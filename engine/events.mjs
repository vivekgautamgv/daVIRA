import { XMLParser } from "fast-xml-parser";
import { resource } from "./upstream.mjs";
const BLS = "https://www.bls.gov/schedule/news_release/bls.ics",
  FED = "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm";
export function easternTime(value) {
  const a = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  if (!a) return null;
  const base = Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4], +a[5], +a[6]);
  if (value.endsWith("Z")) return base;
  let guess = base + 5 * 3600000;
  for (let i = 0; i < 2; i++) {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(guess)
        .map((x) => [x.type, x.value]),
    );
    guess +=
      base -
      Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  }
  return guess;
}
export function parseIcs(raw) {
  return raw
    .replace(/\r?\n[ \t]/g, "")
    .split("BEGIN:VEVENT")
    .slice(1)
    .flatMap((block) => {
      const title = block
          .match(/(?:^|\n)SUMMARY:(.*)/)?.[1]
          ?.trim()
          .replace(/\\,/g, ","),
        dt = block.match(/(?:^|\n)DTSTART[^:]*:(.*)/)?.[1]?.trim();
      const time = dt ? easternTime(dt) : null;
      if (!title || !time) return [];
      return [
        {
          id: `bls:${time}:${title}`,
          title,
          time,
          source: "BLS",
          url: "https://www.bls.gov/schedule/news_release/",
          impact:
            /Consumer Price Index|Employment Situation|Producer Price Index/i.test(
              title,
            )
              ? "Major"
              : "Standard",
          type: /Consumer Price Index/i.test(title)
            ? "Inflation"
            : /Employment|Job Openings/i.test(title)
              ? "Labour"
              : "Economic data",
          timing: "Scheduled release",
        },
      ];
    });
}
export async function events() {
  const result = await resource("events", 6 * 3600000, async () => {
    const r = await fetch(BLS, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw Error(`BLS returned ${r.status}`);
    const rows = parseIcs(await r.text());
    if (!rows.length) throw Error("No calendar entries returned.");
    return rows;
  });
  const dates = [
    "20260128",
    "20260318",
    "20260429",
    "20260617",
    "20260729",
    "20260916",
    "20261028",
    "20261209",
  ];
  const fomc = dates.map((d) => ({
    id: `fomc:${d}`,
    title: "FOMC meeting concludes",
    time: easternTime(`${d}T140000`),
    source: "Federal Reserve",
    url: FED,
    impact: "Major",
    type: "Monetary policy",
    timing:
      "Meeting date verified from the 2026 calendar; 2 pm ET is the customary statement time. Confirm on source.",
  }));
  return {
    ...result,
    data: [...result.data, ...fomc]
      .filter((e) => e.time > Date.now() - 7 * 86400000)
      .sort((a, b) => a.time - b.time),
    calendarNote:
      "FOMC dates cover 2026. BLS feed refreshes every 6 hours. Consensus and actual releases are not provided.",
  };
}
const feeds = [
  {
    name: "Federal Reserve",
    url: "https://www.federalreserve.gov/feeds/press_all.xml",
  },
  { name: "Ethereum Foundation", url: "https://blog.ethereum.org/feed.xml" },
];
export async function news() {
  const results = await Promise.allSettled(
    feeds.map((f) =>
      resource(`news:${f.name}`, 900000, async () => {
        const r = await fetch(f.url, { signal: AbortSignal.timeout(15000) });
        if (!r.ok) throw Error(`${f.name} returned ${r.status}`);
        const doc = new XMLParser({
            ignoreAttributes: false,
            processEntities: false,
          }).parse(await r.text()),
          items = doc.rss?.channel?.item || doc.feed?.entry || [];
        return (Array.isArray(items) ? items : [items])
          .slice(0, 20)
          .map((i) => ({
            title:
              typeof i.title === "object" ? i.title["#text"] : String(i.title),
            url:
              typeof i.link === "string"
                ? i.link
                : (Array.isArray(i.link) ? i.link[0] : i.link)?.["@_href"],
            time: Date.parse(i.pubDate || i.published || i.updated) || null,
            source: f.name,
          }))
          .filter((i) => /^https?:\/\//.test(i.url));
      }),
    ),
  );
  return {
    data: results
      .flatMap((r) => (r.status === "fulfilled" ? r.value.data : []))
      .sort((a, b) => (b.time || 0) - (a.time || 0)),
    sources: results.map((r, i) => ({
      name: feeds[i].name,
      ok: r.status === "fulfilled",
      stale: r.status === "fulfilled" ? r.value.stale : false,
      error: r.status === "rejected" ? r.reason.message : null,
    })),
  };
}
