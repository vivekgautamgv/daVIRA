"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import Terminal, {
  useData,
  Heading,
  Stat,
  Empty,
  money,
  price,
  num,
  short,
} from "./terminal";
import { mutate, useAction, Feedback, DataState, CoinSelect, time } from "./ui";
export default function Paper() {
  return (
    <Suspense
      fallback={<div className="loading-line">Loading paper account…</div>}
    >
      <PaperContent />
    </Suspense>
  );
}
function PaperContent() {
  const params = useSearchParams(),
    source = params.get("source"),
    [coin, setCoin] = useState(params.get("coin") || "BTC"),
    [side, setSide] = useState(
      params.get("side") === "short" ? "short" : "long",
    ),
    [margin, setMargin] = useState("100"),
    [leverage, setLeverage] = useState("1");
  const r = useData("paper", 15000),
    m = useData("markets", 60000),
    action = useAction(),
    d = r.data;
  return (
    <Terminal view="paper">
      <Heading
        eyebrow="PAPER ACCOUNT"
        title="Test your conviction"
        text="Practice a trade or copy a wallet’s current direction with virtual funds."
      >
        <span className="pill">SIMULATION ONLY</span>
      </Heading>
      <DataState resource={r} />
      <Feedback action={action} />
      {d && (
        <>
          <div className="stats">
            <Stat
              label="Virtual equity"
              value={money(d.equity, 2)}
              detail="Starting balance $10,000"
            />
            <Stat
              label="Available margin"
              value={money(d.available, 2)}
              detail="Unrealized gains are not spendable"
            />
            <Stat
              label="Margin in use"
              value={money(d.marginUsed, 2)}
              detail={`${d.positions.length} open positions`}
            />
            <Stat
              label="Realized net PnL"
              value={money(d.realized, 2)}
              detail="Closed positions, after modeled fees"
            />
          </div>
          <div className="notice">{d.assumptions}</div>
        </>
      )}
      <form
        className="panel order-form"
        onSubmit={(e) => {
          e.preventDefault();
          action.run(async () => {
            await mutate("paper/open", {
              coin,
              side,
              margin: Number(margin),
              leverage: Number(leverage),
              source: source || undefined,
            });
            await r.reload();
          }, "Virtual position opened at the current quote with modeled slippage.");
        }}
      >
        <div className="panel-head">
          <div>
            <h2>
              {source
                ? "Paper copy: current direction"
                : "Open a virtual position"}
            </h2>
            {source && (
              <p>
                Source wallet{" "}
                <Link href={`/wallet/${source}`}>{short(source)}</Link> ·
                one-time copy, sized by you
              </p>
            )}
          </div>
        </div>
        <div className="form-row">
          <label>
            Market
            <CoinSelect
              markets={m.data?.data || []}
              value={coin}
              onChange={setCoin}
            />
          </label>
          <label>
            Direction
            <select value={side} onChange={(e) => setSide(e.target.value)}>
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </label>
          <label>
            Margin (USD)
            <input
              required
              type="number"
              min="10"
              max="10000"
              step="1"
              value={margin}
              onChange={(e) => setMargin(e.target.value)}
            />
          </label>
          <label>
            Leverage
            <select
              value={leverage}
              onChange={(e) => setLeverage(e.target.value)}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}×
                </option>
              ))}
            </select>
          </label>
          <button
            className="button primary"
            disabled={action.busy || !d || d.stale}
          >
            Open paper trade <ArrowUpRight size={16} />
          </button>
        </div>
      </form>
      <section className="panel">
        <div className="panel-head">
          <h2>Open positions</h2>
          <span className="muted">Mark snapshot {time(d?.updatedAt)}</span>
        </div>
        {d?.positions?.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Market</th>
                  <th>Direction</th>
                  <th>Entry</th>
                  <th>Mark</th>
                  <th>Margin</th>
                  <th>Unrealized gross</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {d.positions.map((p: any) => (
                  <tr key={p.id}>
                    <td>
                      {p.coin}
                      {p.source && (
                        <small className="cell-sub">
                          From {short(p.source)}
                        </small>
                      )}
                    </td>
                    <td className={p.side === "long" ? "positive" : "negative"}>
                      {p.side} {p.leverage}×
                    </td>
                    <td>{price(Number(p.entry))}</td>
                    <td>{p.mark ? price(p.mark) : "Unavailable"}</td>
                    <td>{money(Number(p.margin), 2)}</td>
                    <td className={p.unrealized >= 0 ? "positive" : "negative"}>
                      {p.unrealized === null ? "—" : money(p.unrealized, 2)}
                    </td>
                    <td>
                      <button
                        disabled={action.busy || d.stale}
                        className="button"
                        onClick={() =>
                          action.run(async () => {
                            await mutate("paper/close", { id: p.id });
                            await r.reload();
                          }, "Virtual position closed; PnL and fees saved.")
                        }
                      >
                        Close
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No open positions">
            Choose a market and margin above, or use Paper copy from a wallet
            profile.
          </Empty>
        )}
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2>Closed trade journal</h2>
        </div>
        {d?.history?.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Market</th>
                  <th>Direction</th>
                  <th>Opened</th>
                  <th>Closed</th>
                  <th>Entry → Exit</th>
                  <th>Total fees</th>
                  <th>Net PnL</th>
                </tr>
              </thead>
              <tbody>
                {d.history.map((p: any) => (
                  <tr key={p.id}>
                    <td>{p.coin}</td>
                    <td>{p.side}</td>
                    <td>{time(p.opened_at)}</td>
                    <td>{time(p.closed_at)}</td>
                    <td>
                      {price(Number(p.entry))} → {price(Number(p.exit))}
                    </td>
                    <td>{money(Number(p.fee), 2)}</td>
                    <td
                      className={Number(p.pnl) >= 0 ? "positive" : "negative"}
                    >
                      {money(Number(p.pnl), 2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Your journal starts with a closed trade" />
        )}
      </section>
    </Terminal>
  );
}
