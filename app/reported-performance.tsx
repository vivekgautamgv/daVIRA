"use client";
import { money } from "./terminal";
import { time } from "./ui";
export default function ReportedPerformance({
  analysis: a,
}: {
  analysis: any;
}) {
  const p = a.performance;
  return (
    <section className="panel research-card">
      <span className="eyebrow">SOURCE-REPORTED PERFORMANCE</span>
      <h2>Performance history & copy eligibility</h2>
      <div className="stats">
        {[
          ["7-day", p?.week],
          ["30-day", p?.month],
          ["All-time", p?.allTime],
        ].map(([label, value]: any) => (
          <div key={label}>
            <span>{label} perpetual PnL</span>
            <h3
              className={
                value?.pnl > 0
                  ? "positive"
                  : value?.pnl < 0
                    ? "negative"
                    : "muted"
              }
            >
              {value ? money(value.pnl, 2) : "Unavailable"}
            </h3>
            <small>
              {value
                ? `${value.days.toFixed(1)} days · ${time(value.first)} to ${time(value.last)}`
                : "Not enough source history"}
            </small>
          </div>
        ))}
      </div>
      <p>
        Portfolio fetched {time(p?.updatedAt)}
        {p?.stale ? " · stale snapshot" : ""}. These are reported portfolio PnL
        changes, separate from the limited execution sample. All-time means the
        period returned by Hyperliquid, not independently verified lifetime
        results.
      </p>
      <div className="notice">
        <strong>
          {a.eligibility?.eligible
            ? "Meets copy shortlist criteria"
            : "Excluded from the copy shortlist"}
        </strong>
        <ul>
          {a.eligibility?.reasons?.map((reason: string) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
