import { createHash } from "node:crypto";
import { db } from "./db.mjs";
import { executionFlow, fillId } from "./screener-math.mjs";
import { cleanCandles } from "./token-desk-math.mjs";
import { sixMonthStart } from "./probability-math.mjs";

const HOUR = 3_600_000;
const initialized = new WeakSet();
const schema = `
CREATE TABLE IF NOT EXISTS probability_flow_archive (address TEXT NOT NULL,coin TEXT NOT NULL,t INTEGER NOT NULL,long_in REAL NOT NULL,long_out REAL NOT NULL,short_in REAL NOT NULL,short_out REAL NOT NULL,fills INTEGER NOT NULL,observed_at INTEGER NOT NULL,source TEXT NOT NULL DEFAULT 'retrospective-observed-sample',PRIMARY KEY(address,coin,t));
CREATE INDEX IF NOT EXISTS idx_probability_flow_coin_time ON probability_flow_archive(coin,t);
CREATE TABLE IF NOT EXISTS probability_fill_seen (address TEXT NOT NULL,id BLOB NOT NULL,time INTEGER NOT NULL,PRIMARY KEY(address,id));
CREATE INDEX IF NOT EXISTS idx_probability_seen_time ON probability_fill_seen(time);
CREATE TABLE IF NOT EXISTS probability_candle_archive (coin TEXT NOT NULL,t INTEGER NOT NULL,value TEXT NOT NULL,observed_at INTEGER NOT NULL,source TEXT NOT NULL DEFAULT 'venue-hourly-candle',PRIMARY KEY(coin,t));
CREATE TABLE IF NOT EXISTS probability_history_meta (key TEXT PRIMARY KEY,value TEXT NOT NULL);`;

const statements = new WeakMap();
function writes(database) {
  let prepared = statements.get(database);
  if (!prepared) {
    prepared = {
      seen: database.prepare(
        "INSERT OR IGNORE INTO probability_fill_seen(address,id,time) VALUES(?,?,?)",
      ),
      flow: database.prepare(
        `INSERT INTO probability_flow_archive(address,coin,t,long_in,long_out,short_in,short_out,fills,observed_at) VALUES(?,?,?,?,?,?,?,1,?)
         ON CONFLICT(address,coin,t) DO UPDATE SET
         long_in=long_in+excluded.long_in,long_out=long_out+excluded.long_out,
         short_in=short_in+excluded.short_in,short_out=short_out+excluded.short_out,
         fills=fills+1,observed_at=MAX(observed_at,excluded.observed_at)`,
      ),
    };
    statements.set(database, prepared);
  }
  return prepared;
}

// Call within the same transaction as a successful raw INSERT. IDs remain for
// the archive retention window: replaying a fill evicted by the raw 250k cap
// must not increase an already archived aggregate.
export function archiveFill(address, fill, now = Date.now(), database = db) {
  if (
    typeof address !== "string" ||
    !address ||
    !fill ||
    !Number.isFinite(now) ||
    !Number.isSafeInteger(fill.time) ||
    fill.time < sixMonthStart(now) ||
    fill.time > now
  )
    return false;
  const flow = executionFlow(fill);
  if (
    !flow ||
    ![flow.longIn, flow.longOut, flow.shortIn, flow.shortOut].every(
      (v) => Number.isFinite(v) && v >= 0,
    )
  )
    return false;
  const id = createHash("sha256").update(fillId(fill)).digest();
  const prepared = writes(database);
  if (!prepared.seen.run(address, id, fill.time).changes) return false;
  prepared.flow.run(
    address,
    fill.coin,
    Math.floor(fill.time / HOUR) * HOUR,
    flow.longIn,
    flow.longOut,
    flow.shortIn,
    flow.shortOut,
    now,
  );
  return true;
}

// One bounded bootstrap of retained raw history at startup. The marker and all
// sums commit together. The seen-ID guard also makes a pre-bootstrap new-fill
// hook safe. Do not rerun a raw-history scan on every request.
export function initializeProbabilityHistory(now = Date.now(), database = db) {
  if (initialized.has(database)) return { bootstrapped: false, archived: 0 };
  database.exec(schema);
  const marker = database
    .prepare(
      "SELECT value FROM probability_history_meta WHERE key='bootstrap-v1'",
    )
    .get();
  if (marker) {
    initialized.add(database);
    return { bootstrapped: false, archived: 0 };
  }
  let archived = 0;
  database.exec("BEGIN IMMEDIATE");
  try {
    const hasRaw = database
      .prepare(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='wallet_fills'",
      )
      .get();
    if (hasRaw)
      for (const row of database
        .prepare(
          "SELECT address,value FROM wallet_fills WHERE time>=? AND time<=?",
        )
        .iterate(sixMonthStart(now), now)) {
        let fill;
        try {
          fill = JSON.parse(row.value);
        } catch {
          continue;
        }
        if (archiveFill(row.address, fill, now, database)) archived++;
      }
    database
      .prepare(
        "INSERT INTO probability_history_meta(key,value) VALUES('bootstrap-v1',?)",
      )
      .run(
        JSON.stringify({
          time: now,
          archived,
          source: "retrospective-observed-sample",
        }),
      );
    database.exec("COMMIT");
    initialized.add(database);
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
  return { bootstrapped: true, archived };
}

export function probabilityFlowRows(
  coin,
  eligibleSet,
  now = Date.now(),
  database = db,
) {
  // Read only whole retained hours; the partial cutoff hour mixes older fills.
  const start = Math.ceil(sixMonthStart(now) / HOUR) * HOUR;
  return database
    .prepare(
      `SELECT address,t,long_in longIn,long_out longOut,short_in shortIn,short_out shortOut,fills,observed_at observedAt,source
       FROM probability_flow_archive WHERE coin=? AND t>=? AND t<=? ORDER BY t,address`,
    )
    .all(coin, start, now)
    .filter((row) => !eligibleSet || eligibleSet.has(row.address));
}

export function saveProbabilityCandles(
  coin,
  candles,
  now = Date.now(),
  database = db,
) {
  const start = sixMonthStart(now);
  const insert = database.prepare(
    "INSERT INTO probability_candle_archive(coin,t,value,observed_at) VALUES(?,?,?,?) ON CONFLICT(coin,t) DO UPDATE SET value=excluded.value,observed_at=MAX(observed_at,excluded.observed_at)",
  );
  let saved = 0;
  database.exec("BEGIN IMMEDIATE");
  try {
    for (const candle of cleanCandles(candles, coin, now).values()) {
      if (candle.t < start) continue;
      insert.run(coin, candle.t, JSON.stringify(candle), now);
      saved++;
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
  return saved;
}

export function probabilityCandles(coin, now = Date.now(), database = db) {
  return database
    .prepare(
      "SELECT value FROM probability_candle_archive WHERE coin=? AND t>=? AND t+?<=? ORDER BY t",
    )
    .all(coin, sixMonthStart(now), HOUR, now)
    .flatMap((row) => {
      try {
        return [JSON.parse(row.value)];
      } catch {
        return [];
      }
    });
}

export function cleanupProbabilityHistory(now = Date.now(), database = db) {
  const start = sixMonthStart(now);
  database.exec("BEGIN IMMEDIATE");
  try {
    database
      .prepare("DELETE FROM probability_flow_archive WHERE t<?")
      .run(start);
    database
      .prepare("DELETE FROM probability_fill_seen WHERE time<?")
      .run(start);
    database
      .prepare("DELETE FROM probability_candle_archive WHERE t<?")
      .run(start);
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}
