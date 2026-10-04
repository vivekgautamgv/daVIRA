const equities = new Set(
  "AAPL AMZN GOOGL GOOG META MSFT NVDA TSLA AMD INTC COIN MSTR HOOD PLTR ORCL NFLX AVGO MU TSM CRCL BABA SHOP UBER SPOT RDDT GME LLY JPM V".split(
    " ",
  ),
);
const indices = new Set(
  "XYZ100 SP500 SPX US500 USA500 US100 NAS100 NASDAQ NDX DJ30 DOW UK100 DE40 EU50 JP225".split(
    " ",
  ),
);
const commodities = new Set(
  "GOLD SILVER XAU XAG PAXG XAUT COPPER PLATINUM PALLADIUM OIL CL WTI BRENT NATGAS NG URANIUM".split(
    " ",
  ),
);

// Shared by indexed execution analytics and the market picker. Unknown builder
// instruments remain unclassified instead of being labelled as crypto.
export function instrumentClass(coin) {
  const symbol = coin.split(":").at(-1).toUpperCase();
  if (commodities.has(symbol)) return "Commodity";
  if (coin.includes(":") && equities.has(symbol)) return "Equity";
  if (coin.includes(":") && indices.has(symbol)) return "Index";
  if (
    coin.includes(":") &&
    ["EUR", "JPY", "GBP", "EURUSD", "USDJPY", "GBPUSD"].includes(symbol)
  )
    return "FX";
  if (["ONDO", "OM"].includes(symbol)) return "RWA token";
  return coin.includes(":") ? "Builder / unclassified" : "Crypto";
}
