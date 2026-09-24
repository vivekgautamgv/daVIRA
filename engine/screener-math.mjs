import { D, uniqueFills } from "./analytics.mjs";
const equities = new Set(
  "AAPL AMZN GOOGL GOOG META MSFT NVDA TSLA AMD INTC COIN MSTR HOOD PLTR ORCL NFLX AVGO MU TSM CRCL BABA SHOP UBER SPOT RDDT GME LLY JPM V".split(
    " ",
  ),
);
const indices = new Set(
  "XYZ100 SP500 SPX US500 USA500 US100 NAS100 NASDAQ NDX DJ30 DOW UK100 DE40 EU50 JP225".split(
    " ",
  ),
);
const commodities = new Set(
  "GOLD SILVER XAU XAG PAXG XAUT COPPER PLATINUM PALLADIUM OIL CL WTI BRENT NATGAS NG URANIUM".split(
    " ",
  ),
);
export function instrumentClass(coin) {
  const symbol = coin.split(":").at(-1).toUpperCase();
  if (commodities.has(symbol)) return "Commodity";
  if (coin.includes(":") && equities.has(symbol)) return "Equity";
  if (coin.includes(":") && indices.has(symbol)) return "Index";
  if (
    coin.includes(":") &&
    ["EUR", "JPY", "GBP", "EURUSD", "USDJPY", "GBPUSD"].includes(symbol)
  )
    return "FX";
  if (["ONDO", "OM"].includes(symbol)) return "RWA token";
  return coin.includes(":") ? "Builder / unclassified" : "Crypto";
}
export const isRwa = (coin) =>
  ["Equity", "Index", "Commodity", "FX"].includes(instrumentClass(coin));
export const fillId = (f) =>
  `${f.time}:${f.coin}:${f.tid ?? `${f.hash}:${f.oid}:${f.px}:${f.sz}`}`;
const validExecution = (f) =>
  typeof f.coin === "string" &&
  !f.coin.startsWith("@") &&
  !["Buy", "Sell"].includes(f.dir) &&
  ["B", "A"].includes(f.side) &&
  f.startPosition !== undefined &&
  f.startPosition !== null &&
  f.startPosition !== "" &&
  Number.isFinite(Number(f.startPosition)) &&
  Number(f.sz) > 0 &&
  Number.isFinite(Number(f.sz)) &&
  Number(f.px) > 0 &&
  Number.isFinite(Number(f.px));
export function executionFlow(f) {
  if (!validExecution(f)) return null;
  const before = D(f.startPosition),
    signed = D(f.sz).mul(f.side === "B" ? 1 : -1),
    after = before.plus(signed),
    px = D(f.px);
  if (["Buy", "Sell"].includes(f.dir) || f.coin.startsWith("@")) return null;
  const longBefore = DecimalMax(before, D(0)),
    longAfter = DecimalMax(after, D(0)),
    shortBefore = DecimalMax(before.neg(), D(0)),
    shortAfter = DecimalMax(after.neg(), D(0));
  return {
    longIn: DecimalMax(longAfter.minus(longBefore), D(0)).mul(px).toNumber(),
    longOut: DecimalMax(longBefore.minus(longAfter), D(0)).mul(px).toNumber(),
    shortIn: DecimalMax(shortAfter.minus(shortBefore), D(0)).mul(px).toNumber(),
    shortOut: DecimalMax(shortBefore.minus(shortAfter), D(0))
      .mul(px)
      .toNumber(),
    buy: f.side === "B" ? D(f.sz).mul(px).toNumber() : 0,
    sell: f.side === "A" ? D(f.sz).mul(px).toNumber() : 0,
  };
}
const DecimalMax = (a, b) => (a.gt(b) ? a : b);
const median = (values) => {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b),
    m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const clamp = (n) => Math.max(0, Math.min(100, n));
