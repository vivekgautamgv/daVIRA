import { db, cached, saveCache, watchlist } from "./db.mjs";
import { leaderboard, markets, health } from "./upstream.mjs";
import { observeWallet } from "./wallet.mjs";
import { enqueueAnalysis } from "./screener.mjs";
import { hasTokenRecord } from "./market-read.mjs";
import { pilotWallets } from "./coverage.mjs";
let running = false;
export async function refreshCohort() {
  if (running) return;
  const old = cached("research-cohort");
  if (old && Date.now() - old.updatedAt < 300000) return;
  running = true;
  try {
    // Keep priority refresh scheduling independent of leaderboard availability.
    for (const w of watchlist()) enqueueAnalysis(w.address, 5);
    for (const address of pilotWallets()) enqueueAnalysis(address, 4);
    const leaders = await leaderboard();
    const selected = leaders.data
      .filter(
        (w) =>
          w.equity >= 50000 &&
          w.pnl7d > 0 &&
          w.pnl30d > 0 &&
          w.volume30d >= 100000,
      )
      .slice(0, 40);
    // Broader execution archive; position polling remains bounded to 40.
    const discovery = leaders.data
      .filter((w) => w.equity >= 1000 && w.volume30d >= 100000)
      .slice(0, 200);
    for (const w of discovery) enqueueAnalysis(w.address);
    // Prioritize demonstrated token records below followed-wallet monitoring.
    for (const row of db
      .prepare("SELECT address,value FROM wallet_analysis")
      .all()) {
      if (JSON.parse(row.value).coins?.some(hasTokenRecord))
        enqueueAnalysis(row.address, 3);
    }
    for (let i = 0; i < selected.length; i += 3)
      await Promise.allSettled(
        selected.slice(i, i + 3).map((w) => observeWallet(w.address)),
      );
    saveCache("research-cohort", {
      wallets: selected,
      leaderboardAt: leaders.updatedAt,
      leaderboardStale: leaders.stale,
    });
  } catch (e) {
    health.failures.cohort = { message: e.message, time: Date.now() };
  } finally {
    running = false;
  }
}
export async function intelligence() {
  const market = await markets(),
    cohort = cached("research-cohort"),
    tracked = watchlist(),
    pool = new Map(
      (cohort?.data.wallets || []).map((w) => [
        w.address,
        { ...w, source: "Research sample" },
      ]),
    );
  for (const w of tracked)
    pool.set(w.address, {
      ...(pool.get(w.address) || {}),
      address: w.address,
      name: w.label || pool.get(w.address)?.name,
      source: "Your watchlist",
    });
  const wallets = [...pool.values()].map((w) => {
    const snapshot = cached(`account:${w.address}`);
    return {
      ...w,
      account: snapshot?.data || null,
      updatedAt: snapshot?.updatedAt || null,
      fresh: !!snapshot && Date.now() - snapshot.updatedAt < 600000,
    };
  });
  const fresh = wallets.filter((w) => w.fresh),
    byCoin = new Map();
  for (const w of fresh)
    for (const p of w.account.positions) {
      let c = byCoin.get(p.coin);
      if (!c) {
        c = {
          coin: p.coin,
          long: 0,
          short: 0,
          longWallets: 0,
          shortWallets: 0,
          positions: [],
          largest: 0,
        };
        byCoin.set(p.coin, c);
      }
      c[p.size > 0 ? "long" : "short"] += p.value;
      c[p.size > 0 ? "longWallets" : "shortWallets"]++;
      c.largest = Math.max(c.largest, p.value);
      c.positions.push({
        address: w.address,
        name: w.name,
        source: w.source,
        size: p.size,
        value: p.value,
        equity: w.account.equity,
        unrealized: p.unrealized,
        leverage: p.leverage,
        updatedAt: w.updatedAt,
      });
    }
  const exposures = [...byCoin.values()]
    .map((c) => {
      const m = market.data.find((x) => x.coin === c.coin);
      return {
        ...c,
        net: c.long - c.short,
        gross: c.long + c.short,
        largestShare: (c.largest / (c.long + c.short)) * 100,
        price: m?.price || null,
        change: m?.change || 0,
        funding: m?.funding || 0,
        category: m?.category || "Crypto",
      };
    })
    .sort((a, b) => b.gross - a.gross);
  return {
    wallets,
    exposures,
    movements: db
      .prepare("SELECT * FROM movements ORDER BY time DESC LIMIT 150")
      .all(),
    signals: db
      .prepare("SELECT * FROM signals WHERE type=? ORDER BY time DESC LIMIT 6")
      .all("position"),
    updatedAt: market.updatedAt,
    cohortAt: cohort?.updatedAt || null,
    leaderboardAt: cohort?.data.leaderboardAt || null,
    stale: market.stale,
    freshWallets: fresh.length,
    coverage:
      "Automatic research sample: up to 40 leaderboard wallets with positive 7D and 30D PnL, equity ≥ $50,000 and 30D volume ≥ $100,000, ranked by 30D PnL. Plus your watchlist. Snapshots older than 10 minutes are excluded from exposure totals. This selection has survivorship bias and is not a verified smart-money classification.",
  };
}
