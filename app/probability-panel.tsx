"use client";
import { useState } from "react";
import { download } from "./ui";

function numeric(value: number | null | undefined, digits = 1) {
  return value == null || !Number.isFinite(value)
    ? "—"
    : value.toLocaleString("en-US", { maximumFractionDigits: digits });
}
function percentage(value: number | null | undefined, signed = false) {
  return value == null || !Number.isFinite(value)
    ? "—"
    : `${signed && value > 0 ? "+" : ""}${numeric(value, 2)}%`;
}
function utc(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${new Date(value).toISOString().slice(0, 16).replace("T", " ")} UTC`;
}
function iso(value: number | null | undefined) {
  return value == null || !Number.isFinite(value)
    ? ""
    : new Date(value).toISOString();
}
function interval(value?: number[] | null) {
  return value?.length === 2
    ? `${percentage(value[0])}–${percentage(value[1])}`
    : "—";
}
function exportExamples(data: any, model: any, horizon: any) {
  const columns = [
    "coin",
    "cohort",
    "model",
    "outcome_hours",
    "input_start_utc",
    "input_end_utc",
    "outcome_end_utc",
    "entry_price",
    "exit_price",
    "return_pct",
    "input_momentum_pct",
    "input_volatility_pct",
    "input_trend_pct",
    "buy_share_pct",
    "expansion_pct",
    "wallets",
    "fills",
  ];
  const escape = (value: unknown) =>
    `"${String(value ?? "").replaceAll('"', '""')}"`;
  const rows = horizon.examples.map((example: any) =>
    [
      data.coin,
      data.cohort,
      model.id,
      horizon.hours,
      iso(example.inputStart),
      iso(example.inputEnd),
      iso(example.outcomeEnd),
      example.entryPrice,
      example.exitPrice,
      example.returnPct,
      example.momentum,
      example.volatility,
      example.trend,
      example.buyShare,
      example.expansion,
      example.wallets,
      example.fills,
    ]
      .map(escape)
      .join(","),
  );
  download(
    `davira-${String(data.coin).replace(/[^a-zA-Z0-9-]/g, "-")}-${model.id}-${horizon.hours}h-history.csv`,
    [columns.join(","), ...rows].join("\r\n"),
    "text/csv;charset=utf-8",
  );
}

