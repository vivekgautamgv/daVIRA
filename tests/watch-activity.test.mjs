import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const temp = mkdtempSync(join(tmpdir(), "davira-watch-test-"));
process.env.DAVIRA_DB_PATH = join(temp, "test.sqlite");
const { watchEvents, watchOverview } =
  await import("../engine/watch-activity.mjs");
const { db, saveCache, signal } = await import("../engine/db.mjs");
const address = "0x" + "a".repeat(40),
  now = Date.now();
test("order placement and execution are distinct, deduplicated events; old events excluded", () => {
  const order = {
    order: {
      oid: 4,
      coin: "ETH",
      timestamp: now,
      side: "B",
      origSz: "2",
      limitPx: "2000",
    },
    status: "filled",
  };
  const fill = {
    coin: "ETH",
    time: now,
    oid: 4,
    tid: 8,
    side: "B",
    dir: "Open Long",
    sz: "2",
    px: "2000",
  };
  const events = watchEvents(
    address,
    now,
    [
      order,
      order,
      { ...order, order: { ...order.order, oid: 1, timestamp: now - 1 } },
    ],
    [fill, fill, { ...fill, tid: 9, time: now - 1 }],
  );
  assert.equal(events.length, 2);
  assert.deepEqual(
    events.map((e) => e.type),
    ["watch_order", "watch_fill"],
  );
  assert.match(events[0].detail, /not an execution/);
  for (const e of [...events, ...events])
    signal(e.id, e.type, e.coin, address, e.title, e.detail, e.time);
  assert.equal(db.prepare("SELECT count(*) n FROM signals").get().n, 2);
});
test("overview includes followed wallets only and labels stale venue snapshots", () => {
  db.prepare("INSERT INTO watchlists VALUES(?,?,?)").run(
    address,
    "Test wallet",
    now - 1000,
  );
  saveCache(
    `account:${address}`,
    { equity: 100, positions: [{ coin: "ETH", size: 2, value: 4000 }] },
    now - 180001,
  );
  const summary = watchOverview(now);
  assert.equal(summary.data.length, 1);
  assert.equal(summary.data[0].positions[0].stale, true);
  assert.equal(summary.data[0].activity, null);
  assert.equal(summary.alerts.length, 2);
  db.prepare("DELETE FROM watchlists").run();
  assert.equal(watchOverview(now).alerts.length, 0);
});

test('poll initializes without historical alerts and retains data on source failure', async () => {
  const {pollWatchActivity}=await import('../engine/watch-activity.mjs');
  const {cached}=await import('../engine/db.mjs');
  db.prepare('INSERT INTO watchlists VALUES(?,?,?)').run(address,'Test',now-86400000);
  const original=globalThis.fetch;
  try {
    globalThis.fetch=async (_url,options)=>({ok:true,json:async()=>JSON.parse(options.body).type==='historicalOrders'?[{order:{oid:99,coin:'ETH',side:'B',timestamp:now-10000},status:'open'}]:[]});
    await pollWatchActivity();
    assert.equal(db.prepare("SELECT count(*) n FROM signals WHERE id LIKE '%:99'").get().n,0);
    const first=cached(`watch-activity:${address}`).data;
    assert.ok(first.since>=now);
    assert.deepEqual(first.orders,[]);
    saveCache(`watch-scan:${address}`,{},now-60000);
    globalThis.fetch=async()=>{throw Error('offline');};
    await pollWatchActivity();
    const failed=cached(`watch-activity:${address}`).data;
    assert.equal(failed.ordersAt,first.ordersAt);
    assert.equal(failed.fillsCursor,first.fillsCursor);
    assert.equal(failed.issues.length,3);
  } finally {globalThis.fetch=original;}
});

test.after(() => {
  db.close();
  rmSync(temp, { recursive: true, force: true });
});
