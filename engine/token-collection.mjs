import { db, cached, saveCache, getSetting } from "./db.mjs";
import { account } from "./wallet.mjs";
import { info, resource } from "./upstream.mjs";
import { enqueueAnalysis, processAnalysisQueue } from "./screener.mjs";
import { requestBackfill } from "./fill-backfill.mjs";
const running = new Set();
export function tokenCandidates(coin) {
  return db
    .prepare("SELECT address,value FROM wallet_analysis")
    .all()
    .map((r) => {
      const a = JSON.parse(r.value),
        token = a.coins?.find((c) => c.coin === coin),
        position = a.positions?.find((p) => p.coin === coin);
      return {
        address: r.address,
        token,
        position,
        last: a.coverage?.last || 0,
      };
    })
    .filter((r) => r.token || r.position)
    .sort(
      (a, b) =>
        Number(!!b.position) - Number(!!a.position) ||
        (b.token?.completeTrades || 0) - (a.token?.completeTrades || 0) ||
        b.last - a.last,
    )
    .slice(0, 40);
}
export function collectionState(coin) {
  const job = cached(`token-refresh:${coin}`)?.data;
  if (!job) return null;
  const rows = job.addresses.map((address) => {
    const a = db
      .prepare("SELECT updated_at FROM wallet_analysis WHERE address=?")
      .get(address);
    const q = db
      .prepare("SELECT error FROM analysis_queue WHERE address=?")
      .get(address);
    const h = db
      .prepare(
        "SELECT status,pages,fills,error FROM fill_backfills WHERE address=?",
      )
      .get(address);
    return {
      address,
      refreshed: !!a && a.updated_at >= job.startedAt - 1800000,
      queued: !!q,
      error: q?.error || h?.error || null,
      history: h || null,
    };
  });
  return {
    ...job,
    refreshed: rows.filter((r) => r.refreshed).length,
    queued: rows.filter((r) => r.queued).length,
    historyPending: rows.filter((r) => r.history?.status === "queued").length,
    historyAdded: rows.reduce((s, r) => s + (r.history?.fills || 0), 0),
    errors: rows.filter((r) => r.error).length,
    paused: getSetting("paused", false),
  };
}
export function refreshToken(coin) {
  const old = collectionState(coin);
  if (old && Date.now() - old.startedAt < 300000) return old;
  const selected = tokenCandidates(coin),
    addresses = selected.slice(0, 20).map((r) => r.address);
  const job = {
    coin,
    startedAt: Date.now(),
    addresses,
    positionTarget: selected.length,
    positionChecked: 0,
    positionErrors: 0,
    status: "refreshing",
  };
  saveCache(`token-refresh:${coin}`, job);
  for (const address of addresses) {
    enqueueAnalysis(address, 15);
    requestBackfill(address);
  }
  void processAnalysisQueue();
  if (!running.has(coin)) {
    running.add(coin);
    void (async () => {
      // Snapshot requests are cheap; refresh this sampled book before deep history finishes.
      for (let i = 0; i < selected.length; i += 4) {
        const results = await Promise.allSettled(
          selected.slice(i, i + 4).map(async (r) => {
            const state = coin.includes(":")
              ? await resource(
                  `builder-account:${coin.split(":")[0]}:${r.address}`,
                  60000,
                  () =>
                    info(
                      {
                        type: "clearinghouseState",
                        user: r.address,
                        dex: coin.split(":")[0],
                      },
                      2,
                    ),
                )
              : await account(r.address);
            if (state.stale) throw Error("Snapshot source unavailable");
          }),
        );
        job.positionChecked += results.filter(
          (r) => r.status === "fulfilled",
        ).length;
        job.positionErrors += results.filter(
          (r) => r.status === "rejected",
        ).length;
        saveCache(`token-refresh:${coin}`, job);
      }
      job.status = "snapshots_checked";
      saveCache(`token-refresh:${coin}`, job);
    })().finally(() => running.delete(coin));
  }
  return collectionState(coin);
}