// Trade IDs are identifiers, not an execution sequence. Recover same-timestamp
// chains only when startPosition establishes a unique order.
function orderedExecutions(input) {
  const groups = new Map(),
    expected = new Map(),
    result = [];
  for (const f of uniqueFills(input).filter(validExecution)) {
    const key = `${f.time}:${f.coin}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(f);
  }
  for (const group of groups.values()) {
    const coin = group[0].coin;
    const after = (f) =>
      D(f.startPosition)
        .plus(D(f.sz).mul(f.side === "B" ? 1 : -1))
        .toString();
    const remaining = [...group],
      ordered = [];
    let cursor = expected.get(coin),
      uncertain = false;
    if (!remaining.some((f) => D(f.startPosition).toString() === cursor)) {
      const ends = new Set(remaining.map(after));
      const starts = remaining.filter(
        (f) => !ends.has(D(f.startPosition).toString()),
      );
      if (starts.length === 1) cursor = D(starts[0].startPosition).toString();
      else if (remaining.length === 1)
        cursor = D(remaining[0].startPosition).toString();
      else {
        cursor = D(remaining[0].startPosition).toString();
        uncertain = true;
      }
    }
    while (remaining.length) {
      const matches = remaining.filter(
        (f) => D(f.startPosition).toString() === cursor,
      );
      if (matches.length !== 1) uncertain = true;
      const f = matches[0] || remaining[0];
      ordered.push(f);
      remaining.splice(remaining.indexOf(f), 1);
      cursor = after(f);
    }
    expected.set(coin, cursor);
    result.push(
      ...ordered.map((f) => ({ ...f, orderingUncertain: uncertain })),
    );
  }
  return result;
}
export function reconstructEpisodes(input) {
  const fills = orderedExecutions(input);
  const running = new Map(),
    closed = [];
  let gaps = 0;
  for (const f of fills) {
    const before = D(f.startPosition),
      signed = D(f.sz).mul(f.side === "B" ? 1 : -1),
      after = before.plus(signed),
      size = D(f.sz),
      fee = D(f.fee),
      turnover = size.mul(f.px);
    if (size.lte(0)) continue;
    let e = running.get(f.coin);
    if (e && !D(e.expected).eq(before)) {
      gaps++;
      running.delete(f.coin);
      e = null;
    }
    if (!e)
      e = {
        coin: f.coin,
        openedAt: f.time,
        known: before.eq(0) && !f.orderingUncertain,
        pnl: D(0),
        fees: D(0),
        turnover: D(0),
        size: D(0),
        expected: before.toString(),
        direction: before.eq(0)
          ? Math.sign(signed.toNumber())
          : Math.sign(before.toNumber()),
        fillCount: 0,
      };
    if (f.orderingUncertain) e.known = false;
    const reversing =
        !before.eq(0) &&
        !after.eq(0) &&
        before.isPositive() !== after.isPositive(),
      closingQuantity = reversing ? before.abs() : size,
      share = closingQuantity.div(size);
    e.pnl = e.pnl.plus(f.closedPnl);
    e.fees = e.fees.plus(fee.mul(share));
    e.turnover = e.turnover.plus(turnover.mul(share));
    e.fillCount++;
    if (after.eq(0) || reversing) {
      closed.push({
        coin: f.coin,
        direction: e.direction,
        openedAt: e.openedAt,
        closedAt: f.time,
        complete: e.known,
        netPnl: e.pnl.minus(e.fees).toNumber(),
        grossPnl: e.pnl.toNumber(),
        fees: e.fees.toNumber(),
        turnover: e.turnover.toNumber(),
        holdMs: f.time - e.openedAt,
        fillCount: e.fillCount,
      });
      running.delete(f.coin);
      if (reversing)
        running.set(f.coin, {
          coin: f.coin,
          openedAt: f.time,
          known: !f.orderingUncertain,
          pnl: D(0),
          fees: fee.mul(D(1).minus(share)),
          turnover: turnover.mul(D(1).minus(share)),
          expected: after.toString(),
          direction: Math.sign(after.toNumber()),
          fillCount: 1,
        });
    } else {
      e.expected = after.toString();
      running.set(f.coin, e);
    }
  }
  return { closed, gaps, openEpisodes: running.size };
}
export function performance(episodes) {
  const full = episodes.filter((e) => e.complete),
    wins = full.filter((e) => e.netPnl > 0),
    losses = full.filter((e) => e.netPnl < 0),
    grossProfit = wins.reduce((a, e) => a + e.netPnl, 0),
    grossLoss = -losses.reduce((a, e) => a + e.netPnl, 0);
  let equity = 0,
    peak = 0,
    maxDrawdown = 0;
  const days = {};
  for (const e of [...full].sort((a, b) => a.closedAt - b.closedAt)) {
    equity += e.netPnl;
    peak = Math.max(peak, equity);
    maxDrawdown = Math.max(maxDrawdown, peak - equity);
    const day = new Date(e.closedAt).toISOString().slice(0, 10);
    days[day] = (days[day] || 0) + e.netPnl;
  }
  const dayCount = Object.keys(days).length,
    profitableDays = Object.values(days).filter((n) => n > 0).length,
    pf = grossLoss ? grossProfit / grossLoss : null,
    hold = median(full.map((e) => e.holdMs)),
    turnover = full.reduce((a, e) => a + e.turnover, 0),
    net = grossProfit - grossLoss;
  const components = {
    profitability: Math.round(
      clamp((grossLoss ? Math.min(pf, 3) / 3 : net > 0 ? 1 : 0) * 100),
    ),
    consistency: Math.round(dayCount ? (profitableDays / dayCount) * 100 : 0),
    drawdownControl: Math.round(
      net > 0 ? clamp(100 - (maxDrawdown / (net + maxDrawdown)) * 100) : 0,
    ),
    evidence: Math.round(clamp(Math.min(full.length / 30, dayCount / 7) * 100)),
  };
  const score =
    full.length >= 5
      ? Math.round(
          components.profitability * 0.35 +
            components.consistency * 0.25 +
            components.drawdownControl * 0.25 +
            components.evidence * 0.15,
        )
      : null;
  return {
    completeTrades: full.length,
    partialTrades: episodes.length - full.length,
    winRate: full.length ? (wins.length / full.length) * 100 : null,
    profitFactor: pf,
    noLosses: full.length > 0 && losses.length === 0,
    netPnl: net,
    grossProfit,
    grossLoss,
    medianHoldMs: hold,
    maxDrawdownUsd: maxDrawdown,
    activeDays: dayCount,
    profitableDays,
    turnover,
    score,
    components,
    confidence:
      full.length >= 30 && dayCount >= 7
        ? "Substantial sample"
        : full.length >= 10 && dayCount >= 3
          ? "Developing sample"
          : "Thin sample",
  };
}
export function analyzeExecutions(input, positions = [], now = Date.now()) {
  const fills = uniqueFills(input).filter(
    (f) => f.time >= now - 30 * 86400000 && f.time <= now && validExecution(f),
  );
  const { closed, gaps, openEpisodes } = reconstructEpisodes(fills),
    stats = performance(closed),
    byCoin = new Map();
  let samplePnl = 0,
    volume = 0,
    makerVolume = 0;
  for (const f of fills) {
    const flow = executionFlow(f),
      v = Number(f.px) * Number(f.sz),
      net = Number(f.closedPnl) - Number(f.fee);
    samplePnl += net;
    volume += v;
    if (!f.crossed) makerVolume += v;
    let c = byCoin.get(f.coin);
    if (!c) {
      c = {
        coin: f.coin,
        class: instrumentClass(f.coin),
        volume: 0,
        samplePnl: 0,
        fills: 0,
        longIn: 0,
        longOut: 0,
        shortIn: 0,
        shortOut: 0,
      };
      byCoin.set(f.coin, c);
    }
    c.volume += v;
    c.samplePnl += net;
    c.fills++;
    for (const k of ["longIn", "longOut", "shortIn", "shortOut"])
      c[k] += flow?.[k] || 0;
  }
  const coins = [...byCoin.values()]
      .map((c) => ({
        ...c,
        ...performance(closed.filter((e) => e.coin === c.coin)),
        volumeShare: volume ? (c.volume / volume) * 100 : 0,
      }))
      .sort((a, b) => b.volume - a.volume),
    first = fills[0]?.time || null,
    last = fills.at(-1)?.time || null,
    spanDays = first ? Math.max(1, (now - first) / 86400000) : 0,
    frequency = spanDays ? fills.length / spanDays : 0,
    medianNotional = median(fills.map((f) => Number(f.px) * Number(f.sz))),
    rwaVolume = coins
      .filter((c) => isRwa(c.coin))
      .reduce((a, c) => a + c.volume, 0),
    makerShare = volume ? (makerVolume / volume) * 100 : 0;
  const holdScore =
      stats.medianHoldMs === null
        ? 0
        : clamp((stats.medianHoldMs / 3600000) * 100),
    speedScore = clamp(100 - frequency),
    costDrag =
      stats.netPnl > 0 ? ((stats.turnover * 0.001) / stats.netPnl) * 100 : null,
    copyScore =
      stats.completeTrades >= 5
        ? Math.round(
            holdScore * 0.35 +
              speedScore * 0.2 +
              clamp(100 - (costDrag ?? 100)) * 0.3 +
              stats.components.evidence * 0.15,
          )
        : null;
  return {
    stats: {
      ...stats,
      samplePnl,
      volume,
      makerShare,
      fillCount: fills.length,
      medianNotional,
      fillFrequency: frequency,
    },
    coins,
    coverage: {
      first,
      last,
      gaps,
      openEpisodes,
      daysObserved: spanDays,
      fullEpisodes: stats.completeTrades,
      partialEpisodes: stats.partialTrades,
      scope:
        "Indexed recent executions within 30 days. Episodes with a missing opening or a position discontinuity are excluded from win-rate and quality scores. Funding is excluded; nominal stablecoin quote units are treated as approximate USD.",
    },
    copy: {
      score: copyScore,
      grade:
        copyScore === null
          ? "More history needed"
          : copyScore >= 70
            ? "Review for copying"
            : copyScore >= 45
              ? "Execution-sensitive"
              : "Difficult to copy",
      costDrag,
      holdScore: Math.round(holdScore),
      speedScore: Math.round(speedScore),
      stress: [0, 5, 10, 25].map((bps) => ({
        bps,
        netPnl: stats.netPnl - (stats.turnover * bps) / 10000,
      })),
      reason:
        stats.completeTrades < 5
          ? "At least five complete position episodes are needed."
          : stats.medianHoldMs < 300000
            ? "Short holding periods make follower delay material."
            : costDrag > 50
              ? "An extra 10 bps per fill would consume more than half the measured PnL."
              : "Longer holding periods make the strategy worth closer execution review.",
    },
    rwa: {
      volume: rwaVolume,
      share: volume ? (rwaVolume / volume) * 100 : 0,
      coins: coins.filter((c) => isRwa(c.coin)).map((c) => c.coin),
      openPositions: positions.filter((p) => isRwa(p.coin)),
    },
    episodes: closed.slice(-100).reverse(),
  };
}
