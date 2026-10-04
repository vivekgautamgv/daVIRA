import { pollWatchActivity } from "./watch-activity.mjs";
import { recordMarkets } from "./market-history.mjs";
import { processBackfill } from "./fill-backfill.mjs";
import {
  db,
  watchlist,
  cached,
  saveCache,
  signal,
  getSetting,
  setSetting,
} from "./db.mjs";
import { markets, globalMarkets, health } from "./upstream.mjs";
import { observeWallet } from "./wallet.mjs";
import { ruleMatches } from "./analytics.mjs";
import { refreshCohort } from "./cohort.mjs";
import {
  processAnalysisQueue,
  cleanupAnalysis,
  queueRwaCandidates,
  refreshStoredAnalyses,
  analyzeWallet,
} from "./screener.mjs";
import { isRwa } from "./screener-math.mjs";
let socket,
  timers = [],
  stopped = false,
  reconnecting,
  connecting = false,
  lastMessage = 0;
const insert = db.prepare(
  "INSERT OR IGNORE INTO trades VALUES(?,?,?,?,?,?,?,?)",
);
export function evaluateRules(marketData, trade) {
  const now = Date.now();
  for (const r of db.prepare("SELECT * FROM rules WHERE enabled=1").all()) {
    if (now - r.last_fired < 900000) continue;
    if (
      ruleMatches(
        r,
        marketData.find((m) => m.coin === r.coin),
        trade,
      )
    ) {
      signal(
        `rule:${r.id}:${now}`,
        "rule",
        trade?.coin || r.coin,
        null,
        `${r.coin || "Market"} · ${r.kind.replaceAll("_", " ")}`,
        `Threshold ${r.threshold}. ${trade ? `Observed trade: $${Math.round(trade.price * trade.size).toLocaleString()}.` : "Condition met on the current market snapshot."}`,
      );
      db.prepare("UPDATE rules SET last_fired=? WHERE id=?").run(now, r.id);
    }
  }
}
export function ingestTrades(items, connectedAt = 0) {
  const fresh = [];
  db.exec("BEGIN");
  try {
    for (const t of items) {
      if (
        !t.coin ||
        !Number.isFinite(t.time) ||
        !Number.isFinite(Number(t.px)) ||
        !Number.isFinite(Number(t.sz)) ||
        Number(t.px) <= 0 ||
        Number(t.sz) <= 0
      )
        continue;
      const row = {
        id: `${t.time}:${t.coin}:${t.tid}`,
        coin: t.coin,
        time: t.time,
        side: t.side,
        price: Number(t.px),
        size: Number(t.sz),
        buyer: t.users?.[0]?.toLowerCase() || null,
        seller: t.users?.[1]?.toLowerCase() || null,
      };
      if (
        insert.run(
          row.id,
          row.coin,
          row.time,
          row.side,
          row.price,
          row.size,
          row.buyer,
          row.seller,
        ).changes &&
        row.time >= connectedAt
      )
        fresh.push(row);
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
  for (const row of fresh) evaluateRules([], row);
  health.lastTrade = Math.max(
    health.lastTrade,
    ...items.map((t) => t.time || 0),
  );
}
async function connect() {
  if (stopped || connecting || getSetting("paused", false)) return;
  connecting = true;
  try {
    const m = await markets(),
      coins = m.data
        .filter((x) => !x.dex)
        .slice(0, 12)
        .map((x) => x.coin);
    try {
      const global = await globalMarkets();
      coins.push(
        ...global.data.markets
          .filter((x) => isRwa(x.coin))
          .slice(0, 4)
          .map((x) => x.coin),
      );
    } catch {}
    health.streams = coins;
    health.websocket = "connecting";
    const connectedAt = Date.now();
    socket = new WebSocket("wss://api.hyperliquid.xyz/ws");
    socket.addEventListener("open", () => {
      lastMessage = Date.now();
      health.websocket = "live";
      if (!getSetting("firstCollectedAt", null))
        setSetting("firstCollectedAt", Date.now());
      for (const coin of coins)
        socket.send(
          JSON.stringify({
            method: "subscribe",
            subscription: { type: "trades", coin },
          }),
        );
    });
    socket.addEventListener("message", (event) => {
      lastMessage = Date.now();
      try {
        const d = JSON.parse(event.data);
        if (d.channel === "trades" && Array.isArray(d.data))
          ingestTrades(d.data, connectedAt);
      } catch (e) {
        health.failures.stream = { message: e.message, time: Date.now() };
      }
    });
    socket.addEventListener("error", () => {
      health.websocket = "reconnecting";
      socket.close();
    });
    socket.addEventListener("close", () => {
      health.websocket = getSetting("paused", false)
        ? "paused"
        : "reconnecting";
      if (!stopped && !getSetting("paused", false)) {
        setSetting("lastGapAt", Date.now());
        reconnecting = setTimeout(connect, 10000);
      }
    });
  } catch (e) {
    health.failures.stream = { message: e.message, time: Date.now() };
    if (!stopped) reconnecting = setTimeout(connect, 15000);
  } finally {
    connecting = false;
  }
}
let polling = false;
export async function poll() {
  if (polling || getSetting("paused", false)) return;
  polling = true;
  try {
    const m = await markets();
    recordMarkets(m);
    if (!m.stale) evaluateRules(m.data);
    await refreshCohort();
    queueRwaCandidates();
    for (const w of watchlist()) {
      if (stopped) break;
      try {
        await observeWallet(w.address);
      } catch (e) {
        health.failures[`wallet:${w.address}`] = {
          message: e.message,
          time: Date.now(),
        };
      }
    }
  } finally {
    polling = false;
  }
}
export function resolveObservations(marketData, quoteAt) {
  for (const o of db
    .prepare("SELECT * FROM observations WHERE resolved_at IS NULL AND time<=?")
    .all(quoteAt - 3600000)) {
    const quote = marketData.find((m) => m.coin === o.coin);
    if (quote && quote.price > 0)
      db.prepare(
        "UPDATE observations SET resolved_at=?,return_pct=? WHERE id=?",
      ).run(quoteAt, (quote.price / o.price - 1) * 100 * o.direction, o.id);
  }
}
export function cleanup() {
  cleanupAnalysis();
  const now = Date.now();
  db.prepare("DELETE FROM trades WHERE time<?").run(now - 86400000);
  db.prepare("DELETE FROM market_history WHERE time<?").run(now - 3 * 86400000);
  db.prepare("DELETE FROM collection_runs WHERE finished_at<?").run(
    now - 14 * 86400000,
  );
  db.prepare(
    "DELETE FROM trades WHERE id IN (SELECT id FROM trades ORDER BY time DESC LIMIT -1 OFFSET 100000)",
  ).run();
  db.prepare("DELETE FROM signals WHERE time<?").run(now - 30 * 86400000);
  db.prepare("DELETE FROM wallet_history WHERE time<?").run(
    now - 90 * 86400000,
  );
  db.prepare("DELETE FROM observations WHERE time<?").run(now - 90 * 86400000);
  db.prepare("DELETE FROM movements WHERE time<?").run(now - 90 * 86400000);
  db.prepare("DELETE FROM cache WHERE updated_at<?").run(now - 7 * 86400000);
  db.exec("PRAGMA wal_checkpoint(PASSIVE)");
}
export function startCollector() {
  refreshStoredAnalyses();
  if (getSetting("firstCollectedAt", null)) setSetting("lastGapAt", Date.now());
  if (getSetting("paused", false)) health.websocket = "paused";
  else void connect();
  void poll().catch((e) => {
    health.failures.poll = { message: e.message, time: Date.now() };
  });
  void pollWatchActivity();
  timers.push(
    setInterval(() => void pollWatchActivity(), 15000),
    setInterval(() => {
      // Preserve request headroom for followed-wallet monitoring.
      if (watchlist().length && health.weight > 600) return;
      void processAnalysisQueue().catch(() => {});
    }, 3000),
    setInterval(() => {
      if (getSetting("paused", false)) return;
      // Clear focused fresh-data requests before spending budget on older pages.
      if (
        db
          .prepare(
            "SELECT 1 FROM analysis_queue WHERE priority>=10 AND queued_at<=? LIMIT 1",
          )
          .get(Date.now())
      )
        return;
      void processBackfill(analyzeWallet);
    }, 6000),
    setInterval(() => void poll().catch(() => {}), 60000),
    setInterval(cleanup, 300000),
    setInterval(() => {
      if (socket?.readyState === WebSocket.OPEN) {
        if (Date.now() - lastMessage > 60000) socket.close();
        else socket.send(JSON.stringify({ method: "ping" }));
      }
    }, 20000),
  );
  cleanup();
}
export function pauseCollector(paused) {
  setSetting("paused", paused);
  if (paused) {
    clearTimeout(reconnecting);
    socket?.close();
    health.websocket = "paused";
  } else void connect();
}
export function stopCollector() {
  stopped = true;
  timers.forEach(clearInterval);
  clearTimeout(reconnecting);
  socket?.close();
}
export function tape(coin) {
  const cutoff = Date.now() - 3600000,
    where = coin ? " AND coin=?" : "",
    args = coin ? [cutoff, coin] : [cutoff];
  const sums = db
    .prepare(
      `SELECT coin,COUNT(*) trades,SUM(CASE WHEN side='B' THEN price*size ELSE 0 END) buy,SUM(CASE WHEN side='A' THEN price*size ELSE 0 END) sell,MIN(time) firstTime,MAX(time) lastTime FROM trades WHERE time>?${where} GROUP BY coin ORDER BY buy+sell DESC`,
    )
    .all(...args);
  const large = db
    .prepare(
      `SELECT * FROM trades WHERE time>?${where} ORDER BY price*size DESC LIMIT 30`,
    )
    .all(...args);
  return {
    sums,
    large,
    firstCollectedAt: getSetting("firstCollectedAt", null),
    lastGapAt: getSetting("lastGapAt", null),
    coverage:
      "Retained observed trades: latest 24 hours or 100,000 trades, whichever is shorter. Table covers retained trades within the last hour. Gaps are not backfilled. Buy/sell is taker direction, not capital inflow/outflow.",
  };
}
