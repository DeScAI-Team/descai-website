import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export function loadLocalEnv() {
  const envPath = path.resolve(projectRoot, ".env");
  if (!fs.existsSync(envPath)) return;

  const source = fs.readFileSync(envPath, "utf8");
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const existing = process.env[key];
    if (!key || (existing !== undefined && existing !== "")) continue;

    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value =
      (rawValue.startsWith('"') && rawValue.endsWith('"')) ||
      (rawValue.startsWith("'") && rawValue.endsWith("'"))
        ? rawValue.slice(1, -1)
        : rawValue;

    process.env[key] = value;
  }
}

export function requireEnv(name, { onMissing, tag } = {}) {
  const value = process.env[name]?.trim();
  if (!value) {
    if (onMissing) {
      onMissing(name);
    } else {
      const prefix = tag ? `${tag} ` : "";
      console.error(`${prefix}Missing required env var: ${name}`);
    }
    process.exit(1);
  }
  return value;
}

export function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    dryRun: false,
    skipD1: false,
    noSdlFit: false,
    pollIntervalMs: null,
    maxWaitMs: null,
    showSecrets: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--skip-d1") {
      options.skipD1 = true;
    } else if (arg === "--no-sdl-fit") {
      options.noSdlFit = true;
    } else if (arg === "--show-secrets") {
      options.showSecrets = true;
    } else if (arg === "--poll-interval") {
      options.pollIntervalMs = Number(argv[++i]);
    } else if (arg === "--max-wait") {
      options.maxWaitMs = Number(argv[++i]);
    }
  }

  return options;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
