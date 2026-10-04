import test from "node:test";
import assert from "node:assert/strict";
import { marketRead, tokenRecordEvidence } from "../engine/market-read.mjs";
const now = Date.now();
function sample(short = false) {
  const wallets = Array.from({ length: 10 }, (_, i) => ({
    address: String(i),
    coin: "BTC",
    longIn: short ? 0 : 20000,
    shortIn: short ? 20000 : 0,
    longOut: 0,
    shortOut: 0,
    positionDelta: short ? "-1" : "1",
    lastExecution: now,
  }));
  const analyses = new Map(
    wallets.map((w) => [
      w.address,
      {
        updatedAt: now,
        fillsFetchedAt: now,
        coverage: { gaps: 0 },
        latestResponseCount: 500,
        coins: [
          {
            coin: "BTC",
            completeTrades: 20,
            activeDays: 7,
            score: 80,
            netPnl: 100,
          },
        ],
      },
    ]),
  );
  return { wallets, analyses };
}
test("qualified broad long and short positioning produces symmetric stances", () => {
  for (const short of [false, true]) {
    const { wallets, analyses } = sample(short);
    const r = marketRead(wallets, analyses, now);
    assert.equal(r.action, short ? "Short bias" : "Long bias");
    assert.equal(r.score, short ? 0 : 100);
    assert.equal(r.qualified, 10);
  }
});
test("one dominant wallet vetoes a high directional score", () => {
  const { wallets, analyses } = sample();
  wallets[0].longIn = 10000000;
  const r = marketRead(wallets, analyses, now);
  assert.equal(r.score, 100);
  assert.equal(r.action, "Wait");
});
test("covering shorts alone cannot be promoted as fresh long conviction", () => {
  const { wallets, analyses } = sample();
  for (const w of wallets) {
    w.shortOut = w.longIn;
    w.longIn = 0;
  }
  assert.equal(marketRead(wallets, analyses, now).action, "Wait");
});
test("missing token track record, stale analysis and old executions all veto direction", () => {
  for (const mode of ["coin", "analysis", "execution"]) {
    const { wallets, analyses } = sample();
    for (const w of wallets) {
      const a = analyses.get(w.address);
      if (mode === "coin") a.coins[0].coin = "ETH";
      if (mode === "analysis") {
        a.updatedAt = now - 7200000;
        a.fillsFetchedAt = now - 7200000;
      }
      if (mode === "execution") w.lastExecution = now - 3 * 3600000;
    }
    assert.equal(marketRead(wallets, analyses, now).action, "Wait");
  }
});
test("specialist disagreement is explicit and neutral evidence can hold", () => {
  const { wallets, analyses } = sample();
  wallets.forEach((w) => (w.positionDelta = "-1"));
  assert.equal(marketRead(wallets, analyses, now).action, "Wait");
  wallets.forEach((w, i) => {
    w.longIn = 10000;
    w.shortIn = 10000;
    w.positionDelta = i % 2 ? "1" : "-1";
  });
  assert.equal(marketRead(wallets, analyses, now).action, "Hold / neutral");
});
test("no data produces wait with no invented direction score", () => {
  const r = marketRead([], new Map(), now);
  assert.equal(r.score, null);
  assert.equal(r.action, "Wait");
});

test("capped, gapped and unverified token candidates cannot vote as qualified specialists", () => {
  for (const mode of [
    "capped",
    "gapped",
    "unknown",
    "missing-fetch",
    "future-fetch",
  ]) {
    const { wallets, analyses } = sample();
    for (const a of analyses.values()) {
      if (mode === "capped") a.latestResponseCount = 2000;
      if (mode === "gapped") a.coverage.gaps = 1;
      if (mode === "unknown") delete a.coverage;
      if (mode === "missing-fetch") delete a.fillsFetchedAt;
      if (mode === "future-fetch") a.fillsFetchedAt = now + 1;
      const evidence = tokenRecordEvidence(a, a.coins[0], now);
      assert.equal(evidence.qualified, false);
      assert(evidence.reasons.length);
    }
    const r = marketRead(wallets, analyses, now);
    assert.equal(r.historicalQualified, 10);
    assert.equal(r.qualified, 0);
    assert.equal(r.action, "Wait");
  }
});

test("an excluded incomplete candidate does not veto enough qualified wallet votes", () => {
  const { wallets, analyses } = sample();
  wallets.push({ ...wallets[0], address: "excluded" });
  analyses.set("excluded", { ...analyses.get("0"), latestResponseCount: 2000 });
  const r = marketRead(wallets, analyses, now);
  assert.equal(r.qualified, 10);
  assert.equal(r.unverifiedCandidates, 1);
  assert.equal(r.action, "Long bias");
  assert.equal(r.reasons.length, 0);
  assert.equal(r.warnings.length, 1);
});
