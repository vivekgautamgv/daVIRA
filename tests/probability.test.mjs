import test from "node:test";
import assert from "node:assert/strict";
import {
  historicalProbability,
  sixMonthStart,
} from "../engine/probability-math.mjs";
const H = 3600000,
  now = Math.floor(Date.UTC(2026, 9, 4, 12) / (18 * H)) * 18 * H + H / 2;
const close = (time, pattern) => {
  const hour = Math.floor(time / H);
  if (pattern === "mixed") {
    const phase = ((hour % 18) + 18) % 18;
    return phase < 6
      ? 100 + (phase + 1) * 0.03
      : phase < 12
        ? 100 + (11 - phase) * 0.03
        : 100;
  }
  if (pattern === "moves") {
    const phase = ((hour % 48) + 48) % 48;
    const block = ((Math.floor(hour / 48) % 6) + 6) % 6;
    return phase === 11 ? 100 + [1, 2, 5, -1, -2, -5][block] : 100;
  }
  return 100;
};
function candles(pattern = "flat", at = now) {
  const result = [],
    start = Math.ceil(sixMonthStart(at) / H) * H,
    end = Math.floor(at / H) * H;
  for (let t = start; t < end; t += H) {
    const o = close(t - H, pattern),
      c = close(t, pattern);
    result.push({
      s: "ETH",
      i: "1h",
      t,
      T: t + H - 1,
      o,
      c,
      h: Math.max(o, c) + 0.01,
      l: Math.min(o, c) - 0.01,
    });
  }
  return result;
}
function flows(cs, observedAt) {
  return cs.flatMap((c) =>
    ["a", "b", "c"].map((address) => ({
      address,
      t: c.t,
      longIn: 10,
      longOut: 0,
      shortIn: 0,
      shortOut: 0,
      fills: 1,
      observedAt: observedAt ?? c.T,
    })),
  );
}
const inspect = (result, id = "price", hours = 6) =>
  result.models
    .find((model) => model.id === id)
    .horizons.find((horizon) => horizon.hours === hours);
const run = (candleInput, flowRows = [], extra = {}) =>
  historicalProbability({ coin: "ETH", candleInput, flowRows, now, ...extra });
