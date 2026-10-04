import { db } from "./db.mjs";
import { info, health } from "./upstream.mjs";
import { fillId } from "./screener-math.mjs";
import { sixMonthStart } from "./probability-math.mjs";
import {
  initializeProbabilityHistory,
  archiveFill,
} from "./probability-history.mjs";
let working = false;
export function requestBackfill(address, now = Date.now()) {
  const start = sixMonthStart(now);
  if (start === null)
    throw new TypeError("Backfill needs a valid numeric UTC timestamp.");
  const old = db
    .prepare("SELECT * FROM fill_backfills WHERE address=?")
    .get(address);
  // Existing 30-day jobs are upgraded once. A six-month job keeps the current
  // coalescing and page budget even when a user requests another refresh.
  const upgrade = old && old.start_time > start;
  if (
    old &&
    !upgrade &&
    (old.status === "queued" || now - old.updated_at < 86400000)
  )
    return;
  db.prepare(
    "INSERT INTO fill_backfills(address,start_time,end_time,cursor,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(address) DO UPDATE SET start_time=excluded.start_time,end_time=excluded.end_time,cursor=excluded.cursor,pages=0,fills=0,status='queued',updated_at=excluded.updated_at,error=NULL",
  ).run(address, start, now, start, now);
}
export function advancePage(page, cursor, end, pages) {
  const valid = page.filter(
    (f) => Number.isFinite(f.time) && f.time >= cursor && f.time <= end,
  );
  const last = valid.reduce((n, f) => Math.max(n, f.time), cursor);
  return {
    cursor: last,
    // Reuse the inclusive last timestamp and deduplicate IDs. Never skip a millisecond.
    status:
      page.length < 2000
        ? "source_exhausted"
        : last <= cursor
          ? "boundary_limited"
          : pages >= 6
            ? "page_limited"
            : "queued",
  };
}
export async function processBackfill(reanalyze, loader = info) {
  if (working || health.weight > 440) return;
  const job = db
    .prepare(
      "SELECT * FROM fill_backfills WHERE status='queued' AND updated_at<=? ORDER BY pages,updated_at LIMIT 1",
    )
    .get(Date.now());
  if (!job) return;
  working = true;
  try {
    const page = await loader({
      type: "userFillsByTime",
      user: job.address,
      startTime: job.cursor,
      endTime: job.end_time,
      aggregateByTime: false,
    });
    if (!Array.isArray(page)) throw Error("Invalid historical fill response.");
    const insert = db.prepare(
      "INSERT OR IGNORE INTO wallet_fills VALUES(?,?,?,?,?)",
    );
    let added = 0;
    const now = Date.now(),
      earliest = Math.max(job.start_time, sixMonthStart(now)),
      latest = Math.min(job.end_time, now);
    initializeProbabilityHistory();
    db.exec("BEGIN");
    try {
      for (const f of page)
        if (
          f.coin &&
          Number.isFinite(f.time) &&
          f.time >= earliest &&
          f.time <= latest &&
          Number(f.sz) > 0 &&
          Number(f.px) > 0
        ) {
          const result = insert.run(
            job.address,
            fillId(f),
            f.coin,
            f.time,
            JSON.stringify(f),
          );
          added += result.changes;
          if (result.changes) archiveFill(job.address, f);
        }
      const state = advancePage(page, job.cursor, job.end_time, job.pages + 1);
      db.prepare(
        "UPDATE fill_backfills SET cursor=?,pages=pages+1,fills=fills+?,status=?,updated_at=?,error=NULL WHERE address=?",
      ).run(state.cursor, added, state.status, Date.now(), job.address);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    if (added) await reanalyze(job.address);
  } catch (e) {
    db.prepare(
      "UPDATE fill_backfills SET error=?,updated_at=? WHERE address=?",
    ).run(String(e.message).slice(0, 300), Date.now() + 60000, job.address);
  } finally {
    working = false;
  }
}
