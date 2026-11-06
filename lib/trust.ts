import type { ResolutionMemory } from "./types";

// Brier score: mean squared gap between stated confidence and what happened (0 = perfect, 0.25 = coin flip).
// Trust blends a source's record with a neutral prior so one lucky call can't make anyone look great.
const PRIOR_N = 3;
const PRIOR_SKILL = 0.75; // = 1 - 0.25

export const brier = (rs: ResolutionMemory[]) =>
  rs.reduce((s, r) => s + (r.confidence - (r.hit ? 1 : 0)) ** 2, 0) / (rs.length || 1);

export function trustScore(rs: ResolutionMemory[]) {
  const n = rs.length;
  const skill = n ? 1 - brier(rs) : PRIOR_SKILL;
  return Math.round(100 * ((n * skill + PRIOR_N * PRIOR_SKILL) / (n + PRIOR_N)));
}

/** Score after each resolution, with a one-line reason: powers the "trust shift" timeline. */
export function trustSeries(rs: ResolutionMemory[]) {
  const sorted = [...rs].sort((a, b) => a.resolvedAt.localeCompare(b.resolvedAt));
  let prev = trustScore([]);
  return sorted.map((r, i) => {
    const score = trustScore(sorted.slice(0, i + 1));
    const point = {
      callId: r.callId,
      score,
      delta: score - prev,
      why: `${r.hit ? "Hit" : "Miss"} at ${Math.round(r.confidence * 100)}% confidence`,
    };
    prev = score;
    return point;
  });
}

/** The memory on/off demo: same votes, equal weights vs trust-weighted. */
export function weightedConsensus(
  votes: { source: string; probability: number; trust: number }[],
  useMemory: boolean,
) {
  const w = (v: { trust: number }) => (useMemory ? v.trust : 1);
  const total = votes.reduce((s, v) => s + w(v), 0);
  return total ? votes.reduce((s, v) => s + w(v) * v.probability, 0) / total : 0.5;
}
