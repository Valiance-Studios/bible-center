/**
 * Runs a command against the Firebase Local Emulator Suite, then shuts the emulators down.
 *
 * Usage: node scripts/with-emulators.ts [--keep-running] [firebase emulators:start args] -- <command>
 *
 * With `--keep-running`, the emulators stay up after the command succeeds, showing their output,
 * until Ctrl+C. `npm run emulators` uses this to seed the emulators and then serve local development.
 *
 * Replaces `firebase emulators:exec`, which on Windows leaves the Firestore emulator's Java
 * process running after it exits, so the next run fails with "port taken". This script stops
 * the emulators' whole process tree instead.
 */
import type {ChildProcess} from 'node:child_process';

import {spawn, spawnSync} from 'node:child_process';
import {constants} from 'node:os';

const KEEP_RUNNING_FLAG = '--keep-running';
const READY_PATTERN = /All emulators ready/;
const STARTUP_TIMEOUT_MS = 120_000;
const isWindows = process.platform === 'win32';

interface ParsedArgs {
  emulatorArgs: string[];
  command: string[];
  keepRunning: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const separator = argv.indexOf('--');

  if (separator === -1 || separator === argv.length - 1) {
    throw new Error('Usage: node scripts/with-emulators.ts [--keep-running] [emulator args] -- <command>');
  }

  const ownArgs = argv.slice(0, separator);

  return {
    emulatorArgs: ownArgs.filter((arg) => arg !== KEEP_RUNNING_FLAG),
    command: argv.slice(separator + 1),
    keepRunning: ownArgs.includes(KEEP_RUNNING_FLAG),
  };
}

function stopEmulators(emulators: ChildProcess): Promise<void> {
  if (emulators.exitCode !== null || emulators.signalCode !== null || emulators.pid === undefined) {
    return Promise.resolve();
  }

  const exited = new Promise<void>((resolve) => {
    emulators.once('exit', () => resolve());
  });

  if (isWindows) {
    spawnSync('taskkill', ['/pid', String(emulators.pid), '/T', '/F'], {stdio: 'ignore'});
  } else {
    // The emulators run in their own process group (detached), so this reaches the Java process too.
    process.kill(-emulators.pid, 'SIGTERM');
  }

  return exited;
}

/**
 * Starts the emulators and resolves once they report ready. Their output is shown if startup fails,
 * or from then on when `showOutput` is set.
 */
function startEmulators(args: string[], showOutput: boolean): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const emulators = spawn(['firebase', 'emulators:start', ...args].join(' '), {
      shell: true,
      detached: !isWindows,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';

    const fail = (message: string): void => {
      clearTimeout(timer);
      void stopEmulators(emulators).then(() => reject(new Error(`${message}\n\n${output}`)));
    };

    const timer = setTimeout(() => fail('Timed out waiting for the emulators to start.'), STARTUP_TIMEOUT_MS);

    const onOutput = (chunk: Buffer): void => {
      output += chunk.toString();

      if (READY_PATTERN.test(output)) {
        clearTimeout(timer);
        emulators.stdout.off('data', onOutput);
        emulators.stderr.off('data', onOutput);

        if (showOutput) {
          process.stdout.write(output);
          emulators.stdout.pipe(process.stdout);
          emulators.stderr.pipe(process.stderr);
        } else {
          // Keep draining output so the emulators never block on a full pipe.
          emulators.stdout.resume();
          emulators.stderr.resume();
        }

        resolve(emulators);
      }
    };

    emulators.stdout.on('data', onOutput);
    emulators.stderr.on('data', onOutput);
    emulators.once('exit', (code) => fail(`The emulators exited before becoming ready (exit code ${code}).`));
  });
}

function runCommand(command: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(command.join(' '), {shell: true, stdio: 'inherit'});

    child.once('exit', (code) => resolve(code ?? 1));
  });
}

async function main(): Promise<number> {
  const {emulatorArgs, command, keepRunning} = parseArgs(process.argv.slice(2));
  const emulators = await startEmulators(emulatorArgs, keepRunning);

  // SIGHUP is what closing the terminal (or IDE task) running this sends. Unhandled, it killed this script
  // alone and left the emulators running with no parent, still holding their ports.
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) {
    process.once(signal, () => {
      // Ending a kept-running session this way is normal, so it is not reported as a failure.
      void stopEmulators(emulators).then(() => process.exit(keepRunning ? 0 : 128 + constants.signals[signal]));
    });
  }

  let exitCode = 1;

  try {
    exitCode = await runCommand(command);
  } finally {
    if (!keepRunning || exitCode !== 0) {
      await stopEmulators(emulators);
    }
  }

  if (keepRunning && exitCode === 0) {
    console.log('Emulators are running. Press Ctrl+C to stop them.');
    // Wait for Ctrl+C; the signal handlers stop the emulators and exit.
    await new Promise<never>(() => {});
  }

  return exitCode;
}

main().then(
  (exitCode) => process.exit(exitCode),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
