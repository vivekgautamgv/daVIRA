import { captureDailyWallets } from "./daily-wallets.mjs";
import { reportedNumber } from "./leaderboard-values.mjs";
import { db, cached, saveCache } from "./db.mjs";
export const health = {
  startedAt: Date.now(),
  lastMarket: 0,
  lastTrade: 0,
  websocket: "connecting",
  failures: {},
  requests: 0,
  weight: 0,
};
const inflight = new Map();
let windowStart = Date.now();
export async function info(body, weight = 20) {
  // Reserve the maximum extra response weight before dispatch, not after it.
  if (["userFillsByTime", "userFills", "userFunding"].includes(body.type))
    weight = Math.max(weight, 120);
  if (Date.now() - windowStart > 60000) {
    windowStart = Date.now();
    health.weight = 0;
  }
  if (health.weight + weight > 900)
    throw Error("Data request budget reached. Try again shortly.");
  health.weight += weight;
  health.requests++;
  const r = await fetch("https://api.hyperliquid.xyz/info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(18000),
  });
  if (!r.ok) throw Error(`Hyperliquid returned ${r.status}`);
  const data = await r.json();
  return data;
}
export async function resource(key, ttl, loader) {
  const old = cached(key);
  if (old && Date.now() - old.updatedAt < ttl) return { ...old, stale: false };
  const failed = health.failures[key];
  if (failed && Date.now() - failed.time < 30000) {
    if (old) return { ...old, stale: true, error: failed.message };
    throw Error(failed.message);
  }
  if (inflight.has(key)) return inflight.get(key);
  const work = (async () => {
    try {
      const data = await loader();
      delete health.failures[key];
      return { ...saveCache(key, data), stale: false };
    } catch (e) {
      health.failures[key] = { message: e.message, time: Date.now() };
      if (old) return { ...old, stale: true, error: e.message };
      throw e;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, work);
  return work;
}
export function category(coin) {
  const name = coin.split(":").pop();
  if (coin.includes(":")) return "Global markets";
  if (["ONDO", "OM"].includes(name)) return "RWA-related";
  if (["PAXG", "XAUT"].includes(name)) return "Gold-linked";
  if (
    [
      "DOGE",
      "PEPE",
      "WIF",
      "BONK",
      "FARTCOIN",
      "kPEPE",
      "kBONK",
      "TRUMP",
      "PUMP",
    ].includes(name)
  )
    return "Memes";
  if (["TAO", "FET", "RENDER", "VIRTUAL", "AI16Z"].includes(name)) return "AI";
  if (
    [
      "AAVE",
      "UNI",
      "ENA",
      "MKR",
      "LDO",
      "CRV",
      "JUP",
      "MORPHO",
      "PENDLE",
    ].includes(name)
  )
    return "DeFi";
  return "Crypto";
}
export async function markets() {
  const result = await resource("markets", 30000, async () => {
    const [meta, contexts] = await info({ type: "metaAndAssetCtxs" });
    return meta.universe
      .map((a, i) => {
        const c = contexts[i] || {},
          price = Number(c.markPx || 0),
          prev = Number(c.prevDayPx || 0);
        return {
          coin: a.name,
          price,
          change: prev ? (price / prev - 1) * 100 : 0,
          volume: Number(c.dayNtlVlm || 0),
          openInterest: Number(c.openInterest || 0) * price,
          funding: Number(c.funding || 0),
          maxLeverage: a.maxLeverage,
          category: category(a.name),
          delisted: !!a.isDelisted,
          dex: "",
        };
      })
      .filter((x) => !x.delisted && x.price > 0)
      .sort((a, b) => b.volume - a.volume);
  });
  health.lastMarket = result.updatedAt;
  return result;
}
export async function leaderboard() {
  const result = await resource("leaderboard", 6 * 3600000, async () => {
    const r = await fetch(
      "https://stats-data.hyperliquid.xyz/Mainnet/leaderboard",
      { signal: AbortSignal.timeout(25000) },
    );
    if (!r.ok) throw Error(`Leaderboard returned ${r.status}`);
    const d = await r.json();
    return d.leaderboardRows
      .map((row) => {
        const w = Object.fromEntries(row.windowPerformances || []);
        return {
          address: row.ethAddress.toLowerCase(),
          name: row.displayName || null,
          equity: reportedNumber(row.accountValue),
          pnl1d: reportedNumber(w.day?.pnl),
          pnl7d: reportedNumber(w.week?.pnl),
          pnl30d: reportedNumber(w.month?.pnl),
          roi30d:
            reportedNumber(w.month?.roi) == null
              ? null
              : reportedNumber(w.month?.roi) * 100,
          volume30d: reportedNumber(w.month?.vlm),
        };
      })
      .sort(
        (a, b) =>
          (b.pnl30d ?? -Infinity) - (a.pnl30d ?? -Infinity) ||
          a.address.localeCompare(b.address),
      )
      .slice(0, 2000);
  });
  captureDailyWallets(db, result);
  return result;
}
export async function candles(coin, interval = "1h") {
  return resource(`candles:${coin}:${interval}`, 60000, () =>
    info({
      type: "candleSnapshot",
      req: {
        coin,
        interval,
        startTime: Date.now() - 7 * 86400000,
        endTime: Date.now(),
      },
    }),
  );
}
export async function globalMarkets() {
  return resource("global-markets", 120000, async () => {
    const dexes = await resource("dexes", 86400000, () =>
      info({ type: "perpDexs" }),
    );
    const selected = dexes.data.filter(Boolean).slice(0, 3);
    const results = await Promise.allSettled(
      selected.map(async (d) => {
        const [meta, contexts] = await info({
          type: "metaAndAssetCtxs",
          dex: d.name,
        });
        return meta.universe
          .map((a, i) => {
            const c = contexts[i] || {},
              price = Number(c.markPx || 0),
              prev = Number(c.prevDayPx || 0);
            return {
              coin: a.name,
              price,
              change: prev ? (price / prev - 1) * 100 : 0,
              volume: Number(c.dayNtlVlm || 0),
              openInterest: Number(c.openInterest || 0) * price,
              funding: Number(c.funding || 0),
              maxLeverage: a.maxLeverage,
              category: "Global markets",
              delisted: !!a.isDelisted,
              dex: d.name,
            };
          })
          .filter((x) => !x.delisted && x.price > 0);
      }),
    );
    if (results.every((r) => r.status === "rejected"))
      throw Error("Builder market sources are unavailable.");
    return {
      markets: results
        .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
        .sort((a, b) => b.volume - a.volume),
      coverage: selected.map((d, i) => ({
        dex: d.name,
        ok: results[i].status === "fulfilled",
      })),
    };
  });
}
export async function cex() {
  return resource("cex", 60000, async () => {
    const r = await fetch(
      "https://api.bybit.com/v5/market/tickers?category=linear",
      { signal: AbortSignal.timeout(12000) },
    );
    if (!r.ok)
      throw Error(
        `Bybit returned ${r.status}; this source may be region-restricted.`,
      );
    const d = await r.json();
    if (d.retCode !== 0) throw Error(d.retMsg || "CEX data unavailable");
    return d.result.list
      .filter((m) => m.symbol.endsWith("USDT"))
      .map((m) => ({
        coin: m.symbol.slice(0, -4),
        price: Number(m.lastPrice),
        funding: Number(m.fundingRate),
        nextFundingTime: Number(m.nextFundingTime),
        source: "Bybit USDT perpetual",
      }));
  });
}
