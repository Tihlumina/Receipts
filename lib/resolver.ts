import { latestCheckpoint, spotPrice, suiBalance } from "./tatum";
import type { CallMemory, ResolutionMemory } from "./types";

/** Checks a call against Tatum. Refuses to resolve early; records how late the check ran. */
export async function resolveCall(call: CallMemory): Promise<ResolutionMemory> {
  const lateMs = Date.now() - Date.parse(call.deadline);
  if (lateMs < 0) throw new Error("Deadline has not passed yet");

  const m = call.metric;
  let observed: number;
  let via: ResolutionMemory["evidence"]["via"];
  let ref: string | undefined;

  if (m.kind === "price") {
    observed = (await spotPrice(m.symbol)).value;
    via = "tatum-data";
  } else {
    observed = await suiBalance(m.address);
    via = "tatum-sui-rpc";
    ref = await latestCheckpoint();
  }

  const hit = m.op === "gte" ? observed >= m.target : observed <= m.target;
  const now = new Date().toISOString();
  return {
    type: "resolution",
    callId: call.id,
    source: call.source,
    hit,
    confidence: call.confidence,
    evidence: { observed, via, at: now, lateSec: Math.round(lateMs / 1000), ref },
    resolvedAt: now,
  };
}
