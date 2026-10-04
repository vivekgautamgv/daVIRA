import test from "node:test";
import assert from "node:assert/strict";
import {
  createProbabilitySource,
  completedHistoryCurrent,
} from "../engine/probability-source.mjs";
import { sixMonthStart } from "../engine/probability-math.mjs";

const now = Date.UTC(2026, 9, 4, 13, 30),
  H = 3600000;
function fixture({ fail = false, stale = false, cacheHits = false } = {}) {
  const cache = new Map(),
    archive = new Map(),
    requests = [],
    ttls = [],
    writes = [];
  const candle = { t: now - 2 * H };
  return {
    cache,
    archive,
    requests,
    ttls,
    writes,
    candle,
    source: createProbabilitySource({
      cached: (key) => cache.get(key),
      resource: async (key, ttl, loader) => {
        ttls.push(ttl);
        if (stale && cache.has(key))
          return { ...cache.get(key), stale: true, error: "budget" };
        if (cacheHits && cache.has(key)) return cache.get(key);
        const value = { data: await loader(), updatedAt: now, stale: false };
        cache.set(key, value);
        return value;
      },
      info: async (body, weight) => {
        requests.push({ body, weight });
        if (fail) throw Error("budget");
        return [candle];
      },
      save: (coin, candles) => {
        writes.push(candles.length);
        const old = archive.get(coin) || [];
        const byTime = new Map(old.map((c) => [c.t, c]));
        for (const c of candles) byTime.set(c.t, c);
        archive.set(coin, [...byTime.values()]);
      },
      load: (coin) => archive.get(coin) || [],
    }),
  };
}
test("first candle request asks for six calendar months, later requests refresh only 48h", async () => {
  const f = fixture();
  await f.source("ETH", now);
  assert.equal(f.requests[0].body.req.startTime, sixMonthStart(now));
  assert.equal(f.requests[0].body.req.coin, "ETH");
  assert.equal(f.requests[0].weight, 100);
  await f.source("ETH", now + H);
  assert.equal(f.requests[1].body.req.startTime, now + H - 48 * H);
  assert.equal(f.requests[1].weight, 20);
});
test("failed initial download preserves genuine cached candles but marks them stale", async () => {
  const f = fixture({ fail: true });
  f.cache.set("token-candles:ETH:1h", { data: [f.candle], updatedAt: now - H });
  const r = await f.source("ETH", now);
  assert.deepEqual(r.data, [f.candle]);
  assert.equal(r.updatedAt, now - H);
  assert.equal(r.stale, true);
  assert.equal(r.error, "budget");
  assert.equal(f.cache.has("probability-candles:ETH:1h:v1"), false);
});
test("stale source preserves stale flag and cannot look fresh after saving archive", async () => {
  const f = fixture({ stale: true });
  f.cache.set("probability-candles:ETH:1h:v1", {
    data: [f.candle],
    updatedAt: now - H,
  });
  const r = await f.source("ETH", now);
  assert.equal(r.stale, true);
  assert.equal(r.updatedAt, now - H);
  assert.equal(r.error, "budget");
  assert.equal(f.requests.length, 0);
});
test("coin archives remain separate", async () => {
  const f = fixture();
  await f.source("ETH", now);
  assert.deepEqual(f.archive.get("ETH"), [f.candle]);
  assert.equal(f.archive.has("BTC"), false);
});
test("cached requests do not rewrite historical candle archives", async () => {
  const f = fixture({ cacheHits: true });
  await f.source("ETH", now);
  await f.source("ETH", now + 1000);
  assert.equal(f.requests.length, 1);
  assert.deepEqual(f.writes, [1]);
});
test("completed-candle readiness survives a refresh failure, but expires at the next hour", async () => {
  const f = fixture({ fail: true }),
    end = Math.floor(now / H) * H;
  const candles = Array.from({ length: 20 }, (_, j) => ({
    s: "ETH",
    i: "1h",
    t: end - (j + 1) * H,
    T: end - j * H - 1,
    o: 100,
    h: 102,
    l: 98,
    c: 101,
  }));
  f.archive.set("ETH", candles);
  const current = await f.source("ETH", now);
  assert.equal(current.stale, true);
  assert.equal(current.error, "budget");
  assert.equal(current.completedHistoryCurrent, true);
  const nextHour = await f.source("ETH", end + H + 1000);
  assert.equal(nextHour.completedHistoryCurrent, false);
  assert.equal(completedHistoryCurrent(candles.slice(1), "ETH", now), false);
  assert.equal(completedHistoryCurrent(candles, "BTC", now), false);
});
test("an hourly boundary expires a response cached less than five minutes ago", async () => {
  const f = fixture(),
    end = Math.floor(now / H) * H;
  f.cache.set("probability-candles:ETH:1h:v1", {
    data: [f.candle],
    updatedAt: end + H - 1000,
  });
  await f.source("ETH", end + H + 1000);
  assert.deepEqual(f.ttls, [0]);
  assert.equal(f.requests.length, 1);
  assert.equal(f.requests[0].weight, 20);
});
