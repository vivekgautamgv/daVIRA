import { Suspense } from "react";
import TradeSetups from "../trade-setups";
export default function SetupsPage() {
  return (
    <Suspense
      fallback={<div className="loading-line">Loading trade research…</div>}
    >
      <TradeSetups />
    </Suspense>
  );
}
