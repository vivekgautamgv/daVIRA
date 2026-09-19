"use client";
import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2, CheckCheck, Radio } from "lucide-react";
import Terminal, {
  useData,
  Heading,
  Empty,
  money,
  short,
  pct,
} from "./terminal";
import { mutate, useAction, Feedback, DataState, CoinSelect, time } from "./ui";
export default function Radar() {
  const r = useData("radar", 10000),
    m = useData("markets", 60000),
    action = useAction();
  const [coin, setCoin] = useState("BTC"),
    [kind, setKind] = useState("price_above"),
    [threshold, setThreshold] = useState("100000"),
    [tab, setTab] = useState("signals");
  const data = r.data;
  return (
    <Terminal view="radar">
      <Heading
        eyebrow="OBSERVATION ENGINE"
        title="Position radar"
        text="Track position changes and large executions from observed wallets."
      />
      <DataState resource={r} />
      <Feedback action={action} />
      <form
        className="panel form-row"
        onSubmit={(e) => {
          e.preventDefault();
          action.run(async () => {
            await mutate("rules", { coin, kind, threshold: Number(threshold) });
            await r.reload();
          }, "Alert saved. Active conditions are checked by the collector.");
        }}
      >
        <label>
          Market
          <CoinSelect
            markets={m.data?.data || []}
            value={coin}
            onChange={setCoin}
          />
        </label>
        <label>
          Alert when
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="price_above">Price at or above</option>
            <option value="price_below">Price at or below</option>
            <option value="funding_above">Absolute hourly funding above</option>
            <option value="large_trade">Individual trade above</option>
          </select>
        </label>
        <label>
          Threshold {kind === "funding_above" ? "(% / hour)" : "(USD)"}
          <input
            type="number"
            min="0.000001"
            step="any"
            required
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
          />
        </label>
        <button disabled={action.busy} className="button primary">
          <Plus size={16} />
          Add alert
        </button>
      </form>
      <div className="rule-chips">
        {data?.rules?.map((rule: any) => (
          <div className="rule-chip" key={rule.id}>
            <span>
              <b>{rule.coin}</b> {rule.kind.replaceAll("_", " ")}{" "}
              {rule.threshold}
            </span>
            <button
              className="icon-button"
              aria-label="Delete alert"
              disabled={action.busy}
              onClick={() =>
                action.run(async () => {
                  await mutate(`rules/${rule.id}`, {}, "DELETE");
                  await r.reload();
                }, "Alert deleted")
              }
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <p className="muted small">
        Alerts are stored in this app. Conditions repeat at most every 15
        minutes. Large-trade alerts require an active stream for that market.
      </p>
      <div className="tabs">
        <button
          className={tab === "signals" ? "selected" : ""}
          onClick={() => setTab("signals")}
        >
          Activity feed
        </button>
        <button
          className={tab === "trades" ? "selected" : ""}
          onClick={() => setTab("trades")}
        >
          Largest observed trades
        </button>
      </div>
      {tab === "signals" && (
        <section className="panel">
          <div className="panel-head">
            <h2>Latest observations</h2>
            <button
              className="text-link"
              disabled={action.busy}
              onClick={() =>
                action.run(async () => {
                  await mutate("signals/read");
                  await r.reload();
                }, "All observations marked as read")
              }
            >
              <CheckCheck size={16} />
              Mark read
            </button>
          </div>
          {data?.signals?.length ? (
            <div className="feed">
              {data.signals.map((s: any) => (
                <article
                  className={`feed-item ${s.read ? "read" : ""}`}
                  key={s.id}
                >
                  <span className="feed-icon">
                    <Radio size={17} />
                  </span>
                  <div>
                    <div className="inline">
                      <h3>{s.title}</h3>
                      {!s.read && <i className="unread-dot" />}
                    </div>
                    <p>{s.detail}</p>
                    <small>
                      {time(s.time)}{" "}
                      {s.address && (
                        <Link href={`/wallet/${s.address}`}>
                          {" "}
                          · {short(s.address)}
                        </Link>
                      )}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty title="Your radar is listening">
              Add a wallet to Watchlist or create an alert above. The first
              wallet snapshot sets a baseline; later changes appear here.
            </Empty>
          )}
        </section>
      )}
      {tab === "trades" && (
        <section className="panel">
          <div className="panel-head">
            <h2>Largest retained trades · last hour</h2>
            <span className="pill">
              {data?.health?.websocket || "Connecting"}
            </span>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Market</th>
                  <th>Taker</th>
                  <th>Notional</th>
                  <th>Buyer</th>
                  <th>Seller</th>
                </tr>
              </thead>
              <tbody>
                {data?.tape?.large?.map((t: any) => (
                  <tr key={t.id}>
                    <td>{time(t.time)}</td>
                    <td>{t.coin}</td>
                    <td className={t.side === "B" ? "positive" : "negative"}>
                      {t.side === "B" ? "Buy" : "Sell"}
                    </td>
                    <td>{money(t.price * t.size)}</td>
                    <td>
                      {t.buyer ? (
                        <Link href={`/wallet/${t.buyer}`}>
                          {short(t.buyer)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      {t.seller ? (
                        <Link href={`/wallet/${t.seller}`}>
                          {short(t.seller)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data?.tape?.large?.length && (
              <Empty title="Waiting for streamed trades" />
            )}
          </div>
          <div className="panel-foot">{data?.tape?.coverage}</div>
        </section>
      )}
    </Terminal>
  );
}
