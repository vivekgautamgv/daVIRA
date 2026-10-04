const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export const hasTokenRecord = (c) =>
  !!c &&
  c.completeTrades >= 10 &&
  c.activeDays >= 3 &&
  c.score >= 60 &&
  c.netPnl > 0;
export const analysisFresh = (a, now) => {
  const at = a?.fillsFetchedAt ?? a?.updatedAt;
  return Number.isFinite(at) && at <= now && now - at < 3600000;
};
// Shared by Summary, setup voting and Token Lens. A promising record is not
// qualified for live voting when retrieval is stale, capped or has known gaps.
export function tokenRecordEvidence(a, c, now = Date.now()) {
  const reasons = [];
  if (!c) reasons.push("No token-specific trading record");
  else {
    if (!Number.isFinite(c.completeTrades) || c.completeTrades < 10)
      reasons.push("Fewer than 10 completed token episodes");
    if (!Number.isFinite(c.activeDays) || c.activeDays < 3)
      reasons.push("Fewer than three token closing days");
    if (!Number.isFinite(c.score) || c.score < 60)
      reasons.push("Token quality below 60 or unavailable");
    if (!Number.isFinite(c.netPnl) || c.netPnl <= 0)
      reasons.push("Completed token episode PnL is not positive");
  }
  const at = a?.fillsFetchedAt;
  if (!Number.isFinite(at) || at > now || now - at >= 3600000)
    reasons.push("Fill retrieval is stale or unverified");
  if (a?.coverage?.gaps !== 0)
    reasons.push("Fill reconstruction gaps exist or coverage is unverified");
  const count = a?.latestResponseCount;
  if (!Number.isFinite(count) || count < 0 || count >= 2000)
    reasons.push("Latest fill response is capped or its depth is unverified");
  return { qualified: reasons.length === 0, reasons };
}
// Evidence-gated positioning score; never a probability of future return.
export function marketRead(wallets, analyses, now = Date.now()) {
  let gross = 0,
    opening = 0,
    entries = 0,
    directional = 0,
    weighted = 0,
    weight = 0,
    qualified = 0,
    historicalQualified = 0,
    fresh = 0,
    unverifiedCandidates = 0,
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
    const isFresh = analysisFresh(a, now);
    if (isFresh) fresh++;
    if (hasTokenRecord(c)) historicalQualified++;
    const record = tokenRecordEvidence(a, c, now);
    if (isFresh && hasTokenRecord(c) && !record.qualified)
      unverifiedCandidates++;
    // Token-specific track record, one bounded vote per wallet; size cannot buy a larger vote.
    if (record.qualified) {
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
  if (qualified < 3) reasons.push("Fewer than three qualified token records");
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
    historicalQualified,
    unverifiedCandidates,
    warnings: unverifiedCandidates
      ? [
          `${unverifiedCandidates} candidate records excluded by fill-coverage checks`,
        ]
      : [],
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
        ? "New long entries and qualified wallet execution direction align. Check price structure and execution costs before considering entry."
        : action === "Short bias"
          ? "New short entries and qualified wallet execution direction align. Check price structure and execution costs before considering entry."
          : action === "Hold / neutral"
            ? "Evidence passes the sample gates but has no strong directional edge. Hold means reassess an existing thesis; it is not an instruction to retain a losing position."
            : "Evidence is insufficient or conflicting. No directional setup is promoted.",
  };
}
