import { db } from "./db.mjs";
import { compareMarket } from "./positioning-brief.mjs";

export function recordMarkets(result, now = Date.now()) {
  if (
    result.stale ||
    !Number.isFinite(result.updatedAt) ||
    result.updatedAt > now ||
    now - result.updatedAt > 120000
  )
    return;
  const insert = db.prepare(
    "INSERT OR IGNORE INTO market_history(coin,bucket,time,price,oi,funding) VALUES(?,?,?,?,?,?)",
  );
  db.exec("BEGIN");
  try {
    for (const m of result.data) {
      if (
        !Number.isFinite(m.price) ||
        !(m.price > 0) ||
        !Number.isFinite(m.openInterest) ||
        m.openInterest < 0
      )
        continue;
      insert.run(
        m.coin,
        Math.floor(result.updatedAt / 300000),
        result.updatedAt,
        m.price,
        m.openInterest / m.price,
        Number.isFinite(m.funding) ? m.funding : null,
      );
    }
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

export function marketContexts(result, duration, now = Date.now()) {
  const contexts = new Map();
  const query = db.prepare(
    "SELECT * FROM market_history WHERE coin=? AND time BETWEEN ? AND ? ORDER BY ABS(time-?) LIMIT 1",
  );
  for (const m of result?.data || []) {
    const target = result.updatedAt - duration;
    const baseline = query.get(
      m.coin,
      target - 600000,
      target + 600000,
      target,
    );
    contexts.set(
      m.coin,
      compareMarket(
        result.stale
          ? null
          : {
              price: m.price,
              oi: m.price > 0 ? m.openInterest / m.price : null,
              funding: m.funding,
              time: result.updatedAt,
            },
        baseline,
        now,
        duration,
      ),
    );
  }
  return contexts;
}
