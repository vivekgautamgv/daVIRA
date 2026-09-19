const gross = (w) => w.longIn + w.longOut + w.shortIn + w.shortOut;
const direction = (w) => w.longIn + w.shortOut - w.shortIn - w.longOut;
const walletBias = (w) =>
  w.positionDelta == null ? direction(w) : Number(w.positionDelta);
export function flowInsights(
  wallets,
  { duration, historyStart = new Map() } = {},
) {
  const totals = {
    longIn: 0,
    longOut: 0,
    shortIn: 0,
    shortOut: 0,
    early: 0,
    late: 0,
  };
  for (const w of wallets)
    for (const k of Object.keys(totals)) totals[k] += w[k] || 0;
  const activity = wallets.reduce((n, w) => n + gross(w), 0),
    netDirection = direction(totals);
  const ranked = [...wallets].sort((a, b) => gross(b) - gross(a)),
    leader = ranked[0];
  const longs = wallets.filter((w) => walletBias(w) > 1e-12).length,
    shorts = wallets.filter((w) => walletBias(w) < -1e-12).length;
  const afterLeader = netDirection - (leader ? direction(leader) : 0);
  const buy = totals.longIn + totals.shortOut,
    sell = totals.shortIn + totals.longOut;
  const components = [
    ["Long building", totals.longIn],
    ["Long unwinding", totals.longOut],
    ["Short building", totals.shortIn],
    ["Short covering", totals.shortOut],
  ].sort((a, b) => b[1] - a[1]);
  const baselineWallets = wallets.filter(
      (w) => historyStart.get(w.address) <= w.windowStart,
    ),
    completeHistory = baselineWallets.length;
  const baselineCoverage = wallets.length
    ? (completeHistory / wallets.length) * 100
    : 0;
  const baselineEarly = baselineWallets.reduce((n, w) => n + (w.early || 0), 0),
    baselineLate = baselineWallets.reduce((n, w) => n + (w.late || 0), 0);
  const acceleration =
    baselineCoverage >= 70 && baselineEarly > 0
      ? baselineLate / baselineEarly
      : null;
  return {
    activity,
    directional: netDirection,
    bullishWallets: longs,
    bearishWallets: shorts,
    breadth: longs + shorts ? (longs / (longs + shorts)) * 100 : null,
    leader: leader?.address || null,
    leaderShare: activity && leader ? (gross(leader) / activity) * 100 : null,
    excludingLeader: afterLeader,
    leaderChangesDirection:
      Math.abs(afterLeader) > 0.01 &&
      Math.abs(netDirection) > 0.01 &&
      Math.sign(afterLeader) !== Math.sign(netDirection),
    newLongBuyShare: buy ? (totals.longIn / buy) * 100 : null,
    newShortSellShare: sell ? (totals.shortIn / sell) * 100 : null,
    behavior:
      activity && components[0][1] / activity >= 0.45
        ? components[0][0]
        : "Two-way positioning",
    acceleration,
    baselineCoverage,
    earlyActivity: totals.early,
    lateActivity: totals.late,
    halfWindowHours: duration / 7200000,
    evidence:
      wallets.length >= 10 && baselineCoverage >= 70
        ? "Broader observed sample"
        : wallets.length >= 3
          ? "Limited observed sample"
          : "Highly concentrated sample",
  };
}
