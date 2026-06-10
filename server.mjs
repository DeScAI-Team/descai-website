import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadLocalEnv } from "./jobs/lib/env.mjs";
import { startDeployScheduler, stopDeployScheduler } from "./jobs/deploy-cron.mjs";

loadLocalEnv();

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "dist");
const app = express();
app.use(express.static(dist));
app.use((_req, res) => res.sendFile(path.join(dist, "index.html")));

app.listen(process.env.PORT ?? 8080, () =>
  console.log(`listening on ${process.env.PORT ?? 8080}`)
);

if (process.env.AKASH_MNEMONIC?.trim()) {
  startDeployScheduler({ embedded: true });
} else {
  console.log("[deploy-cron] AKASH_MNEMONIC not set — deploy scheduler disabled");
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    stopDeployScheduler(signal);
  });
}
