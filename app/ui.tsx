"use client";
import { useState } from "react";
import { useData } from "./terminal";
export async function mutate(
  path: string,
  body: unknown = {},
  method = "POST",
) {
  const r = await fetch(`/api/engine/${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok) throw Error(d.error || "Request failed");
  return d;
}
export function useAction() {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [failed, setFailed] = useState(false);
  const run = async (fn: () => Promise<any>, success = "Saved") => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await fn();
      setFailed(false);
      setMessage(success);
    } catch (e: any) {
      setFailed(true);
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, message, failed, run };
}
export function Feedback({ action }: { action: ReturnType<typeof useAction> }) {
  return action.message ? (
    <div
      role="status"
      className={`notice ${action.failed ? "error" : "success"}`}
    >
      {action.message}
    </div>
  ) : null;
}
export function DataState({
  resource,
}: {
  resource: ReturnType<typeof useData>;
}) {
  return resource.error ? (
    <div role="alert" className="notice error">
      {resource.error}
      <button onClick={() => resource.reload()}>Retry</button>
    </div>
  ) : resource.loading ? (
    <div role="status" className="loading-line">
      Connecting to the data source…
    </div>
  ) : resource.data?.stale ? (
    <div className="notice">
      Showing the last successful snapshot. The source is temporarily
      unavailable.
    </div>
  ) : null;
}
export const time = (n: number | null) =>
  n
    ? new Date(n).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Not observed yet";
export function download(name: string, data: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([data], { type })),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export function CoinSelect({
  markets,
  value,
  onChange,
  id = "coin",
}: {
  markets: any[];
  value: string;
  onChange: (s: string) => void;
  id?: string;
}) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      {markets.map((m) => (
        <option key={m.coin} value={m.coin}>
          {m.coin}
        </option>
      ))}
    </select>
  );
}
