export type Metric =
  | { kind: "price"; symbol: string; op: "gte" | "lte"; target: number } // USD, via Tatum Data API
  | { kind: "sui_balance"; address: string; op: "gte" | "lte"; target: number }; // SUI, via Tatum Sui RPC

export interface CallMemory {
  type: "call";
  id: string;
  source: string; // who made the call
  claim: string; // human-readable, shown on the receipt
  metric: Metric; // machine-checkable version of the claim
  confidence: number; // 0.5 to 0.99: probability the source puts on the claim being true
  deadline: string; // ISO
  createdAt: string; // ISO
}

export interface ResolutionMemory {
  type: "resolution";
  callId: string;
  source: string;
  hit: boolean;
  confidence: number; // copied from the call so scoring only needs resolutions
  evidence: {
    observed: number;
    via: "tatum-data" | "tatum-sui-rpc";
    at: string; // ISO time of the observation
    lateSec: number; // seconds after the deadline we checked (be honest about it)
    ref?: string; // Sui checkpoint number for on-chain checks
  };
  resolvedAt: string;
}

export type ReceiptMemory = CallMemory | ResolutionMemory;
