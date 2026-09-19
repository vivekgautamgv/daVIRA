# Positioning Compass v1

The market summary combines existing indexed executions with token-specific reconstructed performance. It adds no upstream calls and no paid service. Available windows: 6 and 24 hours. Neither score is a return probability.

## Direction

`50 + 50 × (0.45 × opening balance + 0.35 × specialist vote + 0.20 × execution balance)`

- Opening balance = (new long notional − new short notional) / total opening notional.
- Specialist vote = quality-weighted mean of signed net position-quantity change. Flat round trips have no directional vote. Each wallet has bounded weight, independent of notional size.
- Execution balance = (buy notional − sell notional) / total execution notional. This intentionally includes closures at a lower weight.
- Specialists need a fresh analysis (one hour), token score ≥60, positive token PnL, at least 10 complete episodes and three closing days. Broad wallet performance cannot substitute for a token record.

## Evidence and vetoes

Evidence /100 = 35% observed-wallet breadth (saturates at 10) + 30% qualified specialist count (saturates at five) + 20% inverse largest-wallet activity share + 15% fresh-analysis share.

Wait overrides the directional score if there are fewer than five observed wallets, fewer than three specialists, a largest-wallet share over 60%, less than 70% fresh analyses, no execution in two hours, less than $10K new opening notional, or opposing opening/specialist components both stronger than 20%.

Passing coins: long bias at ≥65, short bias at ≤35, otherwise hold/neutral. “Hold” means no new directional edge and reassessment of existing exposure, not an instruction to keep losses. No automatic trade is submitted.

## Aggregate market read

Coins are counted equally. Fewer than three directional coins produces “Wait for broader evidence.” Otherwise, a greater than 2:1 long/short count produces the matching directional headline; other cases are mixed. The coverage includes crypto and covered builder instruments, and therefore is not a broad crypto-market index.

## Limits and validation

Heuristic design, not a demonstrated predictive edge or a claim that competitors offer no similar model. Current wallet selection and truncated fills create selection bias. Wallets may have shared ownership, hidden hedges or coordinated activity. Funding, prices, other venues and incomplete account history can change the interpretation.

Tests cover symmetric direction, concentration vetoes, short-covering-only flows, missing token history, stale analysis, old executions, disagreement, neutral balance and empty samples. Before marketing predictive performance, freeze model versions and collect forward timestamped snapshots; evaluate fees, slippage, coverage, false positives and out-of-sample outcomes. Do not retroactively recompute past signals with future wallet quality.

Dark/light preference is stored only in the user's browser under `davira-theme` and applies to the public landing page and terminal.
