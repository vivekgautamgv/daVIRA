import { info, resource } from "./upstream.mjs";
import { fillSummary, uniqueFills } from "./analytics.mjs";
import { db, cached, saveCache, signal } from "./db.mjs";
import { positionChanges } from "./analytics.mjs";
export const validAddress = (a) => /^0x[0-9a-fA-F]{40}$/.test(a || "");
export async function account(address) {
  return resource(`account:${address}`, 60000, async () => {
    const s = await info({ type: "clearinghouseState", user: address }, 2);
    return {
      equity: Number(s.marginSummary.accountValue),
      marginUsed: Number(s.marginSummary.totalMarginUsed),
      withdrawable: Number(s.withdrawable),
      positions: s.assetPositions
        .map(({ position: p }) => ({
          coin: p.coin,
          size: Number(p.szi),
          entry: Number(p.entryPx),
          value: Number(p.positionValue),
          markPrice: Math.abs(Number(p.szi))
            ? Number(p.positionValue) / Math.abs(Number(p.szi))
            : 0,
          unrealized: Number(p.unrealizedPnl),
          leverage: p.leverage?.value || 0,
          liquidation: p.liquidationPx ? Number(p.liquidationPx) : null,
          returnOnEquity: Number(p.returnOnEquity) * 100,
          cumulativeFunding: Number(p.cumFunding?.sinceOpen || 0),
        }))
        .filter((p) => p.size !== 0),
    };
  });
}
export async function wallet(address) {
  const state = await account(address);
  const results = await Promise.allSettled([
    resource(`fills:${address}`, 300000, () =>
      info({ type: "userFills", user: address, aggregateByTime: false }),
    ),
    resource(`portfolio:${address}`, 900000, () =>
      info({ type: "portfolio", user: address }),
    ),
    resource(`funding:${address}`, 900000, () =>
      info({
        type: "userFunding",
        user: address,
        startTime: Date.now() - 30 * 86400000,
      }),
    ),
  ]);
  const [fr, pr, fu] = results.map((r) =>
      r.status === "fulfilled" ? r.value : null,
    ),
    fills = uniqueFills(fr?.data || []),
    portfolio = Object.fromEntries(pr?.data || []),
    summary = fillSummary(fills),
    funding = (fu?.data || []).reduce(
      (a, x) => a + Number(x.delta?.usdc || 0),
      0,
    );
  return {
    address,
    ...state.data,
    updatedAt: state.updatedAt,
    stale: state.stale,
    summary,
    fills: fills.slice(-300).reverse(),
    funding30d: fu ? funding : null,
    portfolio: portfolio.perpMonth || portfolio.month || null,
    coverage: {
      fills: fr?.data?.length ?? null,
      maxFills: 2000,
      firstFill: summary.firstTime,
      lastFill: summary.lastTime,
      scope:
        "Current positions and fill-PnL summary: main Hyperliquid DEX. Execution table: latest returned fills across available markets, up to 2,000. Funding: first returned page within 30 days (may be truncated).",
      fundingRows: fu?.data?.length ?? null,
      fillsUpdatedAt: fr?.updatedAt ?? null,
      portfolioUpdatedAt: pr?.updatedAt ?? null,
      errors: results.flatMap((r, i) =>
        r.status === "rejected"
          ? [["Fills", "Portfolio", "Funding"][i] + ": " + r.reason.message]
          : r.value.stale
            ? [["Fills", "Portfolio", "Funding"][i] + ": cached data"]
            : [],
      ),
    },
  };
}
export async function observeWallet(address) {
  const current = await account(address);
  if (current.stale) return;
  const old = cached(`baseline:${address}`);
  if (old && old.updatedAt === current.updatedAt) return;
  const changes = positionChanges(old?.data, current.data.positions);
  for (const c of changes) {
    signal(
      `position:${address}:${c.coin}:${current.updatedAt}`,
      "position",
      c.coin,
      address,
      `${c.coin} position ${c.kind}`,
      `Observed size ${c.oldSize} → ${c.size}. This is a snapshot change, not an individual fill.`,
      current.updatedAt,
    );
    db.prepare("INSERT OR IGNORE INTO movements VALUES(?,?,?,?,?,?,?,?)").run(
      `${address}:${c.coin}:${current.updatedAt}`,
      address,
      c.coin,
      c.kind,
      c.oldSize,
      c.size,
      c.delta * c.price,
      current.updatedAt,
    );
  }
  saveCache(`baseline:${address}`, current.data.positions, current.updatedAt);
  db.prepare("INSERT OR IGNORE INTO wallet_history VALUES(?,?,?)").run(
    address,
    current.updatedAt,
    current.data.equity,
  );
  return changes;
}
