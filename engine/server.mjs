import { createServer } from "node:http";
import { timingSafeEqual, randomUUID } from "node:crypto";
import { statSync } from "node:fs";
import {
  markets,
  globalMarkets,
  leaderboard,
  candles,
  cex,
  health,
} from "./upstream.mjs";
import { db, dbPath, watchlist, cached, getSetting } from "./db.mjs";
import { wallet, validAddress, observeWallet } from "./wallet.mjs";
import {
  startCollector,
  stopCollector,
  pauseCollector,
  tape,
} from "./collector.mjs";
import { events, news } from "./events.mjs";
import { paperState, openPaper, closePaper } from "./paper.mjs";
import { report } from "./reports.mjs";
import { intelligence } from "./cohort.mjs";
import {
  screener,
  flows,
  getAnalysis,
  enqueueAnalysis,
  processAnalysisQueue,
  analysisStatus,
} from "./screener.mjs";
const host = process.env.ENGINE_HOST || "127.0.0.1",
  token = process.env.ENGINE_TOKEN;
if (!token || token.length < 24)
  throw Error(
    "ENGINE_TOKEN must have at least 24 characters. Start with npm run dev.",
  );
const matches = (v) => {
  const a = Buffer.from(v || ""),
    b = Buffer.from(`Bearer ${token}`);
  return a.length === b.length && timingSafeEqual(a, b);
};
const json = (res, status, data) => {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(data));
};
function bad(message) {
  throw Object.assign(Error(message), { status: 400 });
}
async function body(req) {
  let data = "",
    length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 16384) bad("Request too large.");
    data += chunk;
  }
  try {
    const d = JSON.parse(data || "{}");
    if (!d || Array.isArray(d) || typeof d !== "object")
      bad("Expected a JSON object.");
    return d;
  } catch {
    bad("Invalid JSON request.");
  }
}
async function quote(coin) {
  if (typeof coin !== "string" || coin.length > 32) bad("Invalid market.");
  const m = await markets();
  if (!m.data.some((m) => m.coin === coin))
    bad("Select a listed main DEX market.");
  return m;
}
const addr = (a) => {
  if (!validAddress(a)) bad("Enter a valid 0x wallet address (42 characters).");
  return a.toLowerCase();
};
const readWatchlist = () =>
  watchlist().map((w) => {
    const a = cached(`account:${w.address}`);
    return { ...w, account: a?.data || null, updatedAt: a?.updatedAt || null };
  });
let windowStart = Date.now(),
  requestCount = 0;
