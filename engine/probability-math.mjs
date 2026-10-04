import { cleanCandles } from "./token-desk-math.mjs";

const H = 3_600_000,
  DAY = 24 * H,
  INPUT = 6 * H,
  FLAT = 0.1;
const finite = (value) => typeof value === "number" && Number.isFinite(value);
const positive = (value) => finite(value) && value >= 0;
const utcDay = (time) => new Date(time).toISOString().slice(0, 10);
const uniqueDays = (rows, field = "inputStart") =>
  new Set(rows.map((row) => utcDay(row[field]))).size;
const outcome = (value) =>
  value > FLAT + 1e-10 ? "up" : value < -FLAT - 1e-10 ? "down" : "flat";

/** Subtract six calendar months in UTC, clamping the day to the target month. */
export function sixMonthStart(now = Date.now()) {
  if (!finite(now) || !Number.isFinite(new Date(now).getTime())) return null;
  const date = new Date(now),
    month = date.getUTCMonth() - 6;
  const first = new Date(0);
  first.setUTCFullYear(date.getUTCFullYear(), month, 1);
  const last = new Date(first);
  last.setUTCMonth(last.getUTCMonth() + 1, 0);
  first.setUTCDate(Math.min(date.getUTCDate(), last.getUTCDate()));
  first.setUTCHours(
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds(),
  );
  return first.getTime();
}

