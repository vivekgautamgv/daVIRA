import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "davira-probability-history-"));
process.env.DAVIRA_DB_PATH = join(dir, "test.sqlite");
const { db } = await import("../engine/db.mjs");
const {
  initializeProbabilityHistory,
  archiveFill,
  probabilityFlowRows,
  saveProbabilityCandles,
  probabilityCandles,
  cleanupProbabilityHistory,
} = await import("../engine/probability-history.mjs");
const { sixMonthStart } = await import("../engine/probability-math.mjs");
const now = Date.UTC(2026, 9, 31, 12),
  HOUR = 3_600_000;
const fill = (extra = {}) => ({
  coin: "ETH",
  time: now - HOUR,
  tid: 1,
  oid: 1,
  side: "B",
  px: "100",
  sz: "2",
  startPosition: "0",
  dir: "Open Long",
  closedPnl: "0",
  fee: "0",
  ...extra,
});
function database() {
  const memory = new DatabaseSync(":memory:");
  memory.exec(
    "CREATE TABLE wallet_fills(address TEXT,id TEXT,coin TEXT,time INTEGER,value TEXT,PRIMARY KEY(address,id));",
  );
  return memory;
}
function rawInsert(memory, address, f) {
  return memory
    .prepare("INSERT OR IGNORE INTO wallet_fills VALUES(?,?,?,?,?)")
    .run(address, String(f.tid), f.coin, f.time, JSON.stringify(f));
}
test.after(() => {
  db.close();
  rmSync(dir, { recursive: true, force: true });
});

test("bootstrap archives observed raw history once and survives raw deletion", () => {
  const memory = database();
  try {
    rawInsert(memory, "a", fill());
    rawInsert(memory, "b", fill({ tid: 2, side: "A", dir: "Open Short" }));
    rawInsert(memory, "old", fill({ tid: 3, time: sixMonthStart(now) - 1 }));
    const result = initializeProbabilityHistory(now, memory);
    assert.deepEqual(result, { bootstrapped: true, archived: 2 });
    let rows = probabilityFlowRows("ETH", null, now, memory);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].longIn, 200);
    assert.equal(rows[1].shortIn, 200);
    assert.equal(rows[0].source, "retrospective-observed-sample");
    assert.equal(rows[0].observedAt, now);
    assert.deepEqual(initializeProbabilityHistory(now, memory), {
      bootstrapped: false,
      archived: 0,
    });
    memory.exec("DELETE FROM wallet_fills");
    rows = probabilityFlowRows("ETH", new Set(["b"]), now, memory);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].address, "b");
    assert.equal(rows[0].fills, 1);
  } finally {
    memory.close();
  }
});

test("raw-cap eviction and later replay cannot double count an archived fill", () => {
  const memory = database();
  try {
    initializeProbabilityHistory(now, memory);
    for (let pass = 0; pass < 2; pass++) {
      memory.exec("BEGIN");
      const inserted = rawInsert(memory, "a", fill());
      assert.equal(inserted.changes, 1);
      assert.equal(archiveFill("a", fill(), now, memory), pass === 0);
      memory.exec("COMMIT");
      memory.exec("DELETE FROM wallet_fills");
    }
    const row = probabilityFlowRows("ETH", null, now, memory)[0];
    assert.equal(row.longIn, 200);
    assert.equal(row.fills, 1);
    assert.equal(
      memory.prepare("SELECT COUNT(*) n FROM probability_fill_seen").get().n,
      1,
    );
  } finally {
    memory.close();
  }
});

