/**
 * Stops this project's Firebase emulators, wherever they were started from.
 *
 * Usage: npm run emulators:stop
 *
 * `npm run test:emulator` and `npm run test:e2e` start their own emulators, so they fail with
 * "port taken" while an `npm run emulators` session - or a leftover Java process from a crashed
 * run - still holds the ports. This sweeps those up.
 *
 * The emulators are found by their command lines, not by asking the OS which process holds each
 * port: on Windows, `netstat` and `Get-NetTCPConnection` were seen listing only a varying few of the
 * listening sockets, so the emulators were sometimes reported as stopped while still running. Whether
 * a port is free is then checked by connecting to it. Only processes naming this project's emulator
 * project id are stopped, so an unrelated server on a shared port (8080) survives and is reported.
 */
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {connect} from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';

const isWindows = process.platform === 'win32';
/** Ports the CLI opens for its hub and logging emulators; neither is declared in firebase.json. */
const INTERNAL_PORTS = [4400, 4500];
/** Both loopback addresses, since the CLI listens on IPv6 for some emulators (e.g. the hub on `::1`). */
const LOOPBACK_HOSTS = ['127.0.0.1', '::1'];
const PROBE_TIMEOUT_MS = 1_000;
const SIGKILL_DELAY_MS = 5_000;
const PORT_RELEASE_TIMEOUT_MS = 10_000;
const POLL_INTERVAL_MS = 200;

interface ProcessInfo {
  pid: number;
  parentPid: number;
  command: string;
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
}

function portOf(emulator: unknown): number | null {
  if (typeof emulator !== 'object' || emulator === null) {
    return null;
  }

  const {port} = emulator as {port?: unknown};

  return typeof port === 'number' ? port : null;
}

/** The emulator ports declared in firebase.json, plus the ones the CLI always opens. */
function emulatorPorts(): number[] {
  const {emulators} = (readJson('../firebase.json') ?? {}) as {emulators?: Record<string, unknown>};
  const configured = Object.values(emulators ?? {})
    .map(portOf)
    .filter((port): port is number => port !== null);

  return [...new Set([...configured, ...INTERNAL_PORTS])];
}

/** The emulator project id, which every emulator process of this project names on its command line. */
function emulatorProjectId(): string {
  const {projects} = (readJson('../.firebaserc') ?? {}) as {projects?: {default?: unknown}};
  const projectId = projects?.default;

  if (typeof projectId !== 'string' || !projectId.startsWith('demo-')) {
    throw new Error('Expected the default project in .firebaserc to be a "demo-" emulator project.');
  }

  return projectId;
}

/** Runs a command and returns its stdout, or an empty string if it fails. */
function run(command: string, args: string[]): string {
  const {status, stdout} = spawnSync(command, args, {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});

  return status === 0 && stdout ? stdout : '';
}

function listWindowsProcesses(): ProcessInfo[] {
  const script = 'ConvertTo-Json -Compress -InputObject @(Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,CommandLine)';
  const output = run('powershell', ['-NoProfile', '-Command', script]);
  const rows = (output ? JSON.parse(output) : []) as {ProcessId: number; ParentProcessId: number; CommandLine: string | null}[];

  return rows.map((row) => ({pid: row.ProcessId, parentPid: row.ParentProcessId, command: row.CommandLine ?? ''}));
}

function listUnixProcesses(): ProcessInfo[] {
  return run('ps', ['-axo', 'pid=,ppid=,command='])
    .split(/\r?\n/)
    .map((line) => /^\s*(\d+)\s+(\d+)\s+(.*)$/.exec(line))
    .filter((match): match is RegExpExecArray => match !== null)
    .map(([, pid, parentPid, command]) => ({pid: Number(pid), parentPid: Number(parentPid), command: command ?? ''}));
}

/**
 * This project's emulator processes: `scripts/with-emulators.ts`, the Firebase CLI it starts (and the
 * shell wrapping it on Windows), and the Firestore emulator's Java process, which can outlive the CLI.
 */
