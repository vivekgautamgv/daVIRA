const DAY = 86400000;
export const dayKey = (time) => new Date(time).toISOString().slice(0, 10);
export function initDailyWallets(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS wallet_daily_snapshots(day TEXT PRIMARY KEY, captured_at INTEGER NOT NULL, source_at INTEGER NOT NULL, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS wallet_sources(address TEXT NOT NULL, source TEXT NOT NULL, first_seen INTEGER NOT NULL, last_seen INTEGER NOT NULL, PRIMARY KEY(address,source));`);
}
// Freeze the first fresh observation of each UTC day. Never manufacture missed days.
export function captureDailyWallets(db, result, now = Date.now()) {
  const day = dayKey(now);
  if (
    result.stale ||
    !Number.isFinite(result.updatedAt) ||
    result.updatedAt > now ||
    dayKey(result.updatedAt) !== day ||
    !result.data?.length
  )
    return false;
  if (db.prepare("SELECT day FROM wallet_daily_snapshots WHERE day=?").get(day))
    return false;
  const unique = new Map(
    result.data
      .filter(
        (w) => /^0x[0-9a-f]{40}$/.test(w.address) && Number.isFinite(w.pnl30d),
      )
      .map((w) => [w.address, w]),
  );
  const rows = [...unique.values()]
    .sort((a, b) => b.pnl30d - a.pnl30d || a.address.localeCompare(b.address))
    .map((w, i) => ({
      address: w.address,
      rank: i + 1,
      pnl30d: w.pnl30d,
      equity: Number.isFinite(w.equity) ? w.equity : null,
    }));
  if (!rows.length) return false;
  db.exec("BEGIN");
  try {
    db.prepare("INSERT INTO wallet_daily_snapshots VALUES(?,?,?,?)").run(
      day,
      now,
      result.updatedAt,
      JSON.stringify(rows),
    );
    const insert = db.prepare(
      "INSERT INTO wallet_sources VALUES(?,'Hyperliquid leaderboard',?,?) ON CONFLICT(address,source) DO UPDATE SET last_seen=excluded.last_seen",
    );
    for (const row of rows)
      insert.run(row.address, result.updatedAt, result.updatedAt);
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  return true;
}
export function dailyWallets(db, now = Date.now()) {
  const day = dayKey(now),
    previousDay = dayKey(now - DAY);
  const read = (d) =>
    db.prepare("SELECT * FROM wallet_daily_snapshots WHERE day=?").get(d);
  const today = read(day),
    prior = read(previousDay),
    old = new Map(
      prior ? JSON.parse(prior.value).map((w) => [w.address, w]) : [],
    );
  const rows = today
    ? JSON.parse(today.value).map((w) => ({
        ...w,
        previousRank: old.get(w.address)?.rank ?? null,
        rankChange: old.has(w.address)
          ? old.get(w.address).rank - w.rank
          : null,
        status: !prior
          ? "baseline"
          : old.has(w.address)
            ? "continuing"
            : "entered",
      }))
    : [];
  const current = new Set(rows.map((w) => w.address));
  return {
    day,
    previousDay,
    capturedAt: today?.captured_at ?? null,
    sourceAt: today?.source_at ?? null,
    hasPrevious: !!prior,
    rows,
    exited:
      today && prior
        ? JSON.parse(prior.value).filter((w) => !current.has(w.address))
        : [],
    methodology:
      "First fresh source observation per UTC day; ranks use reported 30D PnL in the observed leaderboard universe. Rank movement is not daily profit. Missing days are not backfilled.",
  };
}
export function walletDailyHistory(db, address) {
  return db
    .prepare("SELECT * FROM wallet_daily_snapshots ORDER BY day DESC LIMIT 14")
    .all()
    .flatMap((s) => {
      const row = JSON.parse(s.value).find((w) => w.address === address);
      return row ? [{ ...row, day: s.day, sourceAt: s.source_at }] : [];
    });
}
