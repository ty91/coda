import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { CliExit, runAskCommand } from './ask.js';

const REQUEST_JSON = JSON.stringify({
  questions: [
    {
      header: 'Scope',
      id: 'scope_choice',
      question: 'Pick one?',
      options: [
        { label: 'Ship now (Recommended)', description: 'Fast path.' },
        { label: 'Expand', description: 'Broad path.' },
      ],
    },
  ],
});

const listenSocketServer = async (
  socketPath: string,
  onConnection: (payload: unknown, writeLine: (line: string) => void) => void
) => {
  const server = createServer((socket) => {
    let buffer = '';

    socket.setEncoding('utf8');
    socket.on('data', (chunk) => {
      buffer += chunk;
      const newlineIndex = buffer.indexOf('\n');
      if (newlineIndex < 0) {
        return;
      }

      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (line.length === 0) {
        return;
      }

      const payload = JSON.parse(line) as unknown;
      onConnection(payload, (responseLine) => {
        socket.write(`${responseLine}\n`);
        socket.end();
      });
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(socketPath, () => resolve());
  });

  return server;
};

const createPipedStdin = (value: string): NodeJS.ReadStream => {
  const stream = Readable.from([value]) as NodeJS.ReadStream;
  Object.assign(stream, { isTTY: false });
  return stream;
};

describe('runAskCommand', () => {
  it('prints JSON response and exits successfully when answered', async () => {
    const tempHome = mkdtempSync(join(tmpdir(), 'coda-ask-home-'));
    const runtimeDir = join(tempHome, '.coda', 'runtime');
    const socketPath = join(runtimeDir, 'ask.sock');
    const outputs: string[] = [];
    const originalHome = process.env.HOME;

    mkdirSync(runtimeDir, { recursive: true });
    process.env.HOME = tempHome;

    const server = await listenSocketServer(socketPath, (payload, writeLine) => {
      const request = payload as { ask_id: string };
      writeLine(
        JSON.stringify({
          ask_id: request.ask_id,
          answers: [
            {
              id: 'scope_choice',
              selected_label: 'Ship now (Recommended)',
              selected_index: 0,
              used_other: false,
              other_text: null,
            },
          ],
          note: null,
          status: 'answered',
          answered_at_iso: '2026-02-19T13:00:00.000Z',
          source: 'tauri-ui',
        })
      );
    });

    try {
      await runAskCommand(
        { json: true },
        {
          stdin: createPipedStdin(REQUEST_JSON),
          stdout: (message) => {
            outputs.push(message);
          },
        }
      );
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      process.env.HOME = originalHome;
      rmSync(tempHome, { recursive: true, force: true });
    }

    expect(outputs).toHaveLength(1);
    const firstOutput = outputs.at(0);
    expect(firstOutput).toBeDefined();
    expect(JSON.parse(firstOutput ?? '{}') as { status: string }).toMatchObject({
      status: 'answered',
    });
  });

  it('returns exit code 3 when socket response times out', async () => {
    const tempHome = mkdtempSync(join(tmpdir(), 'coda-ask-home-'));
    const runtimeDir = join(tempHome, '.coda', 'runtime');
    const socketPath = join(runtimeDir, 'ask.sock');
    const originalHome = process.env.HOME;

    mkdirSync(runtimeDir, { recursive: true });
    process.env.HOME = tempHome;

    const server = await listenSocketServer(socketPath, () => {
      // keep connection open to trigger CLI timeout path.
    });

    try {
      await expect(
        runAskCommand(
          { timeoutMs: '20' },
          {
            stdin: createPipedStdin(REQUEST_JSON),
            stdout: () => {},
          }
        )
      ).rejects.toMatchObject({
        exitCode: 3,
      } satisfies Partial<CliExit>);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      process.env.HOME = originalHome;
      rmSync(tempHome, { recursive: true, force: true });
    }
  });
});
