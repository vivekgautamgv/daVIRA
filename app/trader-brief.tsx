import Link from "next/link";
import { money, short } from "./terminal";

const pct = (v: number | null) =>
  v == null ? "Unavailable" : `${v.toFixed(1)}%`;
const usd = (v: number | null) => (v == null ? "Unavailable" : money(v, 2));
const level = (v: number) =>
  `$${v.toLocaleString("en-US", { maximumSignificantDigits: 7 })}`;
const date = (v: number) =>
  v
    ? new Date(v).toISOString().slice(5, 16).replace("T", " ") + " UTC"
    : "Unavailable";
const signed = (v: number | null) =>
  v == null ? "" : v > 0 ? "positive" : v < 0 ? "negative" : "";

export default function TraderBrief({
  data,
  readiness,
}: {
  data: any;
  readiness?: string;
}) {
  if (!data) return null;
  return (
    <section
      className="trader-brief"
      aria-label={`${data.coin} decision brief`}
    >
      <header className="panel thesis-head">
        <div className="thesis-kicker">
          <span className="eyebrow">
            DECISION BRIEF / {data.coin} / {data.window.toUpperCase()}
          </span>
          <small>Last retained trade {date(data.latestFill)}</small>
        </div>
        <h2>{data.headline}</h2>
        <p>{data.summary}</p>
        <div className="thesis-readiness">
          <b>{readiness || "Observed wallet activity"}</b>
          <span>
            {data.qualified} qualified token records · {data.knownPositions}/
            {data.totalPositions} wallet position snapshots available
          </span>
        </div>
        {data.qualified === 0 && (
          <p className="thesis-limit">
            The activity is visible, but this sample has not established the
            traders’ token-specific skill. A fresh position snapshot and a
            complete trading record are different evidence.
          </p>
        )}
      </header>

      <div className="thesis-columns">
        {[
          {
            title: "Evidence for buyers",
            facts: data.support,
            tone: "positive",
          },
          {
            title: "Selling pressure & counter-evidence",
            facts: data.challenges,
            tone: "negative",
          },
        ].map((group) => (
          <section className="panel thesis-facts" key={group.title}>
            <h3>{group.title}</h3>
            {group.facts.length ? (
              group.facts.map((f: any) => (
                <article key={f.title}>
                  <div>
                    <b>{f.title}</b>
                    <strong className={group.tone}>
                      {f.kind === "percent" ? pct(f.value) : usd(f.value)}
                    </strong>
                  </div>
                  <p>{f.text}</p>
                </article>
              ))
            ) : (
              <p>
                No supported finding in this direction for the retained window.
              </p>
            )}
          </section>
        ))}
      </div>

      <section className="panel thesis-change">
        <div className="panel-head">
          <div>
            <span className="eyebrow">WHAT CHANGED</span>
            <h3>Two consecutive six-hour periods</h3>
            <p>{data.comparison.description}</p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Completed period · UTC</th>
                <th>Observed net buying</th>
                <th>Price change</th>
                <th>Wallets / fills</th>
                <th>Activity hours</th>
              </tr>
            </thead>
            <tbody>
              {[data.comparison.previous, data.comparison.current].map(
                (b: any, index: number) => (
                  <tr key={b.start}>
                    <td>
                      <b>
                        {index ? "Latest six hours" : "Preceding six hours"}
                      </b>
                      <small>
                        {date(b.start)} → {date(b.end)}
                      </small>
                    </td>
                    <td className={signed(b.netBuy)}>{usd(b.netBuy)}</td>
                    <td className={signed(b.priceChange)}>
                      {pct(b.priceChange)}
                    </td>
                    <td>
                      {b.wallets} / {b.fills.toLocaleString()}
                    </td>
                    <td>{b.observedHours} / 6</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
        <p className="thesis-note">
          {data.comparison.priceResponse && (
            <>
              <strong>{data.comparison.priceResponse}</strong>
              <br />
            </>
          )}
          Periods do not overlap. Each uses retained executions in the current
          cohort; quiet or missing hours cannot establish market inactivity.
          Price changes use complete hourly candles over the same period.
        </p>
      </section>

      <section className="panel thesis-scenarios">
        <div className="panel-head">
          <div>
            <span className="eyebrow">CONDITIONS TO MONITOR</span>
            <h3>What would make either case stronger?</h3>
            <p>
              These are transparent observation checks. Meeting them does not
              qualify a trade or establish a probability.
            </p>
          </div>
        </div>
        <div className="thesis-columns">
          {[
            { name: "Bullish case", rows: data.bullish, tone: "positive" },
            { name: "Bearish case", rows: data.bearish, tone: "negative" },
          ].map((caseData) => (
            <div className="thesis-case" key={caseData.name}>
              <h4 className={caseData.tone}>{caseData.name}</h4>
              {caseData.rows.map((r: any) => (
                <div className="thesis-check" key={r.label}>
                  <span className={`thesis-state ${r.state}`}>
                    {r.state === "met"
                      ? "Observed"
                      : r.state === "unknown"
                        ? "No data"
                        : "Not met"}
                  </span>
                  <p>
                    {r.label}
                    <small>
                      Current reference:{" "}
                      {r.value == null
                        ? "Unavailable"
                        : r.kind === "price"
                          ? level(r.value)
                          : pct(r.value)}
                    </small>
                  </p>
                </div>
              ))}
            </div>
          ))}
        </div>
        {data.price ? (
          <div className="thesis-price">
            <div>
              <span>Last completed close</span>
              <b>{level(data.price.close)}</b>
              <small>{date(data.price.at)}</small>
            </div>
            <div>
              <span>20-hour low / high</span>
              <b>
                {level(data.price.low)} / {level(data.price.high)}
              </b>
              <small>Observed range; no assumed support or resistance.</small>
            </div>
            <p>
              A later completed close above {level(data.price.high)} would
              extend the range upward; a close below {level(data.price.low)}{" "}
              would extend it downward. Recheck fresh entries and wallet breadth
              at that time. Reversal in those observations weakens the
              corresponding case.
            </p>
          </div>
        ) : (
          <p className="thesis-note">
            Current completed-hour price context is unavailable. Price
            conditions are withheld until the latest candle sequence is
            available.
          </p>
        )}
      </section>

      <section className="panel thesis-drivers">
        <div className="panel-head">
          <div>
            <span className="eyebrow">WHO DRIVES THIS VIEW</span>
            <h3>Largest net execution contributors</h3>
            <p>
              Ranked by absolute net buying or selling in this {data.window}{" "}
              window.
            </p>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Wallet</th>
                <th>Net executions / turnover share</th>
                <th>Current position</th>
                <th>{data.coin} completed-episode PnL</th>
              </tr>
            </thead>
            <tbody>
              {data.wallets.map((w: any) => (
                <tr key={w.address}>
                  <td>
                    <Link href={`/wallet/${w.address}`}>
                      {w.name || short(w.address)}
                    </Link>
                    <small>
                      {w.qualified
                        ? "Qualified token record"
                        : "Record not qualified"}
                    </small>
                  </td>
                  <td className={signed(w.netBuy)}>
                    {usd(w.netBuy)}
                    <small>
                      {pct(w.turnoverShare)} of selected-window turnover
                    </small>
                  </td>
                  <td>
                    {w.position
                      ? `${w.position.size > 0 ? "Long" : "Short"} ${usd(w.position.value)}`
                      : w.positionState}
                    <small>{date(w.positionAt)}</small>
                  </td>
                  <td>
                    {usd(w.tokenPnl)}
                    <small>
                      {w.trades} completed episodes · retained history
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.wallets.length && (
          <p className="thesis-note">
            No retained contributors for this window.
          </p>
        )}
        <p className="thesis-note">
          Token PnL covers retained complete episodes, includes execution fees
          and excludes funding. Addresses may belong to the same owner; their
          other hedges are unknown.
        </p>
      </section>

      <section className="panel thesis-history">
        <div className="panel-head">
          <div>
            <span className="eyebrow">HISTORICAL CHECK / SIX MONTHS ONLY</span>
            <h3>Does comparable history support a forecast?</h3>
          </div>
        </div>
        <div className="thesis-columns">
          {data.history.map((model: any) => (
            <article key={model.id}>
              <h4>{model.id === "wallet" ? "Wallet + price" : "Price only"}</h4>
              <p>
                {model.statistics
                  ? `${pct(model.statistics.up)} up · ${pct(model.statistics.down)} down · ${pct(model.statistics.flat)} flat over the following 6h.`
                  : "Conditional frequencies unavailable for the current input."}
              </p>
              <small>{model.matches} matched historical periods.</small>
              <p>
                {model.validation?.status === "evaluated"
                  ? model.validation.skillPct > 0
                    ? "Retrospective error was lower than the baseline. Independent forward validation is still required."
                    : "Retrospective error did not improve on the baseline; no predictive advantage established."
                  : "Insufficient time-ordered evaluations to establish predictive performance."}
              </p>
            </article>
          ))}
        </div>
        <p className="thesis-note">
          Up/down use ±0.1% closing returns. These frequencies are historical
          observations. Open Data & wallets for dated matches, uncertainty
          intervals and export.
        </p>
      </section>
    </section>
  );
}
