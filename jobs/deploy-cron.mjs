import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadLocalEnv } from "./lib/env.mjs";

loadLocalEnv();

const TAG = "[deploy-cron]";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const RETRY_MS = 12 * 60 * 60 * 1000;
const DEPLOY_LIVE_MARKER = "=== Deployment live ===";
const DONE_MARKER = "Done.";

const jobsDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(jobsDir, "..");
const deployScript = path.join(jobsDir, "deploy-test.mjs");

const log = (...args) => console.log(TAG, ...args);
const err = (...args) => console.error(TAG, ...args);

let nextTimer = null;
let activeChild = null;
let running = false;
let shuttingDown = false;
let started = false;
let embedded = false;

function formatDuration(ms) {
  const hours = ms / (60 * 60 * 1000);
  if (hours >= 24) {
    const days = Math.round((hours / 24) * 10) / 10;
    return `${days}d`;
  }
  return `${hours}h`;
}

function scheduleNext(delayMs, reason) {
  if (shuttingDown) return;

  if (nextTimer) {
    clearTimeout(nextTimer);
    nextTimer = null;
  }

  const runAt = new Date(Date.now() + delayMs);
  log(
    `Next run in ${formatDuration(delayMs)} (${reason}) — scheduled for ${runAt.toISOString()}`
  );

  nextTimer = setTimeout(() => {
    nextTimer = null;
    runDeploy().catch((e) => {
      err("Scheduler error:", e.message);
      scheduleNext(RETRY_MS, "scheduler error");
    });
  }, delayMs);
}

function pipeLines(stream, write, onLine) {
  let buffer = "";

  stream.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      write(line);
      onLine(line);
    }
  });

  return () => {
    if (buffer) {
      write(buffer);
      onLine(buffer);
    }
  };
}

function runDeployScript() {
  return new Promise((resolve) => {
    let deploymentMade = false;
    let sawDone = false;

    const child = spawn(process.execPath, [deployScript], {
      cwd: projectRoot,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    activeChild = child;

    const flushStdout = pipeLines(
      child.stdout,
      (line) => console.log(line),
      (line) => {
        if (line.includes(DEPLOY_LIVE_MARKER)) deploymentMade = true;
        if (line.includes(DONE_MARKER)) sawDone = true;
      }
    );

    const flushStderr = pipeLines(
      child.stderr,
      (line) => console.error(line),
      (line) => {
        if (line.includes(DEPLOY_LIVE_MARKER)) deploymentMade = true;
        if (line.includes(DONE_MARKER)) sawDone = true;
      }
    );

    child.on("close", (code, signal) => {
      flushStdout();
      flushStderr();
      activeChild = null;
      if (shuttingDown && !embedded) process.exit(0);
      resolve({ code: code ?? 1, signal, deploymentMade, sawDone });
    });

    child.on("error", (e) => {
      err("Failed to start deploy-test:", e.message);
      activeChild = null;
      resolve({ code: 1, signal: null, deploymentMade: false, sawDone: false });
    });
  });
}

async function runDeploy() {
  if (shuttingDown) return;

  if (running) {
    log("Deploy already in progress — skipping overlapping run");
    return;
  }

  running = true;
  log("Starting deploy-test…");

  const result = await runDeployScript();
  running = false;

  if (shuttingDown) return;

  if (result.deploymentMade) {
    log("Deployment went live.");
  }

  if (result.code === 0 && result.sawDone) {
    log("Deploy run finished successfully.");
    scheduleNext(WEEK_MS, "deployment succeeded");
    return;
  }

  const detail =
    result.signal != null
      ? `signal ${result.signal}`
      : `exit code ${result.code ?? "unknown"}`;
  err(`Deploy failed (${detail}).`);
  scheduleNext(RETRY_MS, "deploy failed");
}

function requestShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  log(`Received ${signal}; stopping scheduler…`);

  if (nextTimer) {
    clearTimeout(nextTimer);
    nextTimer = null;
  }

  if (activeChild) {
    log("Sending SIGINT to active deploy-test process…");
    activeChild.kill("SIGINT");
  } else if (!running && !embedded) {
    process.exit(0);
  }
}

/** @param {{ embedded?: boolean, initialDelayMs?: number, initialReason?: string }} [options] */
export function startDeployScheduler(options = {}) {
  if (started) {
    log("Scheduler already running — skipping second start");
    return;
  }

  started = true;
  embedded = options.embedded ?? false;
  shuttingDown = false;

  if (!embedded) {
    process.on("SIGINT", () => requestShutdown("SIGINT"));
    process.on("SIGTERM", () => requestShutdown("SIGTERM"));
  }

  log("Deploy scheduler started (weekly on success, 12h retry on failure).");
  scheduleNext(options.initialDelayMs ?? 0, options.initialReason ?? "initial run");
}

export function stopDeployScheduler(signal = "SIGTERM") {
  requestShutdown(signal);
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  startDeployScheduler();
}
