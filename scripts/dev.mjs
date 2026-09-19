import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const token = process.env.ENGINE_TOKEN || randomBytes(32).toString("hex");
if (
  !["127.0.0.1", "localhost", "::1"].includes(
    process.env.APP_HOST || "127.0.0.1",
  ) &&
  (process.env.APP_PASSWORD || "").length < 16
)
  throw Error(
    "Set APP_PASSWORD (at least 16 characters) before binding beyond localhost.",
  );
const env = {
  ...process.env,
  ENGINE_TOKEN: token,
  ENGINE_URL:
    process.env.ENGINE_URL ||
    `http://127.0.0.1:${process.env.ENGINE_PORT || 8787}`,
};
const children = [
  spawn(process.execPath, ["engine/server.mjs"], {
    stdio: "inherit",
    env,
    windowsHide: true,
  }),
  spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      process.argv.includes("--production") ? "start" : "dev",
      "-H",
      process.env.APP_HOST || "127.0.0.1",
      "-p",
      process.env.PORT || "3000",
    ],
    { stdio: "inherit", env, windowsHide: true },
  ),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  children.forEach((c) => c.kill());
  setTimeout(() => process.exit(code), 500);
}
children.forEach((c) => {
  c.on("error", (e) => {
    console.error(e.message);
    stop(1);
  });
  c.on("exit", (code) => stop(code || 0));
});
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
