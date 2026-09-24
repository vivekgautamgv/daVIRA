// Descriptive measurements are independent of the stricter trade-readiness gates.
export function positioningBrief(c, now = Date.now()) {
  const i = c.insight, r = c.marketRead;
  const activity = c.inflow + c.outflow;
  const recent = r.latest > 0 && r.latest <= now && now - r.latest <= 2 * 3600000;
  const buy = c.longIn + c.shortOut, sell = c.shortIn + c.longOut;
  const pressure = activity > 0 ? Math.round(100 * buy / activity) : null;
  const exposureChange = activity > 0 ? (c.inflow - c.outflow) / activity : 0;
  return {
    behavior: activity > 0 ? i.behavior : "No activity",
    recent,
    pressure,
    pressureLabel: pressure === null ? "No activity" : pressure >= 60 ? "Buy-heavy executions" : pressure <= 40 ? "Sell-heavy executions" : "Balanced executions",
    exposure: exposureChange > 0.1 ? "Exposure expanding" : exposureChange < -0.1 ? "Exposure contracting" : "Exposure rotating",
    buy, sell,
    readiness: r.action === "Wait" ? "Evidence incomplete" : r.action,
    disagreement: i.leaderChangesDirection ? "Largest wallet reverses the sample direction" : pressure !== null && i.breadth !== null && ((pressure >= 60 && i.breadth < 40) || (pressure <= 40 && i.breadth > 60)) ? "Notional and wallet breadth disagree" : null,
  };
}

export function compareMarket(current, baseline, now, duration) {
  const valid = (s) => s && Number.isFinite(s.price) && s.price > 0 && Number.isFinite(s.oi) && s.oi >= 0;
  if (!valid(current) || current.time > now || now - current.time > 120000) return { status: "unavailable", reason: "Fresh market snapshot unavailable" };
  const base = { price: current.price, funding: current.funding, openInterest: current.oi * current.price, updatedAt: current.time };
  if (!valid(baseline) || Math.abs(baseline.time - (current.time - duration)) > 600000 || baseline.time >= current.time || baseline.oi <= 0) return { ...base, status: "warming", reason: "Collecting a matching price and open-interest baseline" };
  const priceChange = (current.price / baseline.price - 1) * 100;
  // Compare contracts/base units: USD OI alone increases when price rises.
  const oiChange = (current.oi / baseline.oi - 1) * 100;
  const regime = Math.abs(oiChange) < 1 ? "Open interest steady" : Math.abs(priceChange) < 0.25 ? "Price range / positioning changing" : oiChange > 0 ? (priceChange > 0 ? "Price up / OI expanding" : "Price down / OI expanding") : (priceChange > 0 ? "Price up / OI contracting" : "Price down / OI contracting");
  return { ...base, status: "ready", priceChange, oiChange, regime, baselineAt: baseline.time, elapsedHours: (current.time - baseline.time) / 3600000 };
}
