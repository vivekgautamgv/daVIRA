const HOUR = 3600000;
const finitePositive = (v) => Number.isFinite(v) && v > 0;

/** Price levels are research scenarios, not exchange orders or price forecasts.
 * Only completed, contiguous hourly candles may set a structural stop. */
export function buildTradeSetup({
  coin,
  read,
  quote,
  history,
  now = Date.now(),
  window = "24h",
}) {
  const reasons = [...(read?.reasons || [])];
  const side =
    read?.action === "Long bias"
      ? "long"
      : read?.action === "Short bias"
        ? "short"
        : null;
  if (!side && !reasons.length)
    reasons.push(
      read?.action === "Hold / neutral"
        ? "Wallet positioning is neutral; no new entry is proposed."
        : "No qualified directional wallet evidence.",
    );
  const market = quote?.data?.find((m) => m.coin === coin);
  if (market && !finitePositive(market.price))
    reasons.push("The market quote does not contain a valid positive price.");
  if (!market)
    reasons.push(
      "Price coverage is limited to listed main Hyperliquid perpetuals.",
    );
  if (
    quote?.stale ||
    !Number.isFinite(quote?.updatedAt) ||
    now - quote.updatedAt > 120000 ||
    quote.updatedAt > now + 5000
  )
    reasons.push(
      "A fresh market quote is required (maximum age: two minutes).",
    );
  if (
    history?.stale ||
    !Number.isFinite(history?.updatedAt) ||
    now - history.updatedAt > 120000 ||
    history.updatedAt > now + 5000
  )
    reasons.push("A fresh hourly candle snapshot is required.");
  const result = {
    coin,
    window,
    side,
    status: "wait",
    generatedAt: now,
    expiresAt: Math.min(
      now + 120000,
      (quote?.updatedAt || now) + 120000,
      (history?.updatedAt || now) + 120000,
    ),
    quoteAt: quote?.updatedAt || null,
    candleSnapshotAt: history?.updatedAt || null,
    read: read || null,
    market: market || null,
    reasons,
    levels: null,
    method:
      "Closed 1H candles · ATR14 (simple mean of true range) · 12-bar structure · 20-bar trend filter",
  };
  if (!Array.isArray(history?.data)) {
    reasons.push("Hourly candle history is unavailable.");
    return result;
  }
  const closed = history.data
    .filter((c) => Number(c.T) < now)
    .sort((a, b) => Number(a.t) - Number(b.t))
    .slice(-30)
    .map((c) => ({
      t: Number(c.t),
      T: Number(c.T),
      o: Number(c.o),
      h: Number(c.h),
      l: Number(c.l),
      c: Number(c.c),
      symbol: c.s,
      interval: c.i,
    }));
  if (closed.length < 30)
    reasons.push("At least 30 completed hourly candles are required.");
  const malformed = closed.some(
    (c, i) =>
      ![c.o, c.h, c.l, c.c].every(finitePositive) ||
      !Number.isFinite(c.t) ||
      !Number.isFinite(c.T) ||
      c.T < c.t ||
      Math.abs(c.T - c.t + 1 - HOUR) > 1 ||
      c.h < Math.max(c.o, c.c, c.l) ||
      c.l > Math.min(c.o, c.c) ||
      (c.symbol && c.symbol !== coin) ||
      (c.interval && c.interval !== "1h") ||
      (i > 0 && c.t - closed[i - 1].t !== HOUR),
  );
  if (malformed)
    reasons.push(
      "Hourly candles contain invalid prices, duplicates, or a gap.",
    );
  const latest = closed.at(-1);
  if (!latest || now - latest.T > 75 * 60000)
    reasons.push("The last completed hourly candle is too old.");
  if (
    closed.length < 30 ||
    malformed ||
    !market ||
    !finitePositive(market.price)
  )
    return result;
  const ranges = closed
    .slice(1)
    .map((c, i) =>
      Math.max(
        c.h - c.l,
        Math.abs(c.h - closed[i].c),
        Math.abs(c.l - closed[i].c),
      ),
    );
  const atr = ranges.slice(-14).reduce((n, v) => n + v, 0) / 14;
  const trend = closed.slice(-20).reduce((n, c) => n + c.c, 0) / 20;
  if (!finitePositive(atr))
    reasons.push("Price volatility is unavailable or zero.");
  if (side && (side === "long" ? latest.c < trend : latest.c > trend))
    reasons.push(
      "The completed-hour price trend disagrees with the wallet direction.",
    );
  if (Math.abs(market.price - latest.c) > 1.5 * atr)
    reasons.push(
      "Price moved more than 1.5 ATR from the last completed hour; wait for a new reference.",
    );
  if (!side || reasons.length) return result;
  const entry = market.price,
    sign = side === "long" ? 1 : -1;
  const structure =
    side === "long"
      ? Math.min(...closed.slice(-12).map((c) => c.l))
      : Math.max(...closed.slice(-12).map((c) => c.h));
  const structureStop = structure - sign * 0.25 * atr;
  const volatilityStop = entry - sign * 1.5 * atr;
  const stop =
    side === "long"
      ? Math.min(structureStop, volatilityStop, entry * 0.998)
      : Math.max(structureStop, volatilityStop, entry * 1.002);
  const distance = Math.abs(entry - stop),
    stopPct = (distance / entry) * 100;
  if (!finitePositive(stop) || stopPct > 8) {
    reasons.push(
      "The structural stop exceeds the 8% model limit; wait for a tighter setup.",
    );
    return result;
  }
  result.status = "candidate";
  result.levels = {
    entry,
    stop,
    distance,
    stopPct,
    atr,
    trend,
    structure,
    candleClosedAt: latest.T,
    targets: [1, 2, 3]
      .map((r) => ({ r, price: entry + sign * r * distance }))
      .filter((t) => t.price > 0),
  };
  return result;
}
