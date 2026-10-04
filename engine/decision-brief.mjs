// Descriptive rules over observed executions. No model probabilities or trade instructions.
const HOUR = 3_600_000;
const number = (value) =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const nonnegative = (value) =>
  number(value) !== null && value >= 0 ? value : null;
const sum = (values) =>
  values.every((v) => number(v) !== null)
    ? number(values.reduce((s, v) => s + v, 0))
    : null;
const percentage = (numerator, denominator) =>
  number(numerator) !== null && number(denominator) !== null && denominator > 0
    ? Math.max(0, Math.min(100, 100 * (numerator / denominator)))
    : null;
const sign = (value, scale = 1) =>
  number(value) === null || Math.abs(value) <= Math.max(1e-8, scale * 1e-8)
    ? 0
    : Math.sign(value);
const agrees = (a, b) =>
  number(a) !== null &&
  number(b) !== null &&
  Math.abs(a - b) <= Math.max(0.01, Math.abs(a) * 1e-6);
const money = (value) =>
  number(value) === null
    ? "unavailable"
    : `${value < 0 ? "−" : ""}$${Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
const pct = (value) =>
  number(value) === null ? "unavailable" : `${value.toFixed(1)}%`;
const evidence = (label, value, format = "money") => ({
  label,
  value: number(value),
  format,
});

export function decisionBrief(input = {}) {
  const data = input && typeof input === "object" ? input : {};
  const window = ["1h", "6h", "24h", "7d", "30d"].includes(data.window)
    ? data.window
    : "24h";
  const windows = Array.isArray(data.windows) ? data.windows : [];
  const base = windows.find((w) => w?.label === window) || {};
  const parts = [base.longIn, base.longOut, base.shortIn, base.shortOut].map(
    nonnegative,
  );
  const [longIn, longOut, shortIn, shortOut] = parts;
  const grossActivity = sum(parts);
  const buy = sum([longIn, shortOut]),
    sell = sum([shortIn, longOut]);
  const netBuy =
    grossActivity !== null && buy !== null && sell !== null
      ? number(buy - sell)
      : null;
  const end = number(data.end) ?? number(data.updatedAt);
  const start = number(data.start);
  const rawRows = Array.isArray(data.rows) ? data.rows : [];
  const seen = new Set(),
    rows = [];
  let invalidActivity = 0;
  for (const row of rawRows) {
    if (!row?.activity) continue;
    const a = row.activity;
    if (
      typeof row.address !== "string" ||
      !row.address ||
      seen.has(row.address)
    )
      continue;
    seen.add(row.address);
    const notional = nonnegative(a.notional),
      net = number(a.netBuy),
      fills = nonnegative(a.fills),
      last = number(a.last);
    if (
      notional === null ||
      notional <= 0 ||
      net === null ||
      fills === null ||
      fills < 1 ||
      Math.abs(net) > notional + Math.max(0.01, notional * 1e-6) ||
      last === null ||
      (end !== null && last > end) ||
      (start !== null && last < start)
    ) {
      invalidActivity++;
      continue;
    }
    rows.push({
      address: row.address,
      name: typeof row.name === "string" ? row.name : null,
      notional,
      netBuy: net,
      fills,
      last,
      qualified: row.qualified === true,
    });
  }
  rows.sort(
    (a, b) => b.notional - a.notional || a.address.localeCompare(b.address),
  );
  const activityTotal = sum(rows.map((row) => row.notional));
  const rowNet = sum(rows.map((row) => row.netBuy));
  const leader = rows[0] || null;
  const bullishWallets = rows.filter(
    (row) => sign(row.netBuy, row.notional) > 0,
  ).length;
  const bearishWallets = rows.filter(
    (row) => sign(row.netBuy, row.notional) < 0,
  ).length;
  const flatWallets = rows.length - bullishWallets - bearishWallets;
  const breadthPct = percentage(
    bullishWallets,
    bullishWallets + bearishWallets,
  );
  const leaderSharePct = leader
    ? percentage(leader.notional, activityTotal)
    : null;
  const rowCoverage =
    grossActivity === null ? null : percentage(activityTotal, grossActivity);
  const reconciled =
    grossActivity !== null &&
    agrees(activityTotal, grossActivity) &&
    agrees(rowNet, netBuy);
  const excludingLeader = reconciled && leader ? netBuy - leader.netBuy : null;
  const netLeader = [...rows].sort(
    (a, b) =>
      Math.abs(b.netBuy) - Math.abs(a.netBuy) ||
      a.address.localeCompare(b.address),
  )[0];
  const excludingNetLeader =
    reconciled && netLeader ? netBuy - netLeader.netBuy : null;
  const effectiveWallets =
    activityTotal > 0
      ? 1 / rows.reduce((s, row) => s + (row.notional / activityTotal) ** 2, 0)
      : null;
  const positioning = data.positioning || {};
  const long = nonnegative(positioning.long),
    short = nonnegative(positioning.short);
  const positionGross = sum([long, short]);
  const knownPositions =
    positionGross > 0 ||
    sum([
      positioning.longWallets,
      positioning.shortWallets,
      positioning.flatWallets,
    ]) > 0;
  const positionNet =
    knownPositions && long !== null && short !== null ? long - short : null;
  const qualifiedCount = rawRows.filter(
    (row) => row?.qualified === true,
  ).length;
  const metrics = {
    selectedWindow: window,
    netBuy,
    grossActivity,
    buySharePct: percentage(buy, grossActivity),
    coveringSharePct: percentage(shortOut, buy),
    longExitSharePct: percentage(longOut, sell),
    bullishWallets,
    bearishWallets,
    flatWallets,
    breadthPct,
    leaderSharePct,
    excludingLeader,
    excludingNetLeader,
    netLeader: netLeader
      ? {
          address: netLeader.address,
          name: netLeader.name,
          netBuy: netLeader.netBuy,
        }
      : null,
    effectiveWallets,
    positionNet,
    positionLongSharePct: percentage(long, positionGross),
    qualifiedCount,
    activityCoveragePct: rowCoverage,
    observedActivityContributors: rows.length,
  };
  const observations = [],
    limitations = [],
    watchFor = [];
  const add = (id, title, text, tone, items = [], wallet) =>
    observations.push({
      id,
      title,
      text,
      tone,
      evidence: items,
      ...(wallet
        ? { wallet: { address: wallet.address, name: wallet.name } }
        : {}),
    });
  const direction = sign(netBuy, grossActivity ?? 1);
  const flip =
    direction !== 0 && sign(excludingLeader, grossActivity ?? 1) === -direction;
  const breadthDirection =
    breadthPct !== null && Math.abs(breadthPct - 50) >= 10
      ? Math.sign(breadthPct - 50)
      : 0;
  const disagreement =
    reconciled && direction !== 0 && breadthDirection === -direction;
  let tone = "neutral",
    headline = "No execution evidence in this window",
    summary;
  if (grossActivity === null) {
    headline = "Execution totals are unavailable";
    summary =
      "The selected window lacks complete, valid entry and exit totals. No directional interpretation is produced.";
  } else if (grossActivity === 0) {
    summary =
      "No retained execution activity appears in the selected window. This does not establish inactivity across the venue.";
  } else {
    tone =
      flip || disagreement || Math.abs(metrics.buySharePct - 50) < 5
        ? "mixed"
        : direction > 0
          ? "positive"
          : "negative";
    headline = flip
      ? direction > 0
        ? "One contributor changes the buying headline"
        : "One contributor changes the selling headline"
      : disagreement
        ? "Wallet participation and trade size disagree"
        : tone === "mixed"
          ? "Buying and selling are relatively balanced"
          : direction > 0
            ? "Observed buying outweighs selling"
            : "Observed selling outweighs buying";
    summary = `${window} observed net ${direction > 0 ? "buying" : direction < 0 ? "selling" : "flow"}: ${money(Math.abs(netBuy))}, across ${money(grossActivity)} in execution notional. This describes the retained wallet sample; entry and exit composition matters.`;
    add(
      "flow-composition",
      "What the buying and selling contain",
      `${money(longIn)} opened longs and ${money(shortOut)} closed shorts; ${money(shortIn)} opened shorts and ${money(longOut)} closed longs. Buying share is ${pct(metrics.buySharePct)} of execution notional.`,
      tone,
      [
        evidence("New longs", longIn),
        evidence("Short covers", shortOut),
        evidence("New shorts", shortIn),
        evidence("Long exits", longOut),
      ],
    );
    if (leader && effectiveWallets !== null) {
      add(
        "concentration",
        flip
          ? "The largest contributor reverses the headline"
          : "How concentrated is the activity?",
        `${leader.name || leader.address} accounts for ${pct(leaderSharePct)} of contributor-row turnover. ${excludingLeader !== null ? `Exclude its executions and net ${sign(excludingLeader) < 0 ? "selling" : sign(excludingLeader) > 0 ? "buying" : "flow"} is ${money(Math.abs(excludingLeader))}.` : "The exclusion result is unavailable because contributor rows do not reconcile with the full window."} Effective activity contributors: ${effectiveWallets.toFixed(1)}; this is a turnover-concentration measure, not independent bets.`,
        flip || leaderSharePct >= 50 ? "mixed" : "neutral",
        [
          evidence("Largest activity share", leaderSharePct, "percent"),
          evidence("Net flow excluding largest contributor", excludingLeader),
          evidence(
            "Effective activity contributors",
            effectiveWallets,
            "number",
          ),
        ],
        leader,
      );
      add(
        "breadth",
        disagreement
          ? "Participation disagrees with dollar flow"
          : "Wallet participation",
        `${bullishWallets} addresses net bought by execution dollars, ${bearishWallets} net sold and ${flatWallets} were balanced. ${disagreement ? "The majority side differs from dollar flow; trade size drives a different headline." : "Each address gets one vote."} These are addresses, not independent owners or changes in held position size.`,
        disagreement ? "mixed" : "neutral",
        [
          evidence("Net-buying contributors", bullishWallets, "count"),
          evidence("Net-selling contributors", bearishWallets, "count"),
          evidence(
            "Buying breadth among directional contributors",
            breadthPct,
            "percent",
          ),
        ],
      );
    }
    if (metrics.coveringSharePct >= 40 || metrics.longExitSharePct >= 40) {
      add(
        "exit-driven",
        "Exits are a substantial part of the flow",
        `${pct(metrics.coveringSharePct)} of buying closed shorts; ${pct(metrics.longExitSharePct)} of selling closed longs. Exiting a position is different from opening a fresh position. Fresh entries were ${money(longIn)} long versus ${money(shortIn)} short.`,
        "mixed",
        [
          evidence(
            "Buying from short covers",
            metrics.coveringSharePct,
            "percent",
          ),
          evidence(
            "Selling from long exits",
            metrics.longExitSharePct,
            "percent",
          ),
          evidence("Fresh long minus short entries", longIn - shortIn),
        ],
      );
      watchFor.push(
        "Whether fresh entries support the flow after short covers or long exits subside.",
      );
    }
    if (positionGross > 0) {
      const opposed =
        direction !== 0 && sign(positionNet, positionGross) === -direction;
      add(
        "held-exposure",
        opposed
          ? "Held exposure differs from recent flow"
          : "The current sampled position book",
        `${money(long)} long versus ${money(short)} short, with ${money(Math.abs(positionNet))} net ${positionNet > 0 ? "long" : positionNet < 0 ? "short" : "balanced"} exposure. ${opposed ? "The held book leans opposite to recent net executions." : "Held exposure is a snapshot, while execution flow measures changes over a window."} Other positions or hedges are not observable here.`,
        opposed ? "mixed" : "neutral",
        [
          evidence("Long notional", long),
          evidence("Short notional", short),
          evidence("Net held exposure", positionNet),
        ],
      );
    }
    const context = base.priceContext || {};
    const priceChange = number(context.priceChange);
    const alignedNet = number(context.netBuy),
      alignedGross = nonnegative(context.grossActivity);
    const alignedStart = number(context.start),
      alignedEnd = number(context.end),
      hours = nonnegative(context.completedHours);
    const aligned =
      priceChange !== null &&
      alignedNet !== null &&
      alignedGross > 0 &&
      Math.abs(alignedNet) <= alignedGross &&
      alignedStart !== null &&
      alignedEnd !== null &&
      hours > 0 &&
      Number.isInteger(hours) &&
      alignedEnd - alignedStart === hours * HOUR &&
      (start === null || alignedStart >= start) &&
      (end === null || alignedEnd <= end);
    if (aligned && !data.priceError && !data.priceStale && !data.marketStale) {
      const alignedShare = 50 + 50 * (alignedNet / alignedGross);
      const materialFlow = Math.abs(alignedShare - 50) >= 5;
      const materialPrice = Math.abs(priceChange) >= 0.25;
      const opposite =
        materialFlow &&
        materialPrice &&
        sign(alignedNet) !== Math.sign(priceChange);
      add(
        "price-response",
        opposite
          ? "Price moved against observed flow"
          : "Price alongside the executions",
        `Across ${hours} complete hourly candles and executions over the same interval, price changed ${priceChange >= 0 ? "+" : ""}${priceChange.toFixed(2)}%. ${opposite ? "Price and net execution dollars moved in opposite directions; untracked activity may outweigh this sample." : !materialFlow || !materialPrice ? "Heuristic: flow within 5 percentage points of balanced, or a price move below 0.25%, is inconclusive." : "Both share a direction. Co-movement does not establish causation or predict the next move."}`,
        opposite ? "mixed" : "neutral",
        [
          evidence("Aligned price change", priceChange, "percent"),
          evidence("Aligned net buying", alignedNet),
          evidence("Aligned buying share", alignedShare, "percent"),
          evidence("Complete hours", hours, "count"),
        ],
      );
    } else if (!data.priceError && !data.priceStale && !data.marketStale)
      limitations.push(
        "A complete aligned price/flow interval is unavailable; price-versus-flow interpretation is withheld.",
      );
    watchFor.push(
      flip
        ? "Whether the flow direction remains after excluding the largest activity contributor."
        : "Whether participation broadens beyond the largest activity contributors.",
    );
  }
  if (window === "24h") {
    const recent = ["1h", "6h", "24h"].map((label) =>
      windows.find((w) => w?.label === label),
    );
    const values = recent.map((w) =>
      w &&
      [w.longIn, w.longOut, w.shortIn, w.shortOut].every(
        (v) => nonnegative(v) !== null,
      )
        ? w.longIn + w.shortOut - w.shortIn - w.longOut
        : null,
    );
    if (
      values.every((v) => number(v) !== null) &&
      recent.every((w) => nonnegative(w.fills) > 0)
    ) {
      const reversal =
        sign(values[0]) !== 0 &&
        sign(values[1]) !== 0 &&
        sign(values[0]) !== sign(values[1]);
      add(
        "window-change",
        reversal
          ? "The latest hour differs from six hours"
          : "Flow across overlapping windows",
        `Net buying: 1h ${money(values[0])}, 6h ${money(values[1])}, 24h ${money(values[2])}. ${reversal ? "The latest hour points opposite to the six-hour window; persistence remains unconfirmed." : "These rolling windows overlap and are not independent confirmations."}`,
        reversal ? "mixed" : "neutral",
        values.map((v, i) =>
          evidence(`${["1h", "6h", "24h"][i]} net buying`, v),
        ),
      );
      watchFor.push(
        "Whether the latest-hour change persists across several completed hours.",
      );
    }
  }
  limitations.push(
    "Selected wallet sample, with incomplete retained records. This is not the whole market or a calibrated forecast.",
  );
  if (!reconciled && grossActivity > 0)
    limitations.push(
      "Contributor rows do not fully reconcile with window totals. Breadth and concentration cover available valid rows; the largest-contributor exclusion is withheld.",
    );
  if (invalidActivity)
    limitations.push(
      `${invalidActivity} activity row(s) excluded because timestamps or numeric values were invalid or outside the selected window.`,
    );
  const coverage = data.coverage || {};
  if (
    end !== null &&
    (number(coverage.first) === null ||
      end - coverage.first < 30 * 24 * HOUR ||
      coverage.first > end)
  )
    limitations.push(
      "Retained token history covers less than 30 days or its start is unknown; missing executions cannot be interpreted as no trading.",
    );
  if (
    end !== null &&
    (number(coverage.last) === null ||
      coverage.last > end ||
      end - coverage.last > HOUR)
  )
    limitations.push(
      "The latest retained execution is over an hour old or its timestamp is unknown. Collection freshness must be checked separately from trading inactivity.",
    );
  if (data.marketStale || data.priceStale || data.priceError)
    limitations.push(
      "Market or candle data is stale or unavailable; price-response interpretation is withheld.",
    );
  if (
    number(coverage.freshTokenAnalyses) !== null &&
    coverage.freshTokenAnalyses < rawRows.length
  )
    limitations.push(
      "Some token performance analyses are older than the freshness threshold; historical quality and live position freshness differ.",
    );
  if (nonnegative(positioning.unavailable) > 0)
    limitations.push(
      `${positioning.unavailable} position snapshot(s) unavailable; unavailable does not mean flat.`,
    );
  if (!qualifiedCount)
    limitations.push(
      "No wallet currently meets the token-history qualification rules. Observed activity must not be labeled validated smart-money conviction.",
    );
  return {
    version: "decision-brief-v1",
    coin: typeof data.coin === "string" ? data.coin : null,
    headline,
    summary,
    tone,
    window,
    metrics,
    observations,
    limitations,
    watchFor: [...new Set(watchFor)],
  };
}
