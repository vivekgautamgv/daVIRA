// Keep execution cash PnL separate from reconstructed complete-episode PnL.
export function walletAttribution(coins = [], group = "coin") {
  const rows = new Map();
  for (const c of coins) {
    if (!Number.isFinite(c.samplePnl)) continue;
    const key = group === "class" ? c.class || "Unclassified" : c.coin;
    const r = rows.get(key) || {
      name: key,
      coins: [],
      pnl: 0,
      completePnl: 0,
      completeTrades: 0,
      partialTrades: 0,
      fills: 0,
      turnover: 0,
    };
    r.coins.push(c.coin);
    r.pnl += c.samplePnl;
    r.completePnl += Number.isFinite(c.netPnl) ? c.netPnl : 0;
    r.completeTrades += c.completeTrades || 0;
    r.partialTrades += c.partialTrades || 0;
    r.fills += c.fills || 0;
    r.turnover += c.volume || 0;
    rows.set(key, r);
  }
  const result = [...rows.values()];
  const positive = result.reduce((sum, r) => sum + Math.max(0, r.pnl), 0);
  const negative = result.reduce((sum, r) => sum + Math.max(0, -r.pnl), 0);
  return {
    rows: result.map((r) => ({
      ...r,
      contribution:
        r.pnl > 0
          ? (r.pnl / positive) * 100
          : r.pnl < 0
            ? (-r.pnl / negative) * 100
            : 0,
    })),
    positive,
    negative,
    net: positive - negative,
  };
}
