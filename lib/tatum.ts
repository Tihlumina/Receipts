const KEY = () => process.env.TATUM_API_KEY!;
const GQL = () => process.env.TATUM_SUI_GRAPHQL_URL ?? "https://sui-mainnet.gateway.tatum.io/graphql";

/** Spot price in USD from Tatum Data API. */
export async function spotPrice(symbol: string) {
  const r = await fetch(`https://api.tatum.io/v3/tatum/rate/${encodeURIComponent(symbol)}?basePair=USD`, {
    headers: { "x-api-key": KEY() },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Tatum rate ${r.status}`);
  const j = await r.json();
  return { value: Number(j.value), at: new Date().toISOString() };
}

/**
 * All Sui reads go through this one function. Tatum's Sui mainnet gateway serves GraphQL,
 * so every query below is sent to its /graphql endpoint.
 */
async function gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const r = await fetch(GQL(), {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": KEY() },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  const text = await r.text();
  let j: { data?: T; errors?: { message: string }[] };
  try {
    j = JSON.parse(text);
  } catch {
    throw new Error(`Sui GraphQL ${r.status}: ${text.slice(0, 300)}`);
  }
  if (j.errors?.length) throw new Error(`Sui GraphQL: ${j.errors.map((e) => e.message).join("; ")}`);
  if (!j.data) throw new Error(`Sui GraphQL ${r.status}: unexpected response ${text.slice(0, 300)}`);
  return j.data;
}

export async function suiBalance(address: string) {
  const data = await gql<{ address: { balance: { totalBalance: string } | null } | null }>(
    `query ($a: SuiAddress!) { address(address: $a) { balance(coinType: "0x2::sui::SUI") { totalBalance } } }`,
    { a: address },
  );
  return Number(data.address?.balance?.totalBalance ?? 0) / 1e9; // MIST to SUI
}

/** Checkpoint number at observation time: a verifiable pointer you print on the receipt. */
export async function latestCheckpoint() {
  const data = await gql<{ checkpoint: { sequenceNumber: number | string } }>(
    `{ checkpoint { sequenceNumber } }`,
  );
  return String(data.checkpoint.sequenceNumber);
}

export async function txSucceeded(digest: string) {
  const data = await gql<{ transaction: { effects: { status: string } | null } | null }>(
    `query ($d: String!) { transaction(digest: $d) { effects { status } } }`,
    { d: digest },
  );
  return data.transaction?.effects?.status === "SUCCESS";
}