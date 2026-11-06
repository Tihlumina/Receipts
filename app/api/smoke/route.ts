import { readHistory, writeMemory } from "@/lib/memory";
import { latestCheckpoint, spotPrice } from "@/lib/tatum";

//export const runtime = "nodejs";

// Visit /api/smoke once. If all three checks pass, the whole pipeline works.
export async function GET() {
  const out: Record<string, unknown> = {};
  try { out.tatumPrice = await spotPrice("SUI"); } catch (e) { out.tatumPrice = String(e); }
  try { out.suiCheckpoint = await latestCheckpoint(); } catch (e) { out.suiCheckpoint = String(e); }
  try {
    const id = crypto.randomUUID();
    const blobId = await writeMemory({
      type: "call", id, source: "smoke-test", claim: "Smoke test", confidence: 0.6,
      metric: { kind: "price", symbol: "SUI", op: "gte", target: 1 },
      deadline: new Date().toISOString(), createdAt: new Date().toISOString(),
    });
    const { calls } = await readHistory("smoke-test");
    out.walrus = { blobId, roundTrip: calls.some((c) => c.memory.id === id) };
  } catch (e) { out.walrus = String(e); }
  return Response.json(out);
}