function counts(rows) {
  const result = { up: 0, down: 0, flat: 0 };
  for (const row of rows) result[outcome(row.returnPct)]++;
  return result;
}
function interval(successes, total) {
  const z = 1.96,
    p = successes / total,
    denominator = 1 + (z * z) / total;
  const center = (p + (z * z) / (2 * total)) / denominator;
  const half =
    (z * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total)) /
    denominator;
  return [
    Math.max(0, 100 * (center - half)),
    Math.min(100, 100 * (center + half)),
  ];
}
function percentile(values, fraction) {
  const position = (values.length - 1) * fraction,
    left = Math.floor(position);
  return (
    values[left] +
    (values[Math.min(left + 1, values.length - 1)] - values[left]) *
      (position - left)
  );
}
function statistics(matches, baseline) {
  const count = counts(matches),
    base = counts(baseline),
    n = matches.length;
  const returns = matches.map((row) => row.returnPct).sort((a, b) => a - b);
  return {
    up: (100 * count.up) / n,
    down: (100 * count.down) / n,
    flat: (100 * count.flat) / n,
    upInterval: interval(count.up, n),
    downInterval: interval(count.down, n),
    median: percentile(returns, 0.5),
    p10: percentile(returns, 0.1),
    p90: percentile(returns, 0.9),
    baselineUp: (100 * base.up) / baseline.length,
    baselineDown: (100 * base.down) / baseline.length,
    moveThresholds: [1, 2, 5].map((thresholdPct) => ({
      thresholdPct,
      up:
        (100 *
          returns.filter((value) => value >= thresholdPct - 1e-10).length) /
        n,
      down:
        (100 *
          returns.filter((value) => value <= -thresholdPct + 1e-10).length) /
        n,
    })),
  };
}
function continuous(candles, start, hours) {
  const rows = Array.from({ length: hours }, (_, i) =>
    candles.get(start + i * H),
  );
  return rows.every(Boolean) ? rows : null;
}
function inputPrice(candles, inputEnd, historyStart, needsTrend) {
  const inputStart = inputEnd - INPUT;
  if (inputStart < historyStart) return null;
  const six = continuous(candles, inputStart, 6);
  if (!six) return null;
  const entryPrice = six.at(-1).c;
  const momentum = 100 * (entryPrice / six[0].o - 1);
  const result = { inputStart, inputEnd, entryPrice, momentum };
  if (needsTrend) {
    const contextStart = inputEnd - 20 * H;
    if (contextStart < historyStart) return null;
    const twenty = continuous(candles, contextStart, 20);
    if (!twenty) return null;
    const mean = twenty.reduce((total, row) => total + row.c, 0) / 20;
    const ranges = six.map((row, i) => {
      const previous = i ? six[i - 1].c : twenty[13].c;
      return Math.max(
        row.h - row.l,
        Math.abs(row.h - previous),
        Math.abs(row.l - previous),
      );
    });
    result.volatility =
      (100 * ranges.reduce((total, value) => total + value, 0)) /
      6 /
      entryPrice;
    result.trend = 100 * (entryPrice / mean - 1);
  }
  return Object.values(result).every(finite) ? result : null;
}
function cleanFlows(flowRows, historyStart, historyEnd, now) {
  const dedup = new Map();
  for (const row of Array.isArray(flowRows) ? flowRows : []) {
    if (
      !row ||
      typeof row.address !== "string" ||
      !row.address ||
      !finite(row.t) ||
      row.t % H !== 0 ||
      row.t < historyStart ||
      row.t + H > historyEnd ||
      !finite(row.observedAt) ||
      row.observedAt > now ||
      row.observedAt < row.t ||
      ![row.longIn, row.longOut, row.shortIn, row.shortOut].every(positive) ||
      !positive(row.fills) ||
      row.fills < 1 ||
      !Number.isInteger(row.fills)
    )
      continue;
    const gross = row.longIn + row.longOut + row.shortIn + row.shortOut;
    if (!finite(gross) || gross <= 0) continue;
    const key = `${row.address.toLowerCase()}:${row.t}`,
      old = dedup.get(key);
    if (!old || row.observedAt > old.observedAt) dedup.set(key, row);
  }
  const buckets = new Map();
  for (const row of dedup.values()) {
    const bucket = buckets.get(row.t) || {
      longIn: 0,
      longOut: 0,
      shortIn: 0,
      shortOut: 0,
      fills: 0,
      addresses: new Set(),
      observedAt: 0,
    };
    for (const key of ["longIn", "longOut", "shortIn", "shortOut", "fills"])
      bucket[key] += row[key];
    bucket.addresses.add(row.address.toLowerCase());
    bucket.observedAt = Math.max(bucket.observedAt, row.observedAt);
    buckets.set(row.t, bucket);
  }
  return buckets;
}
function inputWallet(candles, buckets, inputEnd, historyStart) {
  const price = inputPrice(candles, inputEnd, historyStart, false);
  if (!price) return null;
  const values = { longIn: 0, longOut: 0, shortIn: 0, shortOut: 0, fills: 0 },
    addresses = new Set();
  let activeHours = 0,
    observedAt = 0;
  for (let t = price.inputStart; t < inputEnd; t += H) {
    const bucket = buckets.get(t);
    if (!bucket) continue;
    activeHours++;
    for (const key of Object.keys(values)) values[key] += bucket[key];
    for (const address of bucket.addresses) addresses.add(address);
    observedAt = Math.max(observedAt, bucket.observedAt);
  }
  const gross =
    values.longIn + values.longOut + values.shortIn + values.shortOut;
  if (
    !finite(gross) ||
    !finite(values.fills) ||
    gross <= 0 ||
    addresses.size < 3 ||
    values.fills < 10 ||
    activeHours < 4
  )
    return null;
  return {
    ...price,
    buyShare: 100 * ((values.longIn + values.shortOut) / gross),
    expansion:
      100 *
      ((values.longIn + values.shortIn - values.longOut - values.shortOut) /
        gross),
    wallets: addresses.size,
    fills: values.fills,
    activeHours,
    observedAt,
  };
}
const sameDirection = (historical, current) =>
  Math.abs(current) <= FLAT || Math.sign(historical) === Math.sign(current);
