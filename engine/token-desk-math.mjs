import { executionFlow, fillId } from "./screener-math.mjs";
const H = 3600000,
  SIX = 6 * H;
const finite = (x) => Number.isFinite(Number(x));
export function cleanCandles(input, coin, now) {
  const map = new Map();
  for (const c of input || [])
    if (
      c.s === coin &&
      c.i === "1h" &&
      Number.isFinite(c.t) &&
      c.t % H === 0 &&
      c.T === c.t + H - 1 &&
      c.T < now &&
      [c.o, c.h, c.l, c.c].every((x) => finite(x) && Number(x) > 0) &&
      Number(c.h) >= Math.max(Number(c.o), Number(c.c)) &&
      Number(c.l) <= Math.min(Number(c.o), Number(c.c)) &&
      Number(c.h) >= Number(c.l)
    )
      map.set(c.t, {
        ...c,
        o: Number(c.o),
        h: Number(c.h),
        l: Number(c.l),
        c: Number(c.c),
      });
  return map;
}
export function executionSeries(records, coin, now) {
  const buckets = new Map(),
    seen = new Set(),
    feed = [];
  for (const r of records) {
    const f = r.fill,
      key = r.address + ":" + fillId(f);
    if (
      f.coin !== coin ||
      f.time > now ||
      f.time < now - 30 * 86400000 ||
      seen.has(key)
    )
      continue;
    const x = executionFlow(f);
    if (!x) continue;
    seen.add(key);
    const t = Math.floor(f.time / H) * H,
      b = buckets.get(t) || {
        t,
        longIn: 0,
        longOut: 0,
        shortIn: 0,
        shortOut: 0,
        fills: 0,
        addresses: new Set(),
      };
    for (const k of ["longIn", "longOut", "shortIn", "shortOut"]) b[k] += x[k];
    b.fills++;
    b.addresses.add(r.address);
    buckets.set(t, b);
    feed.push({
      address: r.address,
      time: f.time,
      coin,
      price: Number(f.px),
      size: Number(f.sz),
      notional: Number(f.px) * Number(f.sz),
      action: f.dir || "Execution",
      ...x,
    });
  }
  return { buckets, feed: feed.sort((a, b) => b.time - a.time) };
}
function segment(buckets, candles, end) {
  const sums = { longIn: 0, longOut: 0, shortIn: 0, shortOut: 0, fills: 0 },
    addresses = new Set();
  let observedHours = 0;
  const prices = [];
  for (let t = end - SIX; t < end; t += H) {
    const b = buckets.get(t),
      c = candles.get(t);
    if (!c) return null;
    prices.push(c);
    if (b) {
      observedHours++;
      for (const k of Object.keys(sums)) sums[k] += b[k];
      for (const a of b.addresses) addresses.add(a);
    }
  }
  const gross = sums.longIn + sums.longOut + sums.shortIn + sums.shortOut;
  if (!gross) return null;
  return {
    ...sums,
    addresses: addresses.size,
    observedHours,
    pressure: (sums.longIn + sums.shortOut) / gross,
    expansion:
      (sums.longIn + sums.shortIn - sums.longOut - sums.shortOut) / gross,
    momentum: (prices.at(-1).c / prices[0].o - 1) * 100,
    close: prices.at(-1).c,
  };
}
function wilson(wins, n) {
  const z = 1.96,
    p = wins / n,
    d = 1 + (z * z) / n,
    mid = (p + (z * z) / (2 * n)) / d,
    half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return [100 * (mid - half), 100 * (mid + half)];
}
const percentile = (a, p) => {
  const pos = (a.length - 1) * p,
    i = Math.floor(pos);
  return a[i] + (a[Math.min(i + 1, a.length - 1)] - a[i]) * (pos - i);
};
export function historicalAnalogues(buckets, candles, now) {
  const end = Math.floor(now / H) * H,
    current = segment(buckets, candles, end),
    examples = [],
    baseline = [];
  if (current)
    for (
      let t = Math.ceil((now - 30 * 86400000 + SIX) / (12 * H)) * 12 * H;
      t + SIX <= end - SIX;
      t += 12 * H
    ) {
      const past = segment(buckets, candles, t);
      if (
        !past ||
        past.addresses < 3 ||
        past.fills < 10 ||
        past.observedHours < 4
      )
        continue;
      const future = Array.from({ length: 6 }, (_, j) =>
        candles.get(t + j * H),
      );
      if (future.some((c) => !c)) continue;
      const change = (future.at(-1).c / past.close - 1) * 100;
      baseline.push(change);
      if (
        Math.abs(past.pressure - current.pressure) <= 0.15 &&
        Math.abs(past.expansion - current.expansion) <= 0.25 &&
        Math.sign(past.momentum) === Math.sign(current.momentum) &&
        Math.abs(past.momentum - current.momentum) <= 2
      )
        examples.push({
          time: t,
          pressure: past.pressure * 100,
          expansion: past.expansion * 100,
          momentum: past.momentum,
          forwardReturn: change,
          wallets: past.addresses,
        });
    }
  const days = new Set(
    examples.map((x) => new Date(x.time).toISOString().slice(0, 10)),
  ).size;
  const reasons = [];
  if (
    !current ||
    current.addresses < 3 ||
    current.fills < 10 ||
    current.observedHours < 4
  )
    reasons.push(
      "Current six-hour window needs ≥3 wallets, ≥10 fills and executions across ≥4 hours, with continuous hourly candles.",
    );
  if (examples.length < 30)
    reasons.push(
      "At least 30 matched, non-overlapping reference windows required.",
    );
  if (days < 14) reasons.push("Matches must span at least 14 UTC dates.");
  const sorted = examples.map((e) => e.forwardReturn).sort((a, b) => a - b),
    up = sorted.filter((x) => x > 0).length,
    down = sorted.filter((x) => x < 0).length;
  return {
    status: reasons.length ? "insufficient" : "descriptive",
    reasons,
    current: current ? { ...current, start: end - SIX, end } : null,
    samples: examples.length,
    days,
    eligible: baseline.length,
    examples: examples.slice(-20).reverse(),
    statistics: reasons.length
      ? null
      : {
          up: (up / sorted.length) * 100,
          down: (down / sorted.length) * 100,
          flat: ((sorted.length - up - down) / sorted.length) * 100,
          interval: wilson(up, sorted.length),
          median: percentile(sorted, 0.5),
          p10: percentile(sorted, 0.1),
          p90: percentile(sorted, 0.9),
          baselineUp:
            (baseline.filter((x) => x > 0).length / baseline.length) * 100,
        },
    method:
      "6h input + 6h outcome; reference starts every 12h, ends before the current input window. Matches: buy share ±15 percentage points, net-opening share ±25 points, momentum of the same sign within 2 percentage points. Current cohort and retained fills introduce selection and coverage bias. Frequencies and Wilson intervals describe this sample, not calibrated future probabilities; temporal dependence can widen uncertainty.",
  };
}
export function tokenTimeline(
  records,
  candleInput,
  coin,
  window,
  now = Date.now(),
) {
  const candles = cleanCandles(candleInput, coin, now),
    { buckets, feed } = executionSeries(records, coin, now);
  const duration =
      { "6h": 6 * H, "24h": 24 * H, "7d": 7 * 24 * H, "30d": 30 * 24 * H }[
        window
      ] || 24 * H,
    step = duration > 24 * H ? 24 * H : H,
    start = now - duration,
    first = Math.floor(start / step) * step,
    series = [];
  for (let t = first; t < now; t += step) {
    let longIn = 0,
      longOut = 0,
      shortIn = 0,
      shortOut = 0,
      fills = 0;
    const addresses = new Set();
    // The first bucket is explicitly partial; exclude fills before the requested window.
    for (const r of feed) {
      if (r.time < Math.max(t, start) || r.time >= t + step) continue;
      longIn += r.longIn;
      longOut += r.longOut;
      shortIn += r.shortIn;
      shortOut += r.shortOut;
      fills++;
      addresses.add(r.address);
    }
    const closed = [];
    for (let h = t; h < t + step; h += H) {
      const c = candles.get(h);
      if (c) closed.push(c);
    }
    const last = closed.at(-1),
      fullPrice = closed.length === step / H;
    series.push({
      t,
      inflow: fills ? longIn + shortIn : null,
      outflow: fills ? -(longOut + shortOut) : null,
      netBuy: fills ? longIn + shortOut - shortIn - longOut : null,
      longIn,
      longOut,
      shortIn,
      shortOut,
      price: fullPrice ? last.c : null,
      fills,
      wallets: addresses.size,
      partial: t < start || t + step > now,
    });
  }
  const recentCandles = Array.from({ length: 21 }, (_, j) =>
    candles.get(Math.floor(now / H) * H - (21 - j) * H),
  );
  let technical = null;
  if (recentCandles.every(Boolean)) {
    const last = recentCandles.at(-1),
      sma = recentCandles.slice(-20).reduce((s, c) => s + c.c, 0) / 20;
    const trs = recentCandles
      .slice(-14)
      .map((c, j) =>
        Math.max(
          c.h - c.l,
          Math.abs(c.h - recentCandles[j + 6].c),
          Math.abs(c.l - recentCandles[j + 6].c),
        ),
      );
    const deltas = recentCandles
        .slice(-14)
        .map((c, j) => c.c - recentCandles[j + 6].c),
      gain = deltas.reduce((s, x) => s + Math.max(0, x), 0),
      loss = deltas.reduce((s, x) => s + Math.max(0, -x), 0);
    technical = {
      price: last.c,
      at: last.T,
      sma20: sma,
      atr14: trs.reduce((s, x) => s + x, 0) / 14,
      rsi14: gain + loss === 0 ? 50 : (100 * gain) / (gain + loss),
      support: Math.min(...recentCandles.slice(-20).map((c) => c.l)),
      resistance: Math.max(...recentCandles.slice(-20).map((c) => c.h)),
      trend:
        last.c > sma
          ? "Above 20-hour average"
          : last.c < sma
            ? "Below 20-hour average"
            : "At 20-hour average",
    };
  }
  const activity = {};
  for (const f of feed) {
    if (f.time < start) continue;
    const row = (activity[f.address] ||= {
      fills: 0,
      netBuy: 0,
      notional: 0,
      last: f.time,
    });
    row.fills++;
    row.netBuy += f.longIn + f.shortOut - f.shortIn - f.longOut;
    row.notional += f.notional;
  }
  return {
    series,
    windows: [1, 6, 24, 168, 720].map((hours) => {
      const since = now - hours * H,
        selected = feed.filter((f) => f.time >= since);
      const wallets = new Set(),
        byWallet = new Map();
      let longIn = 0,
        longOut = 0,
        shortIn = 0,
        shortOut = 0;
      for (const f of selected) {
        wallets.add(f.address);
        longIn += f.longIn;
        longOut += f.longOut;
        shortIn += f.shortIn;
        shortOut += f.shortOut;
        byWallet.set(f.address, (byWallet.get(f.address) || 0) + f.notional);
      }
      const firstCandle = candles.get(Math.floor(since / H) * H),
        lastCandle = candles.get(Math.floor(now / H) * H - H);
      // Price/flow interpretations use the same complete hourly buckets.
      const priceStart = Math.ceil(since / H) * H,
        priceEnd = Math.floor(now / H) * H;
      let continuous = priceEnd > priceStart;
      for (let t = priceStart; t < priceEnd; t += H)
        if (!candles.has(t)) continuous = false;
      const matched = selected.filter(
        (f) => f.time >= priceStart && f.time < priceEnd,
      );
      const priceContext = continuous
        ? {
            start: priceStart,
            end: priceEnd,
            completedHours: (priceEnd - priceStart) / H,
            priceChange:
              100 *
              (candles.get(priceEnd - H).c / candles.get(priceStart).o - 1),
            netBuy: matched.reduce(
              (s, f) => s + f.longIn + f.shortOut - f.shortIn - f.longOut,
              0,
            ),
            grossActivity: matched.reduce((s, f) => s + f.notional, 0),
            fills: matched.length,
            wallets: new Set(matched.map((f) => f.address)).size,
          }
        : null;
      const gross = longIn + longOut + shortIn + shortOut;
      return {
        label: hours === 168 ? "7d" : hours === 720 ? "30d" : `${hours}h`,
        hours,
        longIn,
        longOut,
        shortIn,
        shortOut,
        inflow: longIn + shortIn,
        outflow: longOut + shortOut,
        netBuy: longIn + shortOut - shortIn - longOut,
        openingNet: longIn + shortIn - longOut - shortOut,
        fills: selected.length,
        wallets: wallets.size,
        topShare: gross ? Math.max(0, ...byWallet.values()) / gross : null,
        priceContext,
        priceChange:
          firstCandle && lastCandle
            ? 100 * (lastCandle.c / firstCandle.o - 1)
            : null,
      };
    }),
    activity,
    feed: feed.filter((f) => f.time >= start).slice(0, 100),
    analogues: historicalAnalogues(buckets, candles, now),
    technical,
    start,
    end: now,
    window,
  };
}
