# Historical probabilities

The Summary and Token Lens show conditional historical outcome frequencies for
the selected coin, with a six-hour input and either a six-hour or 24-hour outcome.
All input, trend context and outcome candles must fall within the last **six UTC
calendar months**. Subtracting months clamps the day where necessary; this is not
a fixed 180-day lookback.

## Two distinct evidence models

- **Wallet + price:** compares execution buying share, position expansion and
  price momentum. Each six-hour input needs at least three observed wallets,
  ten fills and activity in four hours, plus continuous hourly candles.
- **Price only:** compares six-hour momentum, hourly true-range volatility and
  distance from the 20-hour close average. It never implies wallet confirmation.

Matching rules are fixed in `engine/probability-math.mjs`. Both models need at
least 30 matched reference windows across 14 UTC dates to publish percentages.
They do not loosen their rules to produce a directional answer.
When current conditions have too few matches, a separately labeled unconditioned
base rate remains visible if the historical reference set itself passes these
sample gates. It is context for comparison, not a prediction for today.

The panel shows up/down/flat frequencies (flat is a closing return within
±0.1%), Wilson 95% intervals, baseline rates, median and 10th–90th percentile
returns, and the frequency of closing moves of at least ±1%, ±2% and ±5%.
Magnitude probabilities refer to the return at the end of the selected horizon,
not to touching a price level during that period. Returns exclude execution
costs, funding and slippage.

## Dated evidence and validation

Reference blocks are non-overlapping within each horizon: six-hour inputs plus
six-hour outcomes use 12-hour spacing; 24-hour outcomes use 30-hour spacing. The
two horizon estimates are related, not independent confirmations. Every reference
outcome finishes before the current input starts. Entry is the completed input's
last candle close; exit is the completed outcome's last close.

The dated table and CSV expose every matched input start, input end, outcome end,
price, return and matching feature. UTC timestamps are exact in CSV. Partial
candles, discontinuous price sequences and future records are rejected. Missing
latest completed candles withhold current percentages. A refresh failure does
not invalidate already archived final candles: all latest 20 completed hours
must be present, and their exact end time and the source warning remain visible.
Readiness is checked again against the current hour on every request, so the
next hourly boundary requires the newly completed candle.

A retrospective walk-forward check evaluates the up event against an expanding
earlier-reference base rate during the last 60 days. Every evaluated estimate
uses only matured earlier references; wallet observations must also have been
collected before the relevant historical decision time. It needs 30 evaluation
windows across 14 dates before publishing Brier error and relative skill. A lower
Brier error is better; negative skill means worse performance than the baseline.
This is a historical diagnostic, not independent live validation. Matching rules
were specified during development, and this check does not measure trading PnL.

## Source and archive

Initial selected-coin downloads request six months of public Hyperliquid hourly
candles. Later refreshes request the last 48 hours and merge completed candles
into SQLite. Requests use the existing shared budget and cache. Only selected
coins are requested; the feature does not fetch every listed coin on page load.
The five-minute response cache avoids repeated full-history requests and SQLite
writes on cache hits.

Observed fills are archived as per-wallet, per-coin hourly flow aggregates before
the raw 30-day/250,000-fill cleanup. Raw insertion, aggregate updates and replay
identifiers share a transaction. Replay identifiers prevent double counting when
a raw fill is evicted and subsequently downloaded again. Archive rows and IDs
expire at the six-month cutoff. Startup bootstraps currently retained real fills
once and records the bootstrap timestamp.

The free `userFillsByTime` API exposes at most 2,000 fills per response and the
latest 10,000 fills. Six-month requests can recover older activity for quieter
wallets, but cannot guarantee six months of activity for busy wallets. Page and
timestamp-boundary limits stay visible. Exhausting the source is not proof of
complete history. The official historical node archives are a separate future
ingestion option and may incur transfer costs; they are not enabled here.

Sources: [Hyperliquid Info endpoint](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint)
and [historical data](https://hyperliquid.gitbook.io/hyperliquid-docs/historical-data).

## Interpretation

These percentages estimate what happened in comparable retained observations.
They are not calibrated probabilities of the next move. The panel always
separates the requested research period from actual observed hours and dates.
The current wallet cohort has selection and survivorship bias; historical
observations do not establish that those wallets were known or qualified at that
time. Missing execution hours are not treated as verified zero activity. News,
other venues and regime changes can invalidate historical comparisons, and
temporal dependence can make uncertainty larger than the displayed binomial
interval. No probability is converted into an automatic order.

Verification covers month-end cutoffs, future/old/malformed records, stale data,
non-overlapping outcomes, absence of lookahead in validation, exact dated
evidence reconciliation, return thresholds, atomic rollback, replay deduplication
and retention after raw deletion. Tests use isolated databases and do not seed
synthetic trading history into the running app.
