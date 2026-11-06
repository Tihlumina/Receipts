"use client";

import { useState } from "react";
import { Receipt } from "@/components/Receipt";
import { OpenCalls } from "@/components/OpenCalls";
import { Consensus } from "@/components/Consensus";

type Made = { claim: string; source: string; confidence: number; called: string; blobId: string };

function inMinutes(m: number) {
  const d = new Date(Date.now() + m * 60000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function Home() {
  const [source, setSource] = useState("Demo Analyst A");
  const [symbol, setSymbol] = useState("SUI");
  const [op, setOp] = useState<"gte" | "lte">("gte");
  const [target, setTarget] = useState("1");
  const [confidence, setConfidence] = useState(70);
  const [deadline, setDeadline] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [made, setMade] = useState<Made | null>(null);
  const [listSource, setListSource] = useState("Demo Analyst A");
  const [refreshKey, setRefreshKey] = useState(0);
  const [known, setKnown] = useState(["Demo Analyst A", "Demo Analyst B"]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const t = Number(target);
      const when = new Date(deadline);
      const sym = symbol.trim().toUpperCase();
      const claim = `${sym} will be ${op === "gte" ? "at or above" : "at or below"} $${t} by ${when.toLocaleString()}`;
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source: source.trim(),
          claim,
          confidence: confidence / 100,
          deadline: when.toISOString(),
          metric: { kind: "price", symbol: sym, op, target: t },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setMade({ claim, source: source.trim(), confidence: confidence / 100, called: `${op === "gte" ? "≥" : "≤"} $${t}`, blobId: data.blobId });
      setListSource(source.trim());
      setKnown((k) => (k.includes(source.trim()) ? k : [...k, source.trim()]));
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl space-y-14 px-6 py-14">
      <header className="space-y-3">
        <p className="text-sm font-medium" style={{ color: "var(--accent)" }}>Built on Walrus Memory and Tatum</p>
        <h1 className="font-display text-6xl">Receipts</h1>
        <p className="muted max-w-xl text-lg">
          Every prediction is stored, checked against real data, and scored. See who deserves your trust.
        </p>
      </header>

      <div className="grid items-start gap-10 md:grid-cols-[1fr_auto]">
        <form onSubmit={submit} className="card space-y-4 p-6">
          <h2 className="font-display text-2xl">Log a call</h2>
          <div>
            <label className="lbl">Who is making the call?</label>
            <input className="input" value={source} onChange={(e) => setSource(e.target.value)} required />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="lbl">Asset</label>
              <input className="input" value={symbol} onChange={(e) => setSymbol(e.target.value)} required />
            </div>
            <div>
              <label className="lbl">Price will be</label>
              <select className="input" value={op} onChange={(e) => setOp(e.target.value as "gte" | "lte")}>
                <option value="gte">At or above</option>
                <option value="lte">At or below</option>
              </select>
            </div>
            <div>
              <label className="lbl">USD</label>
              <input className="input" type="number" step="any" min="0" value={target} onChange={(e) => setTarget(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="lbl">By when</label>
            <input className="input" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} required />
            <div className="mt-2 flex gap-2">
              {[2, 10, 60].map((m) => (
                <button key={m} type="button" onClick={() => setDeadline(inMinutes(m))} className="btn-ghost">
                  {m === 60 ? "In 1 hour" : `In ${m} min`}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="lbl">How sure are they? {confidence}%</label>
            <input className="w-full accent-[var(--accent)]" type="range" min={50} max={99} value={confidence} onChange={(e) => setConfidence(Number(e.target.value))} />
          </div>
          <button disabled={busy} className="btn w-full">{busy ? "Saving to Walrus…" : "Save call"}</button>
          {error && <p className="text-sm" style={{ color: "var(--miss)" }}>{error}</p>}
        </form>

        <div className="flex justify-center md:min-w-[380px]">
          {made ? (
            <Receipt source={made.source} claim={made.claim} confidence={made.confidence} verdict="OPEN" called={made.called} blobId={made.blobId} />
          ) : (
            <p className="muted max-w-[260px] pt-8 text-center text-sm">Your receipt prints here as soon as the call is saved to Walrus.</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="muted">View source:</span>
        {known.map((s) => (
          <button key={s} type="button" data-on={s === listSource} className="btn-ghost" onClick={() => { setListSource(s); setSource(s); }}>
            {s}
          </button>
        ))}
      </div>

      <OpenCalls source={listSource} refreshKey={refreshKey} />
      <Consensus sources={known} refreshKey={refreshKey} />
    </main>
  );
}