import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadLocalEnv, parseArgs } from "./lib/env.mjs";
import {
  ENV_VAR_BY_PATH,
  fetchOneclawSecrets,
  maskSecret,
} from "./lib/oneclaw.mjs";

const TAG = "[key-fetch-test]";
const log = (...args) => console.log(TAG, ...args);
const err = (...args) => console.error(TAG, ...args);

function showSecrets(cliOptions) {
  if (cliOptions.showSecrets) return true;
  const flag = process.env.ONECLAW_SHOW_SECRETS?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

async function main() {
  loadLocalEnv();
  const cliOptions = parseArgs();

  log("Fetching secrets from 1claw…");
  const secrets = await fetchOneclawSecrets({ log });
  const reveal = showSecrets(cliOptions);

  for (const [envName, value] of Object.entries(secrets)) {
    const secretPath =
      Object.entries(ENV_VAR_BY_PATH).find(([, name]) => name === envName)?.[0] ??
      envName;
    const looksLikeAgeKey = value.startsWith("AGE-SECRET-KEY-");
    const suffix = looksLikeAgeKey
      ? " [AGE prefix ok]"
      : " [warn: missing AGE-SECRET-KEY- prefix]";

    if (reveal) {
      log(`OK   ${secretPath} → ${envName}:${suffix}`);
      console.log(`${envName}=${value}`);
    } else {
      log(`OK   ${secretPath} → ${envName}: ${maskSecret(value)}${suffix}`);
    }
  }

  log("");
  log("All secrets fetched successfully.");
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((error) => {
    err("Unrecoverable error:", error);
    process.exit(1);
  });
}
