"use client";
import VenueBalances from "./venue-balances";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Bookmark,
  Plus,
  Search,
  Trash2,
  ExternalLink,
  Download,
} from "lucide-react";
import Terminal, {
  useData,
  Heading,
  Stat,
  Empty,
  Chart,
  money,
  num,
  price,
  short,
  pct,
} from "./terminal";
import { mutate, useAction, Feedback, DataState, time, download } from "./ui";
import WalletResearch from "./wallet-research";

export function Discover() {
  const r = useData("leaderboard", 3600000),
    watch = useData("watchlist"),
    action = useAction();
  const [q, setQ] = useState(""),
    [sort, setSort] = useState("pnl30d"),
    [equity, setEquity] = useState("10000"),
    [page, setPage] = useState(0);
  const rows = useMemo(
    () =>
      (r.data?.data || [])
        .filter(
          (w: any) =>
            `${w.address} ${w.name || ""}`
              .toLowerCase()
              .includes(q.toLowerCase()) && w.equity >= Number(equity),
        )
        .sort((a: any, b: any) => b[sort] - a[sort]),
    [r.data, q, sort, equity],
  );
  return (
    <Terminal view="discover">
      <Heading
        eyebrow="WALLET DISCOVERY"
        title="Find the traders worth watching"
        text="A source-reported leaderboard. Investigate the record behind the return."
      />
      <div className="notice">
        This is a ranked sample of up to 2,000 public leaderboard wallets. PnL
        rank is not a measure of skill, risk or future performance.
      </div>
      <DataState resource={r} />
      <Feedback action={action} />
      <section className="panel">
        <div className="toolbar">
          <label className="search">
            <Search size={17} />
            <input
              aria-label="Search wallets"
              placeholder="Search name or 0x address"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <label>
            Rank by
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(0);
              }}
            >
              <option value="pnl30d">30D PnL</option>
              <option value="pnl7d">7D PnL</option>
              <option value="roi30d">30D ROI</option>
              <option value="equity">Account equity</option>
            </select>
          </label>
          <label>
            Minimum equity
            <select
              value={equity}
              onChange={(e) => {
                setEquity(e.target.value);
                setPage(0);
              }}
            >
              <option value="0">Any</option>
              <option value="10000">$10,000</option>
              <option value="100000">$100,000</option>
              <option value="1000000">$1,000,000</option>
            </select>
          </label>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Trader / wallet</th>
                <th>Equity</th>
                <th>7D PnL</th>
                <th>30D PnL</th>
                <th>30D ROI</th>
                <th>Watch</th>
              </tr>
            </thead>
            <tbody>
              {rows
                .slice(page * 25, page * 25 + 25)
                .map((w: any, i: number) => {
                  const tracked = watch.data?.data.some(
                    (x: any) => x.address === w.address,
                  );
                  return (
                    <tr key={w.address}>
                      <td className="muted">{page * 25 + i + 1}</td>
                      <td>
                        <Link
                          className="asset-cell"
                          href={`/wallet/${w.address}`}
                        >
                          <span className="wallet-ident">
                            {(w.name || w.address.slice(2))[0]?.toUpperCase()}
                          </span>
                          <div>
                            <b>{w.name || short(w.address)}</b>
                            <small className="mono">{short(w.address)}</small>
                          </div>
                        </Link>
                      </td>
                      <td>{money(w.equity)}</td>
                      <td className={w.pnl7d >= 0 ? "positive" : "negative"}>
                        {money(w.pnl7d)}
                      </td>
                      <td className={w.pnl30d >= 0 ? "positive" : "negative"}>
                        {money(w.pnl30d)}
                      </td>
                      <td className={w.roi30d >= 0 ? "positive" : "negative"}>
                        {pct(w.roi30d)}
                      </td>
                      <td>
                        <button
                          disabled={action.busy || tracked}
                          className={`icon-button ${tracked ? "positive" : ""}`}
                          aria-label={
                            tracked
                              ? "Wallet tracked"
                              : `Track ${short(w.address)}`
                          }
                          onClick={() =>
                            action.run(async () => {
                              await mutate("watchlist", {
                                address: w.address,
                                label: w.name || "",
                              });
                              await watch.reload();
                            }, "Wallet added to your watchlist")
                          }
                        >
                          <Bookmark
                            size={17}
                            fill={tracked ? "currentColor" : "none"}
                          />
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        {!r.loading && !rows.length && (
          <Empty title="No wallets match">
            Try a lower equity threshold or open an address directly from
            Watchlist.
          </Empty>
        )}
        <div className="panel-foot">
          <span>
            {num(rows.length)} matching wallets · Updated{" "}
            {time(r.data?.updatedAt)}
          </span>
          <div className="inline">
            <button
              className="button"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span>{page + 1}</span>
            <button
              className="button"
              disabled={(page + 1) * 25 >= rows.length}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </Terminal>
  );
}

export function Watchlist() {
  const r = useData("watchlist"),
    action = useAction(),
    [address, setAddress] = useState(""),
    [label, setLabel] = useState("");
  const rows = r.data?.data || [];
  return (
    <Terminal view="watchlist">
      <Heading
        eyebrow="YOUR OBSERVATION LIST"
        title="Watchlist"
        text="Follow up to 20 wallets. Position changes are checked about once a minute."
      />
      <DataState resource={r} />
      <Feedback action={action} />
      <form
        className="panel form-row"
        onSubmit={(e) => {
          e.preventDefault();
          action.run(async () => {
            await mutate("watchlist", { address, label });
            setAddress("");
            setLabel("");
            await r.reload();
          }, "Wallet saved.");
        }}
      >
        <label className="grow">
          Wallet address
          <input
            required
            pattern="0x[0-9a-fA-F]{40}"
            placeholder="0x…"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </label>
        <label>
          Label
          <input
            maxLength={80}
            placeholder="Optional name"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </label>
        <button className="button primary" disabled={action.busy}>
          <Plus size={16} />
          Save wallet
        </button>
      </form>
      <section className="panel">
        <div className="panel-head">
          <h2>
            Followed wallets <span className="muted">{rows.length} / 20</span>
          </h2>
          <button
            className="text-link"
            onClick={() =>
              download(
                "davira-watchlist.json",
                JSON.stringify(rows, null, 2),
                "application/json",
              )
            }
          >
            <Download size={16} />
            Export
          </button>
        </div>
        {rows.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Wallet</th>
                  <th>Equity</th>
                  <th>Open positions</th>
                  <th>Last snapshot</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((w: any) => (
                  <tr key={w.address}>
                    <td>
                      <Link
                        className="asset-cell"
                        href={`/wallet/${w.address}`}
                      >
                        <span className="wallet-ident">
                          {(w.label || "W")[0]}
                        </span>
                        <div>
                          <b>{w.label || short(w.address)}</b>
                          <small className="mono">{short(w.address)}</small>
                        </div>
                      </Link>
                    </td>
                    <td>{w.account ? money(w.account.equity) : "Pending"}</td>
                    <td>{w.account?.positions.length ?? "—"}</td>
                    <td>
                      {time(w.updatedAt)}
                      {w.updatedAt && Date.now() - w.updatedAt > 180000 && (
                        <small className="negative"> · stale</small>
                      )}
                    </td>
                    <td>
                      <div className="inline">
                        <button
                          className="icon-button"
                          aria-label={`Edit label for ${short(w.address)}`}
                          onClick={() => {
                            setAddress(w.address);
                            setLabel(w.label);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="icon-button"
                          disabled={action.busy}
                          aria-label={`Remove ${short(w.address)}`}
                          onClick={() =>
                            action.run(async () => {
                              await mutate(
                                `watchlist/${w.address}`,
                                {},
                                "DELETE",
                              );
                              await r.reload();
                            }, "Wallet removed")
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="Build your research cohort">
            Add a wallet address above or save a trader from Discover wallets.
          </Empty>
        )}
      </section>
      <div className="subtle-note">
        Saving an existing address updates its label. Removing it stops personal
        tracking; the wallet may remain in the automatic research sample.
        Previous observations stay in your database.
      </div>
    </Terminal>
  );
}

export function WalletProfile({ address }: { address: string }) {
  const r = useData(`wallet/${address}`, 60000),
    watch = useData("watchlist"),
    action = useAction(),
    d = r.data;
  const tracked = watch.data?.data.some(
    (w: any) => w.address === address.toLowerCase(),
  );
  return (
    <Terminal view="discover">
      <Heading
        eyebrow="WALLET PROFILE"
        title={short(address)}
        text="Inspect exposure, recent execution history and source-reported performance."
      >
        <div className="inline">
          <a
            className="button"
            href={`https://app.hyperliquid.xyz/explorer/address/${address}`}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={15} />
            Explorer
          </a>
          <button
            disabled={action.busy || tracked}
            className="button primary"
            onClick={() =>
              action.run(async () => {
                await mutate("watchlist", { address });
                await watch.reload();
              }, "Wallet tracked")
            }
          >
            <Bookmark size={15} />
            {tracked ? "Following" : "Follow wallet"}
          </button>
        </div>
      </Heading>
      <div className="address mono">{address}</div>
      <VenueBalances address={address} />
      <DataState resource={r} />
      <Feedback action={action} />
      {d && (
        <>
          <div className="stats">
            <Stat
              label="Main DEX equity"
              value={money(d.equity, 2)}
              detail="Main DEX margin account"
            />
            <Stat
              label="Main DEX margin in use"
              value={money(d.marginUsed, 2)}
              detail={`${d.equity ? ((d.marginUsed / d.equity) * 100).toFixed(1) : 0}% of account equity`}
            />
            <Stat
              label="Realized PnL less USDC fees"
              value={
                d.coverage.fills === null
                  ? "Unavailable"
                  : money(d.summary.netBeforeFunding, 2)
              }
              detail={`${d.summary.count} main DEX fills · excludes funding`}
            />
            <Stat
              label="Unrealized PnL"
              value={money(
                d.positions.reduce((a: number, p: any) => a + p.unrealized, 0),
                2,
              )}
              detail="Current main DEX positions"
            />
          </div>
          <div className="notice">
            {d.coverage.scope} {d.coverage.errors.join(" · ")}
          </div>
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Open positions</h2>
                <p>Snapshot {time(d.updatedAt)}</p>
              </div>
              <span className="pill">MAIN DEX</span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Market</th>
                    <th>Direction</th>
                    <th>Size / exposure</th>
                    <th>Entry</th>
                    <th>Unrealized</th>
                    <th>Leverage</th>
                    <th>Liquidation</th>
                    <th>Simulate</th>
                  </tr>
                </thead>
                <tbody>
                  {d.positions.map((p: any) => (
                    <tr key={p.coin}>
                      <td>
                        <Link href={`/coins?coin=${p.coin}`}>{p.coin}</Link>
                      </td>
                      <td className={p.size > 0 ? "positive" : "negative"}>
                        {p.size > 0 ? "Long" : "Short"}
                      </td>
                      <td>
                        {num(Math.abs(p.size))}
                        <small className="cell-sub">{money(p.value)}</small>
                      </td>
                      <td>{price(p.entry)}</td>
                      <td
                        className={p.unrealized >= 0 ? "positive" : "negative"}
                      >
                        {money(p.unrealized, 2)}
                      </td>
                      <td>{p.leverage}×</td>
                      <td>{p.liquidation ? price(p.liquidation) : "—"}</td>
                      <td>
                        <Link
                          className="text-link"
                          href={`/paper?coin=${encodeURIComponent(p.coin)}&side=${p.size > 0 ? "long" : "short"}&source=${address}`}
                        >
                          Paper copy <ArrowUpRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!d.positions.length && (
                <Empty title="No open main DEX positions">
                  Spot balances and builder DEX positions are outside this
                  snapshot.
                </Empty>
              )}
            </div>
          </section>
          <div className="two-columns">
            <section className="panel">
              <div className="panel-head">
                <h2>Source-reported PnL history</h2>
                <span className="pill">MONTH</span>
              </div>
              {d.portfolio?.pnlHistory?.length ? (
                <Chart
                  data={d.portfolio.pnlHistory.map(([t, c]: any) => ({
                    t,
                    c: Number(c),
                  }))}
                />
              ) : (
                <Empty title="No portfolio history returned" />
              )}
              <div className="panel-foot">
                Hyperliquid portfolio endpoint · separate from the fill sample
              </div>
            </section>
            <section className="panel research-card">
              <h2>Execution coverage</h2>
              <dl className="facts">
                <div>
                  <dt>Returned fills, including spot</dt>
                  <dd>{d.coverage.fills ?? "Unavailable"} / 2,000 max</dd>
                </div>
                <div>
                  <dt>Perpetual sample starts</dt>
                  <dd>{time(d.coverage.firstFill)}</dd>
                </div>
                <div>
                  <dt>Realized PnL</dt>
                  <dd>
                    {d.coverage.fills === null
                      ? "Unavailable"
                      : money(d.summary.realized, 2)}
                  </dd>
                </div>
                <div>
                  <dt>USDC fees / rebates</dt>
                  <dd>
                    {d.coverage.fills === null
                      ? "Unavailable"
                      : money(d.summary.fees, 2)}
                  </dd>
                </div>
                <div>
                  <dt>Funding returned, 30D query</dt>
                  <dd>
                    {d.funding30d === null
                      ? "Unavailable"
                      : money(d.funding30d, 2)}
                  </dd>
                </div>
              </dl>
              <p className="muted">
                Funding has a different coverage window and is not combined with
                the fill sample. Fill count is not trade count. Win rate and
                risk scores need reconstructed position histories.
              </p>
            </section>
          </div>
          <WalletResearch address={address} />
          <section className="panel">
            <div className="panel-head">
              <h2>Recent executions</h2>
              <span className="muted">
                Latest 100 returned fills · fees as reported
              </span>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Market</th>
                    <th>Action</th>
                    <th>Price</th>
                    <th>Size</th>
                    <th>Closed PnL</th>
                    <th>Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {d.fills.slice(0, 100).map((f: any) => (
                    <tr key={`${f.coin}:${f.tid}:${f.time}`}>
                      <td>{time(f.time)}</td>
                      <td>{f.coin}</td>
                      <td>{f.dir}</td>
                      <td>{price(Number(f.px))}</td>
                      <td>{num(Number(f.sz))}</td>
                      <td
                        className={
                          Number(f.closedPnl) >= 0 ? "positive" : "negative"
                        }
                      >
                        {money(Number(f.closedPnl), 2)}
                      </td>
                      <td>
                        {Number(f.fee).toFixed(4)} {f.feeToken || "USDC"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!d.fills.length && <Empty title="No fills returned" />}
            </div>
          </section>
        </>
      )}
    </Terminal>
  );
}
