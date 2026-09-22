// Eligibility is separate from ranking: a high historical score cannot make an inactive account actionable.
export function candidatePolicy(a, now = Date.now()) {
  const s = a.stats || {},
    risk = a.risk || {};
  const fresh =
    now - a.updatedAt < 3600000 &&
    !a.positionsStale &&
    now - a.positionsAt < 3600000;
  const funded =
    risk.mainEquity > 100 ||
    (a.builderCoverage || []).some(
      (d) =>
        d.available &&
        !d.stale &&
        now - d.updatedAt < 3600000 &&
        d.equity > 100,
    );
  const recent = a.coverage?.last > now - 48 * 3600000;
  const reasons = [];
  if (!(
    Number.isFinite(a.fillsFetchedAt) &&
    a.fillsFetchedAt <= now &&
    now - a.fillsFetchedAt < 3600000
  ))
    reasons.push("Fresh execution evidence required");
  if (a.coverage?.gaps !== 0)
    reasons.push("Execution continuity must be checked without detected gaps");
  if (!(Number.isFinite(a.latestResponseCount) && a.latestResponseCount < 2000))
    reasons.push("Latest execution response may be truncated or is unverified");
  const p = a.performance;
  if (!p || p.stale || !(now - p.updatedAt < 3600000))
    reasons.push("Fresh reported performance unavailable");
  if (!(
    p?.month?.days >= 29 &&
    p.month.last >= now - 86400000 &&
    p.month.pnl > 0
  ))
    reasons.push(
      "Verified positive 30-day PnL required (at least 29 days of samples)",
    );
  if (!(
    p?.allTime?.days >= 30 &&
    p.allTime.last >= now - 86400000 &&
    p.allTime.pnl > 0
  ))
    reasons.push(
      "Positive reported all-time PnL with 30+ days of history required",
    );
  if (!fresh) reasons.push("Refresh account snapshot");
  if (!funded) reasons.push("No verified funded covered venue");
  if (!recent) reasons.push("No execution in the last 48 hours");
  if (!(s.completeTrades >= 20)) reasons.push("Fewer than 20 complete trades");
  if (!(s.activeDays >= 7)) reasons.push("Fewer than 7 closing days");
  if (!(s.profitableDays / s.activeDays >= 0.6))
    reasons.push("Profitable closing days below 60%");
  if (!(s.winRate >= 50)) reasons.push("Win rate below 50%");
  if (!(s.netPnl > 0 && (s.profitFactor >= 1.5 || s.noLosses)))
    reasons.push("Profitability below threshold");
  if (!(s.netPnl > 0 && s.maxDrawdownUsd <= s.netPnl * 0.5))
    reasons.push("Closed-PnL drawdown exceeds 50% of net profit");
  if (!(
    a.copy?.score >= 60 && a.copy?.stress?.find((x) => x.bps === 10)?.netPnl > 0
  ))
    reasons.push("Execution-cost resilience below threshold");
  return {
    eligible: reasons.length === 0,
    fresh,
    funded,
    recent,
    active: fresh && funded && recent,
    reasons,
  };
}
