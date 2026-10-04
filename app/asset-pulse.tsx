"use client";
import { useState } from "react";
import Link from "next/link";
import { useData, money } from "./terminal";
import { DataState } from "./ui";
export default function AssetPulse() {
  const r = useData("flows?window=24h&cohort=all", 60000),
    [selected, setSelected] = useState("");
  const groups = new Map<string, any>();
  for (const c of r.data?.data || []) {
    const k = c.class || "Unclassified",
      g = groups.get(k) || {
        name: k,
        inflow: 0,
        outflow: 0,
        buy: 0,
        coins: [],
      };
    g.inflow += c.inflow;
    g.outflow += c.outflow;
    g.buy += c.directional;
    g.coins.push(c);
    groups.set(k, g);
  }
  const rows = Array.from(groups.values()).sort(
      (a, b) => b.inflow + b.outflow - a.inflow - a.outflow,
    ),
    group = groups.get(selected);
  return (
    <section className="panel research-card">
      <span className="eyebrow">ASSET-CLASS PULSE / 24H</span>
      <h2>Where is the sampled capital positioning?</h2>
      <p>
        Group observed position activity across crypto, equities, indices and
        commodities. Select a class to inspect its coins.
      </p>
      <DataState resource={r} />
      <div className="pulse-grid">
        {rows.map((g) => (
          <button
            className={`panel pulse-card ${selected === g.name ? "active" : ""}`}
            key={g.name}
            onClick={() => setSelected(selected === g.name ? "" : g.name)}
          >
            <strong>{g.name}</strong>
            <span>{g.coins.length} instruments</span>
            <b className={g.buy >= 0 ? "positive" : "negative"}>
              {money(g.buy)}
            </b>
            <small>Net buy − sell executions</small>
            <small>
              {money(g.inflow)} opened / {money(g.outflow)} closed
            </small>
          </button>
        ))}
      </div>
      {group && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{group.name} instrument</th>
                <th>Opened / closed</th>
                <th>Net buying</th>
                <th>Observed behavior</th>
              </tr>
            </thead>
            <tbody>
              {group.coins.slice(0, 20).map((c: any) => (
                <tr key={c.coin}>
                  <td>
                    <Link
                      className="text-link"
                      href={`/coins?coin=${encodeURIComponent(c.coin)}`}
                    >
                      {c.coin} ↗
                    </Link>
                  </td>
                  <td>
                    {money(c.inflow)} / {money(c.outflow)}
                  </td>
                  <td>{money(c.directional)}</td>
                  <td>{c.brief?.behavior || "Unclassified"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="brief-caption">
        Dollar totals are size-weighted and may be dominated by a few
        instruments. They are not asset-class returns, deposit flows or a
        market-wide sentiment index. Builder classifications refer to derivative
        exposure.
      </p>
    </section>
  );
}
