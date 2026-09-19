import Decimal from "decimal.js";
export const D = (n) => new Decimal(n || 0);
export function uniqueFills(fills) {
  const seen = new Set();
  return fills
    .filter((f) => {
      const key = `${f.time}:${f.coin}:${f.tid ?? `${f.hash}:${f.oid}:${f.px}:${f.sz}`}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.time - b.time);
}
export function fillSummary(input) {
  const fills = uniqueFills(input).filter(
    (f) =>
      !f.coin.startsWith("@") &&
      !f.coin.includes(":") &&
      !["Buy", "Sell"].includes(f.dir),
  );
  let realized = D(0),
    fees = D(0),
    notional = D(0);
  const feeTokens = {};
  for (const f of fills) {
    realized = realized.plus(f.closedPnl);
    notional = notional.plus(D(f.px).mul(f.sz));
    const token = (f.feeToken || "USDC").trim();
    feeTokens[token] = D(feeTokens[token]).plus(f.fee).toNumber();
    if (token === "USDC") fees = fees.plus(f.fee);
  }
  // Fills are executions, not round-trip trades. Do not infer a trade win rate.
  return {
    count: fills.length,
    realized: realized.toNumber(),
    fees: fees.toNumber(),
    netBeforeFunding: realized.minus(fees).toNumber(),
    notional: notional.toNumber(),
    feeTokens,
    firstTime: fills[0]?.time || null,
    lastTime: fills.at(-1)?.time || null,
  };
}
export function positionChanges(previous, current) {
  if (!previous) return [];
  const before = new Map(previous.map((p) => [p.coin, p])),
    after = new Map(current.map((p) => [p.coin, p]));
  return [...new Set([...before.keys(), ...after.keys()])].flatMap((coin) => {
    const old = before.get(coin),
      now = after.get(coin),
      a = Number(old?.size || 0),
      b = Number(now?.size || 0);
    if (Math.abs(b - a) < 1e-9) return [];
    return [
      {
        coin,
        oldSize: a,
        size: b,
        delta: b - a,
        price: now?.markPrice || old?.markPrice || 0,
        kind:
          a === 0
            ? "opened"
            : b === 0
              ? "closed"
              : Math.sign(a) !== Math.sign(b)
                ? "reversed"
                : Math.abs(b) > Math.abs(a)
                  ? "increased"
                  : "reduced",
      },
    ];
  });
}
export function ruleMatches(rule, market, trade) {
  if (rule.kind === "large_trade")
    return (
      !!trade &&
      (!rule.coin || rule.coin === trade.coin) &&
      trade.price * trade.size >= rule.threshold
    );
  if (!market) return false;
  return rule.kind === "price_above"
    ? market.price >= rule.threshold
    : rule.kind === "price_below"
      ? market.price <= rule.threshold
      : rule.kind === "funding_above"
        ? Math.abs(market.funding) * 100 >= rule.threshold
        : false;
}
export function paperQuote({
  side,
  margin,
  leverage,
  mark,
  slippageBps = 5,
  feeBps = 4.5,
}) {
  if (
    !["long", "short"].includes(side) ||
    ![margin, leverage, mark].every(
      (n) => Number.isFinite(Number(n)) && Number(n) > 0,
    ) ||
    Number(leverage) > 5
  )
    throw Error("Use a positive margin and leverage between 1 and 5.");
  const entry = D(mark).mul(
      D(1).plus(
        D(slippageBps)
          .div(10000)
          .mul(side === "long" ? 1 : -1),
      ),
    ),
    notional = D(margin).mul(leverage),
    quantity = notional.div(entry),
    fee = notional.mul(feeBps).div(10000);
  return {
    entry: entry.toString(),
    quantity: quantity.toString(),
    fee: fee.toString(),
    margin: D(margin).toString(),
  };
}
export function paperValue(p, mark, closing = false) {
  const exit = D(mark).mul(
      closing
        ? D(1).plus(
            D(5)
              .div(10000)
              .mul(p.side === "long" ? -1 : 1),
          )
        : 1,
    ),
    gross = exit
      .minus(p.entry)
      .mul(p.quantity)
      .mul(p.side === "long" ? 1 : -1),
    closeFee = closing ? exit.mul(p.quantity).mul(0.00045) : D(0);
  return {
    exit: exit.toString(),
    gross: gross.toNumber(),
    closeFee: closeFee.toString(),
    net: gross.minus(p.fee).minus(closeFee).toNumber(),
  };
}