function matching(reference, current, id) {
  if (
    !current ||
    !sameDirection(reference.momentum, current.momentum) ||
    Math.abs(reference.momentum - current.momentum) > 2
  )
    return false;
  if (id === "wallet")
    return (
      Math.abs(reference.buyShare - current.buyShare) <= 15 &&
      Math.abs(reference.expansion - current.expansion) <= 25
    );
  return (
    Math.abs(reference.volatility - current.volatility) <=
      Math.max(0.1, 0.5 * current.volatility) &&
    sameDirection(reference.trend, current.trend) &&
    Math.abs(reference.trend - current.trend) <= 1
  );
}
function publicExample(reference) {
  const keys = [
    "inputStart",
    "inputEnd",
    "outcomeEnd",
    "entryPrice",
    "exitPrice",
    "returnPct",
    "momentum",
    "buyShare",
    "expansion",
    "wallets",
    "fills",
    "volatility",
    "trend",
  ];
  return Object.fromEntries(
    keys.filter((key) => key in reference).map((key) => [key, reference[key]]),
  );
}
function publicCurrent(current) {
  if (!current) return null;
  return {
    start: current.inputStart,
    end: current.inputEnd,
    momentum: current.momentum,
    ...(finite(current.buyShare)
      ? {
          buyShare: current.buyShare,
          expansion: current.expansion,
          wallets: current.wallets,
          fills: current.fills,
        }
      : {}),
    ...(finite(current.volatility)
      ? { volatility: current.volatility, trend: current.trend }
      : {}),
  };
}
function coverage(times, end) {
  if (!times.length) return { first: null, last: null, days: 0, hours: 0 };
  const sorted = times.sort((a, b) => a - b);
  return {
    first: sorted[0],
    last: Math.min(end, sorted.at(-1) + H),
    days: new Set(sorted.map(utcDay)).size,
    hours: sorted.length,
  };
}
function validate(references, id, now) {
  const evaluated = [];
  for (const candidate of references) {
    if (
      candidate.inputStart < now - 60 * DAY ||
      (id === "wallet" && candidate.observedAt > candidate.inputEnd)
    )
      continue;
    const previous = references.filter(
      (row) =>
        row.outcomeEnd <= candidate.inputStart &&
        row.knownAt <= candidate.inputStart,
    );
    const matches = previous.filter((row) => matching(row, candidate, id));
    if (matches.length < 30 || uniqueDays(matches) < 14) continue;
    const predicted = counts(matches).up / matches.length;
    const baseline = counts(previous).up / previous.length;
    const actual = outcome(candidate.returnPct) === "up" ? 1 : 0;
    evaluated.push({
      inputStart: candidate.inputStart,
      error: (predicted - actual) ** 2,
      baseError: (baseline - actual) ** 2,
    });
  }
  const days = uniqueDays(evaluated),
    enough = evaluated.length >= 30 && days >= 14;
  const brier = enough
    ? evaluated.reduce((total, row) => total + row.error, 0) / evaluated.length
    : null;
  const baselineBrier = enough
    ? evaluated.reduce((total, row) => total + row.baseError, 0) /
      evaluated.length
    : null;
  return {
    status: enough ? "evaluated" : "insufficient",
    forecasts: evaluated.length,
    days,
    brier,
    baselineBrier,
    skillPct: baselineBrier > 0 ? 100 * (1 - brier / baselineBrier) : null,
    note: `${enough ? "Retrospective walk-forward Brier score for the >0.1% up event." : "At least 30 retrospective forecasts across 14 UTC dates are required to publish validation scores."} Each forecast needs ≥30 earlier matches across ≥14 dates; references and wallet observations must be known before its input begins. Evaluation uses the last 60 days. The baseline is the expanding earlier-reference up rate. This does not establish a validated live forecast.${enough && baselineBrier === 0 ? " Relative skill is undefined because the baseline Brier score is zero." : ""}`,
  };
}
function model({ id, candles, buckets, historyStart, historyEnd, now, stale }) {
  const candleTimes = [...candles.keys()];
  const latestCandleEnd = candleTimes.length
    ? Math.max(...candleTimes) + H
    : null;
  const currentEnd =
    latestCandleEnd === null
      ? historyEnd
      : Math.min(historyEnd, latestCandleEnd);
  const build = (end) =>
    id === "wallet"
      ? inputWallet(candles, buckets, end, historyStart)
      : inputPrice(candles, end, historyStart, true);
  const current = build(currentEnd);
  const referenceCutoff = current?.inputStart ?? historyEnd - INPUT;
  const currentStale =
    stale || !candles.has(historyEnd - H) || currentEnd !== historyEnd;
  const horizons = [6, 24].map((hours) => {
    const stride = (6 + hours) * H,
      references = [];
    // UTC epoch anchor makes the sampling grid stable as the six-month cutoff rolls.
    for (
      let start = Math.ceil(historyStart / stride) * stride;
      start + INPUT + hours * H <= referenceCutoff;
      start += stride
    ) {
      const features = build(start + INPUT),
        future = continuous(candles, start + INPUT, hours);
      if (!features || !future) continue;
      const exitPrice = future.at(-1).c,
        returnPct = 100 * (exitPrice / features.entryPrice - 1);
      if (!finite(returnPct)) continue;
      const outcomeEnd = start + INPUT + hours * H;
      references.push({
        ...features,
        outcomeEnd,
        exitPrice,
        returnPct,
        knownAt: Math.max(outcomeEnd, features.observedAt || 0),
      });
    }
    const matches = current
      ? references.filter((row) => matching(row, current, id))
      : [];
    const days = uniqueDays(matches),
      reasons = [];
    if (!current)
      reasons.push(
        id === "wallet"
          ? "Current input needs ≥3 wallets, ≥10 fills and ≥4 active hours, with continuous six-hour candles."
          : "Current input needs continuous six-hour candles and 20 hours of in-bound trend context.",
      );
    if (matches.length < 30)
      reasons.push(
        "At least 30 matched, non-overlapping reference windows required.",
      );
    if (days < 14) reasons.push("Matches must span at least 14 UTC dates.");
    if (currentStale)
      reasons.push(
        "The latest completed-hour candle or its upstream resource is stale/unavailable. Dated examples may remain; current estimates are withheld.",
      );
    const status = currentStale
      ? "stale"
      : reasons.length
        ? "insufficient"
        : "available";
    const baseCount = counts(references),
      baseDays = uniqueDays(references),
      baselineReady = references.length >= 30 && baseDays >= 14;
    return {
      hours,
      status,
      reasons,
      matches: matches.length,
      days,
      eligible: references.length,
      counts: counts(matches),
      baseline: {
        samples: references.length,
        days: baseDays,
        statistics: baselineReady
          ? {
              up: (100 * baseCount.up) / references.length,
              down: (100 * baseCount.down) / references.length,
              flat: (100 * baseCount.flat) / references.length,
            }
          : null,
      },
      statistics:
        status === "available" ? statistics(matches, references) : null,
      validation: validate(references, id, now),
      examples: matches.slice().reverse().map(publicExample),
    };
  });
  return {
    id,
    label:
      id === "wallet" ? "Wallet-flow analogues" : "Price-pattern analogues",
    basis:
      id === "wallet"
        ? "Six-hour wallet execution flows and price momentum"
        : "Price only: six-hour momentum, hourly true-range volatility and 20-hour trend",
    coverage: coverage(
      id === "wallet"
        ? [...buckets.keys()].filter((t) => candles.has(t))
        : candleTimes,
      historyEnd,
    ),
    current: publicCurrent(current),
    horizons,
  };
}

