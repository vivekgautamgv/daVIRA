import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
const dir = mkdtempSync(join(tmpdir(), "davira-api-"));
process.env.DAVIRA_DB_PATH = join(dir, "test.sqlite");
process.env.ENGINE_PORT = "0";
process.env.ENGINE_TOKEN = "test-only-engine-token-at-least-32-characters";
process.env.DISABLE_COLLECTOR = "1";
const { db, saveCache } = await import("../engine/db.mjs");
saveCache("markets", [
  {
    coin: "BTC",
    price: 100,
    change: 1,
    funding: 0.0001,
    volume: 1000000,
    openInterest: 1000000,
  },
]);
const address = "0x" + "1".repeat(40);
saveCache(`account:${address}`, { equity: 1000, positions: [] });
const { server } = await import("../engine/server.mjs");
if (!server.listening) await once(server, "listening");
const url = `http://127.0.0.1:${server.address().port}`;
const call = (path, method = "GET", body) =>
  fetch(url + path, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.ENGINE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
test.after(async () => {
  await new Promise((r) => server.close(r));
  db.close();
  rmSync(dir, { recursive: true, force: true });
});
test("engine rejects unauthenticated reads", async () => {
  assert.equal((await fetch(url + "/markets")).status, 401);
  assert.equal((await fetch(url + "/healthz")).status, 200);
});

test("V2 coverage journals real attempts and pilot membership is validated", async () => {
  const { recordCollection } = await import("../engine/coverage.mjs");
  const started = Date.now() - 100;
  recordCollection(address, started, true, {
    fillsFetchedAt: started,
    latestResponseCount: 2000,
    coverage: { gaps: 1 },
  });
  const report = await (await call("/coverage")).json();
  assert.equal(report.collection.attempts, 1);
  assert.equal(report.collection.successRate, 100);
  assert.equal(report.collection.recent[0].capped, 1);
  assert.equal(
    (await call("/coverage/pilot", "POST", { address: "bad", add: true }))
      .status,
    400,
  );
  assert.equal(
    (await call("/coverage/pilot", "POST", { address, add: "yes" })).status,
    400,
  );
  assert.equal(
    (await call("/coverage/pilot", "POST", { address, add: true })).status,
    200,
  );
  let data = await (await call("/coverage")).json();
  assert(data.rows.some((w) => w.address === address && w.pilot));
  const pilotFlows = await (await call("/flows?cohort=pilot")).json();
  assert.equal(pilotFlows.cohort, "pilot");
  assert.equal(pilotFlows.coverage.eligibleWallets, 0);
  assert.equal(
    (await call("/coverage/pilot", "POST", { address, add: false })).status,
    200,
  );
  data = await (await call("/coverage")).json();
  assert(!data.rows.some((w) => w.address === address && w.pilot));
});

test("V2 performance validates windows and does not claim data for an empty archive", async () => {
  assert.equal((await call(`/performance/${address}?days=90`)).status, 400);
  assert.equal(
    (await call(`/performance/${address}?coin=%3Cscript%3E`)).status,
    400,
  );
  const r = await call(`/performance/${address}?days=7`);
  assert.equal(r.status, 200);
  const data = await r.json();
  assert.equal(data.stats.fills, 0);
  assert.equal(data.stats.winRate, null);
  assert(data.daily.every((d) => d.pnl === null));
});

test("trade setup API validates inputs and never promotes a market without wallet evidence", async () => {
  const now = Date.now(),
    hour = 3600000;
  saveCache(
    "candles:BTC:1h",
    Array.from({ length: 30 }, (_, i) => {
      const t = Math.floor(now / hour) * hour - (30 - i) * hour;
      return {
        t,
        T: t + hour - 1,
        o: 100,
        h: 101,
        l: 99,
        c: 100,
        s: "BTC",
        i: "1h",
      };
    }),
  );
  const response = await call("/trade-setup?coin=BTC&window=24h"),
    plan = await response.json();
  assert.equal(response.status, 200);
  assert.equal(plan.status, "wait");
  assert.equal(plan.levels, null);
  assert(plan.reasons.length);
  assert.equal((await call("/trade-setup?coin=BTC&window=2d")).status, 400);
  assert.equal((await call("/trade-setup?coin=%3Cscript%3E")).status, 400);
  const unsupported = await (await call("/trade-setup?coin=xyz:TSLA")).json();
  assert.equal(unsupported.status, "wait");
});
test("watchlist validates addresses and supports persisted labels", async () => {
  assert.equal(
    (await call("/watchlist", "POST", { address: "bad" })).status,
    400,
  );
  assert.equal(
    (await call("/watchlist", "POST", { address, label: "Research test" }))
      .status,
    200,
  );
  const rows = (await (await call("/watchlist")).json()).data;
  assert.equal(rows[0].label, "Research test");
  assert.equal(
    db.prepare("SELECT label FROM watchlists WHERE address=?").get(address)
      .label,
    "Research test",
  );
  assert.equal((await call(`/watchlist/${address}`, "DELETE", {})).status, 200);
});
test("rule creation rejects arbitrary types and invalid thresholds", async () => {
  assert.equal(
    (
      await call("/rules", "POST", {
        kind: "prediction",
        coin: "BTC",
        threshold: 1,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call("/rules", "POST", {
        kind: "price_above",
        coin: "BTC",
        threshold: -1,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call("/rules", "POST", {
        kind: "price_above",
        coin: "BTC",
        threshold: 101,
      })
    ).status,
    200,
  );
});
test("paper order validation and closed-state protection work over HTTP", async () => {
  assert.equal(
    (
      await call("/paper/open", "POST", {
        coin: "FAKE",
        side: "long",
        margin: 100,
        leverage: 1,
      })
    ).status,
    400,
  );
  const opened = await (
    await call("/paper/open", "POST", {
      coin: "BTC",
      side: "long",
      margin: 100,
      leverage: 1,
    })
  ).json();
  assert(opened.id);
  assert.equal(
    (await call("/paper/close", "POST", { id: opened.id })).status,
    200,
  );
  assert.equal(
    (await call("/paper/close", "POST", { id: opened.id })).status,
    400,
  );
});
test("JSON export excludes credentials and contains the journal", async () => {
  const response = await call("/export"),
    data = await response.json();
  assert.equal(data.version, 1);
  assert.equal(data.paper.length, 1);
  assert(!JSON.stringify(data).includes(process.env.ENGINE_TOKEN));
});
test("saved screens persist filters and support deleting only the selected screen", async () => {
  assert.equal(
    (await call("/screens", "POST", { name: "", filters: {} })).status,
    400,
  );
  assert.equal(
    (await call("/screens", "POST", { name: "Invalid", filters: [] })).status,
    400,
  );
  assert.equal(
    (
      await call("/screens", "POST", {
        name: "Quality research",
        filters: { minScore: "60", coin: "BTC" },
      })
    ).status,
    200,
  );
  const rows = (await (await call("/screens")).json()).data;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].filters.coin, "BTC");
  assert.equal(
    (await call(`/screens/${rows[0].id}`, "DELETE", {})).status,
    200,
  );
  assert.equal((await (await call("/screens")).json()).data.length, 0);
});
test("coin flow API attributes openings, closes and reversals to source wallets", async () => {
  const f = {
    coin: "BTC",
    startPosition: "2",
    sz: "5",
    side: "A",
    px: "100",
    closedPnl: "10",
    fee: "1",
    time: Date.now() - 1000,
    tid: 123,
    dir: "Long > Short",
  };
  db.prepare("INSERT INTO wallet_fills VALUES(?,?,?,?,?)").run(
    address,
    "test-fill",
    "BTC",
    f.time,
    JSON.stringify(f),
  );
  const flow = await (await call("/flows?window=1h&coin=BTC")).json();
  assert.equal(flow.data[0].inflow, 300);
  assert.equal(flow.data[0].outflow, 200);
  assert.equal(flow.data[0].net, 100);
  assert.equal(flow.data[0].directional, -500);
  assert.equal(flow.wallets[0].address, address);
  assert.equal(flow.coverage.wallets, 1);
  assert.equal(flow.timeline[0].inflow, 300);
  assert.equal(flow.data[0].insight.bearishWallets, 1);
  assert.equal(flow.wallets[0].positionDelta, "-5");
});
test("large-wallet flow cohorts require fresh qualifying account evidence", async () => {
  const now = Date.now(),
    analysis = {
      updatedAt: now,
      positionsAt: now,
      positionsStale: false,
      risk: { mainEquity: 200000 },
      positions: [],
      stats: { score: 65, completeTrades: 12 },
    };
  db.prepare("INSERT INTO wallet_analysis VALUES(?,?,?)").run(
    address,
    JSON.stringify(analysis),
    now,
  );
  const eligible = await (
    await call("/flows?window=6h&coin=BTC&cohort=whales")
  ).json();
  assert.equal(eligible.coverage.wallets, 1);
  assert.equal(eligible.data[0].inflow, 300);
  analysis.positionsStale = true;
  db.prepare("UPDATE wallet_analysis SET value=? WHERE address=?").run(
    JSON.stringify(analysis),
    address,
  );
  const stale = await (
    await call("/flows?window=24h&coin=BTC&cohort=whales")
  ).json();
  assert.equal(stale.data.length, 0);
});

test("analysis requests distinguish cached results from a full queue", async () => {
  const wallet = "0x" + "9".repeat(40);
  db.prepare("INSERT INTO wallet_analysis VALUES(?,?,?)").run(
    wallet,
    JSON.stringify({ analyticsVersion: 4 }),
    Date.now(),
  );
  const cached = await call("/analyze", "POST", { address: wallet });
  assert.equal(cached.status, 200);
  assert.equal((await cached.json()).status, "cached");
  const add = db.prepare(
    "INSERT OR IGNORE INTO analysis_queue(address,priority,queued_at) VALUES(?,?,?)",
  );
  for (let i = 0; i < 300; i++)
    add.run("0x" + i.toString(16).padStart(40, "0"), 0, Date.now());
  const full = await call("/analyze", "POST", {
    address: "0x" + "a".repeat(40),
  });
  assert.equal(full.status, 503);
  assert.match((await full.json()).error, /not queued/);
  db.prepare("DELETE FROM analysis_queue").run();
  db.prepare("DELETE FROM wallet_analysis WHERE address=?").run(wallet);
});
