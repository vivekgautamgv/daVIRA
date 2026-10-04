import { cleanCandles, executionSeries } from "./token-desk-math.mjs";
const H = 3600000;
const finite = (n) => typeof n === "number" && Number.isFinite(n);

// Compare adjacent, completed periods, never overlapping rolling windows.
// No fills in an hour means no retained observations, not verified inactivity.
export function completedFlowComparison(records, candleInput, coin, now) {
  const { buckets } = executionSeries(records, coin, now);
  const candles = cleanCandles(candleInput, coin, now);
  const end = Math.floor(now / H) * H;
  const summarize = (finish) => {
    const start = finish - 6 * H,
      addresses = new Set();
    let netBuy = 0,
      gross = 0,
      fills = 0,
      observedHours = 0;
    const prices = [];
    for (let t = start; t < finish; t += H) {
      const b = buckets.get(t);
      if (b) {
        netBuy += b.longIn + b.shortOut - b.shortIn - b.longOut;
        gross += b.longIn + b.shortOut + b.shortIn + b.longOut;
        fills += b.fills;
        observedHours++;
        b.addresses.forEach((a) => addresses.add(a));
      }
      if (candles.has(t)) prices.push(candles.get(t));
    }
    return {
      start,
      end: finish,
      netBuy: fills ? netBuy : null,
      fills,
      wallets: addresses.size,
      observedHours,
      gross,
      priceChange:
        prices.length === 6 ? (prices.at(-1).c / prices[0].o - 1) * 100 : null,
    };
  };
  const current = summarize(end),
    previous = summarize(end - 6 * H);
  const comparable = [current, previous].every(
    (b) => b.fills >= 10 && b.wallets >= 3 && b.observedHours >= 4,
  );
  const delta = comparable ? current.netBuy - previous.netBuy : null;
  const meaningfulFlow =
    current.gross > 0 && Math.abs(current.netBuy / current.gross) >= 0.1;
  const priceResponse =
    comparable && meaningfulFlow && finite(current.priceChange)
      ? Math.abs(current.priceChange) < 0.25
        ? "The latest period has a directional execution imbalance, but price moved less than 0.25%. Price response is limited; the flow alone does not establish a continuing move."
        : Math.sign(current.netBuy) !== Math.sign(current.priceChange)
          ? "Price moved against the sampled net executions in the latest period. This weakens a simple follow-the-flow interpretation."
          : "Price and sampled net executions moved in the same direction. This is observed agreement, not evidence of causation or predictive skill."
      : null;
  return {
    current,
    previous,
    comparable,
    delta,
    priceResponse,
    description: !comparable
      ? "Activity is too sparse for a reliable period comparison. Missing observations may reflect collection gaps."
      : current.netBuy > 0 && previous.netBuy < 0
        ? "Observed executions switched from net selling to net buying."
        : current.netBuy < 0 && previous.netBuy > 0
          ? "Observed executions switched from net buying to net selling."
          : delta > 0
            ? "The latest period shifted toward buying relative to the preceding six hours."
            : delta < 0
              ? "The latest period shifted toward selling relative to the preceding six hours."
              : "Observed net executions were unchanged between these periods.",
  };
}

