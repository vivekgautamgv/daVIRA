import test from "node:test";
import assert from "node:assert/strict";
import {
  tokenTimeline,
  historicalAnalogues,
  cleanCandles,
  executionSeries,
} from "../engine/token-desk-math.mjs";
const H = 3600000,
  now = Math.floor(1800000000000 / H) * H + H / 2;
const candle = (t, c = 100) => ({
  t,
  T: t + H - 1,
  s: "ETH",
  i: "1h",
  o: 100,
  h: Math.max(102, c),
  l: 98,
  c,
});
const fill = (time, side = "B", start = "0", sz = "1") => ({
  coin: "ETH",
  time,
  tid: time,
  side,
  startPosition: start,
  sz,
  px: "100",
  closedPnl: "0",
  fee: "0",
  dir: "Open Long",
});
test("chart conserves reversal flows, deduplicates by wallet and never fills absent prices", () => {
  const t = Math.floor(now / H) * H - H,
    r = { address: "a", fill: fill(t + 100, "A", "1", "2") };
  const d = tokenTimeline(
    [
      r,
      r,
      { address: "b", fill: r.fill },
      { address: "a", fill: fill(now + 1) },
    ],
    [candle(t), candle(t + H)],
    "ETH",
    "24h",
    now,
  );
  const row = d.series.find((b) => b.t === t);
  assert.equal(row.inflow, 200);
  assert.equal(row.outflow, -200);
  assert.equal(row.netBuy, -400);
  assert.equal(row.fills, 2);
  assert.equal(row.price, 100);
  assert.equal(d.series.at(-1).price, null);
  assert.equal(d.series[0].inflow, null);
  assert.equal(d.feed.length, 2);
  const six = d.windows.find((w) => w.label === "6h");
  assert.equal(six.longOut, 200);
  assert.equal(six.shortIn, 200);
  assert.equal(six.netBuy, -400);
  assert.equal(six.wallets, 2);
  assert.equal(six.topShare, 0.5);
  assert.equal(d.windows[0].fills, 0);
  assert.equal(d.activity.a.fills, 1);
  assert.equal(d.activity.a.netBuy, -200);
});
test("only selected coin and completed valid candles reach indicators", () => {
  const end = Math.floor(now / H) * H,
    cs = Array.from({ length: 21 }, (_, j) => candle(end - (21 - j) * H));
  const d = tokenTimeline([], cs, "ETH", "24h", now);
  assert.equal(d.technical.rsi14, 50);
  assert.equal(d.technical.atr14, 4);
  assert.equal(d.technical.sma20, 100);
  cs[10].s = "BTC";
  assert.equal(tokenTimeline([], cs, "ETH", "24h", now).technical, null);
  assert.equal(cleanCandles([candle(end)], "ETH", now).size, 0);
});
test("partial first chart bucket excludes executions outside the rolling window", () => {
  const start = now - 24 * H,
    records = [
      { address: "a", fill: fill(start - 1) },
      { address: "a", fill: fill(start + 1) },
    ];
  const d = tokenTimeline(records, [], "ETH", "24h", now);
  assert.equal(d.series[0].inflow, 100);
  assert.equal(d.feed.length, 1);
  assert.equal(d.series[0].partial, true);
  assert.equal(d.analogues.statistics, null);
});

test("six-hour intelligence aligns price and flow only on complete continuous candles", () => {
  const end = Math.floor(now / H) * H,
    cs = Array.from({ length: 6 }, (_, j) => candle(end - (6 - j) * H, 102)),
    rs = [
      { address: "partial-first", fill: fill(now - 6 * H + 1) },
      { address: "matched", fill: fill(end - H + 1) },
      { address: "live-hour", fill: fill(end + 1) },
    ];
  const d = tokenTimeline(rs, cs, "ETH", "6h", now),
    w = d.windows.find((w) => w.label === "6h");
  assert.equal(d.window, "6h");
  assert.equal(d.activity["partial-first"].fills, 1);
  assert.equal(d.activity["live-hour"].fills, 1);
  assert.equal(w.fills, 3);
  assert.equal(w.priceContext.completedHours, 5);
  assert.equal(w.priceContext.fills, 1);
  assert.equal(w.priceContext.netBuy, 100);
  assert.equal(w.priceContext.start, end - 5 * H);
  assert.equal(w.priceContext.end, end);
  assert(Math.abs(w.priceContext.priceChange - 2) < 1e-10);
  assert.equal(
    tokenTimeline(rs, cs.slice(0, 3), "ETH", "6h", now).windows[1].priceContext,
    null,
  );
});
test("analogue windows are separated, exclude future outcomes and require sufficient history", () => {
  const end = Math.floor(now / H) * H,
    cs = [],
    rs = [];
  for (let t = end - 30 * 24 * H; t < end; t += H) {
    cs.push(candle(t));
    for (let a = 0; a < 3; a++)
      rs.push({ address: String(a), fill: fill(t + 100 + a) });
  }
  const { buckets } = executionSeries(rs, "ETH", now),
    a = historicalAnalogues(buckets, cleanCandles(cs, "ETH", now), now);
  assert.equal(a.status, "descriptive");
  assert(a.samples >= 30);
  assert.equal(a.statistics.flat, 100);
  assert.equal(a.statistics.up, 0);
  assert.equal(a.statistics.median, 0);
  assert(a.examples.every((e) => e.time + 6 * H <= a.current.start));
  for (let j = 1; j < a.examples.length; j++)
    assert(a.examples[j - 1].time - a.examples[j].time >= 12 * H);
  const thin = historicalAnalogues(
    new Map([...buckets].filter(([t]) => t > end - 4 * 24 * H)),
    cleanCandles(cs, "ETH", now),
    now,
  );
  assert.equal(thin.statistics, null);
  assert.equal(thin.status, "insufficient");
});
