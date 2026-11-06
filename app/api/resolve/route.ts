import { readHistory, writeMemory } from "@/lib/memory";
import { resolveCall } from "@/lib/resolver";
import { trustScore, trustSeries } from "@/lib/trust";

//export const runtime = "nodejs";

export async function POST(req: Request) {
  const { source, callId } = await req.json();
  const { calls, resolutions } = await readHistory(source);
  const call = calls.find((c) => c.memory.id === callId)?.memory;
  if (!call) return Response.json({ error: "Call not found in this source's memory" }, { status: 404 });
  if (resolutions.some((r) => r.memory.callId === callId)) return Response.json({ error: "Already resolved" }, { status: 409 });

  try {
    const resolution = await resolveCall(call);
    const blobId = await writeMemory(resolution);
    const all = [...resolutions.map((r) => r.memory), resolution];
    return Response.json({ call, resolution, blobId, trust: trustScore(all), series: trustSeries(all) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 422 });
  }
}
