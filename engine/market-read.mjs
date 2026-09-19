const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
// Evidence-gated positioning score; never a probability of future return.
export function marketRead(wallets, analyses, now = Date.now()) {
  let gross = 0,
    opening = 0,
    entries = 0,
    directional = 0,
    weighted = 0,
    weight = 0,
    qualified = 0,
    fresh = 0,
    latest = 0;
  const volumes = [];
  for (const w of wallets) {
    const volume = w.longIn + w.shortIn + w.longOut + w.shortOut;
    gross += volume;
    volumes.push(volume);
    opening += w.longIn + w.shortIn;
    entries += w.longIn - w.shortIn;
    directional += w.longIn + w.shortOut - w.shortIn - w.longOut;
    latest = Math.max(latest, w.lastExecution || 0);
    const a = analyses.get(w.address),
      c = a?.coins?.find((c) => c.coin === w.coin);
    const isFresh = a && now - a.updatedAt < 3600000;
    if (isFresh) fresh++;
    // Token-specific track record, one bounded vote per wallet; size cannot buy a larger vote.
    if (
      isFresh &&
      c?.completeTrades >= 10 &&
      c.activeDays >= 3 &&
      c.score >= 60 &&
      c.netPnl > 0
    ) {
      const q = clamp(c.score / 100, 0, 1);
      weighted += Math.sign(Number(w.positionDelta || 0)) * q;
      weight += q;
      qualified++;
    }
  }
  const count = wallets.length,
    topShare = gross ? Math.max(...volumes) / gross : 1;
  const entryBalance = opening ? entries / opening : 0,
    qualityVote = weight ? weighted / weight : 0;
  const executionBalance = gross ? directional / gross : 0;
  const raw = clamp(
    Math.round(
      50 +
        50 *
          (0.45 * entryBalance + 0.35 * qualityVote + 0.2 * executionBalance),
    ),
    0,
    100,
  );
  const confidence = Math.round(
    100 *
      (0.35 * Math.min(count / 10, 1) +
        0.3 * Math.min(qualified / 5, 1) +
        0.2 * (1 - topShare) +
        0.15 * (count ? fresh / count : 0)),
  );
  const reasons = [];
  if (count < 5) reasons.push("Fewer than five observed wallets");
  if (qualified < 3) reasons.push("Fewer than three proven token specialists");
  if (topShare > 0.6)
    reasons.push("One wallet contributes over 60% of activity");
  if (!count || fresh / count < 0.7)
    reasons.push("Less than 70% of wallet analyses are fresh");
  if (!latest || now - latest > 2 * 3600000)
    reasons.push("No observed execution within two hours");
  if (opening < 10000) reasons.push("Opening notional below $10K");
  const conflict =
    entryBalance * qualityVote < 0 &&
    Math.abs(entryBalance) > 0.2 &&
    Math.abs(qualityVote) > 0.2;
  if (conflict) reasons.push("Fresh entries disagree with token specialists");
  const action = reasons.length
    ? "Wait"
    : raw >= 65
      ? "Long bias"
      : raw <= 35
        ? "Short bias"
        : "Hold / neutral";
  return {
    score: gross ? raw : null,
    confidence,
    action,
    reasons,
    qualified,
    fresh,
    count,
    topShare: topShare * 100,
    latest,
    opening,
    entryBalance,
    qualityVote,
    executionBalance,
    explanation:
      action === "Long bias"
        ? "New long exposure and specialist positioning align. Check price structure and execution costs before considering entry."
        : action === "Short bias"
          ? "New short exposure and specialist positioning align. Check price structure and execution costs before considering entry."
          : action === "Hold / neutral"
            ? "Evidence passes the sample gates but has no strong directional edge. Hold means reassess an existing thesis; it is not an instruction to retain a losing position."
            : "Evidence is insufficient or conflicting. No directional setup is promoted.",
  };
}
