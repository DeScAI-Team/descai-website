import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const binExtension = process.platform === "win32" ? ".cmd" : "";
const localBin = (name) => path.join(projectRoot, "node_modules", ".bin", `${name}${binExtension}`);
const children = new Set();
let shuttingDown = false;

const start = (name, command, args) => {
  const childEnv = { ...process.env };
  if (!childEnv.NO_COLOR && !childEnv.FORCE_COLOR) {
    childEnv.FORCE_COLOR = "1";
  }

  const child = spawn(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    env: childEnv
  });

  children.add(child);

  child.on("exit", (code, signal) => {
    children.delete(child);

    if (shuttingDown) return;

    shuttingDown = true;
    for (const runningChild of children) {
      runningChild.kill("SIGTERM");
    }

    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    console.error(`${name} exited with code ${code ?? 0}`);
    process.exit(code ?? 0);
  });

  return child;
};

const stopAll = () => {
  if (shuttingDown) return;

  shuttingDown = true;
  for (const child of children) {
    child.kill("SIGTERM");
  }
};

process.on("SIGINT", () => {
  stopAll();
  process.exit(130);
});

process.on("SIGTERM", () => {
  stopAll();
  process.exit(143);
});

start("index-api", localBin("tsx"), ["src/api/arweaveIndex.ts"]);
start("vite", localBin("vite"), []);