export function traderBrief(data, comparison) {
  const m = data.decision.metrics,
    base = data.windows.find((w) => w.label === data.window);
  const support = [],
    challenges = [];
  const fact = (title, text, value, kind = "money") => ({
    title,
    text,
    value,
    kind,
  });
  const hasFlows = finite(m.grossActivity) && m.grossActivity > 0;
  const openingTotal = hasFlows ? base.longIn + base.shortIn : 0;
  const openingShare =
    openingTotal > 0 ? (base.longIn / openingTotal) * 100 : null;
  const addDirectional = (value, positiveTitle, negativeTitle, text) => {
    if (finite(value) && value !== 0)
      (value > 0 ? support : challenges).push(
        fact(value > 0 ? positiveTitle : negativeTitle, text, value),
      );
  };
  addDirectional(
    m.netBuy,
    "Net buying in the selected window",
    "Net selling in the selected window",
    "New longs + short covers − new shorts − long exits.",
  );
  if (openingTotal > 0)
    addDirectional(
      base.longIn - base.shortIn,
      "Fresh entries favour longs",
      "Fresh entries favour shorts",
      "Opening long notional minus opening short notional; excludes closing trades.",
    );
  addDirectional(
    m.excludingLeader,
    "Buying survives the turnover exclusion",
    "Remaining wallets lean toward selling",
    "Net executions after removing the largest turnover contributor.",
  );
  const netFlip =
    finite(m.excludingNetLeader) && m.netBuy * m.excludingNetLeader < 0;
  if (netFlip)
    (m.netBuy > 0 ? challenges : support).push(
      fact(
        m.netBuy > 0
          ? "Buying reverses without the largest net contributor"
          : "Selling reverses without the largest net contributor",
        "Excludes the address with the largest absolute net flow, which may differ from the highest-turnover wallet.",
        m.excludingNetLeader,
      ),
    );
  if (hasFlows && finite(m.breadthPct) && m.breadthPct !== 50)
    (m.breadthPct > 50 ? support : challenges).push(
      fact(
        m.breadthPct > 50
          ? "More addresses net bought"
          : "More addresses net sold",
        `${m.bullishWallets} net-buying versus ${m.bearishWallets} net-selling addresses. Addresses may share an owner.`,
        m.breadthPct > 50 ? m.breadthPct : 100 - m.breadthPct,
        "percent",
      ),
    );
  if (hasFlows && m.coveringSharePct >= 50)
    challenges.push(
      fact(
        "Buying is mainly short exits",
        "Closing shorts can lift buying totals without creating new long exposure.",
        m.coveringSharePct,
        "percent",
      ),
    );

  const totalPositions =
    data.positioning.longWallets +
    data.positioning.shortWallets +
    data.positioning.flatWallets +
    data.positioning.unavailable;
  const knownPositions = totalPositions - data.positioning.unavailable;
  const technical = data.technical;
  const currentHour = Math.floor(data.end / H) * H;
  const priceUsable =
    !!technical &&
    finite(technical.at) &&
    technical.at === currentHour - 1 &&
    [
      technical.price,
      technical.sma20,
      technical.support,
      technical.resistance,
    ].every((n) => finite(n) && n > 0) &&
    ((!data.priceStale && !data.priceError) ||
      data.probability?.source?.completedHistoryCurrent === true);
  const gates = (side) => {
    const long = side === "long";
    return [
      {
        label: long
          ? "Fresh long entries ≥60% of all openings"
          : "Fresh short entries ≥60% of all openings",
        state:
          openingShare === null
            ? "unknown"
            : (long ? openingShare >= 60 : openingShare <= 40)
              ? "met"
              : "pending",
        value:
          openingShare === null
            ? null
            : long
              ? openingShare
              : 100 - openingShare,
        kind: "percent",
      },
      {
        label: long
          ? "Net-buying addresses ≥60%; buying survives both contributor exclusions"
          : "Net-selling addresses ≥60%; selling survives both contributor exclusions",
        state:
          !finite(m.breadthPct) ||
          !finite(m.excludingLeader) ||
          !finite(m.excludingNetLeader)
            ? "unknown"
            : (
                  long
                    ? m.breadthPct >= 60 &&
                      m.excludingLeader > 0 &&
                      m.excludingNetLeader > 0
                    : m.breadthPct <= 40 &&
                      m.excludingLeader < 0 &&
                      m.excludingNetLeader < 0
                )
              ? "met"
              : "pending",
        value: finite(m.breadthPct)
          ? long
            ? m.breadthPct
            : 100 - m.breadthPct
          : null,
        kind: "percent",
      },
      {
        label: long
          ? "Latest completed close above its 20-hour average"
          : "Latest completed close below its 20-hour average",
        state: !priceUsable
          ? "unknown"
          : (
                long
                  ? technical.price > technical.sma20
                  : technical.price < technical.sma20
              )
            ? "met"
            : "pending",
        value: priceUsable ? technical.sma20 : null,
        kind: "price",
      },
    ];
  };
  const wallets = data.rows
    .filter(
      (w) =>
        w.activity &&
        finite(w.activity.netBuy) &&
        finite(w.activity.notional) &&
        w.activity.notional > 0,
    )
    .sort((a, b) => Math.abs(b.activity.netBuy) - Math.abs(a.activity.netBuy))
    .slice(0, 4)
    .map((w) => ({
      address: w.address,
      name: w.name,
      netBuy: w.activity.netBuy,
      turnoverShare: hasFlows
        ? (w.activity.notional / m.grossActivity) * 100
        : null,
      tokenPnl: w.token?.completeTrades > 0 ? w.token.netPnl : null,
      trades: w.token?.completeTrades || 0,
      qualified: w.qualified,
      position: w.position,
      positionState: w.positionState,
      positionAt: w.positionAt,
    }));
  return {
    version: "trader-brief-v1",
    coin: data.coin,
    window: data.window,
    at: data.updatedAt,
    headline: netFlip
      ? m.netBuy > 0
        ? "Buying depends on one net contributor"
        : "Selling depends on one net contributor"
      : hasFlows && m.netBuy > 0 && m.breadthPct < 50
        ? "More buying dollars, fewer buying addresses"
        : hasFlows && m.netBuy < 0 && m.breadthPct > 50
          ? "More selling dollars, fewer selling addresses"
          : data.decision.headline,
    summary: data.decision.summary,
    support,
    challenges,
    comparison,
    openingShare,
    qualified: m.qualifiedCount,
    knownPositions,
    totalPositions,
    latestFill: data.coverage.last,
    price: priceUsable
      ? {
          close: technical.price,
          at: technical.at,
          mean: technical.sma20,
          low: technical.support,
          high: technical.resistance,
        }
      : null,
    bullish: gates("long"),
    bearish: gates("short"),
    wallets,
    history:
      data.probability?.models.map((model) => {
        const h = model.horizons.find((h) => h.hours === 6);
        return {
          id: model.id,
          matches: h?.matches || 0,
          status: h?.status,
          statistics: h?.status === "available" ? h.statistics : null,
          validation: h?.validation,
        };
      }) || [],
  };
}
