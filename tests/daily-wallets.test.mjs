import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import {
  initDailyWallets,
  captureDailyWallets,
  dailyWallets,
  walletDailyHistory,
} from "../engine/daily-wallets.mjs";
import { walletEvidence } from "../engine/wallet-evidence.mjs";
import { reportedNumber } from "../engine/leaderboard-values.mjs";
const day = 86400000,
  now = Date.UTC(2026, 8, 23, 8),
  a = "0x" + "a".repeat(40),
  b = "0x" + "b".repeat(40),
  c = "0x" + "c".repeat(40);
const source = (at, rows) => ({
  updatedAt: at,
  stale: false,
  data: rows.map(([address, pnl30d]) => ({ address, pnl30d, equity: 100 })),
});
function fixture() {
  const db = new DatabaseSync(":memory:");
  initDailyWallets(db);
  return db;
}
test("daily ranks freeze, preserve reported PnL and compare only the previous UTC date", () => {
  const db = fixture();
  captureDailyWallets(
    db,
    source(now - day, [
      [a, 100],
      [b, 200],
    ]),
    now - day,
  );
  captureDailyWallets(
    db,
    source(now, [
      [a, 300],
      [c, 250],
    ]),
    now,
  );
  assert.equal(
    captureDailyWallets(db, source(now + 1000, [[a, -1000]]), now + 1000),
    false,
  );
  const d = dailyWallets(db, now);
  assert.equal(d.rows[0].rankChange, 1);
  assert.equal(d.rows[0].pnl30d, 300);
  assert.equal(d.rows[1].status, "entered");
  assert.equal(d.exited[0].address, b);
  assert.equal(walletDailyHistory(db, a).length, 2);
  captureDailyWallets(db, source(now + 2 * day, [[a, 500]]), now + 2 * day);
  assert.equal(dailyWallets(db, now + 2 * day).rows[0].status, "baseline");
  db.close();
});
test("stale, previous-date, empty and invalid source data cannot create a fresh snapshot", () => {
  const db = fixture();
  for (const s of [
    { ...source(now, [[a, 10]]), stale: true },
    source(now - day, [[a, 10]]),
    source(now, []),
    source(now, [[a, null]]),
    source(now, [[a, NaN]]),
    source(now + 1, [[a, 10]]),
  ])
    assert.equal(captureDailyWallets(db, s, now), false);
  assert.equal(dailyWallets(db, now).capturedAt, null);
  db.close();
});
test("ties have a deterministic address order and duplicate addresses do not inflate the cohort", () => {
  const db = fixture();
  captureDailyWallets(
    db,
    source(now, [
      [b, 100],
      [a, 100],
      [a, 100],
    ]),
    now,
  );
  assert.deepEqual(
    dailyWallets(db, now).rows.map((w) => w.address),
    [a, b],
  );
  db.close();
});
test("missing leaderboard metrics remain unavailable, while actual zero and negatives survive", () => {
  for (const v of [null, undefined, "", false, "invalid", Infinity])
    assert.equal(reportedNumber(v), null);
  assert.equal(reportedNumber("0"), 0);
  assert.equal(reportedNumber("-3.5"), -3.5);
});
test("evidence exposes stale, incomplete and capped samples without inventing pre-move scores", () => {
  const good = {
    fillsFetchedAt: now,
    stats: { completeTrades: 30, activeDays: 8 },
    coverage: { gaps: 0 },
    latestResponseCount: 100,
  };
  assert.equal(walletEvidence(good, now).status, "Sample checks passed");
  for (const patch of [
    { fillsFetchedAt: now - 7200000 },
    { latestResponseCount: 2000 },
    { coverage: { gaps: 1 } },
    { stats: { completeTrades: 2, activeDays: 1 } },
  ])
    assert.equal(
      walletEvidence({ ...good, ...patch }, now).status,
      "Limited evidence",
    );
  assert.equal(walletEvidence(good, now).preMove.score, null);
});
