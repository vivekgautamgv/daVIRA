import assert from "node:assert/strict";
import { request } from "node:http";
const base = process.env.CHECK_URL || "http://127.0.0.1:3000";
for (const path of [
  "/",
  "/summary",
  "/coverage",
  "/setups",
  "/dashboard",
  "/discover",
  "/flows",
  "/rwa",
  "/copy",
  "/coins",
  "/watchlist",
  "/radar",
  "/calendar",
  "/reports",
  "/paper",
  "/settings",
]) {
  const r = await fetch(base + path);
  assert.equal(r.status, 200, path);
  console.log(`PASS page ${path}`);
}
for (const path of [
  "overview",
  "intelligence",
  "leaderboard",
  "screener",
  "flows",
  "flows?cohort=pilot",
  "coverage",
  "trade-setup?coin=BTC&window=24h",
  "coin-research?coin=ETH&window=24h",
  "screens",
  "markets",
  "global-markets",
  "tape",
  "radar",
  "events",
  "news",
  "reports?coin=BTC",
  "paper",
  "status",
]) {
  const r = await fetch(`${base}/api/engine/${path}`),
    d = await r.json();
  assert.equal(r.status, 200, `${path}: ${d.error}`);
  console.log(`PASS API ${path}`);
}
const post = (headers, body) =>
  fetch(`${base}/api/engine/watchlist`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body,
  });
assert.equal(
  (await post({ Origin: base }, JSON.stringify({ address: "invalid" }))).status,
  400,
);
assert.equal(
  (await post({ Origin: "https://untrusted.example" }, "{}")).status,
  403,
);
assert.equal((await post({ Origin: "null" }, "{}")).status, 403);
assert.equal(
  (await post({ Origin: base }, JSON.stringify({ label: "x".repeat(17000) })))
    .status,
  413,
);
const hostStatus = await new Promise((resolve, reject) => {
  const req = request(
    `${base}/api/engine/markets`,
    { headers: { Host: "untrusted.example" } },
    (res) => {
      res.resume();
      resolve(res.statusCode);
    },
  );
  req.on("error", reject);
  req.end();
});
assert.equal(hostStatus, 403);
console.log(
  "PASS origin validation, host validation, payload size and input rejection",
);
const status = await (await fetch(`${base}/api/engine/status`)).json();
assert.equal(status.health.websocket, "live", "Trade stream must be connected");
assert(status.tradeCount > 0, "Expected observed trades");
console.log(
  `PASS collector: ${status.health.streams.length} streams, ${status.tradeCount} retained trades`,
);
