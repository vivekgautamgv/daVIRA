import { db, cached, watchlist } from "./db.mjs";
import { markets, candles } from "./upstream.mjs";
import { tape } from "./collector.mjs";
export async function report(coin) {
  const m = await markets(),
    asset = m.data.find((x) => x.coin === coin);
  if (!asset) throw Error("Research currently covers main DEX markets.");
  const c = await candles(coin),
    rows = c.data.map((x) => ({
      high: Number(x.h),
      low: Number(x.l),
      close: Number(x.c),
    })),
    high = Math.max(...rows.map((x) => x.high)),
    low = Math.min(...rows.map((x) => x.low));
  const cohort = watchlist().flatMap((w) => {
    const s = cached(`account:${w.address}`);
    if (!s || Date.now() - s.updatedAt > 300000) return [];
    return s.data.positions
      .filter((p) => p.coin === coin)
      .map((p) => ({
        address: w.address,
        label: w.label,
        size: p.size,
        value: p.value,
        updatedAt: s.updatedAt,
      }));
  });
  return {
    coin,
    asset,
    updatedAt: m.updatedAt,
    stale: m.stale || c.stale,
    range: { high, low },
    cohort,
    tape: tape(coin),
    sections: [
      {
        title: "Market structure",
        body: `${coin} is ${asset.change >= 0 ? "up" : "down"} ${Math.abs(asset.change).toFixed(2)}% over 24 hours. Observed seven-day candle range: $${low.toLocaleString()}–$${high.toLocaleString()}. These are historical extremes, not guaranteed support or resistance.`,
      },
      {
        title: "Positioning & carry",
        body: `Open interest is $${Math.round(asset.openInterest).toLocaleString()}. The current hourly funding rate is ${(asset.funding * 100).toFixed(4)}%. ${asset.funding >= 0 ? "Longs currently pay shorts." : "Shorts currently pay longs."} A high rate alone does not establish a profitable trade.`,
      },
      {
        title: "Scenario to watch",
        body: `A sustained move above the observed range high, supported by increased participation, would be a breakout candidate. A move below the range low would challenge that scenario. V1 does not assign a calibrated probability or price target.`,
      },
      {
        title: "Wallet evidence",
        body: `${cohort.length} tracked wallet(s) have a fresh observed ${coin} position. This is your selected cohort; it does not represent the whole market. Taker buys may close short positions, so tape imbalance is not new capital inflow.`,
      },
      {
        title: "Coverage & limitations",
        body: "This report is generated from structured source data without an LLM. No social sentiment, insider attribution or forecast certainty is inferred. Funding and prices can change quickly. Review source timestamps before using the research.",
      },
    ],
    sources: [
      {
        title: "Hyperliquid market",
        url: `https://app.hyperliquid.xyz/trade/${encodeURIComponent(coin)}`,
      },
      {
        title: "Hyperliquid API definitions",
        url: "https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint",
      },
    ],
  };
}
