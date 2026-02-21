import { NextResponse } from 'next/server';
import { spawn, type ChildProcess } from 'child_process';
import path from 'path';
import net from 'net';

// LiveKit agent worker listens on port 8081 by default
const AGENT_PORT = 8081;

// Keep a reference to the agent process across hot-reloads in dev
declare global {
  // eslint-disable-next-line no-var
  var __qubitAgentProcess: ChildProcess | null;
}
globalThis.__qubitAgentProcess = globalThis.__qubitAgentProcess ?? null;

/** Check if something is already listening on the agent port */
function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net.createConnection({ port, host: '127.0.0.1' });
    tester.once('connect', () => { tester.destroy(); resolve(true); });
    tester.once('error', () => { tester.destroy(); resolve(false); });
  });
}

function isAgentAlive(): boolean {
  const proc = globalThis.__qubitAgentProcess;
  return !!(proc && proc.exitCode === null && !proc.killed);
}

export async function POST() {
  try {
    // If a managed process is alive OR port 8081 is already occupied → already running
    const portBusy = await isPortInUse(AGENT_PORT);
    if (isAgentAlive() || portBusy) {
      return NextResponse.json({ status: 'already_running' });
    }

    const cwd = process.cwd();
    const agentPath = path.join(cwd, 'agent.js');

    const proc = spawn('node', [agentPath, 'start'], {
      cwd,
      env: { ...process.env },
      stdio: 'pipe',
      detached: false,
    });

    globalThis.__qubitAgentProcess = proc;

    proc.stdout?.on('data', (d: Buffer) => console.log('[Qubit Agent]', d.toString().trim()));
    proc.stderr?.on('data', (d: Buffer) => {
      const text = d.toString().trim();
      // EADDRINUSE means another agent is running — not a real error
      if (!text.includes('EADDRINUSE')) {
        console.error('[Qubit Agent ERR]', text);
      }
    });
    proc.on('exit', (code) => {
      console.log(`[Qubit Agent] process exited with code ${code}`);
      globalThis.__qubitAgentProcess = null;
    });

    // Wait up to 8 seconds for the agent to register with LiveKit (look for port + log)
    const started = await new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => resolve(false), 8000);

      // Poll the port until it opens
      const poll = setInterval(async () => {
        if (await isPortInUse(AGENT_PORT)) {
          clearInterval(poll);
          clearTimeout(timeout);
          resolve(true);
        }
      }, 300);

      // Also resolve on known log lines (belt-and-suspenders)
      const onData = (d: Buffer) => {
        const text = d.toString();
        if (
          text.includes('registered worker') ||
          text.includes('Server is listening') ||
          text.includes('connected and ready')
        ) {
          clearInterval(poll);
          clearTimeout(timeout);
          resolve(true);
        }
        // If it exits due to EADDRINUSE, another instance is running — treat as success
        if (text.includes('EADDRINUSE')) {
          clearInterval(poll);
          clearTimeout(timeout);
          resolve(true);
        }
      };

      proc.stdout?.on('data', onData);
      proc.stderr?.on('data', onData);

      proc.on('exit', (code) => {
        clearInterval(poll);
        clearTimeout(timeout);
        // Exit code 1 with EADDRINUSE means already running — success
        // Any other non-zero is a real failure, but check port one more time
        isPortInUse(AGENT_PORT).then((busy) => resolve(busy));
      });
    });

    if (!started) {
      return NextResponse.json(
        { status: 'failed', error: 'Agent did not start in time. Check server logs.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ status: 'started' });
  } catch (err) {
    console.error('Failed to start Qubit agent:', err);
    return NextResponse.json({ status: 'error', error: String(err) }, { status: 500 });
  }
}

export async function GET() {
  const portBusy = await isPortInUse(AGENT_PORT);
  return NextResponse.json({ alive: isAgentAlive() || portBusy });
}
