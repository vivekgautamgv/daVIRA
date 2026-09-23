import { executionFlow, fillId } from "./screener-math.mjs";
import { flowInsights } from "./flow-insights.mjs";
const hour = 3600000,
  day = 24 * hour;
const total = (w) => w.longIn + w.longOut + w.shortIn + w.shortOut;
const median = (values) => {
  const a = [...values].sort((x, y) => x - y);
  return a.length
    ? (a[Math.floor((a.length - 1) / 2)] + a[Math.floor(a.length / 2)]) / 2
    : null;
};
const fresh = (t, now) => Number.isFinite(t) && t <= now && now - t < hour;
export function coinResearch({
  coin,
  records,
  analyses = new Map(),
  followed = new Set(),
  now = Date.now(),
  duration = day,
}) {
  const start = now - duration,
    wallets = new Map(),
    history = new Map(),
    orders = new Map();
  const events = [
    ...new Map(
      records
        .filter(
          (r) =>
            r.fill.coin === coin &&
            r.fill.time <= now &&
            r.fill.time >= now - 30 * day,
        )
        .map((r) => [`${r.address}:${fillId(r.fill)}`, r]),
    ).values(),
  ].sort((a, b) => a.fill.time - b.fill.time);
  for (const { address, fill: f } of events) {
    const x = executionFlow(f);
    if (!x) continue;
    history.set(address, Math.min(history.get(address) ?? Infinity, f.time));
    const key = `${address}:${f.oid ?? fillId(f)}`;
    const o = orders.get(key) || {
      address,
      id: f.oid ?? fillId(f),
      first: f.time,
      last: f.time,
      notional: 0,
      opening: 0,
      closing: 0,
    };
    o.first = Math.min(o.first, f.time);
    o.last = Math.max(o.last, f.time);
    o.notional += total(x);
    o.opening += x.longIn + x.shortIn;
    o.closing += x.longOut + x.shortOut;
    orders.set(key, o);
    if (f.time < start) continue;
    const w = wallets.get(address) || {
      address,
      coin,
      longIn: 0,
      longOut: 0,
      shortIn: 0,
      shortOut: 0,
      early: 0,
      late: 0,
      positionDelta: 0,
      executions: 0,
      windowStart: start,
      firstTime: f.time,
      lastExecution: f.time,
      reversals: 0,
    };
    for (const k of ["longIn", "longOut", "shortIn", "shortOut"]) w[k] += x[k];
    w[f.time < now - duration / 2 ? "early" : "late"] += total(x);
    const before = Number(f.startPosition),
      after = before + (f.side === "B" ? 1 : -1) * Number(f.sz);
    if (w.executions === 0) w.startSize = before;
    w.endAmbiguous = w.executions > 0 && w.lastExecution === f.time;
    w.endSize = after;
    w.positionDelta += after - before;
    w.executions++;
    w.lastExecution = f.time;
    if (before * after < 0) { w.reversals++; w.reversalTime = f.time; }
    wallets.set(address, w);
  }
  const list = [...wallets.values()],
    insights = flowInsights(list, { duration, historyStart: history });
  const qualified = (a) =>
    a &&
    fresh(a.fillsFetchedAt, now) &&
    a.coverage?.gaps === 0 &&
    Number.isFinite(a.latestResponseCount) &&
    a.latestResponseCount < 2000;
  const specialist = (a) => {
    const c = a?.coins?.find((c) => c.coin === coin);
    return (
      qualified(a) &&
      c?.completeTrades >= 10 &&
      c.activeDays >= 3 &&
      c.netPnl > 0 &&
      c.score >= 60
    );
  };
  const definitions = [
    [
      "specialists",
      "Coin specialists",
      (a) => specialist(a),
      "10+ complete coin episodes, 3+ closing days, positive net trading PnL, score ≥60; fresh uncapped analysis with no detected gaps.",
    ],
    [
      "consistent",
      "Consistent traders",
      (a) =>
        qualified(a) &&
        a.stats?.completeTrades >= 20 &&
        a.stats.activeDays >= 7 &&
        a.stats.netPnl > 0 &&
        a.stats.score >= 60,
      "20+ complete episodes, 7+ closing days, positive net trading PnL, score ≥60; fresh uncapped analysis with no detected gaps.",
    ],
    [
      "equity",
      "High-equity wallets",
      (a) =>
        a &&
        !a.positionsStale &&
        fresh(a.positionsAt, now) &&
        a.risk?.mainEquity >= 100000,
      "Fresh main-DEX equity ≥$100K. Builder equity excluded.",
    ],
    [
      "short",
      "Short-duration traders",
      (a) =>
        qualified(a) &&
        a.stats?.completeTrades >= 10 &&
        a.stats.medianHoldMs != null &&
        a.stats.medianHoldMs < hour,
      "10+ complete episodes and median holding time below one hour; fresh execution evidence.",
    ],
    [
      "long",
      "Longer-duration traders",
      (a) =>
        qualified(a) &&
        a.stats?.completeTrades >= 10 &&
        a.stats.medianHoldMs >= 4 * hour,
      "10+ complete episodes and median holding time at least four hours; fresh execution evidence.",
    ],
    [
      "watchlist",
      "Your watchlist",
      (_a, address) => followed.has(address),
      "Currently followed addresses with indexed activity in this window.",
    ],
  ];
  const cohorts = definitions.map(([id, label, predicate, definition]) => {
    const members = list.filter((w) =>
      predicate(analyses.get(w.address), w.address),
    );
    const bull = members.filter((w) => w.positionDelta > 1e-10).length,
      bear = members.filter((w) => w.positionDelta < -1e-10).length;
    const balance = bull + bear ? (bull - bear) / (bull + bear) : null;
    const state =
      members.length < 3
        ? "Insufficient sample"
        : balance === null || Math.abs(balance) < 0.34
          ? "Mixed"
          : balance > 0
            ? "Bullish positioning"
            : "Bearish positioning";
    return {
      id,
      label,
      definition,
      count: members.length,
      bull,
      bear,
      neutral: members.length - bull - bear,
      balance,
      state,
      addresses: members.map((w) => w.address),
      ...Object.fromEntries(
        ["longIn", "longOut", "shortIn", "shortOut"].map((k) => [
          k,
          members.reduce((s, w) => s + w[k], 0),
        ]),
      ),
    };
  });
  const directionals = cohorts.filter(
    (c) =>
      c.state === "Bullish positioning" || c.state === "Bearish positioning",
  );
  const agreement =
    directionals.length < 2
      ? "Not enough cohort evidence"
      : new Set(directionals.map((c) => c.state)).size > 1
        ? "Cohorts disagree"
        : "Directional cohorts agree";
  const behaviors = [];
  for (const w of list) {
    const own = [...orders.values()].filter((o) => o.address === w.address),
      prior = own.filter((o) => o.last < start),
      current = own.filter((o) => o.first >= start);
    const days = new Set(prior.map((o) => Math.floor(o.first / day))).size,
      baseline = median(prior.map((o) => o.notional));
    const largest = [...current].sort((a, b) => b.notional - a.notional)[0];
    const evidence = qualified(analyses.get(w.address));
    if (
      evidence &&
      prior.length >= 10 &&
      days >= 3 &&
      baseline > 0 &&
      largest?.notional >= baseline * 3
    )
      behaviors.push({
        address: w.address,
        type: "Unusually large execution",
        detail: `Largest executed order is ${(largest.notional / baseline).toFixed(1)}× the median of ${prior.length} prior observed orders across ${days} days. Partial fills are grouped by order ID.`,
        time: largest.last,
        amount: largest.notional,
        baseline,
        ratio: largest.notional / baseline,
      });
    if (w.reversals)
      behaviors.push({
        address: w.address,
        type: "Direction reversal",
        detail: `${w.reversals} observed execution${w.reversals === 1 ? "" : "s"} crossed from long to short or short to long.`,
        time: w.reversalTime,
      });
    const adds = current.filter((o) => o.opening > 0 && o.closing === 0),
      exits = current.filter((o) => o.closing > 0 && o.opening === 0);
    if (adds.length >= 3 || exits.length >= 3)
      behaviors.push({
        address: w.address,
        type: "Repeated entries / exits",
        detail: `${adds.length} opening-only and ${exits.length} closing-only executed orders in this window. This describes activity, not intent.`,
        time: w.lastExecution,
      });
    w.specialist = !!specialist(analyses.get(w.address));
    w.baselineOrders = prior.length;
    w.baselineDays = days;
    const a = analyses.get(w.address),
      p = a?.positions?.find((p) => p.coin === coin);
    const venue =
      p?.dex && p.dex !== "Hyperliquid"
        ? a?.builderCoverage?.find((b) => b.dex === p.dex)
        : null;
    const positionAt = venue?.updatedAt ?? a?.positionsAt;
    const positionFresh = venue
      ? venue.available && !venue.stale && fresh(positionAt, now)
      : a && !a.positionsStale && fresh(positionAt, now);
    w.currentPosition =
      p && positionFresh
        ? { size: p.size, value: p.value, at: positionAt }
        : null;
    w.retainedDirection =
      w.currentPosition &&
      !w.endAmbiguous &&
      positionAt >= w.lastExecution &&
      Math.abs(w.endSize) > 1e-10
        ? Math.sign(w.endSize) === Math.sign(p.size)
        : null;
  }
  return {
    coin,
    windowStart: start,
    updatedAt: now,
    insights,
    cohorts,
    agreement,
    components: Object.fromEntries(
      ["longIn", "longOut", "shortIn", "shortOut"].map((k) => [
        k,
        list.reduce((s, w) => s + w[k], 0),
      ]),
    ),
    wallets: list.sort((a, b) => total(b) - total(a)),
    behaviors: behaviors.sort((a, b) => b.time - a.time).slice(0, 50),
    coverage: {
      wallets: list.length,
      specialists: list.filter((w) => w.specialist).length,
      baselineReady: list.filter(
        (w) =>
          w.baselineOrders >= 10 &&
          w.baselineDays >= 3 &&
          qualified(analyses.get(w.address)),
      ).length,
      retained: list.filter((w) => w.retainedDirection === true).length,
      checkedRetention: list.filter((w) => w.retainedDirection !== null).length,
    },
    methodology:
      "Observed indexed executions, not the entire market or collateral transfers. Current cohort membership is used, not historical membership. Cohorts overlap and must not be summed; wallet addresses are not verified independent owners. Votes use net signed size change, with one vote per address. No price forecast or probability. Same-direction snapshots do not prove continuous holding. Size anomalies require fresh uncapped gap-free analysis and 10 prior orders on 3 days; the baseline excludes the selected window and is limited to retained 30-day history. Leverage changes and first-ever coin entries require additional historical evidence and are not inferred.",
  };
}
