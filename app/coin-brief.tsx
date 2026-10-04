"use client";
import { useData } from "./terminal";
import { DataState } from "./ui";
import DecisionPanel from "./decision-panel";
import ProbabilityPanel from "./probability-panel";

export default function CoinBrief({
  coin,
  window,
  cohort,
}: {
  coin: string;
  window: string;
  cohort: string;
}) {
  const r = useData(
    `token-desk?coin=${encodeURIComponent(coin)}&window=${window}&cohort=${cohort}`,
    30000,
  );
  return (
    <>
      <DataState resource={r} />
      {r.data?.coin === coin &&
        r.data?.window === window &&
        r.data?.cohort === cohort && (
          <>
            <DecisionPanel
              data={r.data.decision}
              sourceAt={r.data.updatedAt}
              compact
            />
            <ProbabilityPanel data={r.data.probability} compact />
          </>
        )}
    </>
  );
}
