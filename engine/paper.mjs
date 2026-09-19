import { randomUUID } from "node:crypto";
import { db } from "./db.mjs";
import { D, paperQuote, paperValue } from "./analytics.mjs";
export function paperState(markets) {
  const rows = db
      .prepare("SELECT * FROM paper_positions ORDER BY opened_at DESC")
      .all(),
    open = rows.filter((p) => !p.closed_at),
    closed = rows.filter((p) => p.closed_at);
  let balance = D(10000);
  for (const p of closed) balance = balance.plus(p.pnl);
  for (const p of open) balance = balance.minus(p.fee);
  const used = open.reduce((n, p) => n.plus(p.margin), D(0));
  const positions = open.map((p) => {
    const m = markets.find((m) => m.coin === p.coin);
    return {
      ...p,
      mark: m?.price ?? null,
      unrealized: m ? paperValue(p, m.price).gross : null,
    };
  });
  const unrealized = positions.reduce(
    (n, p) => n.plus(p.unrealized || 0),
    D(0),
  );
  return {
    initial: 10000,
    balance: balance.toNumber(),
    available: balance
      .minus(used)
      .plus(DecimalMin(unrealized, D(0)))
      .toNumber(),
    marginUsed: used.toNumber(),
    equity: balance.plus(unrealized).toNumber(),
    realized: closed.reduce((n, p) => n + Number(p.pnl), 0),
    positions,
    history: closed.slice(0, 100),
    assumptions:
      "Virtual $10,000 · 4.5 bps fee per side · 5 bps adverse slippage per side · max 5×. Funding, liquidation and execution delay are not simulated. This is a forward paper journal, not an execution-quality backtest.",
  };
}
const DecimalMin = (a, b) => (a.lessThan(b) ? a : b);
export function openPaper(body, markets) {
  const m = markets.find((m) => m.coin === body.coin);
  if (!m) throw Error("Select an available market.");
  if (Number(body.margin) < 10 || Number(body.margin) > 10000)
    throw Error("Margin must be between $10 and $10,000.");
  if (Number(body.leverage) < 1)
    throw Error("Leverage must be between 1 and 5.");
  if (paperState(markets).positions.length >= 20)
    throw Error("Close a position before opening more than 20.");
  const q = paperQuote({ ...body, mark: m.price }),
    state = paperState(markets);
  if (D(q.margin).plus(q.fee).gt(state.available))
    throw Error("Insufficient available virtual balance.");
  const id = randomUUID();
  db.prepare(
    "INSERT INTO paper_positions(id,source,coin,side,quantity,entry,margin,leverage,fee,opened_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
  ).run(
    id,
    body.source || null,
    m.coin,
    body.side,
    q.quantity,
    q.entry,
    q.margin,
    Number(body.leverage),
    q.fee,
    Date.now(),
  );
  return { id, ...q };
}
export function closePaper(id, markets) {
  const p = db
    .prepare("SELECT * FROM paper_positions WHERE id=? AND closed_at IS NULL")
    .get(id);
  if (!p) throw Error("Open position not found.");
  const m = markets.find((m) => m.coin === p.coin);
  if (!m) throw Error("A current market quote is unavailable.");
  const value = paperValue(p, m.price, true);
  db.prepare(
    "UPDATE paper_positions SET closed_at=?,exit=?,pnl=?,fee=? WHERE id=? AND closed_at IS NULL",
  ).run(
    Date.now(),
    value.exit,
    String(value.net),
    D(p.fee).plus(value.closeFee).toString(),
    id,
  );
  return value;
}
