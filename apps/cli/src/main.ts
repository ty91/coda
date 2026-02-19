#!/usr/bin/env node

import { SCAFFOLD_STATUS } from '@coda/core/contracts';
import { parseNonEmptyDescription, parseStatusOptions } from '@coda/core/validation';
import { Command, CommanderError } from 'commander';

import { CliExit, runAskCommand } from './ask.js';

const EXIT_SUCCESS = 0;
const EXIT_VALIDATION_ERROR = 2;
const EXIT_RUNTIME_ERROR = 1;

const writeStdout = (message: string): void => {
  process.stdout.write(`${message}\n`);
};

const writeStderr = (message: string): void => {
  process.stderr.write(`${message}\n`);
};

const registerDescriptionCommand = (
  program: Command,
  name: 'plan' | 'review',
  description: string
): void => {
  program
    .command(name)
    .description(description)
    .argument('<description>', 'non-empty description')
    .action((rawDescription: string) => {
      const parsedDescription = parseNonEmptyDescription(rawDescription);
      writeStdout(`${name}: queued "${parsedDescription}" (scaffold)`);
    });
};

const registerStubCommand = (
  program: Command,
  name: 'work' | 'compound',
  description: string
): void => {
  program
    .command(name)
    .description(description)
    .action(() => {
      writeStdout(`${name}: scaffold command ready`);
    });
};

const registerStatusCommand = (program: Command): void => {
  program
    .command('status')
    .description('show scaffold status')
    .option('--json', 'emit JSON output')
    .action((rawOptions: { json?: boolean }) => {
      const options = parseStatusOptions(rawOptions);
      if (options.json) {
        writeStdout(JSON.stringify(SCAFFOLD_STATUS));
        return;
      }

      writeStdout(`project: ${SCAFFOLD_STATUS.projectName}`);
      writeStdout(`milestone: ${SCAFFOLD_STATUS.milestone}`);
      writeStdout(`readiness: ${SCAFFOLD_STATUS.readiness}`);
      writeStdout(`checked_at: ${SCAFFOLD_STATUS.checkedAtIso}`);
    });
};

const registerAskCommand = (program: Command): void => {
  program
    .command('ask')
    .description('request structured user input from Tauri UI')
    .option('--id <value>', 'correlation id (max 64 chars, [A-Za-z0-9._:-]+)')
    .option('--timeout-ms <value>', 'timeout in milliseconds (default: 0 means wait forever)', '0')
    .option('--json', 'emit JSON output')
    .addHelpText(
      'after',
      `
Examples:
  echo '{"questions":[...]}' | coda ask
  cat ./fixtures/ask/multi-question.json | coda ask --json
  cat ./fixtures/ask/multi-question-timeout.json | coda ask --timeout-ms 30000`
    )
    .action(async (rawOptions: { id?: string; timeoutMs?: string; json?: boolean }) => {
      await runAskCommand(rawOptions, { stdin: process.stdin, stdout: writeStdout });
    });
};

const createProgram = (): Command => {
  const program = new Command();

  program.name('coda').description('Coda CLI scaffold').showHelpAfterError();

  registerDescriptionCommand(program, 'plan', 'create a scaffold plan');
  registerStubCommand(program, 'work', 'execute scaffold workflow');
  registerDescriptionCommand(program, 'review', 'run scaffold review workflow');
  registerStubCommand(program, 'compound', 'capture scaffold learnings');
  registerStatusCommand(program);
  registerAskCommand(program);

  return program;
};

const run = async (): Promise<number> => {
  const program = createProgram();
  program.exitOverride();

  try {
    await program.parseAsync(process.argv);
    return EXIT_SUCCESS;
  } catch (error: unknown) {
    if (error instanceof CliExit) {
      if (error.message.length > 0) {
        writeStderr(`error: ${error.message}`);
      }
      return error.exitCode;
    }

    if (error instanceof CommanderError) {
      if (error.code === 'commander.helpDisplayed') {
        return EXIT_SUCCESS;
      }

      writeStderr(`error: ${error.message}`);
      return error.exitCode > 0 ? error.exitCode : EXIT_VALIDATION_ERROR;
    }

    if (error instanceof Error) {
      writeStderr(`error: ${error.message}`);
      return EXIT_VALIDATION_ERROR;
    }

    writeStderr('error: unknown runtime failure');
    return EXIT_RUNTIME_ERROR;
  }
};

void run().then((code) => {
  process.exitCode = code;
});