function ProbabilityView({ data, compact }: { data: any; compact: boolean }) {
  const [hours, setHours] = useState(6);
  const [chosenModel, setChosenModel] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const models = data.models || [];
  const wallet = models.find((model: any) => model.id === "wallet");
  const price = models.find((model: any) => model.id === "price");
  const autoModel = wallet?.horizons?.some(
    (horizon: any) => horizon.hours === hours && horizon.status === "available",
  )
    ? wallet
    : price || wallet;
  const model =
    models.find((item: any) => item.id === chosenModel) || autoModel;
  if (!model) return null;
  const horizon = model.horizons?.find((item: any) => item.hours === hours);
  if (!horizon) return null;
  const statistics = horizon.status === "available" ? horizon.statistics : null;
  const validation = horizon.validation;
  const pageSize = compact ? 10 : 15;
  const examples = horizon.examples || [];
  const maxPage = Math.max(0, Math.ceil(examples.length / pageSize) - 1);
  const currentPage = Math.min(page, maxPage);
  const displayed = examples.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );
  const current = model.current;
  const flat = data.flatThresholdPct;
  const counts = horizon.counts || { up: 0, down: 0, flat: 0 };
  const covered = model.coverage;
  const selectModel = (id: string) => {
    setChosenModel(id);
    setPage(0);
  };
  const selectHorizon = (value: number) => {
    setHours(value);
    setPage(0);
  };
  return (
    <section
      className={`panel probability-panel${compact ? " probability-compact" : ""}`}
      aria-label={`${data.coin} historical probabilities`}
    >
      <header className="probability-head">
        <div>
          <span className="eyebrow">
            HISTORICAL PROBABILITIES / {data.coin}
          </span>
          <h3>What followed comparable conditions?</h3>
          <p>
            Last six months only. The previous {data.inputHours} completed hours
            are matched to historical conditions; outcomes are measured over the
            following {hours} hours.
          </p>
          <p>
            Research period: {utc(data.historyStart)} → {utc(data.historyEnd)}.
          </p>
        </div>
        <span className="probability-asof">As of {utc(data.asOf)}</span>
      </header>

      <div className="probability-controls">
        <div
          role="group"
          aria-label="Historical probability evidence model"
          className="probability-toggle"
        >
          {models.map((item: any) => (
            <button
              key={item.id}
              aria-pressed={model.id === item.id}
              onClick={() => selectModel(item.id)}
            >
              {item.id === "wallet" ? "Wallet + price" : "Price only"}
            </button>
          ))}
        </div>
        <div
          role="group"
          aria-label="Historical outcome horizon"
          className="probability-toggle"
        >
          {[6, 24].map((value) => (
            <button
              key={value}
              aria-pressed={hours === value}
              onClick={() => selectHorizon(value)}
            >
              Next {value}h
            </button>
          ))}
        </div>
      </div>

      {model.id === "price" && (
        <div className="probability-model-note">
          <strong>Price-only comparison.</strong> These matches use market-price
          conditions, not wallet confirmation.
          {!wallet?.horizons?.some(
            (item: any) => item.hours === hours && item.status === "available",
          ) &&
            " Wallet-conditioned probabilities do not yet have sufficient fresh evidence for this horizon."}
        </div>
      )}
      <div className="probability-context">
        <span>
          <b>Basis</b> {model.basis}
        </span>
        {current ? (
          <>
            <span>
              <b>Current input</b> {utc(current.start)} → {utc(current.end)}
            </span>
            <span>
              <b>{data.inputHours}h momentum</b>{" "}
              {percentage(current.momentum, true)}
            </span>
            {model.id === "price" && (
              <>
                <span>
                  <b>Volatility</b> {percentage(current.volatility)}
                </span>
                <span>
                  <b>20h trend</b> {percentage(current.trend, true)}
                </span>
              </>
            )}
            {model.id === "wallet" && (
              <span>
                <b>Buying share</b> {percentage(current.buyShare)}
              </span>
            )}
          </>
        ) : (
          <span>Current comparison input is unavailable.</span>
        )}
      </div>

      <div
        className="probability-scorecards"
        aria-label="Conditional historical outcome frequencies"
      >
        <div className="probability-score">
          <span>Up &gt; +{numeric(flat, 2)}%</span>
          <strong className={statistics ? "positive" : ""}>
            {percentage(statistics?.up)}
          </strong>
          <small>{numeric(counts.up, 0)} matched outcomes</small>
          <small>
            95% frequency interval {interval(statistics?.upInterval)}
          </small>
        </div>
        <div className="probability-score">
          <span>Down &lt; −{numeric(flat, 2)}%</span>
          <strong className={statistics ? "negative" : ""}>
            {percentage(statistics?.down)}
          </strong>
          <small>{numeric(counts.down, 0)} matched outcomes</small>
          <small>
            95% frequency interval {interval(statistics?.downInterval)}
          </small>
        </div>
        <div className="probability-score">
          <span>Flat within ±{numeric(flat, 2)}%</span>
          <strong>{percentage(statistics?.flat)}</strong>
          <small>{numeric(counts.flat, 0)} matched outcomes</small>
          <small>Completed {hours}h outcomes</small>
        </div>
        <div className="probability-score">
          <span>Median following move</span>
          <strong>{percentage(statistics?.median, true)}</strong>
          <small>10th–90th percentile range</small>
          <small>
            {percentage(statistics?.p10, true)} to{" "}
            {percentage(statistics?.p90, true)}
          </small>
        </div>
      </div>

      {statistics?.moveThresholds?.length > 0 && (
        <div className="probability-magnitudes">
          <div>
            <h4>Move magnitude</h4>
            <p>Historical return at the end of the following {hours} hours.</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Threshold</th>
                <th>Rose at least</th>
                <th>Fell at least</th>
              </tr>
            </thead>
            <tbody>
              {statistics.moveThresholds.map((item: any) => (
                <tr key={item.thresholdPct}>
                  <td>±{numeric(item.thresholdPct, 2)}%</td>
                  <td>{percentage(item.up)}</td>
                  <td>{percentage(item.down)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!statistics && (
        <div className="probability-unavailable" role="status">
          <h4>
            {horizon.status === "stale"
              ? "Current conditions are stale"
              : "Not enough matching evidence yet"}
          </h4>
          <p>
            Outcome counts are visible for inspection. Probability percentages
            remain unavailable until this model's evidence checks pass.
          </p>
          {horizon.reasons?.length > 0 && (
            <ul>
              {horizon.reasons.map((reason: string, index: number) => (
                <li key={index}>{reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="probability-coverage">
        <dl>
          <div>
            <dt>Matched conditions</dt>
            <dd>
              {numeric(horizon.matches, 0)} across {numeric(horizon.days, 0)}{" "}
              UTC dates
            </dd>
          </div>
          <div>
            <dt>Eligible reference windows</dt>
            <dd>{numeric(horizon.eligible, 0)}</dd>
          </div>
          <div>
            <dt>Unconditioned baseline</dt>
            <dd>
              Up{" "}
              {percentage(
                horizon.baseline?.statistics?.up ?? statistics?.baselineUp,
              )}{" "}
              · down{" "}
              {percentage(
                horizon.baseline?.statistics?.down ?? statistics?.baselineDown,
              )}
              {horizon.baseline?.statistics && (
                <small>
                  {numeric(horizon.baseline.samples, 0)} eligible windows ·{" "}
                  {numeric(horizon.baseline.days, 0)} UTC dates. Unconditioned;
                  not a forecast for today's input.
                </small>
              )}
            </dd>
          </div>
          <div>
            <dt>
              {model.id === "wallet"
                ? "Observed wallet activity with prices"
                : "Available completed candle history"}
            </dt>
            <dd>
              {utc(covered?.first)} → {utc(covered?.last)}
              <small>
                {numeric(covered?.days, 0)} UTC dates ·{" "}
                {numeric(covered?.hours, 0)}{" "}
                {model.id === "wallet"
                  ? "observed activity hours"
                  : "completed candle hours"}
              </small>
            </dd>
          </div>
        </dl>
        <p>
          These are conditional frequencies in retained historical matches. They
          are not calibrated probabilities of the next trade.
        </p>
      </div>

      <div className="probability-validation">
        <div>
          <h4>Historical walk-forward check</h4>
          <span className="probability-validation-status">
            {validation?.status === "evaluated"
              ? "Historical evaluation available"
              : "More time-ordered evaluations needed"}
          </span>
          <p>
            {validation?.note ||
              "Requires historical forecasts made using only evidence available at each evaluation time."}
          </p>
        </div>
        <dl>
          <div>
            <dt>Evaluation windows</dt>
            <dd>
              {numeric(validation?.forecasts, 0)} ·{" "}
              {numeric(validation?.days, 0)} dates
            </dd>
          </div>
          <div>
            <dt>Model / baseline Brier</dt>
            <dd>
              {numeric(validation?.brier, 4)} /{" "}
              {numeric(validation?.baselineBrier, 4)}
            </dd>
          </div>
          <div>
            <dt>Skill versus baseline</dt>
            <dd>{percentage(validation?.skillPct, true)}</dd>
          </div>
        </dl>
        <small>
          Lower Brier error is better. This retrospective check does not
          establish a profitable trading strategy.
        </small>
      </div>

      <details
        className="probability-evidence"
        open={!compact}
        key={`evidence:${model.id}:${hours}`}
      >
        <summary>
          Dated matched evidence · {numeric(examples.length, 0)} historical
          windows
        </summary>
        <div className="probability-evidence-head">
          <p>
            Newest first. Each outcome finishes before the current input begins.
            All dates below are UTC.
          </p>
          <button
            className="button"
            disabled={!examples.length}
            onClick={() => exportExamples(data, model, horizon)}
          >
            Export all {numeric(examples.length, 0)} matches
          </button>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Input start · UTC</th>
                <th>Input end · UTC</th>
                <th>Outcome end · UTC</th>
                <th>Input momentum</th>
                {model.id === "price" && (
                  <>
                    <th>Input volatility</th>
                    <th>20h trend</th>
                  </>
                )}
                {model.id === "wallet" && (
                  <>
                    <th>Buying share</th>
                    <th>Expansion</th>
                    <th>Wallets / fills</th>
                  </>
                )}
                <th>Entry price</th>
                <th>Exit price</th>
                <th>Following {hours}h move</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((example: any, index: number) => (
                <tr
                  key={`${example.inputStart}:${example.outcomeEnd}:${index}`}
                >
                  <td>{utc(example.inputStart).replace(" UTC", "")}</td>
                  <td>{utc(example.inputEnd).replace(" UTC", "")}</td>
                  <td>{utc(example.outcomeEnd).replace(" UTC", "")}</td>
                  <td>{percentage(example.momentum, true)}</td>
                  {model.id === "price" && (
                    <>
                      <td>{percentage(example.volatility)}</td>
                      <td>{percentage(example.trend, true)}</td>
                    </>
                  )}
                  {model.id === "wallet" && (
                    <>
                      <td>{percentage(example.buyShare)}</td>
                      <td>{percentage(example.expansion, true)}</td>
                      <td>
                        {numeric(example.wallets, 0)} /{" "}
                        {numeric(example.fills, 0)}
                      </td>
                    </>
                  )}
                  <td>{numeric(example.entryPrice, 6)}</td>
                  <td>{numeric(example.exitPrice, 6)}</td>
                  <td
                    className={
                      example.returnPct > 0
                        ? "positive"
                        : example.returnPct < 0
                          ? "negative"
                          : ""
                    }
                  >
                    {percentage(example.returnPct, true)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!examples.length && (
          <p className="probability-empty">
            No eligible matches in this model's retained archive.
          </p>
        )}
        {examples.length > 0 && (
          <div className="probability-pagination">
            <span>
              {currentPage * pageSize + 1}–
              {Math.min((currentPage + 1) * pageSize, examples.length)} of{" "}
              {numeric(examples.length, 0)} matches
            </span>
            <div>
              <button
                className="button"
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
              >
                Previous
              </button>
              <span>
                Page {currentPage + 1} / {maxPage + 1}
              </span>
              <button
                className="button"
                disabled={currentPage === maxPage}
                onClick={() => setPage(currentPage + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </details>

      {data.source?.priceError && (
        <p className="probability-source-status" role="status">
          Market-price history refresh is unavailable.{" "}
          {data.source.completedHistoryCurrent
            ? `Using archived completed candles through ${utc(data.source.completedThrough)}. The ongoing hourly candle is excluded.`
            : "The latest completed candle sequence is missing; current estimates are withheld."}
        </p>
      )}

      <details className="probability-method">
        <summary>Methodology, archive bounds & limitations</summary>
        <p>{data.method}</p>
        <p>
          Archive bounds: {utc(data.historyStart)} → {utc(data.historyEnd)}.
          Current cohort: {data.cohort}. Calculation version: {data.version}.
        </p>
        <ul>
          {(data.limitations || []).map((item: string, index: number) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}

export default function ProbabilityPanel({
  data,
  compact = false,
}: {
  data: any;
  compact?: boolean;
}) {
  return data ? (
    <ProbabilityView
      key={`${data.coin}:${data.cohort}`}
      data={data}
      compact={compact}
    />
  ) : null;
}
