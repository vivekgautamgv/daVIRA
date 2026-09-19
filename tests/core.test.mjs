import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  fillSummary,
  positionChanges,
  paperQuote,
  paperValue,
  ruleMatches,
} from "../engine/analytics.mjs";
const dir = mkdtempSync(join(tmpdir(), "davira-test-"));
process.env.DAVIRA_DB_PATH = join(dir, "test.sqlite");
const { db, saveCache, cached } = await import("../engine/db.mjs");
const { ingestTrades, resolveObservations } =
  await import("../engine/collector.mjs");
const { observeWallet } = await import("../engine/wallet.mjs");
const { openPaper, closePaper, paperState } =
  await import("../engine/paper.mjs");
const { easternTime, parseIcs } = await import("../engine/events.mjs");
test.after(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});
test("deduplicates fills and counts inclusive builder fees only once", () => {
  const f = {
    coin: "BTC",
    tid: 1,
    time: 1,
    px: "100",
    sz: "1",
    closedPnl: "12",
    fee: "2",
    builderFee: "1",
    feeToken: "USDC",
    dir: "Close Long",
  };
  const s = fillSummary([f, f]);
  assert.equal(s.count, 1);
  assert.equal(s.realized, 12);
  assert.equal(s.fees, 2);
  assert.equal(s.netBeforeFunding, 10);
});
test("spot trades are excluded from perpetual realized PnL", () => {
  assert.equal(
    fillSummary([
      {
        coin: "@107",
        tid: 1,
        time: 1,
        px: "100",
        sz: "1",
        closedPnl: "100",
        fee: "1",
        dir: "Sell",
      },
    ]).count,
    0,
  );
});
test("builder DEX fill PnL is not mixed into main DEX USDC results", () => {
  assert.equal(
    fillSummary([
      {
        coin: "xyz:NVDA",
        tid: 1,
        time: 1,
        px: "100",
        sz: "1",
        closedPnl: "100",
        fee: "1",
        feeToken: "USDH",
        dir: "Close Long",
      },
    ]).count,
    0,
  );
});
test("initial snapshots do not fabricate openings; changes distinguish reductions and reversals", () => {
  assert.deepEqual(positionChanges(null, [{ coin: "BTC", size: 1 }]), []);
  const c = positionChanges(
    [
      { coin: "BTC", size: 2 },
      { coin: "ETH", size: 5 },
    ],
    [
      { coin: "BTC", size: 1 },
      { coin: "ETH", size: -2 },
      { coin: "SOL", size: 3 },
    ],
  );
  assert.deepEqual(
    c.map((x) => x.kind),
    ["reduced", "reversed", "opened"],
  );
  assert.equal(c[1].delta, -7);
});
test("mark changes alone do not create position changes", () => {
  assert.deepEqual(
    positionChanges(
      [{ coin: "BTC", size: 1, markPrice: 100 }],
      [{ coin: "BTC", size: 1, markPrice: 120 }],
    ),
    [],
  );
});
test("paper orders use adverse slippage and fees on both sides", () => {
  const q = paperQuote({ side: "long", margin: 100, leverage: 2, mark: 100 });
  assert.equal(Number(q.entry), 100.05);
  assert.equal(Number(q.fee), 0.09);
  const v = paperValue({ ...q, side: "long" }, 100, true);
  assert(v.net < -0.37 && v.net > -0.39);
  const short = paperQuote({
    side: "short",
    margin: 100,
    leverage: 1,
    mark: 100,
  });
  assert.equal(Number(short.entry), 99.95);
  assert(paperValue({ ...short, side: "short" }, 90, true).net > 9);
});
test("paper cash, fees and margin reconcile after open and close", () => {
  const m = [{ coin: "BTC", price: 100 }],
    before = paperState(m);
  const p = openPaper(
    { coin: "BTC", side: "long", margin: 100, leverage: 2 },
    m,
  );
  const open = paperState(m);
  assert.equal(open.positions.length, 1);
  assert.equal(open.balance, 9999.91);
  assert.equal(open.marginUsed, 100);
  assert(open.available < 9899.91);
  const v = closePaper(p.id, m),
    closed = paperState(m);
  assert.equal(closed.positions.length, 0);
  assert(Math.abs(closed.balance - (before.balance + v.net)) < 1e-8);
  assert.equal(closed.marginUsed, 0);
  assert.throws(() => closePaper(p.id, m), /not found/);
});
test("invalid and over-budget paper orders are rejected", () => {
  const m = [{ coin: "BTC", price: 100 }];
  assert.throws(
    () =>
      openPaper({ coin: "BTC", side: "long", margin: 10000, leverage: 5 }, m),
    /Insufficient/,
  );
  assert.throws(
    () => openPaper({ coin: "BTC", side: "long", margin: 100, leverage: 6 }, m),
    /leverage/,
  );
  assert.throws(
    () => openPaper({ coin: "BTC", side: "long", margin: -10, leverage: 1 }, m),
    /Margin/,
  );
  assert.throws(() =>
    paperQuote({ side: "long", margin: NaN, leverage: 1, mark: 100 }),
  );
});
test("WebSocket replay is idempotent and old snapshots do not trigger alerts", () => {
  db.prepare(
    "INSERT INTO rules(id,kind,coin,threshold,created_at) VALUES(?,?,?,?,?)",
  ).run("large", "large_trade", "BTC", 10, Date.now());
  const t = {
    coin: "BTC",
    time: Date.now() - 10000,
    tid: 123,
    side: "B",
    px: "100",
    sz: "2",
    users: ["0xabc", "0xdef"],
  };
  ingestTrades([t], Date.now());
  ingestTrades([t], 0);
  assert.equal(db.prepare("SELECT count(*) n FROM trades").get().n, 1);
  assert.equal(db.prepare("SELECT count(*) n FROM signals").get().n, 0);
  const next = { ...t, time: Date.now(), tid: 124 };
  ingestTrades([next], 0);
  ingestTrades([{ ...next, tid: 125 }], 0);
  assert.equal(db.prepare("SELECT count(*) n FROM signals").get().n, 1);
});
test("rules use hourly funding percentage and match the chosen market", () => {
  assert(
    ruleMatches(
      { kind: "funding_above", threshold: 0.01 },
      { funding: -0.0002 },
    ),
  );
  assert(
    !ruleMatches({ kind: "large_trade", coin: "ETH", threshold: 10 }, null, {
      coin: "BTC",
      price: 100,
      size: 1,
    }),
  );
});
test("calendar handles US daylight saving time", () => {
  assert.equal(
    new Date(easternTime("20260114T083000")).toISOString(),
    "2026-01-14T13:30:00.000Z",
  );
  assert.equal(
    new Date(easternTime("20260916T140000")).toISOString(),
    "2026-09-16T18:00:00.000Z",
  );
  assert.equal(
    new Date(easternTime("20260916T180000Z")).toISOString(),
    "2026-09-16T18:00:00.000Z",
  );
});
test("ICS parsing unfolds continuation lines", () => {
  const rows = parseIcs(
    "BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART;TZID=US/Eastern:20260916T083000\r\nSUMMARY:Consumer Price\r\n Index\r\nEND:VEVENT\r\nEND:VCALENDAR",
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, "Consumer PriceIndex");
  assert.equal(
    new Date(rows[0].time).toISOString(),
    "2026-09-16T12:30:00.000Z",
  );
});
test("cache writes preserve data and timestamp", () => {
  saveCache("test", { a: 1 }, 12345);
  assert.deepEqual(cached("test"), { data: { a: 1 }, updatedAt: 12345 });
});
test("wallet movement ledger persists changes without deferred front-running studies", async () => {
  const address = "0x" + "2".repeat(40),
    now = Date.now() - 1000;
  saveCache(
    `account:${address}`,
    { equity: 1000, positions: [{ coin: "BTC", size: 1, markPrice: 100 }] },
    now,
  );
  await observeWallet(address);
  assert.equal(
    db.prepare("SELECT count(*) n FROM movements WHERE address=?").get(address)
      .n,
    0,
  );
  saveCache(
    `account:${address}`,
    { equity: 1000, positions: [{ coin: "BTC", size: 2, markPrice: 100 }] },
    now + 500,
  );
  await observeWallet(address);
  const move = db
    .prepare("SELECT * FROM movements WHERE address=?")
    .get(address);
  assert.equal(move.kind, "increased");
  assert.equal(move.notional_delta, 100);
  assert.equal(
    db
      .prepare("SELECT count(*) n FROM observations WHERE address=?")
      .get(address).n,
    0,
  );
  await observeWallet(address);
  assert.equal(
    db.prepare("SELECT count(*) n FROM movements WHERE address=?").get(address)
      .n,
    1,
  );
});
