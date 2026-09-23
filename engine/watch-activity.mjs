import { db, cached, saveCache, signal, watchlist, getSetting } from "./db.mjs";
import { info, health } from "./upstream.mjs";
import { fillId } from "./screener-math.mjs";

export function watchEvents(address, since, orders, fills) {
  const events = [];
  for (const item of orders) {
    const o = item.order;
    if (
      !o ||
      o.oid == null ||
      !(o.timestamp >= since) ||
      !["B", "A"].includes(o.side)
    )
      continue;
    events.push({
      id: `watch-order:${address}:${o.oid}`,
      type: "watch_order",
      coin: o.coin,
      time: o.timestamp,
      title: `${o.coin} ${o.side === "B" ? "buy" : "sell"} order placed`,
      detail: `Order ${o.oid}: ${o.origSz ?? o.sz} units at limit ${o.limitPx}. Type: ${o.orderType || "order"}. ${o.reduceOnly ? "Reduce-only. " : ""}Observed status: ${item.status}. Order placement is not an execution.`,
    });
  }
  for (const f of fills) {
    if (!(f.time >= since) || !(Number(f.sz) > 0) || !(Number(f.px) > 0))
      continue;
    events.push({
      id: `watch-fill:${address}:${fillId(f)}`,
      type: "watch_fill",
      coin: f.coin,
      time: f.time,
      title: `${f.coin} ${f.dir || (f.side === "B" ? "buy" : "sell")} executed`,
      detail: `${f.sz} units at ${f.px} (approximately $${(Number(f.sz) * Number(f.px)).toFixed(2)}). Order ${f.oid ?? "unavailable"}. Realized PnL ${f.closedPnl ?? "unavailable"} before fees; reported fee ${f.fee ?? "unavailable"} ${f.feeToken || ""}.`,
    });
  }
  return [...new Map(events.map((e) => [e.id, e])).values()];
}
let running = false;
export async function pollWatchActivity() {
  if (running || getSetting("paused", false)) return;
  const now = Date.now();
  const candidates = watchlist()
    .map((w) => ({ ...w, scan: cached(`watch-scan:${w.address}`) }))
    .filter((w) => !w.scan || now - w.scan.updatedAt >= 30000)
    .sort((a, b) => (a.scan?.updatedAt || 0) - (b.scan?.updatedAt || 0));
  const w = candidates[0];
  if (!w) return;
  running = true;
  try {
    saveCache(`watch-scan:${w.address}`, { pending: true }, now);
    const previous = cached(`watch-activity:${w.address}`);
    const since = Math.max(w.added_at, previous?.data.since ?? now);
    const results = await Promise.allSettled([
      info({ type: "historicalOrders", user: w.address }),
      info({ type: "frontendOpenOrders", user: w.address }),
      info({
        type: "userFillsByTime",
        user: w.address,
        startTime: Math.max(
          since,
          (previous?.data.fillsCursor ?? since) - 60000,
          now - 86400000,
        ),
        endTime: now,
        aggregateByTime: false,
      }),
    ]);
    // A removed/re-added wallet must not receive late events from the old subscription.
    if (
      !watchlist().some(
        (x) => x.address === w.address && x.added_at === w.added_at,
      )
    )
      return;
    const get = (i) =>
      results[i].status === "fulfilled" && Array.isArray(results[i].value)
        ? results[i].value
        : null;
    const orders = get(0),
      open = get(1),
      fills = get(2);
    const issues = results.flatMap((r, i) =>
      r.status === "rejected"
        ? [
            `${["Order history", "Open orders", "Fills"][i]}: ${r.reason.message}`,
          ]
        : !Array.isArray(r.value)
          ? [
              `${["Order history", "Open orders", "Fills"][i]}: invalid source response`,
            ]
          : [],
    );
    if (orders?.length >= 2000 || fills?.length >= 2000)
      issues.push("Source response reached its cap; events may be missing.");
    if (previous && now - previous.updatedAt > 86400000)
      issues.push(
        "Collector was offline for over 24 hours; fill catch-up is limited to 24 hours.",
      );
    for (const e of watchEvents(w.address, since, orders || [], fills || []))
      signal(e.id, e.type, e.coin, w.address, e.title, e.detail, e.time);
    const prior = previous?.data;
    saveCache(
      `watch-activity:${w.address}`,
      {
        since,
        fillsCursor:
          fills && fills.length < 2000 ? now : (prior?.fillsCursor ?? since),
        orders: open ?? prior?.orders ?? null,
        ordersAt: open ? now : (prior?.ordersAt ?? null),
        fills: fills
          ? [
              ...new Map(
                [...(prior?.fills || []), ...fills].map((f) => [fillId(f), f]),
              ).values(),
            ]
              .sort((a, b) => b.time - a.time)
              .slice(0, 50)
          : (prior?.fills ?? []),
        fillsAt: fills ? now : (prior?.fillsAt ?? null),
        historyAt: orders ? now : (prior?.historyAt ?? null),
        issues,
      },
      now,
    );
    delete health.failures[`watch:${w.address}`];
  } catch (e) {
    health.failures[`watch:${w.address}`] = {
      message: e.message,
      time: Date.now(),
    };
  } finally {
    running = false;
  }
}

export function watchOverview(now = Date.now()) {
  const wallets = watchlist();
  const data = wallets.map((w) => {
    const main = cached(`account:${w.address}`),
      activity = cached(`watch-activity:${w.address}`);
    const row = db
      .prepare("SELECT value FROM wallet_analysis WHERE address=?")
      .get(w.address);
    const a = row ? JSON.parse(row.value) : null;
    const positions = (main?.data.positions || []).map((p) => ({
      ...p,
      venue: "Hyperliquid",
      observedAt: main.updatedAt,
      stale: now - main.updatedAt > 180000,
    }));
    for (const p of a?.positions || []) {
      if (!p.dex || p.dex === "Hyperliquid") continue;
      const v = a.builderCoverage?.find((v) => v.dex === p.dex);
      positions.push({
        ...p,
        venue: p.dex,
        observedAt: v?.updatedAt ?? null,
        stale: !v?.available || v.stale || now - v.updatedAt > 180000,
      });
    }
    return {
      ...w,
      account: main?.data || null,
      updatedAt: main?.updatedAt ?? null,
      positions,
      activity: activity?.data || null,
      checkedAt: activity?.updatedAt ?? null,
    };
  });
  const alerts = db
    .prepare(
      `SELECT s.* FROM signals s JOIN watchlists w ON w.address=s.address WHERE s.time>=w.added_at AND s.type IN ('watch_order','watch_fill','position') ORDER BY s.time DESC LIMIT 100`,
    )
    .all();
  return {
    data,
    alerts,
    paused: getSetting("paused", false),
    coverage:
      "Main DEX and spot orders; fills returned by Hyperliquid across available markets. Builder positions use separately timestamped research snapshots. Rotating polling is best effort; short-lived events and capped history can be missed.",
  };
}