test("six-month cutoff uses UTC calendar months, day clamp and preserved time", () => {
  assert.equal(
    new Date(
      sixMonthStart(Date.UTC(2026, 9, 4, 12, 34, 56, 789)),
    ).toISOString(),
    "2026-04-04T12:34:56.789Z",
  );
  assert.equal(
    new Date(sixMonthStart(Date.UTC(2026, 11, 31))).toISOString(),
    "2026-06-30T00:00:00.000Z",
  );
  assert.equal(
    new Date(sixMonthStart(Date.UTC(2024, 7, 31))).toISOString(),
    "2024-02-29T00:00:00.000Z",
  );
  assert.equal(
    new Date(sixMonthStart(Date.UTC(2025, 7, 31))).toISOString(),
    "2025-02-28T00:00:00.000Z",
  );
  assert.equal(sixMonthStart(NaN), null);
});
test("price-only fallback works without wallet activity and flat counts reconcile", () => {
  const result = run(candles());
  assert.equal(inspect(result, "wallet").status, "insufficient");
  assert.equal(
    result.models.find((model) => model.id === "wallet").current,
    null,
  );
  for (const hours of [6, 24]) {
    const horizon = inspect(result, "price", hours);
    assert.equal(horizon.status, "available");
    assert.equal(horizon.statistics.flat, 100);
    assert.equal(horizon.statistics.up, 0);
    assert.equal(horizon.statistics.down, 0);
    assert.equal(horizon.counts.flat, horizon.matches);
    assert.equal(horizon.statistics.median, 0);
    assert(
      horizon.statistics.upInterval[0] >= 0 &&
        horizon.statistics.upInterval[1] <= 100,
    );
  }
});
test("reference inputs, trend context and outcomes stay in-bound and never overlap", () => {
  const cs = candles(),
    result = run(cs, flows(cs));
  for (const model of result.models)
    for (const horizon of model.horizons) {
      assert(horizon.examples.length >= 30);
      assert.equal(horizon.matches, horizon.examples.length);
      assert.equal(
        horizon.days,
        new Set(
          horizon.examples.map((row) =>
            new Date(row.inputStart).toISOString().slice(0, 10),
          ),
        ).size,
      );
      for (const example of horizon.examples) {
        assert(example.inputStart >= result.historyStart);
        if (model.id === "price")
          assert(example.inputEnd - 20 * H >= result.historyStart);
        assert.equal(example.inputEnd - example.inputStart, 6 * H);
        assert.equal(example.outcomeEnd - example.inputEnd, horizon.hours * H);
        assert(example.outcomeEnd <= model.current.start);
        assert.equal(example.entryPrice, 100);
        assert.equal(example.exitPrice, 100);
      }
      for (let i = 1; i < horizon.examples.length; i++)
        assert(
          horizon.examples[i].outcomeEnd <= horizon.examples[i - 1].inputStart,
        );
    }
});
test("out-of-range and future records cannot influence any model", () => {
  const cs = candles(),
    fs = flows(cs),
    original = run(cs, fs);
  const old = {
    ...cs[0],
    t: Math.floor(original.historyStart / H) * H - H,
    T: Math.floor(original.historyStart / H) * H - 1,
    c: 300,
    h: 301,
  };
  const future = {
    ...cs[0],
    t: original.historyEnd,
    T: original.historyEnd + H - 1,
    c: 300,
    h: 301,
  };
  const foreign = { ...cs[100], s: "BTC", c: 500, h: 501 };
  const altered = run(
    [...cs, old, future, foreign],
    [
      ...fs,
      { ...fs[0], t: old.t, observedAt: now },
      { ...fs[0], t: future.t, observedAt: now + H, longIn: 1e12 },
    ],
  );
  assert.deepEqual(altered, original);
});
test("stale current data withholds probabilities while retaining dated examples", () => {
  const cs = candles(),
    result = run(cs, flows(cs), { priceStale: true });
  for (const model of result.models)
    for (const horizon of model.horizons) {
      assert.equal(horizon.status, "stale");
      assert.equal(horizon.statistics, null);
      assert(horizon.examples.length >= 30);
    }
  const missingLast = run(cs.slice(0, -1));
  assert.equal(inspect(missingLast).status, "stale");
  assert.equal(inspect(missingLast).statistics, null);
  assert(
    missingLast.models.find((m) => m.id === "price").current.end <
      missingLast.historyEnd,
  );
});
test("all three outcome classes and fixed move thresholds reconcile with dated evidence", () => {
  const mixed = inspect(run(candles("mixed")));
  assert.equal(mixed.status, "available");
  assert(mixed.counts.up > 0 && mixed.counts.down > 0 && mixed.counts.flat > 0);
  assert.equal(
    mixed.counts.up + mixed.counts.down + mixed.counts.flat,
    mixed.matches,
  );
  assert(
    Math.abs(
      mixed.statistics.up + mixed.statistics.down + mixed.statistics.flat - 100,
    ) < 1e-10,
  );
  const moveNow = Math.floor(now / (48 * H)) * 48 * H + H / 2;
  const moves = inspect(run(candles("moves", moveNow), [], { now: moveNow }));
  assert.equal(moves.status, "available");
  const thresholds = moves.statistics.moveThresholds;
  assert.deepEqual(
    thresholds.map((row) => row.thresholdPct),
    [1, 2, 5],
  );
  assert(thresholds.at(-1).up > 0 && thresholds.at(-1).down > 0);
  for (let i = 0; i < thresholds.length; i++) {
    const threshold = thresholds[i];
    assert.equal(
      threshold.up,
      (100 *
        moves.examples.filter(
          (row) => row.returnPct >= threshold.thresholdPct - 1e-10,
        ).length) /
        moves.matches,
    );
    assert.equal(
      threshold.down,
      (100 *
        moves.examples.filter(
          (row) => row.returnPct <= -threshold.thresholdPct + 1e-10,
        ).length) /
        moves.matches,
    );
    if (i)
      assert(
        thresholds[i - 1].up >= threshold.up &&
          thresholds[i - 1].down >= threshold.down,
      );
  }
});
test("walk-forward validation cannot use wallet rows collected after a past forecast", () => {
  const cs = candles();
  const known = run(cs, flows(cs));
  const late = run(cs, flows(cs, now));
  const historical = inspect(known, "wallet");
  const backfilled = inspect(late, "wallet");
  assert.equal(historical.validation.status, "evaluated");
  assert(historical.validation.forecasts >= 30);
  assert.equal(historical.validation.brier, 0);
  assert.equal(historical.validation.baselineBrier, 0);
  assert.equal(historical.validation.skillPct, null);
  assert.equal(backfilled.status, "available");
  assert.equal(backfilled.matches, historical.matches);
  assert.equal(backfilled.validation.status, "insufficient");
  assert.equal(backfilled.validation.forecasts, 0);
  assert.equal(backfilled.validation.brier, null);
  const futureObserved = run(cs, flows(cs, now + 1));
  assert.equal(inspect(futureObserved, "wallet").matches, 0);
});
test("missing candles and thin, invalid wallet inputs withhold unsupported statistics", () => {
  const cs = candles(),
    gap = cs.at(-3).t;
  const missingPrice = run([], flows(cs));
  assert.equal(
    missingPrice.models.find((m) => m.id === "wallet").coverage.hours,
    0,
  );
  const onePrice = run([cs.at(-1)], flows(cs));
  assert.equal(
    onePrice.models.find((m) => m.id === "wallet").coverage.hours,
    1,
  );
  const broken = run(cs.filter((c) => c.t !== gap));
  assert.equal(inspect(broken).status, "insufficient");
  assert.equal(inspect(broken).statistics, null);
  const twoWallets = run(
    cs,
    flows(cs).filter((row) => row.address !== "c"),
  );
  assert.equal(inspect(twoWallets, "wallet").statistics, null);
  const malformed = run(cs, [
    {
      address: "a",
      t: now - H,
      fills: 10,
      longIn: Infinity,
      longOut: 0,
      shortIn: 0,
      shortOut: 0,
      observedAt: now,
    },
  ]);
  assert.equal(inspect(malformed, "wallet").matches, 0);
  assert.equal(inspect(run(cs.slice(-30))).statistics, null);
});
test("a sufficiently deep historical baseline stays visible when current conditions have no matches", () => {
  const cs = candles();
  cs[cs.length - 1] = { ...cs.at(-1), c: 110, h: 111 };
  const h = inspect(run(cs));
  assert.equal(h.status, "insufficient");
  assert.equal(h.matches, 0);
  assert.equal(h.statistics, null);
  assert(h.baseline.samples >= 30);
  assert(h.baseline.days >= 14);
  assert.equal(h.baseline.samples, h.eligible);
  assert.deepEqual(h.baseline.statistics, { up: 0, down: 0, flat: 100 });
  assert.equal(inspect(run(cs.slice(-30))).baseline.statistics, null);
});
