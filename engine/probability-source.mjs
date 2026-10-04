import { sixMonthStart } from "./probability-math.mjs";
import { cleanCandles } from "./token-desk-math.mjs";

const H = 3600000;

export function completedHistoryCurrent(candles, coin, now) {
  const end = Math.floor(now / H) * H,
    clean = cleanCandles(candles, coin, now);
  return Array.from({ length: 20 }, (_, j) => end - (j + 1) * H).every((t) =>
    clean.has(t),
  );
}

// The first request obtains six months; later requests refresh only recent
// candles. Completed candles are retained separately from the response cache.
export function createProbabilitySource({
  resource,
  cached,
  info,
  load,
  save,
}) {
  return async function probabilitySource(coin, now = Date.now()) {
    const key = `probability-candles:${coin}:1h:v1`;
    const seed = cached(`token-candles:${coin}:1h`);
    if (!load(coin, now).length && seed?.data) save(coin, seed.data, now);
    const previous = cached(key),
      ttl =
        previous && Math.floor(previous.updatedAt / H) < Math.floor(now / H)
          ? 0
          : 300000;
    try {
      const result = await resource(key, ttl, async () => {
        const initial = !cached(key);
        const candles = await info(
          {
            type: "candleSnapshot",
            req: {
              coin,
              interval: "1h",
              startTime: initial
                ? sixMonthStart(now)
                : Math.max(sixMonthStart(now), now - 48 * H),
              endTime: now,
            },
          },
          initial ? 100 : 20,
        );
        if (!Array.isArray(candles) || !candles.length)
          throw Error("Historical candle source returned an invalid response.");
        save(coin, candles, now);
        return load(coin, now);
      });
      // Recover a cache retained independently of its archive after a restore.
      // Ordinary cache hits never rewrite thousands of completed candles.
      if (!load(coin, now).length && result.data?.length)
        save(coin, result.data, now);
      // Archived reads enforce today's calendar cutoff even on cached responses.
      const data = load(coin, now);
      return {
        ...result,
        data,
        completedHistoryCurrent: completedHistoryCurrent(data, coin, now),
      };
    } catch (e) {
      const data = load(coin, now);
      return {
        data,
        updatedAt: seed?.updatedAt || null,
        stale: true,
        error: e.message,
        completedHistoryCurrent: completedHistoryCurrent(data, coin, now),
      };
    }
  };
}
