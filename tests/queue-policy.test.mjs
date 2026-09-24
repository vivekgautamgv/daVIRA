import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { selectAnalysisJob } from "../engine/queue-policy.mjs";
test("background discovery progresses without displacing explicit requests or retry backoff", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec(
      "CREATE TABLE analysis_queue(address TEXT,priority INTEGER,queued_at INTEGER,attempts INTEGER)",
    );
    const add = db.prepare("INSERT INTO analysis_queue VALUES(?,?,?,?)"),
      now = 2000000;
    add.run("discovery", 0, 0, 0);
    add.run("pilot", 4, 0, 0);
    add.run("watch", 5, 0, 0);
    assert.equal(selectAnalysisJob(db, now, 0).address, "watch");
    assert.equal(selectAnalysisJob(db, now, 4).address, "discovery");
    add.run("explicit", 10, 0, 0);
    assert.equal(selectAnalysisJob(db, now, 5).address, "explicit");
    db.exec("DELETE FROM analysis_queue WHERE address='explicit'");
    add.run("future", 20, now + 1, 0);
    add.run("backoff", 20, now - 1000, 3);
    assert.equal(selectAnalysisJob(db, now, 0).address, "watch");
    assert.equal(selectAnalysisJob(db, now + 1800000, 0).address, "backoff");
  } finally {
    db.close();
  }
});