test("raw fills, archive sums and replay IDs roll back together", () => {
  const memory = database();
  try {
    initializeProbabilityHistory(now, memory);
    memory.exec("BEGIN");
    rawInsert(memory, "a", fill());
    assert.equal(archiveFill("a", fill(), now, memory), true);
    memory.exec("ROLLBACK");
    assert.equal(probabilityFlowRows("ETH", null, now, memory).length, 0);
    assert.equal(
      memory.prepare("SELECT COUNT(*) n FROM probability_fill_seen").get().n,
      0,
    );
    memory.exec("BEGIN");
    rawInsert(memory, "a", fill());
    assert.equal(archiveFill("a", fill(), now, memory), true);
    memory.exec("COMMIT");
    assert.equal(probabilityFlowRows("ETH", null, now, memory)[0].fills, 1);
  } finally {
    memory.close();
  }
});

test("archive rejects invalid or future executions and splits reversal exposure", () => {
  const memory = database();
  try {
    initializeProbabilityHistory(now, memory);
    const bad = [
      { time: now + 1 },
      { time: NaN },
      { time: sixMonthStart(now) - 1 },
      { px: "Infinity" },
      { sz: "-1" },
      { dir: "Buy", coin: "@1" },
      { startPosition: undefined },
    ];
    for (const extra of bad)
      assert.equal(archiveFill("a", fill(extra), now, memory), false);
    assert.equal(probabilityFlowRows("ETH", null, now, memory).length, 0);
    memory.exec("BEGIN");
    assert.equal(
      archiveFill("a", fill({ startPosition: "-1", sz: "2" }), now, memory),
      true,
    );
    memory.exec("COMMIT");
    const row = probabilityFlowRows("ETH", null, now, memory)[0];
    assert.equal(row.longIn, 100);
    assert.equal(row.shortOut, 100);
    assert.equal(row.longOut + row.shortIn, 0);
    assert.equal(row.fills, 1);
  } finally {
    memory.close();
  }
});

test("six calendar months retain aggregates and replay IDs beyond raw 30 days", () => {
  const memory = database();
  try {
    initializeProbabilityHistory(now, memory);
    const old = fill({ time: now - 90 * 24 * HOUR });
    memory.exec("BEGIN");
    archiveFill("a", old, now, memory);
    memory.exec("COMMIT");
    cleanupProbabilityHistory(now, memory);
    assert.equal(probabilityFlowRows("ETH", null, now, memory)[0].fills, 1);
    assert.equal(archiveFill("a", old, now, memory), false);
    const later = Date.UTC(2027, 3, 1, 12);
    cleanupProbabilityHistory(later, memory);
    assert.equal(probabilityFlowRows("ETH", null, later, memory).length, 0);
    assert.equal(
      memory.prepare("SELECT COUNT(*) n FROM probability_fill_seen").get().n,
      0,
    );
  } finally {
    memory.close();
  }
});

test("candle archive accepts only validated closed matching hourly candles", () => {
  const memory = database();
  try {
    initializeProbabilityHistory(now, memory);
    const t = now - HOUR;
    const c = {
      s: "ETH",
      i: "1h",
      t,
      T: t + HOUR - 1,
      o: "100",
      h: "105",
      l: "95",
      c: "102",
    };
    const invalid = [
      { ...c, s: "BTC" },
      { ...c, i: "1d" },
      { ...c, t: now, T: now + HOUR - 1 },
      { ...c, h: "90" },
      { ...c, t: sixMonthStart(now) - HOUR, T: sixMonthStart(now) - 1 },
      { ...c, t: t + 1, T: t + HOUR },
    ];
    assert.equal(
      saveProbabilityCandles("ETH", [c, ...invalid], now, memory),
      1,
    );
    assert.equal(
      saveProbabilityCandles("ETH", [{ ...c, c: "103" }], now, memory),
      1,
    );
    const candles = probabilityCandles("ETH", now, memory);
    assert.equal(candles.length, 1);
    assert.equal(candles[0].c, 103);
    assert.equal(probabilityCandles("BTC", now, memory).length, 0);
    cleanupProbabilityHistory(Date.UTC(2027, 4, 1, 12), memory);
    assert.equal(
      probabilityCandles("ETH", Date.UTC(2027, 4, 1, 12), memory).length,
      0,
    );
  } finally {
    memory.close();
  }
});
