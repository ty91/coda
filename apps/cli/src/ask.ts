import { randomBytes } from 'node:crypto';
import { createConnection } from 'node:net';
import { homedir } from 'node:os';
import { join } from 'node:path';

import type { AskRequestBatch, AskResponseBatch } from '@coda/core/contracts';
import { parseAskRequestBatchJson, parseAskResponseBatch } from '@coda/core/validation';

const EXIT_VALIDATION_ERROR = 2;
const EXIT_RUNTIME_ERROR = 1;
const EXIT_TIMEOUT = 3;
const EXIT_CANCELLED = 4;
const EXIT_INTERRUPTED = 130;

type AskCommandRawOptions = {
  timeoutMs?: string;
  json?: boolean;
};

type AskCommandOptions = {
  timeoutMs: number;
  json: boolean;
};

type AskSocketRequest = {
  type: 'ask_request';
  ask_id: string;
  request: AskRequestBatch;
  timeout_ms: number;
  requested_at_iso: string;
};

type AskIo = {
  stdin: NodeJS.ReadStream;
  stdout: (message: string) => void;
};

export class CliExit extends Error {
  readonly exitCode: number;

  constructor(exitCode: number, message?: string) {
    super(message);
    this.name = 'CliExit';
    this.exitCode = exitCode;
  }
}

export const resolveAskSocketPath = (): string => {
  return join(homedir(), '.coda', 'runtime', 'ask.sock');
};

const parseAskCommandOptions = (rawOptions: AskCommandRawOptions): AskCommandOptions => {
  const rawTimeoutValue = rawOptions.timeoutMs ?? '0';
  const timeoutMs = Number.parseInt(rawTimeoutValue, 10);
  if (!Number.isFinite(timeoutMs) || Number.isNaN(timeoutMs) || timeoutMs < 0) {
    throw new CliExit(EXIT_VALIDATION_ERROR, '--timeout-ms must be a non-negative integer');
  }

  return {
    timeoutMs,
    json: rawOptions.json ?? false,
  };
};

const readStdinJson = async (stdin: NodeJS.ReadStream): Promise<string> => {
  if (stdin.isTTY) {
    throw new CliExit(
      EXIT_VALIDATION_ERROR,
      'ask request JSON must be provided via stdin (example: echo \'{"questions":[...]}\' | coda ask)'
    );
  }

  stdin.setEncoding('utf8');
  let input = '';
  for await (const chunk of stdin) {
    input += chunk;
  }

  return input;
};

const createAskId = (): string => {
  return `ask-${Date.now()}-${randomBytes(6).toString('hex')}`;
};

const parseSocketResponse = (rawJson: string): AskResponseBatch => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(rawJson) as unknown;
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      throw new CliExit(EXIT_RUNTIME_ERROR, `invalid socket response JSON: ${error.message}`);
    }
    throw error;
  }

  try {
    return parseAskResponseBatch(parsed);
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new CliExit(EXIT_RUNTIME_ERROR, `invalid ask response payload: ${error.message}`);
    }
    throw error;
  }
};

