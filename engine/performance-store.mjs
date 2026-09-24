import { db } from "./db.mjs";
import { walletPerformance } from "./wallet-performance.mjs";
const cache = new Map();
export function performanceForWallet(
  address,
  days,
  coin = "",
  now = Date.now(),
) {
  const row = db
    .prepare("SELECT value,updated_at FROM wallet_analysis WHERE address=?")
    .get(address);
  const key = `${address}:${days}:${coin}`,
    hit = cache.get(key);
  if (hit && now - hit.at < 30000 && hit.version === row?.updated_at)
    return hit.result;
  const fills = db
    .prepare(
      "SELECT value FROM wallet_fills WHERE address=? AND time>=? AND time<=? ORDER BY time",
    )
    .all(address, now - 30 * 86400000, now)
    .map((r) => JSON.parse(r.value));
  const a = row ? JSON.parse(row.value) : null;
  const result = {
    ...walletPerformance(fills, { days, coin, now }),
    address,
    updatedAt: now,
    sourceAt: a?.fillsFetchedAt ?? null,
    stale:
      !a?.fillsFetchedAt ||
      now - a.fillsFetchedAt > 3600000 ||
      a.fillsFetchedAt > now,
    capped: a?.latestResponseCount >= 2000,
  };
  cache.set(key, { at: now, version: row?.updated_at, result });
  if (cache.size > 50) cache.delete(cache.keys().next().value);
  return result;
}
