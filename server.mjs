import express from "express";
import cron from "node-cron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { run } from "./jobs/deploy-test.mjs";

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), "dist");
const app = express();
app.use(express.static(dist));
app.use((_req, res) => res.sendFile(path.join(dist, "index.html")));

app.listen(process.env.PORT ?? 8080, () =>
  console.log(`listening on ${process.env.PORT ?? 8080}`)
);

cron.schedule("0 0 * * 0", () => {
  run().catch(err => console.error("[cron] deploy failed:", err));
});
