import { initDailyWallets } from "./daily-wallets.mjs";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
export const dbPath = resolve(
  process.env.DAVIRA_DB_PATH || "data/davira.sqlite",
);
mkdirSync(dirname(dbPath), { recursive: true });
export const db = new DatabaseSync(dbPath);
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS watchlists (address TEXT PRIMARY KEY, label TEXT NOT NULL DEFAULT '', added_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS trades (id TEXT PRIMARY KEY, coin TEXT NOT NULL, time INTEGER NOT NULL, side TEXT NOT NULL, price REAL NOT NULL, size REAL NOT NULL, buyer TEXT, seller TEXT);
CREATE INDEX IF NOT EXISTS idx_trades_coin_time ON trades(coin,time);
CREATE TABLE IF NOT EXISTS wallet_history (address TEXT NOT NULL, time INTEGER NOT NULL, equity REAL NOT NULL, PRIMARY KEY(address,time));
CREATE TABLE IF NOT EXISTS signals (id TEXT PRIMARY KEY, type TEXT NOT NULL, coin TEXT, address TEXT, title TEXT NOT NULL, detail TEXT NOT NULL, time INTEGER NOT NULL, read INTEGER NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS idx_signals_time ON signals(time);
CREATE TABLE IF NOT EXISTS rules (id TEXT PRIMARY KEY, kind TEXT NOT NULL, coin TEXT, threshold REAL NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, last_fired INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS paper_positions (id TEXT PRIMARY KEY, source TEXT, coin TEXT NOT NULL, side TEXT NOT NULL, quantity TEXT NOT NULL, entry TEXT NOT NULL, margin TEXT NOT NULL, leverage REAL NOT NULL, fee TEXT NOT NULL, funding TEXT NOT NULL DEFAULT '0', opened_at INTEGER NOT NULL, closed_at INTEGER, exit TEXT, pnl TEXT);
CREATE TABLE IF NOT EXISTS paper_followers (address TEXT PRIMARY KEY, budget REAL NOT NULL, active INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL, last_sync INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS paper_actions (id TEXT PRIMARY KEY, time INTEGER NOT NULL, detail TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS observations (id TEXT PRIMARY KEY,address TEXT NOT NULL,coin TEXT NOT NULL,direction INTEGER NOT NULL,price REAL NOT NULL,time INTEGER NOT NULL,resolved_at INTEGER,return_pct REAL);
CREATE TABLE IF NOT EXISTS movements (id TEXT PRIMARY KEY,address TEXT NOT NULL,coin TEXT NOT NULL,kind TEXT NOT NULL,old_size REAL NOT NULL,new_size REAL NOT NULL,notional_delta REAL NOT NULL,time INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS wallet_fills (address TEXT NOT NULL,id TEXT NOT NULL,coin TEXT NOT NULL,time INTEGER NOT NULL,value TEXT NOT NULL,PRIMARY KEY(address,id));
CREATE INDEX IF NOT EXISTS idx_wallet_fills_time ON wallet_fills(time);
CREATE INDEX IF NOT EXISTS idx_wallet_fills_coin_time ON wallet_fills(coin,time);
CREATE TABLE IF NOT EXISTS wallet_analysis (address TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS analysis_queue (address TEXT PRIMARY KEY,priority INTEGER NOT NULL DEFAULT 0,queued_at INTEGER NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,error TEXT);
CREATE TABLE IF NOT EXISTS saved_screens (id TEXT PRIMARY KEY,name TEXT NOT NULL,filters TEXT NOT NULL,created_at INTEGER NOT NULL);
PRAGMA optimize;`);
initDailyWallets(db);
export function cached(key) {
  const row = db.prepare("SELECT * FROM cache WHERE key=?").get(key);
  return row
    ? { data: JSON.parse(row.value), updatedAt: row.updated_at }
    : null;
}
export function saveCache(key, data, time = Date.now()) {
  db.prepare(
    "INSERT INTO cache VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at",
  ).run(key, JSON.stringify(data), time);
  return { data, updatedAt: time };
}
export const watchlist = () =>
  db.prepare("SELECT * FROM watchlists ORDER BY added_at DESC").all();
export const getSetting = (key, fallback) => {
  const row = db.prepare("SELECT value FROM settings WHERE key=?").get(key);
  return row ? JSON.parse(row.value) : fallback;
};
export const setSetting = (key, value) =>
  db
    .prepare(
      "INSERT INTO settings VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
    )
    .run(key, JSON.stringify(value));
export function signal(
  id,
  type,
  coin,
  address,
  title,
  detail,
  time = Date.now(),
) {
  return (
    db
      .prepare(
        "INSERT OR IGNORE INTO signals(id,type,coin,address,title,detail,time) VALUES(?,?,?,?,?,?,?)",
      )
      .run(id, type, coin, address, title, detail, time).changes > 0
  );
}
