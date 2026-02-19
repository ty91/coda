#!/usr/bin/env node

import { mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const requestJson = JSON.stringify({
  questions: [
    {
      header: 'Scope',
      id: 'scope_choice',
      question: 'Choose scope?',
      options: [
        { label: 'Ship now (Recommended)', description: 'Fast path' },
        { label: 'Expand', description: 'Broader path' },
      ],
    },
  ],
  note: {
    label: 'Reason',
    required: false,
  },
});

const tempHome = mkdtempSync(join(tmpdir(), 'coda-ask-smoke-'));
const runtimeDir = join(tempHome, '.coda', 'runtime');
const socketPath = join(runtimeDir, 'ask.sock');

mkdirSync(runtimeDir, { recursive: true });

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
    if (line.length === 0) {
      return;
    }

    const payload = JSON.parse(line);

    setTimeout(() => {
      socket.write(
        `${JSON.stringify({
          ask_id: payload.ask_id,
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
          answered_at_iso: new Date().toISOString(),
          source: 'tauri-ui',
        })}\n`
      );
      socket.end();
    }, 150);
  });
});

const run = async () => {
  await new Promise((resolve) => {
    server.listen(socketPath, () => resolve());
  });

  const child = spawn(
    'pnpm',
    ['--filter', '@coda/cli', 'exec', 'node', 'dist/main.js', 'ask', '--json'],
    {
      env: {
        ...process.env,
        HOME: tempHome,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    }
  );

  child.stdin.write(requestJson);
  child.stdin.end();

  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });

  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  const exitCode = await new Promise((resolve) => {
    child.on('close', (code) => resolve(code ?? 1));
  });

  if (stderr.trim().length > 0) {
    console.error(stderr.trim());
  }

  if (exitCode !== 0) {
    throw new Error(`coda ask exited with code ${exitCode}`);
  }

  const parsed = JSON.parse(stdout.trim());
  if (parsed.status !== 'answered') {
    throw new Error(`unexpected ask status: ${parsed.status}`);
  }

  console.log('ask roundtrip smoke passed');
  console.log(stdout.trim());
};

run()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await new Promise((resolve) => server.close(() => resolve()));
    rmSync(tempHome, { recursive: true, force: true });
  });