const requestAskResponse = async (
  socketPath: string,
  requestPayload: AskSocketRequest,
  timeoutMs: number
): Promise<AskResponseBatch> => {
  return await new Promise<AskResponseBatch>((resolve, reject) => {
    const socket = createConnection(socketPath);
    let settled = false;
    let buffer = '';

    const fail = (error: CliExit): void => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      socket.destroy();
      reject(error);
    };

    const succeed = (response: AskResponseBatch): void => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      socket.destroy();
      resolve(response);
    };

    const onData = (chunk: string): void => {
      buffer += chunk;

      // Line-delimited JSON framing: parse first non-empty complete line.
      while (buffer.includes('\n')) {
        const newlineIndex = buffer.indexOf('\n');
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);

        if (line.length === 0) {
          continue;
        }

        try {
          const response = parseSocketResponse(line);
          succeed(response);
          return;
        } catch (error: unknown) {
          if (error instanceof CliExit) {
            fail(error);
            return;
          }
          fail(new CliExit(EXIT_RUNTIME_ERROR, 'socket delivered an invalid response frame'));
          return;
        }
      }
    };

    const onError = (error: Error): void => {
      fail(new CliExit(EXIT_RUNTIME_ERROR, `socket I/O failure: ${error.message}`));
    };

    const onEnd = (): void => {
      try {
        const trailing = buffer.trim();
        if (trailing.length > 0) {
          const response = parseSocketResponse(trailing);
          succeed(response);
          return;
        }

        fail(new CliExit(EXIT_RUNTIME_ERROR, 'socket closed before response payload arrived'));
      } catch (error: unknown) {
        if (error instanceof CliExit) {
          fail(error);
          return;
        }
        fail(new CliExit(EXIT_RUNTIME_ERROR, 'socket closed with malformed response payload'));
      }
    };

    const onSigint = (): void => {
      fail(new CliExit(EXIT_INTERRUPTED));
    };

    const timeoutHandle =
      timeoutMs > 0
        ? setTimeout(() => {
            fail(new CliExit(EXIT_TIMEOUT, 'ask request timed out'));
          }, timeoutMs)
        : null;

    const cleanup = (): void => {
      socket.off('data', onData);
      socket.off('error', onError);
      socket.off('end', onEnd);
      process.off('SIGINT', onSigint);
      if (timeoutHandle !== null) {
        clearTimeout(timeoutHandle);
      }
    };

    process.on('SIGINT', onSigint);
    socket.setEncoding('utf8');
    socket.on('data', onData);
    socket.on('error', onError);
    socket.on('end', onEnd);
    socket.on('connect', () => {
      socket.write(`${JSON.stringify(requestPayload)}\n`);
    });
  });
};

const writeTextResponse = (response: AskResponseBatch, stdout: (message: string) => void): void => {
  for (const answer of response.answers) {
    const otherSuffix =
      answer.used_other && answer.other_text !== null ? ` (${answer.other_text})` : '';
    stdout(`${answer.id}: ${answer.selected_label}${otherSuffix}`);
  }

  if (response.note !== null) {
    stdout(`note: ${response.note}`);
  }

  if (response.status !== 'answered' || response.answers.length === 0) {
    stdout(`status: ${response.status}`);
  }
};

export const runAskCommand = async (
  rawOptions: AskCommandRawOptions,
  io: AskIo
): Promise<void> => {
  const options = parseAskCommandOptions(rawOptions);
  const rawJson = await readStdinJson(io.stdin);

  let requestBatch: AskRequestBatch;
  try {
    requestBatch = parseAskRequestBatchJson(rawJson);
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new CliExit(EXIT_VALIDATION_ERROR, error.message);
    }
    throw new CliExit(EXIT_VALIDATION_ERROR, 'invalid ask request payload');
  }

  const askId = createAskId();
  const socketPath = resolveAskSocketPath();
  const requestPayload: AskSocketRequest = {
    type: 'ask_request',
    ask_id: askId,
    request: requestBatch,
    timeout_ms: options.timeoutMs,
    requested_at_iso: new Date().toISOString(),
  };

  const response = await requestAskResponse(socketPath, requestPayload, options.timeoutMs);
  if (response.ask_id !== askId) {
    throw new CliExit(
      EXIT_RUNTIME_ERROR,
      `ask_id mismatch: expected ${askId}, received ${response.ask_id}`
    );
  }

  if (options.json) {
    io.stdout(JSON.stringify(response));
  } else {
    writeTextResponse(response, io.stdout);
  }

  if (response.status === 'cancelled') {
    throw new CliExit(EXIT_CANCELLED);
  }

  if (response.status === 'expired') {
    throw new CliExit(EXIT_TIMEOUT);
  }
};
