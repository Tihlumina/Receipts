type Point = { callId: string; score: number; delta: number; why: string };

export function TrustTimeline({ series }: { series: Point[] }) {
  if (!series.length) {
    return <p className="muted text-sm">No results yet. Resolve a call to start the timeline.</p>;
  }
  const scores = [75, ...series.map((p) => p.score)];
  const W = 420;
  const H = 110;
  const pad = 10;
  const x = (i: number) => pad + (i * (W - 2 * pad)) / Math.max(scores.length - 1, 1);
  const y = (s: number) => pad + ((100 - s) * (H - 2 * pad)) / 100;
  const path = scores.map((s, i) => `${i ? "L" : "M"}${x(i)},${y(s)}`).join(" ");

  return (
    <div className="space-y-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Trust score over time">
        <line x1={pad} x2={W - pad} y1={y(75)} y2={y(75)} stroke="#e6e8ec" strokeDasharray="4 4" />
        <path d={path} fill="none" stroke="#2f6fed" strokeWidth="2.5" strokeLinejoin="round" />
        {scores.map((s, i) => (
          <circle key={i} cx={x(i)} cy={y(s)} r="4" fill="#fff" stroke="#2f6fed" strokeWidth="2" />
        ))}
      </svg>
      <ol className="space-y-1.5 text-sm">
        {series.map((p) => (
          <li key={p.callId} className="flex gap-3">
            <span className="w-10 font-mono" style={{ color: p.delta >= 0 ? "var(--hit)" : "var(--miss)" }}>
              {p.delta >= 0 ? "+" : ""}
              {p.delta}
            </span>
            <span>{p.why}</span>
            <span className="muted ml-auto">now {p.score}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}