export const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost"),
      path = url.pathname,
      method = req.method;
    if (path === "/healthz") return json(res, 200, { ok: true });
    if (!matches(req.headers.authorization))
      return json(res, 401, { error: "Unauthorized" });
    if (Date.now() - windowStart > 60000) {
      windowStart = Date.now();
      requestCount = 0;
    }
    if (++requestCount > 300)
      return json(res, 429, {
        error: "Request limit reached. Retry in one minute.",
      });
    if (method === "GET") {
      if (path === "/overview") {
        const d = await markets();
        return json(res, 200, {
          markets: d.data,
          updatedAt: d.updatedAt,
          stale: d.stale,
          watchlist: watchlist(),
          health,
        });
      }
      if (path === "/markets") return json(res, 200, await markets());
      if (path === "/intelligence") return json(res, 200, await intelligence());
      if (path === "/screener") return json(res, 200, await screener());
      if (path === "/flows")
        return json(
          res,
          200,
          flows(
            url.searchParams.get("window") || "24h",
            (url.searchParams.get("coin") || "").slice(0, 40),
            ["all", "whales", "quality", "watchlist"].includes(
              url.searchParams.get("cohort"),
            )
              ? url.searchParams.get("cohort")
              : "all",
          ),
        );
      if (path.startsWith("/analysis/")) {
        const address = addr(path.split("/")[2]);
        const result = getAnalysis(address);
        void processAnalysisQueue();
        return json(res, 200, result);
      }
      if (path === "/screens")
        return json(res, 200, {
          data: db
            .prepare("SELECT * FROM saved_screens ORDER BY created_at DESC")
            .all()
            .map((r) => ({ ...r, filters: JSON.parse(r.filters) })),
        });
      if (path === "/global-markets")
        return json(res, 200, await globalMarkets());
      if (path === "/leaderboard") return json(res, 200, await leaderboard());
      if (path === "/cex") return json(res, 200, await cex());
      if (path === "/candles") {
        const coin = url.searchParams.get("coin") || "BTC";
        await quote(coin);
        return json(res, 200, await candles(coin));
      }
      if (path.startsWith("/wallet/"))
        return json(res, 200, await wallet(addr(path.split("/")[2])));
      if (path === "/watchlist")
        return json(res, 200, { data: readWatchlist() });
      if (path === "/radar")
        return json(res, 200, {
          signals: db
            .prepare("SELECT * FROM signals ORDER BY time DESC LIMIT 100")
            .all(),
          rules: db
            .prepare("SELECT * FROM rules ORDER BY created_at DESC")
            .all(),
          observations: db
            .prepare("SELECT * FROM observations ORDER BY time DESC LIMIT 100")
            .all(),
          tape: tape(),
          health,
        });
      if (path === "/tape")
        return json(res, 200, tape(url.searchParams.get("coin") || undefined));
      if (path === "/events") return json(res, 200, await events());
      if (path === "/news") return json(res, 200, await news());
      if (path === "/reports") {
        const coin = url.searchParams.get("coin") || "BTC";
        await quote(coin);
        return json(res, 200, await report(coin));
      }
      if (path === "/paper") {
        const m = await markets();
        return json(res, 200, {
          ...paperState(m.data),
          updatedAt: m.updatedAt,
          stale: m.stale,
        });
      }
      if (path === "/status")
        return json(res, 200, {
          health,
          paused: getSetting("paused", false),
          databaseBytes: statSync(dbPath).size,
          tradeCount: db.prepare("SELECT count(*) n FROM trades").get().n,
          watchCount: watchlist().length,
          indexing: analysisStatus(),
          firstCollectedAt: getSetting("firstCollectedAt", null),
          lastGapAt: getSetting("lastGapAt", null),
          limits: {
            watchlist: 20,
            streams: 16,
            automaticCohort: 40,
            indexedFills: 250000,
            fillDays: 30,
            trades: 100000,
            tradeHours: 24,
            historyDays: 90,
          },
          sources: [
            {
              name: "Hyperliquid",
              purpose: "Market data, public wallets and trade stream",
              url: "https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api",
            },
            {
              name: "Bureau of Labor Statistics",
              purpose: "Economic release calendar",
              url: "https://www.bls.gov/schedule/",
            },
            {
              name: "Federal Reserve",
              purpose: "2026 FOMC dates and public announcements",
              url: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
            },
          ],
        });
      if (path === "/export")
        return json(res, 200, {
          version: 1,
          exportedAt: new Date().toISOString(),
          watchlist: watchlist(),
          rules: db.prepare("SELECT * FROM rules").all(),
          paper: db.prepare("SELECT * FROM paper_positions").all(),
          screens: db
            .prepare("SELECT * FROM saved_screens")
            .all()
            .map((r) => ({ ...r, filters: JSON.parse(r.filters) })),
          observations: db.prepare("SELECT * FROM observations").all(),
        });
    }
    if (method === "POST" || method === "PATCH" || method === "DELETE") {
      const b = await body(req);
      if (path === "/analyze" && method === "POST") {
        const address = addr(b.address);
        const queued = enqueueAnalysis(address, 20);
        const existing = db
          .prepare(
            "SELECT updated_at,value FROM wallet_analysis WHERE address=?",
          )
          .get(address);
        const current =
          existing &&
          Date.now() - existing.updated_at < 1800000 &&
          JSON.parse(existing.value).analyticsVersion >= 4;
        if (!queued && !current)
          return json(res, 503, {
            error:
              "The analysis queue is full. Please retry shortly; your wallet was not queued.",
          });
        if (queued) void processAnalysisQueue();
        return json(res, queued ? 202 : 200, {
          ok: true,
          status: queued ? "queued" : "cached",
          updatedAt: existing?.updated_at ?? null,
        });
      }
      if (path === "/screens" && method === "POST") {
        if (db.prepare("SELECT COUNT(*) n FROM saved_screens").get().n >= 12)
          bad("Limit: 12 saved screens.");
        const name = String(b.name || "")
          .trim()
          .slice(0, 60);
        if (!name) bad("Name the screen.");
        if (
          !b.filters ||
          Array.isArray(b.filters) ||
          typeof b.filters !== "object" ||
          JSON.stringify(b.filters).length > 3000
        )
          bad("Invalid filters.");
        db.prepare("INSERT INTO saved_screens VALUES(?,?,?,?)").run(
          randomUUID(),
          name,
          JSON.stringify(b.filters),
          Date.now(),
        );
        return json(res, 200, { ok: true });
      }
      if (path.startsWith("/screens/") && method === "DELETE") {
        db.prepare("DELETE FROM saved_screens WHERE id=?").run(
          path.split("/")[2],
        );
        return json(res, 200, { ok: true });
      }
      if (path === "/watchlist" && method === "POST") {
        const address = addr(b.address),
          label = String(b.label || "")
            .trim()
            .slice(0, 80);
        if (
          watchlist().length >= 20 &&
          !watchlist().some((w) => w.address === address)
        )
          bad("The free local edition tracks up to 20 wallets.");
        db.prepare(
          "INSERT INTO watchlists VALUES(?,?,?) ON CONFLICT(address) DO UPDATE SET label=excluded.label",
        ).run(address, label, Date.now());
        void observeWallet(address).catch(() => {});
        return json(res, 200, { ok: true });
      }
      if (path.startsWith("/watchlist/") && method === "DELETE") {
        const address = addr(path.split("/")[2]);
        db.prepare("DELETE FROM watchlists WHERE address=?").run(address);
        if (
          !cached("research-cohort")?.data.wallets.some(
            (w) => w.address === address,
          )
        )
          db.prepare("DELETE FROM cache WHERE key=?").run(
            `baseline:${address}`,
          );
        return json(res, 200, { ok: true });
      }
      if (path === "/rules" && method === "POST") {
        if (db.prepare("SELECT COUNT(*) n FROM rules").get().n >= 30)
          bad("Limit: 30 alert rules.");
        if (
          ![
            "price_above",
            "price_below",
            "funding_above",
            "large_trade",
          ].includes(b.kind)
        )
          bad("Invalid alert type.");
        const coin = String(b.coin || "BTC");
        await quote(coin);
        const threshold = Number(b.threshold);
        if (!Number.isFinite(threshold) || threshold <= 0)
          bad("Threshold must be a positive number.");
        db.prepare(
          "INSERT INTO rules(id,kind,coin,threshold,created_at) VALUES(?,?,?,?,?)",
        ).run(randomUUID(), b.kind, coin, threshold, Date.now());
        return json(res, 200, { ok: true });
      }
      if (path.startsWith("/rules/") && method === "DELETE") {
        db.prepare("DELETE FROM rules WHERE id=?").run(path.split("/")[2]);
        return json(res, 200, { ok: true });
      }
      if (path === "/signals/read" && method === "POST") {
        db.prepare("UPDATE signals SET read=1").run();
        return json(res, 200, { ok: true });
      }
      if (path === "/paper/open" && method === "POST") {
        const m = await quote(b.coin);
        if (m.stale || Date.now() - m.updatedAt > 60000)
          bad("A fresh market quote is required for paper orders.");
        if (b.source) b.source = addr(b.source);
        try {
          return json(res, 200, openPaper(b, m.data));
        } catch (e) {
          bad(e.message);
        }
      }
      if (path === "/paper/close" && method === "POST") {
        const m = await markets();
        if (m.stale || Date.now() - m.updatedAt > 60000)
          bad("A fresh market quote is required for paper orders.");
        try {
          return json(res, 200, closePaper(String(b.id || ""), m.data));
        } catch (e) {
          bad(e.message);
        }
      }
      if (path === "/settings" && method === "POST") {
        if (typeof b.paused !== "boolean") bad("Specify paused as a boolean.");
        pauseCollector(b.paused);
        return json(res, 200, { ok: true });
      }
    }
    return json(res, 404, { error: "Route not found" });
  } catch (e) {
    console.error("[api]", e.message);
    json(res, e.status || 503, { error: e.message });
  }
});
server.requestTimeout = 30000;
server.headersTimeout = 15000;
server.listen(Number(process.env.ENGINE_PORT || 8787), host, () =>
  console.log(
    `daVIRA engine ready on http://${host}:${process.env.ENGINE_PORT || 8787}`,
  ),
);
if (process.env.DISABLE_COLLECTOR !== "1") startCollector();
function shutdown() {
  stopCollector();
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
