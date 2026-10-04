import Link from "next/link";

type Tone = "positive" | "negative" | "mixed" | "neutral";
type Evidence = {
  label: string;
  value: number | null;
  format: "money" | "percent" | "count" | "number";
};
export type DecisionData = {
  version: string | number;
  coin?: string | null;
  headline: string;
  summary: string;
  tone: Tone;
  window: string;
  metrics: {
    netBuy: number | null;
    grossActivity: number | null;
    buySharePct: number | null;
    coveringSharePct: number | null;
    longExitSharePct: number | null;
    bullishWallets: number | null;
    bearishWallets: number | null;
    flatWallets: number | null;
    breadthPct: number | null;
    leaderSharePct: number | null;
    excludingLeader: number | null;
    effectiveWallets: number | null;
    positionNet: number | null;
    positionLongSharePct: number | null;
    qualifiedCount: number | null;
  };
  observations: {
    id: string;
    title: string;
    text: string;
    tone: Tone;
    evidence: Evidence[];
    wallet?: { address: string; name?: string | null };
  }[];
  limitations: string[];
  watchFor: string[];
};

function amount(value: number | null | undefined, signed = false) {
  if (value == null || !Number.isFinite(value)) return "—";
  const absolute = Math.abs(value);
  const prefix = value < 0 ? "−" : signed && value > 0 ? "+" : "";
  const scale =
    absolute >= 1e9 ? 1e9 : absolute >= 1e6 ? 1e6 : absolute >= 1e3 ? 1e3 : 1;
  const suffix =
    scale === 1e9 ? "B" : scale === 1e6 ? "M" : scale === 1e3 ? "K" : "";
  return `${prefix}$${(absolute / scale).toLocaleString("en-US", {
    minimumFractionDigits: scale > 1 ? 2 : 0,
    maximumFractionDigits: scale > 1 ? 2 : 0,
  })}${suffix}`;
}

