import { randomUUID } from "node:crypto";
import { writeMemory } from "@/lib/memory";
import type { CallMemory, Metric } from "@/lib/types";

//export const runtime = "nodejs";

export async function POST(req: Request) {
  const b = await req.json();
  const confidence = Number(b.confidence);
  if (!b.source || !b.claim || !b.metric || !(confidence >= 0.5 && confidence <= 0.99) || Number.isNaN(Date.parse(b.deadline))) {
    return Response.json({ error: "source, claim, metric, confidence (0.5 to 0.99) and deadline are required" }, { status: 400 });
  }
  // TODO: validate the metric shape (kind, op, target) before trusting it.
  const call: CallMemory = {
    type: "call",
    id: randomUUID(),
    source: String(b.source),
    claim: String(b.claim),
    metric: b.metric as Metric,
    confidence,
    deadline: new Date(b.deadline).toISOString(),
    createdAt: new Date().toISOString(),
  };
  const blobId = await writeMemory(call);
  return Response.json({ call, blobId });
}