export function historicalProbability({
  coin,
  candleInput = [],
  flowRows = [],
  now = Date.now(),
  cohort = "all",
  priceStale = false,
  priceError = null,
} = {}) {
  const historyStart = sixMonthStart(now);
  if (historyStart === null)
    throw new TypeError(
      "historicalProbability needs a valid numeric UTC timestamp.",
    );
  const historyEnd = Math.floor(now / H) * H;
  const candles = new Map(
    [...cleanCandles(candleInput, coin, now)].filter(
      ([t]) => t >= historyStart && t + H <= historyEnd,
    ),
  );
  const buckets = cleanFlows(flowRows, historyStart, historyEnd, now);
  const models = ["wallet", "price"].map((id) =>
    model({
      id,
      candles,
      buckets,
      historyStart,
      historyEnd,
      now,
      stale: !!priceStale || !!priceError,
    }),
  );
  return {
    version: "historical-probability-v1",
    coin,
    cohort,
    asOf: now,
    historyStart,
    historyEnd,
    inputHours: 6,
    flatThresholdPct: FLAT,
    models,
    limitations: [
      "Percentages are empirical conditional frequencies in this sample, not validated forecasts or guaranteed future moves.",
      "Only the most recent six calendar months are used. Missing candles or executions are excluded, not filled with invented activity.",
      "Wallet results use the selected cohort and retained records; selection, survivorship and late collection can bias historical examples.",
      "Price-only results are an explicit separate model. They do not establish smart-money confirmation and omit news, funding and activity outside the sampled venue.",
      "Wilson intervals describe binomial sampling uncertainty. Regime changes and temporal dependence may make real uncertainty larger.",
    ],
    method:
      "Six-hour inputs; separate 6h and 24h outcomes. Non-overlapping reference blocks are anchored to UTC epoch with 12h and 30h spacing respectively. Every reference outcome finishes before the current input begins. Wallet matches: buy share ±15 percentage points, expansion ±25 points, momentum ±2 points with the same direction outside a ±0.1% neutral band. Price matches: momentum by the same rule; six-hour average hourly true range as a percent of input close within ±max(0.1 points, 50% of current volatility); distance from the 20-hour close average within ±1 point and the same direction outside the neutral band. All trend context and outcomes stay within six calendar months; candles must be continuous. Flat outcomes are −0.1% through +0.1%. Publication requires ≥30 matches across ≥14 UTC dates. Walk-forward validation uses only matured references and wallet records observed before each validation input begins, and never tunes these fixed matching rules.",
  };
}
