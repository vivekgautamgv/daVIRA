import test from "node:test";
import assert from "node:assert/strict";
import {
  positioningBrief,
  compareMarket,
} from "../engine/positioning-brief.mjs";
import { flowInsights } from "../engine/flow-insights.mjs";
import { marketRead } from "../engine/market-read.mjs";
const now = 1800000000000;
test("short covering stays visible when track records cannot support a setup", () => {
  const w = {
    address: "a",
    coin: "BTC",
    longIn: 0,
    longOut: 0,
    shortIn: 0,
    shortOut: 100000,
    lastExecution: now,
  };
  const c = {
    ...w,
    inflow: 0,
    outflow: 100000,
    insight: flowInsights([w]),
    marketRead: marketRead([w], new Map(), now),
  };
  const b = positioningBrief(c, now);
  assert.equal(b.behavior, "Short covering");
  assert.equal(b.pressure, 100);
  assert.equal(b.readiness, "Evidence incomplete");
  assert.equal(b.exposure, "Exposure contracting");
  assert.equal(positioningBrief(c, now + 3 * 3600000).recent, false);
});
test("cached old fills cannot become fresh by rerunning analysis", () => {
  const r = marketRead(
    [
      {
        address: "a",
        coin: "BTC",
        longIn: 20000,
        shortIn: 0,
        longOut: 0,
        shortOut: 0,
        lastExecution: now,
      },
    ],
    new Map([
      [
        "a",
        {
          updatedAt: now,
          fillsFetchedAt: now - 7200000,
          coins: [
            {
              coin: "BTC",
              completeTrades: 20,
              activeDays: 5,
              score: 80,
              netPnl: 500,
            },
          ],
        },
      ],
    ]),
    now,
  );
  assert.equal(r.fresh, 0);
  assert.equal(r.qualified, 0);
  assert.equal(r.historicalQualified, 1);
});
test("OI compares contracts not inflated dollar valuations", () => {
  const c = { time: now, price: 110, oi: 10, funding: 0.0001 },
    base = { time: now - 3600000, price: 100, oi: 10 };
  const r = compareMarket(c, base, now, 3600000);
  assert.equal(r.status, "ready");
  assert.equal(r.oiChange, 0);
  assert.equal(r.regime, "Open interest steady");
  assert.equal(compareMarket(c, null, now, 3600000).status, "warming");
  assert.equal(
    compareMarket(c, { ...base, time: base.time - 1200000 }, now, 3600000)
      .status,
    "warming",
  );
  assert.equal(
    compareMarket(c, base, now + 180000, 3600000).status,
    "unavailable",
  );
  assert.equal(
    compareMarket({ ...c, time: now + 1000 }, base, now, 3600000).status,
    "unavailable",
  );
});
