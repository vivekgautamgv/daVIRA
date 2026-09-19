import test from "node:test";
import assert from "node:assert/strict";
import { flowInsights } from "../engine/flow-insights.mjs";
const wallet = (address, values = {}) => ({
  address,
  longIn: 0,
  longOut: 0,
  shortIn: 0,
  shortOut: 0,
  early: 10,
  late: 20,
  windowStart: 100,
  ...values,
});
test("fresh longs and short covering are distinguished inside buy volume", () => {
  const s = flowInsights([wallet("a", { longIn: 25, shortOut: 75 })], {
    duration: 86400000,
  });
  assert.equal(s.newLongBuyShare, 25);
  assert.equal(s.behavior, "Short covering");
  assert.equal(s.directional, 100);
});
test("concentration reveals when one wallet reverses the aggregate direction", () => {
  const s = flowInsights(
    [
      wallet("a", { longIn: 1000 }),
      wallet("b", { shortIn: 100 }),
      wallet("c", { shortIn: 100 }),
    ],
    { duration: 86400000 },
  );
  assert.equal(s.bullishWallets, 1);
  assert.equal(s.bearishWallets, 2);
  assert.equal(s.excludingLeader, -200);
  assert.equal(s.leaderChangesDirection, true);
  assert.equal(s.leader, "a");
  assert(s.leaderShare > 83);
});
test("pace ratios require a historical baseline and nonzero prior activity", () => {
  const wallets = [wallet("a"), wallet("b")];
  assert.equal(
    flowInsights(wallets, { duration: 86400000 }).acceleration,
    null,
  );
  const historyStart = new Map([
    ["a", 50],
    ["b", 80],
  ]);
  const s = flowInsights(wallets, { duration: 86400000, historyStart });
  assert.equal(s.acceleration, 2);
  assert.equal(s.halfWindowHours, 12);
  assert.equal(s.baselineCoverage, 100);
  assert.equal(
    flowInsights([wallet("a", { early: 0 })], {
      duration: 86400000,
      historyStart,
    }).acceleration,
    null,
  );
});
test("zero flow does not fabricate direction, concentration or agreement", () => {
  const s = flowInsights([], { duration: 3600000 });
  assert.equal(s.breadth, null);
  assert.equal(s.leaderShare, null);
  assert.equal(s.newLongBuyShare, null);
  assert.equal(s.leaderChangesDirection, false);
});
test("flat profitable round trips do not create a bearish wallet vote", () => {
  const s = flowInsights(
    [wallet("a", { longIn: 100, longOut: 110, positionDelta: "0" })],
    { duration: 3600000 },
  );
  assert.equal(s.bearishWallets, 0);
  assert.equal(s.bullishWallets, 0);
  assert.equal(s.directional, -10);
});
test("newly indexed wallets cannot inflate a sufficiently covered pace ratio", () => {
  const wallets = ["a", "b", "c"].map((a) => wallet(a));
  wallets.push(wallet("new", { early: 0, late: 10000 }));
  const historyStart = new Map([
    ["a", 50],
    ["b", 50],
    ["c", 50],
    ["new", 101],
  ]);
  const s = flowInsights(wallets, { duration: 86400000, historyStart });
  assert.equal(s.baselineCoverage, 75);
  assert.equal(s.acceleration, 2);
});
