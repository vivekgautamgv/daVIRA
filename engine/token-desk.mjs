import { db, cached, watchlist } from "./db.mjs";
import { resource, info, markets, globalMarkets } from "./upstream.mjs";
import { pilotWallets } from "./coverage.mjs";
import { tokenTimeline } from "./token-desk-math.mjs";
import { instrumentClass } from "./screener-math.mjs";
import { collectionState } from "./token-collection.mjs";
import { decisionBrief } from "./decision-brief.mjs";
import { tokenRecordEvidence } from "./market-read.mjs";
import { historicalProbability } from "./probability-math.mjs";
import {
  probabilityFlowRows,
  probabilityCandles,
  saveProbabilityCandles,
} from "./probability-history.mjs";
import { createProbabilitySource } from "./probability-source.mjs";
const probabilitySource = createProbabilitySource({
  resource,
  cached,
  info,
  load: probabilityCandles,
  save: saveProbabilityCandles,
});
const resultCache = new Map();
const fresh = (t, now) => Number.isFinite(t) && t <= now && now - t < 3600000;
export async function tokenDesk(coin, window = "24h", cohort = "all") {
  const now = Date.now(),
    key = `${coin}:${window}:${cohort}`,
    old = resultCache.get(key);
  if (
    old &&
    now - old.updatedAt < 30000 &&
    Math.floor(now / 3600000) === Math.floor(old.updatedAt / 3600000)
  )
    return old;
  const market = coin.includes(":") ? await globalMarkets() : await markets();
  const listed = (coin.includes(":") ? market.data.markets : market.data).find(
    (m) => m.coin === coin,
  );
  if (!listed)
    throw Object.assign(Error("Select a currently listed covered market."), {
      status: 400,
    });
  const history = await probabilitySource(coin, now);
  const analyses = db
    .prepare("SELECT address,value FROM wallet_analysis")
    .all()
    .map((r) => ({ address: r.address, a: JSON.parse(r.value) }));
  const pilot = new Set(pilotWallets()),
    followed = new Set(watchlist().map((w) => w.address)),
    eligible = new Set(
      analyses
        .filter((r) =>
          cohort === "pilot"
            ? pilot.has(r.address)
            : cohort === "watchlist"
              ? followed.has(r.address)
              : true,
        )
        .map((r) => r.address),
    );
  const records = db
    .prepare(
      "SELECT address,value FROM wallet_fills WHERE coin=? AND time>=? AND time<=? ORDER BY time",
    )
    .all(coin, now - 30 * 86400000, now)
    .filter((r) => eligible.has(r.address))
    .map((r) => ({ address: r.address, fill: JSON.parse(r.value) }));
  const names = new Map(
    (cached("leaderboard")?.data || []).map((w) => [w.address, w.name]),
  );
  const rows = [];
  for (const { address, a } of analyses) {
    if (!eligible.has(address)) continue;
    const token = a.coins?.find((c) => c.coin === coin);
    let positions = a.positions || [],
      at = a.positionsAt,
      available = !a.positionsStale;
    if (coin.includes(":")) {
      const dex = coin.split(":")[0],
        v = a.builderCoverage?.find((b) => b.dex === dex),
        snapshot = cached(`builder-account:${dex}:${address}`);
      at = v?.updatedAt;
      available = !!v?.available && !v?.stale;
      if (snapshot && snapshot.updatedAt >= (at || 0)) {
        at = snapshot.updatedAt;
        available = true;
        positions = (snapshot.data.assetPositions || []).map(
          ({ position: p }) => ({
            coin: p.coin,
            size: Number(p.szi),
            value: Number(p.positionValue),
            entry: Number(p.entryPx),
            unrealized: Number(p.unrealizedPnl),
            leverage: p.leverage?.value || 0,
          }),
        );
      }
    } else {
      const snapshot = cached(`account:${address}`);
      if (snapshot && snapshot.updatedAt >= (at || 0)) {
        at = snapshot.updatedAt;
        available = true;
        positions = snapshot.data.positions;
      }
    }
    const p = positions.find((p) => p.coin === coin),
      isFresh = available && fresh(at, now);
    if (!token && !p) continue;
    const evidence = tokenRecordEvidence(a, token, now);
    rows.push({
      address,
      name: names.get(address) || null,
      token: token || null,
      position: isFresh && p ? p : null,
      positionState: isFresh ? (p ? "Open" : "Flat") : "Unavailable",
      positionAt: at || null,
      analysisAt: a.fillsFetchedAt || a.updatedAt,
      qualified: evidence.qualified,
      qualificationReasons: evidence.reasons,
    });
  }
  rows.sort(
    (a, b) =>
      Number(b.qualified) - Number(a.qualified) ||
      (b.token?.score ?? -1) - (a.token?.score ?? -1) ||
      (b.token?.netPnl || 0) - (a.token?.netPnl || 0),
  );
  const live = rows.filter((r) => r.position),
    long = live.filter((r) => r.position.size > 0),
    short = live.filter((r) => r.position.size < 0),
    sum = (xs) => xs.reduce((s, r) => s + r.position.value, 0);
  const timeline = tokenTimeline(
    records,
    history?.data || [],
    coin,
    window,
    now,
  );
  for (const row of rows) row.activity = timeline.activity[row.address] || null;
  const result = {
    ...timeline,
    coin,
    assetClass: instrumentClass(coin),
    cohort,
    updatedAt: now,
    market: listed,
    marketAt: market.updatedAt,
    marketStale: market.stale,
    priceAt: history?.updatedAt || null,
    priceStale: !!history?.stale,
    priceError: history?.error || null,
    collection: collectionState(coin),
    rows,
    positioning: {
      long: sum(long),
      short: sum(short),
      longWallets: long.length,
      shortWallets: short.length,
      flatWallets: rows.filter((r) => r.positionState === "Flat").length,
      unavailable: rows.filter((r) => r.positionState === "Unavailable").length,
      top: live.sort((a, b) => b.position.value - a.position.value).slice(0, 5),
    },
    coverage: {
      wallets: eligible.size,
      contributors: new Set(records.map((r) => r.address)).size,
      fills: records.length,
      freshAnalyses: analyses.filter(
        (r) => eligible.has(r.address) && fresh(r.a.fillsFetchedAt, now),
      ).length,
      freshTokenAnalyses: rows.filter((r) => fresh(r.analysisAt, now)).length,
      first: records[0]?.fill.time ?? null,
      last: records.at(-1)?.fill.time ?? null,
    },
  };
  result.probability = historicalProbability({
    coin,
    cohort,
    candleInput: history.data,
    flowRows: probabilityFlowRows(coin, eligible, now),
    now,
    priceStale: !!history.stale && !history.completedHistoryCurrent,
    priceError: history.completedHistoryCurrent ? null : history.error || null,
  });
  result.probability.source = {
    priceAt: history.updatedAt,
    priceStale: !!history.stale,
    priceError: history.error || null,
    completedHistoryCurrent: history.completedHistoryCurrent,
    completedThrough: history.completedHistoryCurrent
      ? Math.floor(now / 3600000) * 3600000
      : null,
    walletArchiveNote:
      "Observed executions in the selected current wallet cohort; missing hours do not imply no market activity. Archived aggregates are retained for six calendar months.",
  };
  result.decision = decisionBrief(result);
  resultCache.set(key, result);
  if (resultCache.size > 30)
    resultCache.delete(resultCache.keys().next().value);
  return result;
}
