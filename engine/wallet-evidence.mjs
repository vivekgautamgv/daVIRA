export function walletEvidence(a, now = Date.now()) {
  if (!a)
    return {
      status: "Not indexed",
      issues: ["Execution analysis unavailable"],
      checks: [],
      preMove: { status: "Methodology pending", score: null },
    };
  const checks = [
    {
      label: "Execution refresh within one hour",
      pass:
        Number.isFinite(a.fillsFetchedAt) &&
        a.fillsFetchedAt <= now &&
        now - a.fillsFetchedAt < 3600000,
    },
    {
      label: "At least 20 complete episodes",
      pass: a.stats?.completeTrades >= 20,
    },
    { label: "At least 7 closing days", pass: a.stats?.activeDays >= 7 },
    {
      label: "No detected position discontinuities",
      pass: a.coverage?.gaps === 0,
    },
    {
      label: "Latest response below 2,000-fill cap",
      pass:
        Number.isFinite(a.latestResponseCount) && a.latestResponseCount < 2000,
    },
  ];
  return {
    status: checks.every((c) => c.pass)
      ? "Sample checks passed"
      : "Limited evidence",
    checks,
    issues: checks.filter((c) => !c.pass).map((c) => c.label),
    first: a.coverage?.first ?? null,
    last: a.coverage?.last ?? null,
    fetchedAt: a.fillsFetchedAt ?? null,
    scope:
      "Observed executions only; passing these checks does not prove complete lifetime history. Funding is excluded from episode PnL.",
    preMove: { status: "Methodology pending", score: null },
  };
}
