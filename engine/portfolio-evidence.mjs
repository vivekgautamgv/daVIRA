// Source-reported portfolio curves are independent of the truncated execution sample.
export function portfolioEvidence(result, now = Date.now()) {
  const periods = Object.fromEntries(
    Array.isArray(result?.data) ? result.data : [],
  );
  const read = (key) => {
    const raw = periods[key]?.pnlHistory;
    if (!Array.isArray(raw) || raw.length < 2) return null;
    if (
      raw.some(
        (p) =>
          !Array.isArray(p) ||
          p[1] === null ||
          p[1] === "" ||
          !Number.isFinite(Number(p[0])) ||
          !Number.isFinite(Number(p[1])),
      )
    )
      return null;
    const points = [...raw].sort((a, b) => Number(a[0]) - Number(b[0]));
    const first = points[0],
      last = points.at(-1);
    if (last[0] <= first[0] || last[0] > now + 60000) return null;
    return {
      pnl: Number(last[1]) - Number(first[1]),
      first: Number(first[0]),
      last: Number(last[0]),
      days: (last[0] - first[0]) / 86400000,
    };
  };
  return {
    month: read("perpMonth"),
    allTime: read("perpAllTime"),
    week: read("perpWeek"),
    updatedAt: result?.updatedAt ?? null,
    stale: !result || !!result.stale,
    source:
      "Hyperliquid portfolio / perpMonth & perpAllTime; source-reported coverage, not a verified lifetime trading ledger",
  };
}
