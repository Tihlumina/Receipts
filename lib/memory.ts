import { MemWal } from "@mysten-incubation/memwal";
import type { CallMemory, ReceiptMemory, ResolutionMemory } from "./types";

// One Walrus Memory namespace per source: a trust score is built only from that source's own history.
const TAG = "RECEIPTS_V1";
export const nsFor = (source: string) =>
  `src-${source.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

const clients = new Map<string, MemWal>();
function client(namespace: string) {
  let c = clients.get(namespace);
  if (!c) {
    c = MemWal.create({
      key: process.env.MEMWAL_PRIVATE_KEY!,
      accountId: process.env.MEMWAL_ACCOUNT_ID!,
      serverUrl: process.env.MEMWAL_SERVER_URL,
      namespace,
    });
    clients.set(namespace, c);
  }
  return c;
}

/** Writes one memory to Walrus and waits until it is stored. Returns the blob id (your proof). */
export async function writeMemory(m: ReceiptMemory): Promise<string> {
  const mw = client(nsFor(m.source));
  const accepted = await mw.remember(`${TAG} ${JSON.stringify(m)}`);
  const stored = await mw.waitForRememberJob(accepted.job_id);
  return stored.blob_id as string;
}

export interface Stored<T> { memory: T; blobId: string }

/** Recalls a source's full history, split into calls and resolutions (deduplicated). */
export async function readHistory(source: string) {
  const { results } = await client(nsFor(source)).recall({ query: `${TAG} call resolution`, limit: 100 });
  const calls = new Map<string, Stored<CallMemory>>();
  const resolutions = new Map<string, Stored<ResolutionMemory>>();
  for (const r of results) {
    const i = r.text.indexOf(TAG);
    if (i < 0) continue;
    try {
      const memory = JSON.parse(r.text.slice(i + TAG.length)) as ReceiptMemory;
      if (memory.type === "call") calls.set(memory.id, { memory, blobId: r.blob_id });
      else resolutions.set(memory.callId, { memory, blobId: r.blob_id });
    } catch {
      /* not one of ours, or the relayer reshaped the text: check with /api/smoke */
    }
  }
  return { calls: [...calls.values()], resolutions: [...resolutions.values()] };
}
