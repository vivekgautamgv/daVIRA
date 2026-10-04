import test from "node:test";
import assert from "node:assert/strict";
import { decisionBrief } from "../engine/decision-brief.mjs";
const end = 1_800_000_000_000;
const near = (actual, expected) => assert(Math.abs(actual - expected) < 1e-10);
const row = (address, notional, netBuy, extra = {}) => ({
  address,
  name: address,
  activity: { notional, netBuy, fills: 1, last: end - 1000 },
  ...extra,
});
const data = (parts, rows, extra = {}) => ({
  coin: "ETH",
  window: "24h",
  start: end - 24 * 3600000,
  end,
  windows: [{ label: "24h", ...parts }],
  rows,
  positioning: { long: 200, short: 300, unavailable: 0 },
  coverage: {
    first: end - 30 * 86400000,
    last: end - 1000,
    freshTokenAnalyses: rows.length,
  },
  ...extra,
});
test("execution composition conserves dollars and exclusion flips a dominant buyer", () => {
  const brief = decisionBrief(
    data({ longIn: 120, shortOut: 20, shortIn: 60, longOut: 20 }, [
      row("leader", 140, 100),
      row("rest", 80, -40),
    ]),
  );
  assert.equal(brief.metrics.netBuy, 60);
  assert.equal(brief.metrics.grossActivity, 220);
  near(brief.metrics.buySharePct, (100 * 140) / 220);
  near(brief.metrics.coveringSharePct, (100 * 20) / 140);
  assert.equal(brief.metrics.excludingLeader, -40);
  near(brief.metrics.leaderSharePct, (100 * 140) / 220);
  near(
    brief.metrics.effectiveWallets,
    1 / ((140 / 220) ** 2 + (80 / 220) ** 2),
  );
  assert.equal(brief.tone, "mixed");
  assert(
    brief.observations.some(
      (o) => o.id === "concentration" && o.wallet.address === "leader",
    ),
  );
  assert(
    brief.observations.some(
      (o) => o.id === "held-exposure" && o.title.includes("differs"),
    ),
  );
});
test("a dominant seller can disagree with a majority of buyers", () => {
  const rows = [
    row("seller", 100, -100),
    ...Array.from({ length: 4 }, (_, i) => row(`buyer${i}`, 20, 20)),
  ];
  const brief = decisionBrief(
    data({ longIn: 80, shortOut: 0, shortIn: 100, longOut: 0 }, rows),
  );
  assert.equal(brief.metrics.netBuy, -20);
  assert.equal(brief.metrics.bullishWallets, 4);
  assert.equal(brief.metrics.bearishWallets, 1);
  assert.equal(brief.metrics.breadthPct, 80);
  assert.equal(brief.metrics.excludingLeader, 80);
  assert(
    brief.observations.some((o) => o.id === "breadth" && o.tone === "mixed"),
  );
});
test("largest net contributor differs from a high-turnover flat wallet", () => {
  const brief = decisionBrief(
    data({ longIn: 590, shortOut: 0, shortIn: 510, longOut: 0 }, [
      row("churn", 900, 0),
      row("buyer", 140, 140),
      row("seller", 60, -60),
    ]),
  );
  assert.equal(brief.metrics.netBuy, 80);
  assert.equal(brief.metrics.excludingLeader, 80);
  assert.equal(brief.metrics.excludingNetLeader, -60);
  assert.equal(brief.metrics.netLeader.address, "buyer");
  const partial = decisionBrief(
    data({ longIn: 590, shortOut: 0, shortIn: 510, longOut: 0 }, [
      row("buyer", 140, 140),
    ]),
  );
  assert.equal(partial.metrics.excludingNetLeader, null);
});
test("covering-heavy buying is identified separately from fresh long entries", () => {
  const brief = decisionBrief(
    data({ longIn: 10, shortOut: 90, shortIn: 60, longOut: 0 }, [
      row("a", 160, 40),
    ]),
  );
  assert.equal(brief.metrics.coveringSharePct, 90);
  const exit = brief.observations.find((o) => o.id === "exit-driven");
  assert(exit.text.includes("Fresh entries"));
  assert.equal(exit.evidence.at(-1).value, -50);
  assert(brief.watchFor.some((text) => text.includes("fresh entries")));
});
test("overlapping rolling windows and opposing price are descriptive", () => {
  const windows = [
    { label: "1h", longIn: 50, longOut: 0, shortIn: 0, shortOut: 0, fills: 4 },
    {
      label: "6h",
      longIn: 50,
      longOut: 0,
      shortIn: 150,
      shortOut: 0,
      fills: 10,
    },
    {
      label: "24h",
      longIn: 250,
      longOut: 0,
      shortIn: 150,
      shortOut: 0,
      fills: 20,
      priceChange: -2,
      priceContext: {
        start: end - 23 * 3600000,
        end,
        completedHours: 23,
        priceChange: -2,
        netBuy: 100,
        grossActivity: 400,
      },
    },
  ];
  const brief = decisionBrief(data({}, [row("a", 400, 100)], { windows }));
  assert(
    brief.observations.some(
      (o) => o.id === "window-change" && o.title.includes("differs"),
    ),
  );
  assert(
    brief.observations.some(
      (o) => o.id === "price-response" && o.title.includes("against"),
    ),
  );
  const stale = decisionBrief(
    data({}, [row("a", 400, 100)], { windows, priceStale: true }),
  );
  assert(!stale.observations.some((o) => o.id === "price-response"));
  assert(stale.limitations.some((text) => text.includes("price-response")));
  const missing = decisionBrief(
    data({}, [row("a", 400, 100)], {
      windows: windows.map(({ priceContext, ...w }) => w),
    }),
  );
  assert(!missing.observations.some((o) => o.id === "price-response"));
  const future = decisionBrief(
    data({}, [row("a", 400, 100)], {
      windows: windows.map((w) =>
        w.priceContext
          ? {
              ...w,
              priceContext: {
                ...w.priceContext,
                start: end - 22 * 3600000,
                end: end + 3600000,
              },
            }
          : w,
      ),
    }),
  );
  assert(!future.observations.some((o) => o.id === "price-response"));
  const differentAlignedDirection = decisionBrief(
    data({}, [row("a", 400, 100)], {
      windows: windows.map((w) =>
        w.priceContext
          ? { ...w, priceContext: { ...w.priceContext, netBuy: -100 } }
          : w,
      ),
    }),
  );
  assert.equal(
    differentAlignedDirection.observations.find(
      (o) => o.id === "price-response",
    ).title,
    "Price alongside the executions",
  );
});
test("missing, empty, all-flat, nonfinite and future rows never invent a direction", () => {
  for (const input of [
    undefined,
    null,
    {},
    { windows: [null], rows: [null] },
  ]) {
    const brief = decisionBrief(input);
    assert.equal(brief.metrics.netBuy, null);
    assert.equal(brief.metrics.excludingLeader, null);
    assert.equal(brief.tone, "neutral");
    assert(!JSON.stringify(brief).includes("NaN"));
  }
  const empty = decisionBrief(
    data({ longIn: 0, longOut: 0, shortIn: 0, shortOut: 0 }, []),
  );
  assert.equal(empty.metrics.grossActivity, 0);
  assert.equal(empty.metrics.buySharePct, null);
  assert.equal(empty.metrics.effectiveWallets, null);
  const flat = decisionBrief(
    data({ longIn: 20, longOut: 20, shortIn: 0, shortOut: 0 }, [
      row("flat", 40, 0),
    ]),
  );
  assert.equal(flat.metrics.flatWallets, 1);
  assert.equal(flat.metrics.breadthPct, null);
  assert.equal(flat.metrics.netBuy, 0);
  const bad = decisionBrief(
    data({ longIn: NaN, longOut: 20, shortIn: 0, shortOut: 0 }, [
      row("future", 50, 50, {
        activity: { notional: 50, netBuy: 50, fills: 1, last: end + 1 },
      }),
      row("bad", Infinity, 0),
    ]),
  );
  assert.equal(bad.metrics.grossActivity, null);
  assert.equal(bad.metrics.observedActivityContributors, 0);
  assert.equal(bad.metrics.excludingLeader, null);
  const overflow = decisionBrief(
    data({ longIn: 1e308, longOut: 1e308, shortIn: 1e308, shortOut: 1e308 }, [
      row("a", 1e308, 1e308),
      row("b", 1e308, 1e308),
    ]),
  );
  assert.equal(overflow.metrics.grossActivity, null);
  assert.equal(overflow.metrics.netBuy, null);
  assert.equal(overflow.metrics.effectiveWallets, null);
});
test("partial contributor rows suppress counterfactual totals and qualify concentration scope", () => {
  const brief = decisionBrief(
    data({ longIn: 80, shortOut: 0, shortIn: 100, longOut: 0 }, [
      row("seller", 100, -100),
    ]),
  );
  assert.equal(brief.metrics.excludingLeader, null);
  near(brief.metrics.activityCoveragePct, (100 * 100) / 180);
  assert(
    brief.limitations.some((text) => text.includes("do not fully reconcile")),
  );
  const missingSellers = decisionBrief(
    data({ longIn: 80, shortOut: 0, shortIn: 100, longOut: 0 }, [
      row("only-buyer", 80, 80),
    ]),
  );
  assert(!missingSellers.headline.includes("disagree"));
  assert.equal(missingSellers.metrics.excludingLeader, null);
});
test("selected 7-day contributor activity is never compared with 24-hour totals", () => {
  const brief = decisionBrief(
    data({}, [row("a", 300, -100)], {
      window: "7d",
      start: end - 7 * 86400000,
      windows: [
        { label: "24h", longIn: 40, shortIn: 0, longOut: 0, shortOut: 0 },
        { label: "7d", longIn: 100, shortIn: 200, longOut: 0, shortOut: 0 },
      ],
    }),
  );
  assert.equal(brief.window, "7d");
  assert.equal(brief.metrics.netBuy, -100);
  assert.equal(brief.metrics.excludingLeader, 0);
  assert(!brief.observations.some((o) => o.id === "window-change"));
});
