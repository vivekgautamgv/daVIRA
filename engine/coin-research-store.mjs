import { db, watchlist } from "./db.mjs";
import { coinResearch } from "./coin-research.mjs";
const cache = new Map();
export function researchForCoin(coin, window = "24h") {
  const duration =
    { "1h": 3600000, "6h": 21600000, "24h": 86400000, "7d": 604800000 }[
      window
    ] || 86400000;
  const now = Date.now(),
    key = `${coin}:${duration}`,
    old = cache.get(key);
  if (old && now - old.updatedAt < 15000) return old;
  const records = db
    .prepare(
      "SELECT address,value FROM wallet_fills WHERE coin=? AND time>=? AND time<=? ORDER BY time",
    )
    .all(coin, now - 30 * 86400000, now)
    .map((r) => ({ address: r.address, fill: JSON.parse(r.value) }));
  const analyses = new Map(
    db
      .prepare("SELECT address,value FROM wallet_analysis")
      .all()
      .map((r) => [r.address, JSON.parse(r.value)]),
  );
  const result = coinResearch({
    coin,
    records,
    analyses,
    followed: new Set(watchlist().map((w) => w.address)),
    now,
    duration,
  });
  cache.set(key, result);
  if (cache.size > 30) cache.delete(cache.keys().next().value);
  return result;
}
