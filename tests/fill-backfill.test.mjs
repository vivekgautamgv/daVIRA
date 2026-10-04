import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const dir = mkdtempSync(join(tmpdir(), "davira-history-"));
process.env.DAVIRA_DB_PATH = join(dir, "test.sqlite");
const { db } = await import("../engine/db.mjs");
const { advancePage, requestBackfill, processBackfill } =
  await import("../engine/fill-backfill.mjs");
const { sixMonthStart } = await import("../engine/probability-math.mjs");
const { probabilityFlowRows } =
  await import("../engine/probability-history.mjs");
test.after(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});
test("backfill retains inclusive timestamp boundaries and exposes bounded coverage", () => {
  const page = Array.from({ length: 2000 }, (_, i) => ({ time: 100 + i }));
  assert.deepEqual(advancePage(page, 100, 9999, 1), {
    cursor: 2099,
    status: "queued",
  });
  assert.equal(
    advancePage(
      Array.from({ length: 2000 }, () => ({ time: 100 })),
      100,
      9999,
      1,
    ).status,
    "boundary_limited",
  );
  assert.equal(advancePage(page, 100, 9999, 6).status, "page_limited");
  assert.equal(
    advancePage([{ time: 101 }], 100, 9999, 1).status,
    "source_exhausted",
  );
});
test("historical fills deduplicate, exclude out-of-range values and trigger derived analysis", async () => {
  const address = "0x" + "7".repeat(40),
    now = Date.now();
  requestBackfill(address, now - 1);
  requestBackfill(address, now);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM fill_backfills").get().n, 1);
  assert.equal(
    db.prepare("SELECT start_time FROM fill_backfills").get().start_time,
    sixMonthStart(now - 1),
  );
  const fill = {
    coin: "ETH",
    time: now - 1000,
    tid: 1,
    oid: 1,
    side: "B",
    px: "100",
    sz: "1",
    startPosition: "0",
    dir: "Open Long",
    closedPnl: "0",
    fee: "0",
    feeToken: "USDC",
  };
  let rebuilt = 0;
  await processBackfill(
    async (a) => {
      assert.equal(a, address);
      rebuilt++;
    },
    async (req) => {
      assert.equal(req.type, "userFillsByTime");
      assert.equal(req.aggregateByTime, false);
      return [fill, fill, { ...fill, time: now + 10000, tid: 2 }];
    },
  );
  assert.equal(rebuilt, 1);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM wallet_fills").get().n, 1);
  const job = db.prepare("SELECT * FROM fill_backfills").get();
  assert.equal(job.status, "source_exhausted");
  assert.equal(job.fills, 1);
});

test("older 30-day jobs upgrade once to six calendar months without increasing the page budget", () => {
  const address = "0x" + "8".repeat(40),
    now = Date.now();
  db.prepare(
    "INSERT INTO fill_backfills(address,start_time,end_time,cursor,pages,fills,status,updated_at) VALUES(?,?,?,?,?,?,?,?)",
  ).run(
    address,
    now - 30 * 86400000,
    now,
    now - 10 * 86400000,
    4,
    7000,
    "queued",
    now,
  );
  requestBackfill(address, now);
  const upgraded = db
    .prepare("SELECT * FROM fill_backfills WHERE address=?")
    .get(address);
  assert.equal(upgraded.start_time, sixMonthStart(now));
  assert.equal(upgraded.cursor, sixMonthStart(now));
  assert.equal(upgraded.pages, 0);
  assert.equal(upgraded.fills, 0);
  assert.equal(upgraded.status, "queued");
  db.prepare(
    "UPDATE fill_backfills SET pages=2,fills=4000 WHERE address=?",
  ).run(address);
  requestBackfill(address, now + 1000);
  const coalesced = db
    .prepare("SELECT * FROM fill_backfills WHERE address=?")
    .get(address);
  assert.equal(coalesced.start_time, sixMonthStart(now));
  assert.equal(coalesced.pages, 2);
  assert.equal(coalesced.fills, 4000);
});

test("50-day fills enter the historical archive while recent raw analysis stays within 30 days", async () => {
  db.prepare("DELETE FROM fill_backfills WHERE status='queued'").run();
  const address = "0x" + "9".repeat(40),
    now = Date.now();
  const old = {
    coin: "ETH",
    time: now - 50 * 86400000,
    tid: 9,
    oid: 9,
    side: "B",
    px: "100",
    sz: "1",
    startPosition: "0",
    dir: "Open Long",
    closedPnl: "0",
    fee: "0",
  };
  requestBackfill(address, now - 1);
  let rebuilt = 0;
  await processBackfill(
    async (a) => {
      assert.equal(a, address);
      rebuilt++;
    },
    async (req) => {
      assert.equal(req.startTime, sixMonthStart(now - 1));
      return [old, old, { ...old, tid: 10, time: now + 10000 }];
    },
  );
  assert.equal(rebuilt, 1);
  assert.equal(
    db
      .prepare(
        "SELECT COUNT(*) n FROM wallet_fills WHERE address=? AND time>=?",
      )
      .get(address, now - 30 * 86400000).n,
    0,
  );
  const rows = probabilityFlowRows("ETH", new Set([address]), Date.now());
  assert.equal(rows.length, 1);
  assert.equal(rows[0].longIn, 100);
  assert.equal(rows[0].fills, 1);
  assert.equal(rows[0].source, "retrospective-observed-sample");
  assert.equal(
    db.prepare("SELECT status FROM fill_backfills WHERE address=?").get(address)
      .status,
    "source_exhausted",
  );
});
