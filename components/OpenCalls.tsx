"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Receipt } from "@/components/Receipt";
import { TrustTimeline } from "@/components/TrustTimeline";
import type { CallMemory, ResolutionMemory } from "@/lib/types";

type Point = { callId: string; score: number; delta: number; why: string };
type Resolved = { call: CallMemory; resolution: ResolutionMemory; blobId: string };

const isPrice = (m: CallMemory["metric"]) => m.kind === "price";
const bound = (m: CallMemory["metric"]) =>
  `${m.op === "gte" ? "≥" : "≤"} ${isPrice(m) ? "$" : ""}${m.target}${isPrice(m) ? "" : " SUI"}`;
const observed = (m: CallMemory["metric"], n: number) => (isPrice(m) ? `$${n.toFixed(4)}` : `${n.toFixed(2)} SUI`);

export function OpenCalls({ source, refreshKey }: { source: string; refreshKey: number }) {
  const [open, setOpen] = useState<CallMemory[]>([]);
  const [trust, setTrust] = useState<number | null>(null);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [series, setSeries] = useState<Point[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState<Resolved[]>([]);
  const [now, setNow] = useState(0);
  const inFlight = useRef(new Set<string>());

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/trust?source=${encodeURIComponent(source)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load calls");
      setOpen(data.open);
      setTrust(data.trust);
      setResolvedCount(data.resolved);
      setSeries(data.series);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [source]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  async function resolve(call: CallMemory) {
    if (inFlight.current.has(call.id)) return;
    inFlight.current.add(call.id);
    setBusyId(call.id);
    setError("");
    try {
      const res = await fetch("/api/resolve", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: call.source, callId: call.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not resolve");
      setDone((d) => [{ call, resolution: data.resolution, blobId: data.blobId }, ...d.filter((x) => x.call.id !== call.id)]);
      setOpen((o) => o.filter((c) => c.id !== call.id));
      setTrust(data.trust);
      setSeries(data.series);
      setResolvedCount((n) => n + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      inFlight.current.delete(call.id);
      setBusyId("");
    }
  }

  const shown = done.filter((d) => d.call.source === source);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="lbl">Source</p>
          <h2 className="font-display text-3xl">{source}</h2>
        </div>
        <button onClick={load} disabled={loading} className="btn-ghost disabled:opacity-50">
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && <p className="text-sm" style={{ color: "var(--miss)" }}>{error}</p>}

      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <div className="card p-6">
          <p className="lbl">Trust score</p>
          <p className="font-display text-6xl">{trust ?? "…"}</p>
          <p className="muted mt-2 text-sm">
            {resolvedCount} resolved · {open.length} open
          </p>
        </div>
        <div className="card p-6">
          <h3 className="mb-3 text-sm font-semibold">Trust timeline</h3>
          <TrustTimeline series={series} />
        </div>
      </div>

      <div className="card">
        <h3 className="px-6 pt-5 text-sm font-semibold">Open calls</h3>
        <ul className="mt-2 divide-y divide-[var(--line)]">
          {open.map((c) => {
            const due = now >= Date.parse(c.deadline);
            return (
              <li key={c.id} className="flex items-center justify-between gap-4 px-6 py-4 text-sm">
                <div>
                  <p className="font-medium">{c.claim}</p>
                  <p className="muted">
                    {Math.round(c.confidence * 100)}% sure · {due ? "Ready to check" : `Opens ${new Date(c.deadline).toLocaleString()}`}
                  </p>
                </div>
                <button onClick={() => resolve(c)} disabled={!due || busyId === c.id} className="btn shrink-0">
                  {busyId === c.id ? "Checking…" : "Resolve"}
                </button>
              </li>
            );
          })}
          {!open.length && !loading && <li className="muted px-6 py-4 text-sm">No open calls. Save one above.</li>}
        </ul>
      </div>

      <div className="flex flex-wrap justify-center gap-10 py-4">
        {shown.map((d) => (
          <Receipt
            key={d.call.id}
            source={d.call.source}
            claim={d.call.claim}
            confidence={d.call.confidence}
            verdict={d.resolution.hit ? "HIT" : "MISS"}
            called={bound(d.call.metric)}
            observed={observed(d.call.metric, d.resolution.evidence.observed)}
            via={d.resolution.evidence.via === "tatum-data" ? "Tatum Data API" : "Tatum Sui GraphQL"}
            checkpoint={d.resolution.evidence.ref}
            blobId={d.blobId}
          />
        ))}
      </div>
    </section>
  );
}