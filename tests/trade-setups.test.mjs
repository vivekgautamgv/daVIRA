import test from "node:test";
import assert from "node:assert/strict";
import { buildTradeSetup } from "../engine/trade-setups.mjs";
import { sizeTrade } from "../lib/trade-risk.mjs";
const now = Date.parse("2026-09-24T12:10:00Z"),
  hour = 3600000;
const risk = {
  equity: 10000,
  riskPct: 0.5,
  dailyLimitPct: 2,
  dailyLoss: 0,
  totalRiskPct: 3,
  openRisk: 0,
  allocationPct: 100,
  feeBps: 5,
  slippageBps: 10,
};
function sample(side = "long") {
  const sign = side === "long" ? 1 : -1;
  const data = Array.from({ length: 30 }, (_, i) => {
    const c = 100 + sign * i * 0.05,
      t = Math.floor(now / hour) * hour - (30 - i) * hour;
    return {
      t,
      T: t + hour - 1,
      o: c - sign * 0.03,
      h: c + 0.25,
      l: c - 0.25,
      c,
      i: "1h",
      s: "BTC",
    };
  });
  return {
    coin: "BTC",
    now,
    read: {
      action: side === "long" ? "Long bias" : "Short bias",
      score: side === "long" ? 85 : 15,
      reasons: [],
    },
    quote: {
      data: [{ coin: "BTC", price: data.at(-1).c }],
      updatedAt: now,
      stale: false,
    },
    history: { data, updatedAt: now, stale: false },
  };
}
test("qualified long and short scenarios have symmetric stop and target geometry", () => {
  for (const side of ["long", "short"]) {
    const p = buildTradeSetup(sample(side)),
      sign = side === "long" ? 1 : -1;
    assert.equal(p.status, "candidate");
    assert(p.levels.distance >= 1.5 * p.levels.atr);
    assert(sign * (p.levels.entry - p.levels.stop) > 0);
    p.levels.targets.forEach((t) =>
      assert(
        Math.abs(
          (sign * (t.price - p.levels.entry)) / p.levels.distance - t.r,
        ) < 1e-10,
      ),
    );
    assert(p.expiresAt <= now + 120000);
  }
});
test("an unfinished extreme candle cannot influence the stop", () => {
  const x = sample(),
    expected = buildTradeSetup(x).levels;
  x.history.data.push({
    ...x.history.data.at(-1),
    t: Math.floor(now / hour) * hour,
    T: Math.floor(now / hour) * hour + hour - 1,
    h: 10000,
    l: 0.01,
  });
  assert.deepEqual(buildTradeSetup(x).levels, expected);
});
test("neutral, insufficient, stale, malformed and gapped evidence never emits levels", () => {
  const changes = [
    (x) => (x.read.action = "Hold / neutral"),
    (x) => x.read.reasons.push("One wallet dominates"),
    (x) => (x.quote.stale = true),
    (x) => (x.quote.updatedAt = now - 120001),
    (x) => (x.history.updatedAt = now - 120001),
    (x) => (x.history.stale = true),
    (x) => x.history.data.pop(),
    (x) => (x.history.data[20].c = NaN),
    (x) => (x.history.data[20].l = -1),
    (x) => (x.history.data[20].t += 1),
    (x) => (x.history.data[20].s = "ETH"),
    (x) => (x.history.data[20].i = "4h"),
    (x) =>
      x.history.data.forEach((c) => {
        c.t -= 2 * hour;
        c.T -= 2 * hour;
      }),
    (x) => (x.quote.data[0].price *= 1.1),
    (x) => (x.read.action = "Short bias"),
  ];
  for (const change of changes) {
    const x = sample();
    change(x);
    const p = buildTradeSetup(x);
    assert.equal(p.status, "wait");
    assert.equal(p.levels, null);
    assert(p.reasons.length > 0);
  }
});
test("too-wide stops and unsupported markets are withheld", () => {
  const x = sample();
  x.history.data[20].l = 80;
  assert(buildTradeSetup(x).reasons.some((r) => r.includes("8%")));
  x.coin = "xyz:TSLA";
  assert.equal(buildTradeSetup(x).levels, null);
});
test("size respects loss budgets including both legs of costs", () => {
  for (const side of ["long", "short"]) {
    const p = buildTradeSetup(sample(side)),
      s = sizeTrade(p.levels, side, risk);
    assert.equal(s.errors.length, 0);
    assert(s.risk <= (risk.equity * risk.riskPct) / 100 + 1e-8);
    const independentlyComputedLoss =
      s.quantity *
      (Math.abs(p.levels.entry - p.levels.stop) +
        (p.levels.entry + p.levels.stop) * 0.0015);
    assert(Math.abs(s.risk - independentlyComputedLoss) < 1e-8);
    assert(s.targets[0].netR < 1);
    assert(s.targets[1].netR < 2);
  }
});
test("daily and aggregate risk limits reduce size, exhaustion blocks sizing", () => {
  const p = buildTradeSetup(sample());
  assert(
    Math.abs(
      sizeTrade(p.levels, "long", { ...risk, dailyLoss: 190 }).risk - 10,
    ) < 1e-8,
  );
  assert(
    Math.abs(sizeTrade(p.levels, "long", { ...risk, openRisk: 295 }).risk - 5) <
      1e-8,
  );
  for (const change of [{ dailyLoss: 200 }, { openRisk: 300 }])
    assert.equal(
      sizeTrade(p.levels, "long", { ...risk, ...change }).quantity,
      0,
    );
});
test("allocation caps include entry costs and invalid inputs cannot create a size", () => {
  const p = buildTradeSetup(sample()),
    s = sizeTrade(p.levels, "long", { ...risk, allocationPct: 1 });
  assert(s.allocationLimited);
  assert(s.notional * 1.0015 <= 100 + 1e-8);
  for (const change of [
    { equity: NaN },
    { equity: 0 },
    { riskPct: -1 },
    { allocationPct: 101 },
    { feeBps: -2 },
    { dailyLoss: NaN },
    { slippageBps: Infinity },
  ])
    assert(sizeTrade(p.levels, "long", { ...risk, ...change }).errors.length);
  assert(sizeTrade(null, "long", risk).errors.length);
  assert(
    sizeTrade({ ...p.levels, stop: p.levels.entry + 1 }, "long", risk).errors
      .length,
  );
});
