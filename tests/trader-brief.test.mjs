import test from "node:test";
import assert from "node:assert/strict";
import {
  completedFlowComparison,
  traderBrief,
} from "../engine/trader-brief.mjs";
import { decisionBrief } from "../engine/decision-brief.mjs";
const H = 3600000,
  end = Date.parse("2026-10-04T12:00:00Z"),
  now = end + H / 2;
function fixture() {
  const candles = Array.from({ length: 12 }, (_, i) => {
    const t = end - (12 - i) * H;
    return {
      s: "ETH",
      i: "1h",
      t,
      T: t + H - 1,
      o: 100,
      h: 102,
      l: 98,
      c: 101,
    };
  });
  const records = candles.flatMap((c, i) =>
    [0, 1, 2].map((j) => ({
      address: `wallet-${j}`,
      fill: {
        coin: "ETH",
        time: c.t + 100,
        tid: i * 3 + j,
        px: 100,
        sz: 1,
        startPosition: 0,
        side: i < 6 ? "A" : "B",
        dir: i < 6 ? "Open Short" : "Open Long",
      },
    })),
  );
  return { records, candles };
}
test("completed-period comparison excludes partial current hours and preserves exact aligned dates", () => {
  const { records, candles } = fixture();
  records.push({
    ...records[0],
    fill: { ...records[0].fill, time: end + 100, tid: 100, sz: 100000 },
  });
  const result = completedFlowComparison(records, candles, "ETH", now);
  assert.equal(result.previous.end, result.current.start);
  assert.equal(result.current.end, end);
  assert.equal(result.current.netBuy, 1800);
  assert.equal(result.previous.netBuy, -1800);
  assert.equal(result.current.observedHours, 6);
  assert.equal(result.current.wallets, 3);
  assert(result.comparable);
  assert.equal(result.delta, 3600);
  assert(result.description.includes("switched"));
  assert(Math.abs(result.current.priceChange - 1) < 1e-10);
  assert(result.priceResponse.includes("same direction"));
  candles.forEach((c) => (c.c = 100));
  assert(
    completedFlowComparison(
      records,
      candles,
      "ETH",
      now,
    ).priceResponse.includes("less than 0.25%"),
  );
});
test("sparse activity and candle gaps do not become confident changes or invented prices", () => {
  const { records, candles } = fixture();
  const sparse = completedFlowComparison(
    records.slice(-3),
    candles.slice(0, -1),
    "ETH",
    now,
  );
  assert.equal(sparse.previous.netBuy, null);
  assert.equal(sparse.current.observedHours, 1);
  assert.equal(sparse.current.priceChange, null);
  assert.equal(sparse.delta, null);
  assert.equal(sparse.comparable, false);
  assert.equal(sparse.priceResponse, null);
  const duplicates = completedFlowComparison(
    [...records, ...records],
    candles,
    "ETH",
    now,
  );
  assert.equal(duplicates.current.fills, 18);
});
function lens() {
  const rows = [
    {
      address: "leader",
      activity: { notional: 140, netBuy: 100, fills: 12, last: now - 1000 },
      positionState: "Unavailable",
      token: { completeTrades: 0, netPnl: 0 },
    },
    {
      address: "seller",
      activity: { notional: 80, netBuy: -40, fills: 12, last: now - 1000 },
      positionState: "Flat",
      token: { completeTrades: 3, netPnl: -15 },
    },
  ];
  const data = {
    coin: "ETH",
    window: "24h",
    start: now - 24 * H,
    end: now,
    updatedAt: now,
    windows: [
      { label: "24h", longIn: 120, longOut: 20, shortIn: 60, shortOut: 20 },
    ],
    rows,
    positioning: {
      long: 0,
      short: 0,
      longWallets: 0,
      shortWallets: 0,
      flatWallets: 1,
      unavailable: 1,
    },
    coverage: {
      first: now - 20 * 24 * H,
      last: now - 1000,
      freshTokenAnalyses: 2,
    },
    technical: {
      at: end - 1,
      price: 101,
      sma20: 100,
      support: 98,
      resistance: 102,
    },
    priceStale: false,
    priceError: null,
    probability: {
      models: [
        {
          id: "price",
          horizons: [
            {
              hours: 6,
              status: "insufficient",
              matches: 3,
              statistics: { up: 99 },
            },
          ],
        },
      ],
    },
  };
  data.decision = decisionBrief(data);
  return data;
}
test("a fragile buying case exposes contrary contributors and incomplete position coverage", () => {
  const d = lens(),
    brief = traderBrief(d, {});
  assert(brief.support.some((f) => f.value === 60));
  assert(brief.challenges.some((f) => f.value === -40));
  assert.equal(brief.knownPositions, 1);
  assert.equal(brief.totalPositions, 2);
  assert.equal(brief.bullish[1].state, "pending");
  assert.equal(brief.bullish[2].state, "met");
  assert.equal(brief.bearish[2].state, "pending");
  assert.equal(brief.wallets[0].tokenPnl, null);
  assert.equal(brief.wallets[1].tokenPnl, -15);
  assert.equal(brief.history[0].statistics, null);
});
test("stale or missing current price context cannot satisfy either scenario", () => {
  const d = lens();
  d.priceStale = true;
  let brief = traderBrief(d, {});
  assert.equal(brief.price, null);
  assert.equal(brief.bullish[2].state, "unknown");
  d.probability.source = { completedHistoryCurrent: true };
  assert(traderBrief(d, {}).price);
  d.technical.at -= H;
  assert.equal(traderBrief(d, {}).price, null);
});
