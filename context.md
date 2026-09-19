# daVIRA — current product context

daVIRA is a local-first Hyperliquid wallet research terminal. The main product is the heavy wallet screener and coin research workflow: observable wallet positions, a movement ledger, cohort exposure and concentration, and execution-derived coin intelligence. A separate landing page explains the product.

The $5/month subscription is a future hosted pricing target. There is no live billing or public multi-tenant service in V1.

## Principles

- Use actual source data. Never fabricate wallet scores, win rates, PnL, alerts, or market statistics.
- “Smart money” describes a research cohort, not a verified identity or proof of skill.
- Position changes are observations between snapshots; they are not individual fills or capital inflows.
- Separate observed facts, derived measurements and conditional interpretations.
- Show source timestamps, limits, stale states, collection gaps and selection bias.
- Keep the local setup free: Node 24, Next.js and SQLite, using public Hyperliquid APIs.
- UI: restrained research terminal, dense readable tables, tabular numbers, clear hierarchy, no decorative AI imagery.
- Real-money execution, automated copying, customer accounts and billing require later implementation and validation.

See README.md for the current implementation and docs/PRODUCT_AND_DEPLOYMENT_PLAN.md for the broader roadmap. That roadmap is not a claim that every future feature is implemented.

Current focus: explain why flows matter with opening/closing decomposition, one-wallet-one-vote agreement, largest-contributor sensitivity and baseline-gated activity pace. Large-wallet cohorts have explicit eligibility rules. Front-running detection is deferred. The animated landing page uses original design inspired by the provided Nansen reference, without proprietary assets or competitor exclusivity claims.
