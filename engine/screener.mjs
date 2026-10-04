import { dailyWallets, walletDailyHistory } from "./daily-wallets.mjs";
import { recordCollection, pilotWallets } from "./coverage.mjs";
import { selectAnalysisJob } from "./queue-policy.mjs";
import { walletEvidence } from "./wallet-evidence.mjs";
import { marketRead, analysisFresh, hasTokenRecord } from "./market-read.mjs";
import { positioningBrief } from "./positioning-brief.mjs";
import { marketContexts } from "./market-history.mjs";
import { portfolioEvidence } from "./portfolio-evidence.mjs";
import { candidatePolicy } from "./candidate-policy.mjs";
import { db, cached, saveCache, watchlist, getSetting } from "./db.mjs";
import { info, resource, leaderboard, health } from "./upstream.mjs";
import { account } from "./wallet.mjs";
import { flowInsights } from "./flow-insights.mjs";
import { D } from "./analytics.mjs";
import {
  initializeProbabilityHistory,
  archiveFill,
  cleanupProbabilityHistory,
} from "./probability-history.mjs";
import {
  analyzeExecutions,
  fillId,
  instrumentClass,
  isRwa,
  executionFlow,
} from "./screener-math.mjs";
let working = false;
let priorityStreak = 0;
export function refreshStoredAnalyses() {
  for (const row of db
    .prepare("SELECT address,value FROM wallet_analysis")
    .all()) {
    const old = JSON.parse(row.value);
    if (old.analyticsVersion >= 2) continue;
    const fills = db
      .prepare("SELECT value FROM wallet_fills WHERE address=? ORDER BY time")
      .all(row.address)
      .map((r) => JSON.parse(r.value));
    const updated = {
      ...old,
      ...analyzeExecutions(fills, old.positions),
      analyticsVersion: 2,
    };
    db.prepare("UPDATE wallet_analysis SET value=? WHERE address=?").run(
      JSON.stringify(updated),
      row.address,
    );
  }
}
export function enqueueAnalysis(address, priority = 0) {
  const existing = db
    .prepare("SELECT updated_at,value FROM wallet_analysis WHERE address=?")
    .get(address);
  if (
    existing &&
    JSON.parse(existing.value).analyticsVersion >= 4 &&
    Date.now() - existing.updated_at < 1800000
  )
    return false;
  const queued = db
    .prepare("SELECT address FROM analysis_queue WHERE address=?")
    .get(address);
  if (
    !queued &&
    db.prepare("SELECT COUNT(*) n FROM analysis_queue").get().n >= 300
  )
    return false;
  // Bound automatic discovery; explicit research requests can still enter the queue.
  if (
    !existing &&
    !queued &&
    priority < 5 &&
    db
      .prepare(
        "SELECT COUNT(*) n FROM (SELECT address FROM wallet_analysis UNION SELECT address FROM analysis_queue)",
      )
      .get().n >= 300
  )
    return false;
  db.prepare(
    "INSERT INTO analysis_queue(address,priority,queued_at) VALUES(?,?,?) ON CONFLICT(address) DO UPDATE SET priority=MAX(priority,excluded.priority), attempts=CASE WHEN excluded.priority>=20 THEN 0 ELSE attempts END, error=CASE WHEN excluded.priority>=20 THEN NULL ELSE error END",
  ).run(address, priority, Date.now());
  return true;
}
export function analysisStatus() {
  return {
    indexed: db.prepare("SELECT COUNT(*) n FROM wallet_analysis").get().n,
    queued: db.prepare("SELECT COUNT(*) n FROM analysis_queue").get().n,
    working,
    failed: db
      .prepare(
        "SELECT address,error,attempts FROM analysis_queue WHERE error IS NOT NULL LIMIT 5",
      )
      .all(),
  };
}
async function builderAccounts(address) {
  const dexs = await resource("dexes", 86400000, () =>
    info({ type: "perpDexs" }),
  );
  const chosen = dexs.data.filter(Boolean).slice(0, 3),
    results = await Promise.allSettled(
      chosen.map((d) =>
        resource(`builder-account:${d.name}:${address}`, 600000, () =>
          info({ type: "clearinghouseState", user: address, dex: d.name }, 2),
        ),
      ),
    );
  return {
    positions: results.flatMap((r, i) =>
      r.status === "fulfilled"
        ? r.value.data.assetPositions
            .map(({ position: p }) => ({
              coin: p.coin,
              size: Number(p.szi),
              entry: Number(p.entryPx),
              value: Number(p.positionValue),
              markPrice: Math.abs(Number(p.szi))
                ? Number(p.positionValue) / Math.abs(Number(p.szi))
                : 0,
              unrealized: Number(p.unrealizedPnl),
              leverage: p.leverage?.value || 0,
              liquidation: p.liquidationPx ? Number(p.liquidationPx) : null,
              dex: chosen[i].name,
              class: instrumentClass(p.coin),
            }))
            .filter((p) => p.size !== 0)
        : [],
    ),
    coverage: results.map((r, i) => ({
      dex: chosen[i].name,
      available: r.status === "fulfilled",
      stale: r.status === "fulfilled" ? r.value.stale : false,
      updatedAt: r.status === "fulfilled" ? r.value.updatedAt : null,
      equity:
        r.status === "fulfilled"
          ? Number(r.value.data.marginSummary?.accountValue)
          : null,
      marginUsed:
        r.status === "fulfilled"
          ? Number(r.value.data.marginSummary?.totalMarginUsed)
          : null,
    })),
  };
}
export async function analyzeWallet(address) {
  const [state, fillResult, builderResult, portfolioResult] = await Promise.all(
    [
      account(address),
      resource(`fills:${address}`, 300000, () =>
        info({ type: "userFills", user: address, aggregateByTime: false }),
      ),
      builderAccounts(address).catch((e) => ({
        positions: [],
        coverage: [],
        error: e.message,
      })),
      resource(`portfolio:${address}`, 900000, () =>
        info({ type: "portfolio", user: address }),
      ).catch(() => null),
    ],
  );
  if (fillResult.stale)
    throw Error(
      "Fresh execution history is unavailable; retaining previous analysis.",
    );
  const insert = db.prepare(
    "INSERT OR IGNORE INTO wallet_fills VALUES(?,?,?,?,?)",
  );
  initializeProbabilityHistory();
  db.exec("BEGIN");
  try {
    for (const f of fillResult.data)
      if (f.coin && f.time && Number(f.sz) > 0 && Number(f.px) > 0) {
        const added = insert.run(
          address,
          fillId(f),
          f.coin,
          f.time,
          JSON.stringify(f),
        );
        if (added.changes) archiveFill(address, f);
      }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  const fills = db
    .prepare(
      "SELECT value FROM wallet_fills WHERE address=? AND time>=? ORDER BY time",
    )
    .all(address, Date.now() - 30 * 86400000)
    .map((r) => JSON.parse(r.value));
  const positions = [
      ...state.data.positions.map((p) => ({
        ...p,
        dex: "Hyperliquid",
        class: instrumentClass(p.coin),
      })),
      ...builderResult.positions,
    ],
    analysis = analyzeExecutions(fills, positions);
  const gross = state.data.positions.reduce((a, p) => a + p.value, 0),
    allGross = positions.reduce((a, p) => a + p.value, 0);
  const result = {
    address,
    analyticsVersion: 4,
    performance: portfolioEvidence(portfolioResult),
    ...analysis,
    positions,
    risk: {
      mainGrossExposure: gross,
      mainEquity: state.data.equity,
      exposureMultiple:
        state.data.equity > 0 ? gross / state.data.equity : null,
      concentration: allGross
        ? (Math.max(...positions.map((p) => p.value)) / allGross) * 100
        : 0,
      marginUtilization:
        state.data.equity > 0
          ? (state.data.marginUsed / state.data.equity) * 100
          : null,
    },
    builderCoverage: builderResult.coverage,
    builderError: builderResult.error || null,
    updatedAt: Date.now(),
    fillsFetchedAt: fillResult.updatedAt,
    positionsAt: state.updatedAt,
    positionsStale: state.stale,
    latestResponseCount: fillResult.data.length,
    indexedFills: fills.length,
  };
  db.prepare(
    "INSERT INTO wallet_analysis VALUES(?,?,?) ON CONFLICT(address) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at",
  ).run(address, JSON.stringify(result), result.updatedAt);
  return result;
}
export async function processAnalysisQueue() {
  if (working || getSetting("paused", false) || health.weight > 600) return;
  const job = selectAnalysisJob(db, Date.now(), priorityStreak);
  if (!job) return;
  working = true;
  const startedAt = Date.now();
  priorityStreak = job.priority > 0 ? priorityStreak + 1 : 0;
  try {
    const analysis = await analyzeWallet(job.address);
    recordCollection(job.address, startedAt, true, analysis);
    db.prepare("DELETE FROM analysis_queue WHERE address=?").run(job.address);
    delete health.failures.analysis;
  } catch (e) {
    recordCollection(job.address, startedAt, false, null, e.message);
    db.prepare(
      "UPDATE analysis_queue SET attempts=attempts+1,error=?,queued_at=? WHERE address=?",
    ).run(e.message, Date.now() + 60000, job.address);
    health.failures.analysis = { message: e.message, time: Date.now() };
  } finally {
    working = false;
  }
}
export function getAnalysis(address) {
  const row = db
    .prepare("SELECT * FROM wallet_analysis WHERE address=?")
    .get(address);
  enqueueAnalysis(address, 10);
  return {
    data: row
      ? {
          ...JSON.parse(row.value),
          eligibility: candidatePolicy(JSON.parse(row.value)),
          evidence: walletEvidence(JSON.parse(row.value)),
          dailyHistory: walletDailyHistory(db, address),
        }
      : null,
    updatedAt: row?.updated_at || null,
    stale: row ? Date.now() - row.updated_at > 1800000 : false,
    queue:
      db
        .prepare("SELECT attempts,error FROM analysis_queue WHERE address=?")
        .get(address) || null,
  };
}
export async function screener() {
  const leaders = await leaderboard(),
    analyses = new Map(
      db
        .prepare("SELECT address,value,updated_at FROM wallet_analysis")
        .all()
        .map((r) => [r.address, JSON.parse(r.value)]),
    ),
    tracked = watchlist(),
    rows = [...leaders.data];
  for (const w of tracked)
    if (!rows.some((r) => r.address === w.address))
      rows.push({
        address: w.address,
        name: w.label,
        equity: null,
        pnl7d: null,
        pnl30d: null,
        roi30d: null,
        volume30d: null,
      });
  for (const [address, a] of analyses)
    if (!rows.some((w) => w.address === address))
      rows.push({
        address,
        name: null,
        equity: a.risk.mainEquity,
        pnl7d: null,
        pnl30d: null,
        roi30d: null,
        volume30d: null,
      });
  const daily = dailyWallets(db);
  const ranks = new Map(daily.rows.map((w) => [w.address, w]));
  const data = rows.map((w) => {
    const a = analyses.get(w.address),
      account = cached(`account:${w.address}`);
    return {
      ...w,
      daily: ranks.get(w.address) || null,
      evidence: walletEvidence(a),
      pnl30d:
        w.pnl30d ??
        (a?.performance?.month?.days >= 29 ? a.performance.month.pnl : null),
      pnl30dSource:
        w.pnl30d != null
          ? "Hyperliquid leaderboard"
          : a?.performance?.month?.days >= 29
            ? `Hyperliquid perpMonth portfolio${a.performance.stale ? " (cached)" : ""}`
            : "No sufficient reported month history",
      tracked: tracked.some((t) => t.address === w.address),
      analysis: a
        ? {
            stats: a.stats,
            copy: a.copy,
            rwa: a.rwa,
            risk: a.risk,
            eligibility: candidatePolicy(a),
            performance: a.performance,
            builderCoverage: a.builderCoverage,
            positions: a.positions,
            coins: a.coins.map((c) => ({
              ...c,
              coin: c.coin,
              class: c.class,
              volumeShare: c.volumeShare,
              score: c.score,
              samplePnl: c.samplePnl,
              winRate: c.winRate,
              completeTrades: c.completeTrades,
            })),
            updatedAt: a.updatedAt,
            coverage: a.coverage,
          }
        : null,
      currentPositions: account?.data.positions.length ?? null,
    };
  });
  return {
    data,
    daily,
    updatedAt: leaders.updatedAt,
    stale: leaders.stale,
    indexing: analysisStatus(),
    methodology:
      "Quality /100 = 35% capped net profit factor + 25% profitable closing-day share + 25% closed-PnL drawdown control + 15% sample depth. Minimum five complete episodes. Funding excluded. It is an explanatory heuristic, not a calibrated forecast. Unindexed rows have no inferred metrics.",
  };
}
export function queueRwaCandidates() {
  const rows = db
    .prepare(
      "WITH activity AS (SELECT coin,buyer address,price*size notional FROM trades WHERE time>? UNION ALL SELECT coin,seller address,price*size notional FROM trades WHERE time>?), ranked AS (SELECT coin,address,SUM(notional) volume,ROW_NUMBER() OVER (PARTITION BY coin ORDER BY SUM(notional) DESC) rank FROM activity WHERE address IS NOT NULL GROUP BY coin,address HAVING SUM(notional)>=10000) SELECT DISTINCT address FROM ranked WHERE rank<=3 LIMIT 60",
    )
    .all(Date.now() - 900000, Date.now() - 900000);
  for (const row of rows)
    if (/^0x[0-9a-f]{40}$/.test(row.address)) enqueueAnalysis(row.address, 2);
}
const flowCache = new Map();
export function flows(window = "24h", coin = "", cohort = "all") {
  const spans = {
      "1h": 3600000,
      "6h": 21600000,
      "24h": 86400000,
      "7d": 604800000,
    },
    duration = spans[window] || spans["24h"],
    now = Date.now(),
    key = window + ":" + coin + ":" + cohort,
    old = flowCache.get(key);
  if (old && now - old.updatedAt < 15000) return old;
  const analyses = new Map(
    db
      .prepare("SELECT address,value FROM wallet_analysis")
      .all()
      .map((r) => [r.address, JSON.parse(r.value)]),
  );
  const followed = new Set(watchlist().map((w) => w.address));
  const pilot = cohort === "pilot" ? new Set(pilotWallets()) : null;
  const eligible = (address) => {
    const a = analyses.get(address);
    if (cohort === "watchlist") return followed.has(address);
    if (cohort === "pilot") return pilot.has(address);
    if (cohort === "quality")
      return (
        a &&
        now - a.updatedAt < 3600000 &&
        a.stats.score >= 60 &&
        a.stats.completeTrades >= 10
      );
    if (cohort === "whales") {
      if (!a || now - a.updatedAt >= 3600000) return false;
      const mainFresh = !a.positionsStale && now - a.positionsAt < 3600000;
      const freshGross = a.positions
        .filter((p) =>
          !p.dex || p.dex === "Hyperliquid"
            ? mainFresh
            : a.builderCoverage?.some(
                (b) => b.dex === p.dex && b.available && !b.stale,
              ),
        )
        .reduce((n, p) => n + p.value, 0);
      return (
        (mainFresh && a.risk.mainEquity >= 100000) || freshGross >= 1000000
      );
    }
    return true;
  };
  const historyStart = new Map(
    db
      .prepare(
        "SELECT address,MIN(time) first FROM wallet_fills GROUP BY address",
      )
      .all()
      .map((r) => [r.address, r.first]),
  );
  const where = coin ? " AND coin=?" : "",
    args = coin ? [now - duration, now, coin] : [now - duration, now],
    records = db
      .prepare(
        `SELECT address,value FROM wallet_fills WHERE time>=? AND time<=?${where} ORDER BY time`,
      )
      .all(...args)
      .filter((r) => eligible(r.address));
  const byCoin = new Map(),
    walletMap = new Map(),
    buckets = new Map(),
    addresses = new Set(),
    bucketSize =
      duration <= 3600000 ? 300000 : duration <= 86400000 ? 3600000 : 86400000;
  let first = null,
    last = null;
  for (const row of records) {
    const f = JSON.parse(row.value),
      x = executionFlow(f);
    if (!x) continue;
    addresses.add(row.address);
    first = first === null ? f.time : Math.min(first, f.time);
    last = Math.max(last || 0, f.time);
    let c = byCoin.get(f.coin);
    if (!c) {
      c = {
        coin: f.coin,
        class: instrumentClass(f.coin),
        longIn: 0,
        longOut: 0,
        shortIn: 0,
        shortOut: 0,
        buy: 0,
        sell: 0,
        executions: 0,
        wallets: new Set(),
        longBuilders: new Set(),
        shortBuilders: new Set(),
      };
      byCoin.set(f.coin, c);
    }
    let w = walletMap.get(`${row.address}:${f.coin}`);
    if (!w) {
      w = {
        address: row.address,
        coin: f.coin,
        longIn: 0,
        longOut: 0,
        shortIn: 0,
        shortOut: 0,
        samplePnl: 0,
        executions: 0,
      };
      walletMap.set(`${row.address}:${f.coin}`, w);
    }
    for (const k of ["longIn", "longOut", "shortIn", "shortOut"]) {
      c[k] += x[k];
      w[k] += x[k];
    }
    c.buy += x.buy;
    c.sell += x.sell;
    c.executions++;
    c.wallets.add(row.address);
    if (x.longIn) c.longBuilders.add(row.address);
    if (x.shortIn) c.shortBuilders.add(row.address);
    w.executions++;
    w.lastExecution = Math.max(w.lastExecution || 0, f.time);
    w.positionDelta = D(w.positionDelta || 0)
      .plus(D(f.sz).mul(f.side === "B" ? 1 : -1))
      .toString();
    w[f.time < now - duration / 2 ? "early" : "late"] =
      (w[f.time < now - duration / 2 ? "early" : "late"] || 0) +
      x.longIn +
      x.longOut +
      x.shortIn +
      x.shortOut;
    w.windowStart = now - duration;
    w.samplePnl += Number(f.closedPnl) - Number(f.fee);
    const t = Math.floor(f.time / bucketSize) * bucketSize,
      b = buckets.get(t) || { t, inflow: 0, outflow: 0 };
    b.inflow += x.longIn + x.shortIn;
    b.outflow += x.longOut + x.shortOut;
    buckets.set(t, b);
  }
  const context = marketContexts(cached("markets"), duration, now);
  const data = [...byCoin.values()]
      .map((c) => ({
        ...c,
        wallets: c.wallets.size,
        longBuilders: c.longBuilders.size,
        shortBuilders: c.shortBuilders.size,
        inflow: c.longIn + c.shortIn,
        outflow: c.longOut + c.shortOut,
        net: c.longIn + c.shortIn - c.longOut - c.shortOut,
        directional: c.longIn + c.shortOut - c.shortIn - c.longOut,
        marketRead: marketRead(
          [...walletMap.values()].filter((w) => w.coin === c.coin),
          analyses,
          now,
        ),
        insight: flowInsights(
          [...walletMap.values()].filter((w) => w.coin === c.coin),
          { duration, historyStart },
        ),
      }))
      .map((c) => ({
        ...c,
        brief: positioningBrief(c, now),
        context: context.get(c.coin) || {
          status: "unavailable",
          reason: "Market history currently covers main DEX instruments",
        },
      }))
      .sort((a, b) => b.inflow + b.outflow - a.inflow - a.outflow),
    result = {
      data,
      wallets: [...walletMap.values()]
        .map((w) => ({
          ...w,
          net: w.longIn + w.shortIn - w.longOut - w.shortOut,
          directional: w.longIn + w.shortOut - w.shortIn - w.longOut,
          quality: analyses.get(w.address)?.stats.score ?? null,
        }))
        .sort(
          (a, b) =>
            b.longIn +
            b.shortIn +
            b.longOut +
            b.shortOut -
            (a.longIn + a.shortIn + a.longOut + a.shortOut),
        )
        .slice(0, 100),
      timeline: [...buckets.values()],
      window,
      cohort,
      updatedAt: now,
      coverage: {
        first,
        last,
        wallets: addresses.size,
        executions: records.length,
        indexedWallets: analysisStatus().indexed,
        freshWallets: [...analyses.values()].filter((a) =>
          analysisFresh(a, now),
        ).length,
        historicalSpecialists: [...analyses.values()].filter((a) =>
          a.coins?.some(hasTokenRecord),
        ).length,
        queue: analysisStatus().queued,
        eligibleWallets: [...analyses.keys()].filter(eligible).length,
        cohortDefinition:
          cohort === "pilot"
            ? "Current 20-wallet pilot membership with prioritized refreshes. Historical activity uses today's membership; this is not a point-in-time investment universe."
            : cohort === "whales"
              ? "Large wallets: latest analysis within one hour, with main DEX equity ≥ $100K or covered gross positions ≥ $1M. Historical flows use this current cohort."
              : cohort === "quality"
                ? "Quality cohort: latest analysis within one hour, quality ≥ 60 and at least 10 complete episodes. Selection uses current scores, not historical point-in-time scores."
                : cohort === "watchlist"
                  ? "Your currently followed wallets with indexed executions."
                  : "All wallets whose executions have been indexed. This is not the entire exchange.",
        note: "Position inflow/outflow is opened/closed notional in indexed wallet executions. This is not collateral deposited or withdrawn. A reversal is split into a close and an open. Both sides can belong to the cohort; totals describe wallet activity, not venue volume. History may be incomplete.",
      },
    };
  flowCache.set(key, result);
  if (flowCache.size > 50) flowCache.delete(flowCache.keys().next().value);
  return result;
}
export function cleanupAnalysis() {
  initializeProbabilityHistory();
  cleanupProbabilityHistory();
  db.prepare("DELETE FROM wallet_fills WHERE time<?").run(
    Date.now() - 30 * 86400000,
  );
  db.prepare(
    "DELETE FROM wallet_fills WHERE rowid IN (SELECT rowid FROM wallet_fills ORDER BY time DESC LIMIT -1 OFFSET 250000)",
  ).run();
}
