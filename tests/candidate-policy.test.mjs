import test from "node:test";
import assert from "node:assert/strict";
import { candidatePolicy } from "../engine/candidate-policy.mjs";
const now = Date.now();
const qualified = () => ({
  performance: {
    updatedAt: now,
    stale: false,
    month: { days: 30, last: now, pnl: 1000 },
    allTime: { days: 100, last: now, pnl: 5000 },
  },
  updatedAt: now,
  positionsAt: now,
  positionsStale: false,
  risk: { mainEquity: 1000 },
  builderCoverage: [],
  coverage: { last: now - 1000 },
  stats: {
    completeTrades: 30,
    activeDays: 10,
    profitableDays: 8,
    winRate: 65,
    netPnl: 1000,
    profitFactor: 2,
    maxDrawdownUsd: 200,
  },
  copy: { score: 75, stress: [{ bps: 10, netPnl: 600 }] },
});
test("funded consistent recent trader qualifies", () =>
  assert.equal(candidatePolicy(qualified(), now).eligible, true));
test("zero main balance can qualify with fresh funded builder account", () => {
  const a = qualified();
  a.risk.mainEquity = 0;
  a.builderCoverage = [
    { available: true, stale: false, updatedAt: now, equity: 2000 },
  ];
  assert.equal(candidatePolicy(a, now).eligible, true);
});
test("empty and stale builder balances cannot qualify", () => {
  for (const equity of [0, null, undefined]) {
    const a = qualified();
    a.risk.mainEquity = 0;
    a.builderCoverage = [{ available: true, updatedAt: now, equity }];
    assert.equal(candidatePolicy(a, now).funded, false);
  }
  const a = qualified();
  a.risk.mainEquity = 0;
  a.builderCoverage = [
    { available: true, stale: true, updatedAt: now, equity: 5000 },
  ];
  assert.equal(candidatePolicy(a, now).eligible, false);
});
test("inactive, thin, high drawdown and cost-sensitive histories fail separately", () => {
  for (const change of [
    (a) => (a.coverage.last = now - 3 * 86400000),
    (a) => (a.stats.completeTrades = 19),
    (a) => (a.stats.activeDays = 6),
    (a) => (a.stats.maxDrawdownUsd = 600),
    (a) => (a.copy.stress[0].netPnl = -1),
    (a) => (a.positionsStale = true),
  ]) {
    const a = qualified();
    change(a);
    assert.equal(candidatePolicy(a, now).eligible, false);
    assert.ok(candidatePolicy(a, now).reasons.length);
  }
});

test("missing, losing, short and stale reported history excludes copy eligibility", () => {
  for (const change of [
    (a) => delete a.performance,
    (a) => (a.performance.month = null),
    (a) => (a.performance.month.pnl = 0),
    (a) => (a.performance.allTime.pnl = -1),
    (a) => (a.performance.month.days = 10),
    (a) => (a.performance.stale = true),
  ]) {
    const a = qualified();
    change(a);
    assert.equal(candidatePolicy(a, now).eligible, false);
  }
});