function number(value: number | null | undefined, digits = 1) {
  return value == null || !Number.isFinite(value)
    ? "—"
    : value.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function percent(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? "—" : `${number(value)}%`;
}

function evidenceValue(evidence: Evidence) {
  return evidence.format === "money"
    ? amount(evidence.value)
    : evidence.format === "percent"
      ? percent(evidence.value)
      : number(evidence.value, evidence.format === "count" ? 0 : 2);
}

function direction(value: number | null | undefined) {
  return value == null || value === 0
    ? ""
    : value > 0
      ? "positive"
      : "negative";
}

function Metric({
  label,
  value,
  context,
  className = "",
}: {
  label: string;
  value: string;
  context: string;
  className?: string;
}) {
  return (
    <div className="decision-metric">
      <dt>{label}</dt>
      <dd className={className}>{value}</dd>
      <span>{context}</span>
    </div>
  );
}

function Observation({
  observation,
}: {
  observation: DecisionData["observations"][number];
}) {
  return (
    <article
      className={`decision-observation decision-tone-${observation.tone}`}
    >
      <h4>{observation.title}</h4>
      <p>{observation.text}</p>
      {observation.evidence?.length > 0 && (
        <dl className="decision-evidence">
          {observation.evidence.map((item, index) => (
            <div key={`${item.label}:${index}`}>
              <dt>{item.label}</dt>
              <dd>{evidenceValue(item)}</dd>
            </div>
          ))}
        </dl>
      )}
      {observation.wallet && (
        <Link
          className="decision-wallet"
          href={`/wallet/${observation.wallet.address}`}
        >
          Inspect{" "}
          {observation.wallet.name ||
            `${observation.wallet.address.slice(0, 6)}…${observation.wallet.address.slice(-4)}`}
          <span aria-hidden="true"> ↗</span>
        </Link>
      )}
    </article>
  );
}

export default function DecisionPanel({
  data,
  compact = false,
  sourceAt,
}: {
  data: DecisionData | null | undefined;
  compact?: boolean;
  sourceAt?: number | null;
}) {
  if (!data) return null;
  const metrics = data.metrics;
  const observations = data.observations || [];
  const visibleObservations = compact ? observations.slice(0, 3) : observations;
  const otherObservations = compact ? observations.slice(3) : [];
  const sourceTime =
    sourceAt && Number.isFinite(sourceAt)
      ? new Date(sourceAt).toLocaleString("en-IN", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;
  return (
    <section
      className={`panel decision-panel${compact ? " decision-compact" : ""}`}
      aria-label="Wallet intelligence brief"
    >
      <header className="decision-head">
        <div>
          <span className="eyebrow">
            INTELLIGENCE BRIEF / {data.coin && `${data.coin} / `}
            {data.window?.toUpperCase() || "SELECTED WINDOW"}
          </span>
          <h3>{data.headline}</h3>
          <p>{data.summary}</p>
          <p className="decision-record-status">
            {number(metrics.qualifiedCount, 0)} qualified token records ·{" "}
            {metrics.qualifiedCount === 0
              ? "Tracked activity; trader skill is unverified in this sample."
              : "Qualification describes observed trading history, not future returns."}
          </p>
        </div>
        {sourceTime && (
          <span className="decision-time">Calculated {sourceTime}</span>
        )}
      </header>

      <dl className="decision-metrics">
        <Metric
          label="Net buying"
          value={amount(metrics.netBuy, true)}
          context={`${amount(metrics.grossActivity)} observed turnover`}
          className={direction(metrics.netBuy)}
        />
        <Metric
          label="Net-buy address breadth"
          value={percent(metrics.breadthPct)}
          context={`${number(metrics.bullishWallets, 0)} net-buy · ${number(metrics.bearishWallets, 0)} net-sell addresses`}
        />
        <Metric
          label="Largest wallet share"
          value={percent(metrics.leaderSharePct)}
          context="Share of observed turnover"
        />
        <Metric
          label="Without largest wallet"
          value={amount(metrics.excludingLeader, true)}
          context="Net buying, largest turnover wallet excluded"
          className={direction(metrics.excludingLeader)}
        />
        <Metric
          label="Buying from short covers"
          value={percent(metrics.coveringSharePct)}
          context="Share of buying that closed shorts"
        />
        <Metric
          label="Selling from long exits"
          value={percent(metrics.longExitSharePct)}
          context="Share of selling that closed longs"
        />
        {!compact && (
          <>
            <Metric
              label="Effective activity contributors"
              value={number(metrics.effectiveWallets, 2)}
              context="Turnover concentration equivalent"
            />
            <Metric
              label="Current net exposure"
              value={amount(metrics.positionNet, true)}
              context={`${percent(metrics.positionLongSharePct)} of fresh exposure is long`}
              className={direction(metrics.positionNet)}
            />
          </>
        )}
      </dl>

      <div className="decision-observations">
        {visibleObservations.map((observation) => (
          <Observation key={observation.id} observation={observation} />
        ))}
      </div>
      {otherObservations.length > 0 && (
        <details className="decision-more">
          <summary>{otherObservations.length} more evidence findings</summary>
          <div className="decision-observations">
            {otherObservations.map((observation) => (
              <Observation key={observation.id} observation={observation} />
            ))}
          </div>
        </details>
      )}
      {data.watchFor?.length > 0 && (
        <div className="decision-watch">
          <h4>What to watch next</h4>
          <ul>
            {data.watchFor.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="decision-foot">
        <p>
          Observed positioning in the indexed sample. Breadth uses execution
          notional; addresses may share an owner. Buying can be a new long or a
          short exit; selling can be a new short or a long exit.
        </p>
        <details>
          <summary>Calculation rules & coverage limits</summary>
          <dl className="decision-definitions">
            <div>
              <dt>Net buying</dt>
              <dd>
                New longs + short covers − new shorts − long exits. Position
                flows are not deposits or withdrawals.
              </dd>
            </div>
            <div>
              <dt>Breadth</dt>
              <dd>
                Net-buying wallets as a share of wallets with a non-zero net
                direction in this window. {number(metrics.flatWallets, 0)}{" "}
                net-flat wallets are excluded.
              </dd>
            </div>
            <div>
              <dt>Concentration</dt>
              <dd>
                Largest-wallet share uses turnover. Excluding that wallet tests
                whether the aggregate direction survives. Effective wallet count
                reflects turnover distribution, not verified independent
                identities.
              </dd>
            </div>
            <div>
              <dt>Token record</dt>
              <dd>
                {number(metrics.qualifiedCount, 0)} wallets meet the
                token-record qualification rules. Activity alone does not
                establish skill.
              </dd>
            </div>
          </dl>
          {data.limitations?.length > 0 && (
            <ul>
              {data.limitations.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          )}
          <p className="decision-version">
            Calculation version {data.version}. These descriptions are evidence
            summaries, not calibrated price probabilities.
          </p>
        </details>
      </div>
    </section>
  );
}
