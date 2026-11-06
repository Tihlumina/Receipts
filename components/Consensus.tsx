"use client";

import { useEffect, useState } from "react";
import { weightedConsensus } from "@/lib/trust";

type Row = { source: string; trust: number; resolved: number };

export function Consensus({ sources, refreshKey }: { sources: string[]; refreshKey: number }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [says, setSays] = useState<Record<string, number>>({});
  const [useMemory, setUseMemory] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const out = await Promise.all(
          sources.map(async (s) => {
            const res = await fetch(`/api/trust?source=${encodeURIComponent(s)}`);
            const d = await res.json();
            if (!res.ok) throw new Error(d.error ?? `Could not load ${s}`);
            return { source: s, trust: d.trust as number, resolved: d.resolved as number };
          }),
        );
        if (!cancelled) setRows(out);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sources, refreshKey, tick]);

  const defaultSay = (i: number) => (i === 0 ? 90 : i === 1 ? 40 : 60);
  const votes = rows.map((r, i) => ({ source: r.source, probability: (says[r.source] ?? defaultSay(i)) / 100, trust: r.trust }));
  const off = weightedConsensus(votes, false);
  const on = weightedConsensus(votes, true);
  const shown = useMemory ? on : off;
  const totalTrust = votes.reduce((s, v) => s + v.trust, 0) || 1;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl">Who should you believe?</h2>
          <p className="muted mt-1 text-sm">Set what each source says about a new question, then flip memory on and off.</p>
        </div>
        <button onClick={() => setTick((t) => t + 1)} disabled={loading} className="btn-ghost disabled:opacity-50">
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {error && <p className="text-sm" style={{ color: "var(--miss)" }}>{error}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {votes.map((v, i) => {
          const weight = useMemory ? v.trust / totalTrust : 1 / votes.length;
          return (
            <div key={v.source} className="card space-y-3 p-5 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">{v.source}</span>
                <span className="muted">
                  Trust {v.trust} · {rows[i].resolved} resolved
                </span>
              </div>
              <label className="block">
                <span className="lbl">Says {Math.round(v.probability * 100)}% · counts for {Math.round(weight * 100)}%</span>
                <input
                  className="w-full accent-[var(--accent)]"
                  type="range"
                  min={1}
                  max={99}
                  value={Math.round(v.probability * 100)}
                  onChange={(e) => setSays((s) => ({ ...s, [v.source]: Number(e.target.value) }))}
                />
              </label>
            </div>
          );
        })}
      </div>

      <div className="card flex flex-wrap items-center justify-between gap-6 p-6">
        <div className="inline-flex gap-2">
          {[false, true].map((m) => (
            <button key={String(m)} type="button" onClick={() => setUseMemory(m)} data-on={useMemory === m} className="btn-ghost">
              {m ? "Memory on" : "Memory off"}
            </button>
          ))}
        </div>
        <div className="text-right">
          <p className="font-display text-6xl">{Math.round(shown * 100)}%</p>
          <p className="muted text-sm">
            {useMemory ? "Weighted by track records recalled from Walrus" : "Everyone counts equally"}
          </p>
        </div>
      </div>

      <p className="muted text-sm">
        Without memory {Math.round(off * 100)}% · With memory {Math.round(on * 100)}% · memory moves the answer by{" "}
        {Math.abs(Math.round((on - off) * 100))} points
      </p>
    </section>
  );
}