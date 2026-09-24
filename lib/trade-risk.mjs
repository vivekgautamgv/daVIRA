/** User risk is independent of observed wallet equity or leverage.
 * Costs model both entry and exit notionals; all risk inputs remain in the browser. */
export function sizeTrade(levels, side, settings) {
  const {
    equity,
    riskPct,
    dailyLimitPct,
    dailyLoss,
    totalRiskPct,
    openRisk,
    allocationPct,
    feeBps,
    slippageBps,
  } = settings;
  const errors = [];
  if (!Number.isFinite(equity) || equity <= 0 || equity > 1e12)
    errors.push(
      "Enter account equity above zero and no more than $1 trillion.",
    );
  for (const [name, value, max] of [
    ["Risk per trade", riskPct, 5],
    ["Daily loss limit", dailyLimitPct, 20],
    ["Total open risk limit", totalRiskPct, 20],
    ["Position allocation", allocationPct, 100],
  ]) {
    if (!Number.isFinite(value) || value <= 0 || value > max)
      errors.push(`${name} must be greater than 0 and no more than ${max}%.`);
  }
  for (const [name, value, max] of [
    ["Realized daily loss", dailyLoss, Infinity],
    ["Existing open risk", openRisk, Infinity],
    ["Fee estimate", feeBps, 100],
    ["Slippage estimate", slippageBps, 500],
  ]) {
    if (!Number.isFinite(value) || value < 0 || value > max)
      errors.push(
        `${name} must be a valid non-negative amount${Number.isFinite(max) ? `, at most ${max} bps` : ""}.`,
      );
  }
  if (
    !levels ||
    ![levels.entry, levels.stop].every((v) => Number.isFinite(v) && v > 0) ||
    !["long", "short"].includes(side) ||
    (side === "long"
      ? levels.stop >= levels.entry
      : levels.stop <= levels.entry)
  )
    errors.push("A valid directional setup is required before sizing.");
  if (errors.length) return { errors, quantity: 0 };
  const tradeBudget = (equity * riskPct) / 100;
  const dailyRemaining = Math.max(
    0,
    (equity * dailyLimitPct) / 100 - dailyLoss,
  );
  const openRemaining = Math.max(0, (equity * totalRiskPct) / 100 - openRisk);
  const budget = Math.min(tradeBudget, dailyRemaining, openRemaining);
  if (budget <= 0)
    return {
      errors: ["Your daily or total open-risk budget is exhausted."],
      quantity: 0,
    };
  const rate = (feeBps + slippageBps) / 10000;
  const distance = Math.abs(levels.entry - levels.stop);
  const stopCostsPerUnit = (levels.entry + levels.stop) * rate;
  const riskPerUnit = distance + stopCostsPerUnit;
  const cap = (equity * allocationPct) / 100;
  // Unlevered exposure cap; opening costs also fit within the allocation.
  const quantity = Math.min(
    budget / riskPerUnit,
    cap / (levels.entry * (1 + rate)),
  );
  const notional = quantity * levels.entry,
    risk = quantity * riskPerUnit;
  if (![quantity, notional, risk].every((v) => Number.isFinite(v) && v > 0))
    return {
      errors: ["These inputs cannot produce a finite position size."],
      quantity: 0,
    };
  const sign = side === "long" ? 1 : -1;
  const targets = levels.targets.map((t) => {
    const gross = sign * (t.price - levels.entry) * quantity;
    const costs = (levels.entry + t.price) * rate * quantity;
    return { ...t, netPnl: gross - costs, netR: (gross - costs) / risk };
  });
  return {
    errors,
    quantity,
    notional,
    risk,
    riskPct: (risk / equity) * 100,
    budget,
    tradeBudget,
    dailyRemaining,
    openRemaining,
    stopCosts: stopCostsPerUnit * quantity,
    allocationLimited: quantity < budget / riskPerUnit,
    fundingReserve: null,
    targets,
  };
}