function findEmulatorProcesses(projectId: string): ProcessInfo[] {
  const processes = isWindows ? listWindowsProcesses() : listUnixProcesses();

  return processes.filter(({pid, command}) =>
    pid !== process.pid
    && command.includes(projectId)
    && (/with-emulators\.ts/.test(command) || /firebase.*emulators:start/.test(command) || /cloud-firestore-emulator/.test(command)));
}

/** The processes whose parent is not also being stopped, which on Windows take their trees with them. */
function roots(processes: ProcessInfo[]): ProcessInfo[] {
  const pids = new Set(processes.map(({pid}) => pid));

  return processes.filter(({parentPid}) => !pids.has(parentPid));
}

function describe({command}: ProcessInfo): string {
  if (/with-emulators\.ts/.test(command)) {
    return 'emulator session (scripts/with-emulators.ts)';
  }

  return /cloud-firestore-emulator/.test(command) ? 'Firestore emulator (Java)' : 'Firebase CLI';
}

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function stop(pid: number, force: boolean): void {
  if (isWindows) {
    spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], {stdio: 'ignore'});

    return;
  }

  try {
    process.kill(pid, force ? 'SIGKILL' : 'SIGTERM');
  } catch {
    // Already exited between listing it and signalling it.
  }
}

async function waitForExit(processes: ProcessInfo[]): Promise<ProcessInfo[]> {
  const deadline = Date.now() + SIGKILL_DELAY_MS;
  let remaining = processes.filter(({pid}) => isRunning(pid));

  while (remaining.length > 0 && Date.now() < deadline) {
    await delay(POLL_INTERVAL_MS);
    remaining = remaining.filter(({pid}) => isRunning(pid));
  }

  return remaining;
}

/** Whether anything accepts a connection on the port, on either loopback address. */
async function isPortInUse(port: number): Promise<boolean> {
  const accepts = (host: string): Promise<boolean> => new Promise((resolve) => {
    const socket = connect({host, port, timeout: PROBE_TIMEOUT_MS});
    const finish = (inUse: boolean): void => {
      socket.destroy();
      resolve(inUse);
    };

    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });

  const results = await Promise.all(LOOPBACK_HOSTS.map(accepts));

  return results.includes(true);
}

async function portsInUse(ports: number[]): Promise<number[]> {
  const inUse = await Promise.all(ports.map(isPortInUse));

  return ports.filter((_, index) => inUse[index]);
}

/** Waits for stopped processes to release their ports, returning any still in use. */
async function waitForPorts(ports: number[]): Promise<number[]> {
  const deadline = Date.now() + PORT_RELEASE_TIMEOUT_MS;
  let taken = await portsInUse(ports);

  while (taken.length > 0 && Date.now() < deadline) {
    await delay(POLL_INTERVAL_MS);
    taken = await portsInUse(taken);
  }

  return taken;
}

async function main(): Promise<number> {
  const ports = emulatorPorts();
  const emulators = findEmulatorProcesses(emulatorProjectId());

  for (const emulator of roots(emulators)) {
    console.log(`Stopping ${describe(emulator)}, pid ${emulator.pid}.`);
  }

  // Every process is signalled, not just the roots: elsewhere than Windows a signal does not reach a
  // process's children, and a Java process left by a crashed run has no parent here to take it down.
  for (const emulator of isWindows ? roots(emulators) : emulators) {
    stop(emulator.pid, false);
  }

  for (const survivor of await waitForExit(emulators)) {
    console.log(`Process ${survivor.pid} ignored the shutdown request; forcing it.`);
    stop(survivor.pid, true);
  }

  // Only stopped processes need time to release their ports.
  const stillTaken = emulators.length > 0 ? await waitForPorts(ports) : await portsInUse(ports);

  if (stillTaken.length > 0) {
    const finder = isWindows ? 'netstat -ano | findstr LISTENING' : 'lsof -nP -iTCP -sTCP:LISTEN';
    console.error(`Port ${stillTaken.join(', ')} is still in use by something other than this project's emulators. Find it with \`${finder}\`, stop it, then run this again.`);

    return 1;
  }

  console.log(emulators.length > 0
    ? 'All emulator ports are free.'
    : `No emulators were running; ports ${ports.join(', ')} are free.`);

  return 0;
}

main().then(
  (exitCode) => process.exit(exitCode),
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
