import test from "node:test";
import assert from "node:assert/strict";
import { walletPerformance } from "../engine/wallet-performance.mjs";
const now = 1800000000000,
  day = 86400000;
const fill = (
  tid,
  time,
  coin,
  side,
  startPosition,
  px,
  closedPnl = 0,
  fee = 1,
) => ({
  tid,
  time,
  coin,
  side,
  startPosition: String(startPosition),
  px: String(px),
  sz: "1",
  closedPnl: String(closedPnl),
  fee: String(fee),
  feeToken: "USDC",
  dir: side === "B" ? "Open Long" : "Close Long",
});
const rows = [
  fill(1, now - 8 * day, "BTC", "B", 0, 100),
  fill(2, now - day, "BTC", "A", 1, 110, 10),
  fill(3, now - 2 * day, "ETH", "A", 0, 110),
  fill(4, now - day, "ETH", "B", -1, 100, 10),
];
test("realized window and full-episode costs remain distinct across the boundary", () => {
  const r = walletPerformance(rows, { days: 7, now });
  assert.equal(r.stats.grossRealized, 20);
  assert.equal(r.stats.fees, 3);
  assert.equal(r.stats.samplePnl, 17);
  assert.equal(r.stats.netPnl, 16);
  assert.equal(r.sides[0].netPnl, 8);
  assert.equal(r.sides[1].netPnl, 8);
  assert.equal(r.stats.completeTrades, 2);
  assert.equal(r.coverage.historyReachesStart, true);
  assert(r.daily.some((d) => d.pnl === null));
});
test("duplicates, future executions and unsupported fees cannot inflate token PnL", () => {
  const r = walletPerformance(
    [
      ...rows,
      rows[3],
      fill(5, now + 1, "BTC", "A", 1, 200, 100),
      { ...fill(6, now - 100, "BTC", "A", 1, 200, 100), feeToken: "ETH" },
    ],
    { days: 30, coin: "BTC", now },
  );
  assert.equal(r.stats.samplePnl, 8);
  assert.equal(r.stats.completeTrades, 1);
  assert.equal(r.coins.length, 1);
  assert.equal(r.coverage.excludedFills, 1);
});
test("a missing opening reports execution PnL without a fabricated win rate", () => {
  const r = walletPerformance([rows[1]], { days: 7, now });
  assert.equal(r.stats.samplePnl, 9);
  assert.equal(r.stats.completeTrades, 0);
  assert.equal(r.stats.winRate, null);
  assert.equal(r.stats.partialTrades, 1);
  const empty = walletPerformance([], { days: 7, now });
  assert.equal(empty.stats.fills, 0);
  assert(empty.daily.every((d) => d.pnl === null));
  assert.throws(() => walletPerformance([], { days: 100, now }));
});
