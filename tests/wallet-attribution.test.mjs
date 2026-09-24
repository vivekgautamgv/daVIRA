import test from "node:test";
import assert from "node:assert/strict";
import { walletAttribution } from "../lib/wallet-attribution.mjs";
const coins = [
  {
    coin: "BTC",
    class: "Crypto",
    samplePnl: 100,
    netPnl: 80,
    completeTrades: 10,
    partialTrades: 1,
  },
  {
    coin: "ETH",
    class: "Crypto",
    samplePnl: -100,
    netPnl: -90,
    completeTrades: 5,
  },
  {
    coin: "xyz:GOLD",
    class: "Commodity",
    samplePnl: 50,
    netPnl: 0,
    completeTrades: 0,
  },
];
test("PnL attribution separates gains and losses without dividing by net profit", () => {
  const a = walletAttribution(coins);
  assert.equal(a.positive, 150);
  assert.equal(a.negative, 100);
  assert.equal(a.net, 50);
  assert.equal(a.rows[1].contribution, 100);
  assert.equal(a.rows[0].completePnl, 80);
});
test("asset class grouping nets instruments and preserves sample counts", () => {
  const a = walletAttribution(coins, "class");
  assert.equal(a.rows.length, 2);
  assert.equal(a.rows[0].pnl, 0);
  assert.equal(a.rows[0].completeTrades, 15);
  assert.equal(a.rows[0].contribution, 0);
  assert.deepEqual(walletAttribution([]).rows, []);
});
