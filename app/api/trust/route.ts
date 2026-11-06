import { readHistory } from "@/lib/memory";
import { brier, trustScore, trustSeries } from "@/lib/trust";

//export const runtime = "nodejs";

export async function GET(req: Request) {
  const source = new URL(req.url).searchParams.get("source");
  if (!source) return Response.json({ error: "source is required" }, { status: 400 });
  const { calls, resolutions } = await readHistory(source);
  const rs = resolutions.map((r) => r.memory);
  const done = new Set(rs.map((r) => r.callId));
  return Response.json({
    source,
    trust: trustScore(rs),
    brier: rs.length ? brier(rs) : null,
    resolved: rs.length,
    series: trustSeries(rs),
    open: calls.filter((c) => !done.has(c.memory.id)).map((c) => c.memory),
  });
}
