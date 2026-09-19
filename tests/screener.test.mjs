import test from "node:test";
import assert from "node:assert/strict";
import {
  executionFlow,
  reconstructEpisodes,
  analyzeExecutions,
  instrumentClass,
  isRwa,
} from "../engine/screener-math.mjs";
const now = Date.UTC(2026, 8, 16);
let tid = 0;
const fill = (start, size, side, pnl = 0, fee = 1, time = now - 3600000) => ({
  coin: "BTC",
  startPosition: String(start),
  sz: String(size),
  side,
  px: "100",
  closedPnl: String(pnl),
  fee: String(fee),
  time,
  tid: ++tid,
  dir: "Trade",
  crossed: true,
});
test("flows split reversal notional and conserve executed value", () => {
  assert.deepEqual(executionFlow(fill(2, 5, "A")), {
    longIn: 0,
    longOut: 200,
    shortIn: 300,
    shortOut: 0,
    buy: 0,
    sell: 500,
  });
  for (const before of [-5, -1, 0, 1, 5])
    for (const size of [0.25, 1, 7])
      for (const side of ["A", "B"]) {
        const x = executionFlow(fill(before, size, side));
        assert.equal(x.longIn + x.longOut + x.shortIn + x.shortOut, size * 100);
        assert.equal(
          x.longIn + x.shortOut - x.shortIn - x.longOut,
          x.buy - x.sell,
        );
      }
});
test("unknown starting positions and spot executions never become position inflows", () => {
  for (const f of [
    { ...fill(0, 1, "B"), startPosition: undefined },
    { ...fill(0, 1, "B"), coin: "@1" },
    { ...fill(0, 1, "B"), dir: "Buy" },
    { ...fill(0, 1, "B"), side: "unknown" },
  ])
    assert.equal(executionFlow(f), null);
});
test("partial exits count as one complete episode and duplicates do not inflate PnL", () => {
  const a = fill(0, 2, "B", 0, 1, now - 7200000),
    b = fill(2, 1, "A", 10, 1, now - 3600000),
    c = fill(1, 1, "A", 20, 1, now);
  const result = reconstructEpisodes([c, a, b, b]);
  assert.equal(result.closed.length, 1);
  assert.equal(result.closed[0].netPnl, 27);
  assert.equal(result.closed[0].turnover, 400);
  assert.equal(result.closed[0].holdMs, 7200000);
  assert.equal(result.closed[0].complete, true);
});
test("reversal fees belong proportionally to the closing and new episodes", () => {
  const r = reconstructEpisodes([
    fill(0, 2, "B", 0, 2, now - 3),
    fill(2, 5, "A", 20, 5, now - 2),
    fill(-3, 3, "B", 30, 3, now - 1),
  ]);
  assert.deepEqual(
    r.closed.map((e) => e.netPnl),
    [16, 24],
  );
  assert.equal(
    r.closed.reduce((n, e) => n + e.fees, 0),
    10,
  );
  assert.equal(
    r.closed.reduce((n, e) => n + e.turnover, 0),
    1000,
  );
  assert.deepEqual(
    r.closed.map((e) => e.direction),
    [1, -1],
  );
});
test("same-millisecond fills use position continuity instead of random trade ID order", () => {
  const a = fill(0, 2, "B", 0, 1, now - 1000),
    b = fill(2, 3, "B", 0, 1, now - 1000),
    c = fill(5, 1, "B", 0, 1, now - 1000),
    d = fill(6, 6, "A", 60, 1, now);
  const r = reconstructEpisodes([c, a, b, d]);
  assert.equal(r.gaps, 0);
  assert.equal(r.closed.length, 1);
  assert.equal(r.closed[0].complete, true);
  assert.equal(r.closed[0].netPnl, 56);
});
test("ambiguous same-time round trips are excluded from quality evidence", () => {
  const r = reconstructEpisodes([
    fill(0, 1, "B", 0, 1, now),
    fill(1, 1, "A", 10, 1, now),
    fill(0, 1, "B", 0, 1, now),
    fill(1, 1, "A", 10, 1, now),
  ]);
  assert(r.closed.every((e) => !e.complete));
});
test("missing opening and position discontinuities cannot generate quality scores", () => {
  const r = analyzeExecutions(
    [
      fill(4, 4, "A", 900, 1, now - 4),
      fill(0, 2, "B", 0, 1, now - 3),
      fill(1, 1, "A", 900, 1, now - 2),
    ],
    [],
    now,
  );
  assert.equal(r.stats.completeTrades, 0);
  assert.equal(r.stats.partialTrades, 2);
  assert.equal(r.coverage.gaps, 1);
  assert.equal(r.stats.score, null);
  assert.equal(r.copy.score, null);
  assert.equal(r.stats.winRate, null);
});
test("quality requires five complete episodes and copy stress charges every execution notional", () => {
  const fills = [];
  for (let i = 0; i < 5; i++)
    fills.push(
      fill(0, 1, "B", 0, 1, now - (i + 1) * 86400000),
      fill(1, 1, "A", 10, 1, now - (i + 1) * 86400000 + 3600000),
    );
  assert.equal(analyzeExecutions(fills.slice(0, 8), [], now).stats.score, null);
  const a = analyzeExecutions(fills, [], now);
  assert.equal(a.stats.completeTrades, 5);
  assert.equal(a.stats.netPnl, 40);
  assert.equal(a.stats.winRate, 100);
  assert(a.stats.score >= 0 && a.stats.score <= 100);
  assert.equal(a.copy.stress.find((s) => s.bps === 10).netPnl, 39);
  assert.equal(a.coins[0].score, a.stats.score);
});
test("RWA underlying exposure is distinct from RWA governance tokens and unknown builders", () => {
  assert.equal(instrumentClass("xyz:TSLA"), "Equity");
  assert.equal(instrumentClass("xyz:GOLD"), "Commodity");
  assert.equal(isRwa("xyz:XYZ100"), true);
  assert.equal(isRwa("ONDO"), false);
  assert.equal(instrumentClass("PENDLE"), "Crypto");
  assert.equal(instrumentClass("xyz:UNKNOWN"), "Builder / unclassified");
});

 test("token scores do not borrow profitable episodes from other tokens", () => {
  const fills = [];
  for (let i=0;i<6;i++) {
    const t=now-(10-i)*86400000;
    fills.push({...fill(0,1,"B",0,0,t), coin:"BTC"}, {...fill(1,1,"A",10,0,t+3600000), coin:"BTC"});
    fills.push({...fill(0,1,"B",0,0,t), coin:"ETH"}, {...fill(1,1,"A",-5,0,t+3600000), coin:"ETH"});
  }
  const a=analyzeExecutions(fills, [], now);
  const btc=a.coins.find(c=>c.coin==="BTC"), eth=a.coins.find(c=>c.coin==="ETH");
  assert.equal(btc.netPnl,60); assert.equal(eth.netPnl,-30);
  assert.equal(btc.winRate,100); assert.equal(eth.winRate,0);
  assert.ok(btc.score>eth.score); assert.equal(btc.activeDays,6);
});
