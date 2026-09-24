import { D, uniqueFills } from "./analytics.mjs";
import {
  executionFlow,
  reconstructEpisodes,
  performance,
  instrumentClass,
} from "./screener-math.mjs";

export function walletPerformance(
  input,
  { days = 30, coin = "", now = Date.now() } = {},
) {
  if (![7, 30].includes(days)) throw Error("Choose 7 or 30 days.");
  const start = now - days * 86400000;
  const retained = uniqueFills(input).filter(
    (f) =>
      f.time >= now - 30 * 86400000 &&
      f.time <= now &&
      (!coin || f.coin === coin),
  );
  const valid = retained.filter(
    (f) =>
      executionFlow(f) &&
      Number.isFinite(Number(f.closedPnl)) &&
      Number.isFinite(Number(f.fee)) &&
      (!f.feeToken || f.feeToken === "USDC"),
  );
  const { closed, gaps } = reconstructEpisodes(valid);
  const episodes = closed.filter((e) => e.closedAt >= start),
    fills = valid.filter((f) => f.time >= start);
  const byCoin = new Map(),
    byDay = new Map();
  let gross = D(0),
    fees = D(0);
  for (const f of fills) {
    const pnl = D(f.closedPnl),
      fee = D(f.fee),
      net = pnl.minus(fee),
      volume = D(f.px).mul(f.sz);
    gross = gross.plus(pnl);
    fees = fees.plus(fee);
    const c = byCoin.get(f.coin) || {
      coin: f.coin,
      class: instrumentClass(f.coin),
      pnl: D(0),
      fees: D(0),
      volume: D(0),
      fills: 0,
      days: new Set(),
    };
    const day = new Date(f.time).toISOString().slice(0, 10);
    c.pnl = c.pnl.plus(net);
    c.fees = c.fees.plus(fee);
    c.volume = c.volume.plus(volume);
    c.fills++;
    c.days.add(day);
    byCoin.set(f.coin, c);
    const d = byDay.get(day) || { day, pnl: D(0), fees: D(0), fills: 0 };
    d.pnl = d.pnl.plus(net);
    d.fees = d.fees.plus(fee);
    d.fills++;
    byDay.set(day, d);
  }
  const coins = [...byCoin.values()]
    .map((c) => ({
      ...performance(episodes.filter((e) => e.coin === c.coin)),
      coin: c.coin,
      class: c.class,
      samplePnl: c.pnl.toNumber(),
      fees: c.fees.toNumber(),
      volume: c.volume.toNumber(),
      fills: c.fills,
      executionDays: c.days.size,
    }))
    .sort((a, b) => b.samplePnl - a.samplePnl);
  const daily = [];
  for (
    let t = Math.floor(start / 86400000) * 86400000;
    t <= now;
    t += 86400000
  ) {
    const day = new Date(t).toISOString().slice(0, 10),
      d = byDay.get(day);
    daily.push({
      day,
      pnl: d ? d.pnl.toNumber() : null,
      fees: d ? d.fees.toNumber() : null,
      fills: d?.fills || 0,
    });
  }
  const result = performance(episodes);
  return {
    days,
    coin,
    start,
    end: now,
    coins,
    daily,
    stats: {
      ...result,
      samplePnl: gross.minus(fees).toNumber(),
      grossRealized: gross.toNumber(),
      fees: fees.toNumber(),
      fills: fills.length,
    },
    sides: [
      {
        side: "Long",
        ...performance(episodes.filter((e) => e.direction === 1)),
      },
      {
        side: "Short",
        ...performance(episodes.filter((e) => e.direction === -1)),
      },
    ],
    coverage: {
      first: fills[0]?.time ?? null,
      last: fills.at(-1)?.time ?? null,
      executionDays: byDay.size,
      gaps,
      excludedFills:
        retained.filter((f) => f.time >= start).length - fills.length,
      historyReachesStart: valid.some((f) => f.time <= start),
    },
    note: "Observed USDC-fee perpetual fills; nominal quote PnL is treated as approximate USD. Funding and unrealized PnL excluded. Daily dashes mean no observed executions, not confirmed inactivity. Episode metrics use complete trades closing in this window, including their opening fees when retained before the window; they need not equal execution PnL.",
  };
}
