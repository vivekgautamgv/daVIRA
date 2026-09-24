import { db, getSetting, setSetting, watchlist } from "./db.mjs";
import { analysisFresh, hasTokenRecord } from "./market-read.mjs";

export function pilotWallets() {
  const saved = getSetting("pilotWallets", null);
  if (Array.isArray(saved)) return saved;
  const rows = db
    .prepare("SELECT address,value FROM wallet_analysis")
    .all()
    .map((r) => ({ address: r.address, a: JSON.parse(r.value) }));
  rows.sort(
    (x, y) =>
      Number(y.a.coins?.some(hasTokenRecord)) -
        Number(x.a.coins?.some(hasTokenRecord)) ||
      (y.a.coverage?.last || 0) - (x.a.coverage?.last || 0),
  );
  const addresses = rows.slice(0, 20).map((r) => r.address);
  // Wait for indexed data before freezing the first pilot universe.
  if (addresses.length) {
    setSetting("pilotWallets", addresses);
    setSetting("pilotStartedAt", Date.now());
  }
  return addresses;
}
export function changePilot(address, add) {
  const list = pilotWallets();
  if (add && !list.includes(address)) {
    if (list.length >= 20)
      throw Object.assign(
        Error(
          "Pilot is limited to 20 wallets. Remove one before adding another.",
        ),
        { status: 400 },
      );
    list.push(address);
  }
  setSetting("pilotWallets", add ? list : list.filter((a) => a !== address));
  if (add && !getSetting("pilotStartedAt", null))
    setSetting("pilotStartedAt", Date.now());
  return { ok: true };
}
export function recordCollection(
  address,
  startedAt,
  success,
  analysis,
  error,
  now = Date.now(),
) {
  db.prepare(
    "INSERT INTO collection_runs(address,started_at,finished_at,success,source_at,fills,gaps,capped,error) VALUES(?,?,?,?,?,?,?,?,?)",
  ).run(
    address,
    startedAt,
    now,
    success ? 1 : 0,
    analysis?.fillsFetchedAt ?? null,
    analysis?.latestResponseCount ?? null,
    analysis?.coverage?.gaps ?? null,
    analysis?.latestResponseCount == null
      ? null
      : Number(analysis.latestResponseCount >= 2000),
    error ? String(error).slice(0, 300) : null,
  );
}
export function coverageReport(now = Date.now()) {
  const pilot = new Set(pilotWallets()),
    followed = new Set(watchlist().map((w) => w.address));
  const analyses = new Map(
    db
      .prepare("SELECT address,value FROM wallet_analysis")
      .all()
      .map((r) => [r.address, JSON.parse(r.value)]),
  );
  const queue = new Map(
    db
      .prepare("SELECT * FROM analysis_queue")
      .all()
      .map((r) => [r.address, r]),
  );
  const addresses = new Set([
    ...analyses.keys(),
    ...pilot,
    ...followed,
    ...queue.keys(),
  ]);
  const rows = [...addresses]
    .map((address) => {
      const a = analyses.get(address),
        q = queue.get(address),
        at = a?.fillsFetchedAt;
      const age = Number.isFinite(at) && at <= now ? now - at : null;
      const tier = followed.has(address)
        ? "Watchlist"
        : pilot.has(address)
          ? "Pilot"
          : "Discovery";
      const issues = [];
      if (!a) issues.push("Not indexed");
      else {
        if (!analysisFresh(a, now)) issues.push("Stale fill analysis");
        if (a.coverage?.gaps > 0) issues.push("Position discontinuities");
        if (a.latestResponseCount >= 2000)
          issues.push("Response reached fill cap");
        if (a.latestResponseCount == null)
          issues.push("Response depth unknown");
      }
      if (q?.error) issues.push("Refresh failed");
      return {
        address,
        tier,
        pilot: pilot.has(address),
        sourceAt: at ?? null,
        ageMs: age,
        fresh: analysisFresh(a, now),
        overdue: tier !== "Discovery" && (age == null || age > 3600000),
        first: a?.coverage?.first ?? null,
        last: a?.coverage?.last ?? null,
        fills: a?.indexedFills ?? 0,
        gaps: a?.coverage?.gaps ?? null,
        capped: a?.latestResponseCount >= 2000,
        completeTrades: a?.stats?.completeTrades ?? 0,
        issues,
        queuedAt: q?.queued_at ?? null,
        attempts: q?.attempts ?? 0,
        error: q?.error || null,
      };
    })
    .sort(
      (a, b) =>
        Number(b.pilot) - Number(a.pilot) ||
        Number(b.overdue) - Number(a.overdue) ||
        (b.ageMs ?? Infinity) - (a.ageMs ?? Infinity),
    );
  const runs = db
    .prepare(
      "SELECT * FROM collection_runs WHERE finished_at>=? ORDER BY finished_at DESC",
    )
    .all(now - 86400000);
  const durations = runs
    .filter((r) => r.success)
    .map((r) => r.finished_at - r.started_at)
    .sort((a, b) => a - b);
  const p95 = durations.length
    ? durations[Math.ceil(durations.length * 0.95) - 1]
    : null;
  return {
    updatedAt: now,
    studyStartedAt: getSetting("pilotStartedAt", null),
    pilotLimit: 20,
    targetMinutes: 30,
    freshLimitMinutes: 60,
    rows,
    summary: {
      indexed: analyses.size,
      pilot: pilot.size,
      fresh: rows.filter((r) => r.fresh).length,
      pilotFresh: rows.filter((r) => r.pilot && r.fresh).length,
      overdue: rows.filter((r) => r.overdue).length,
      queued: queue.size,
      failed: rows.filter((r) => r.error).length,
      capped: rows.filter((r) => r.capped).length,
    },
    collection: {
      attempts: runs.length,
      successes: runs.filter((r) => r.success).length,
      successRate: runs.length
        ? (runs.filter((r) => r.success).length / runs.length) * 100
        : null,
      p95DurationMs: p95,
      firstRun: db
        .prepare("SELECT MIN(started_at) t FROM collection_runs")
        .get().t,
      recent: runs.slice(0, 30),
    },
    paused: getSetting("paused", false),
  };
}
