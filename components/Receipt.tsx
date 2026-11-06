// The product's signature element: every call becomes a thermal-paper receipt.
const INK = "#1C1B19";
const PAPER = "#F2F1EC";

interface Props {
  source: string;
  claim: string;
  confidence: number; // 0 to 1
  verdict: "HIT" | "MISS" | "OPEN";
  called?: string;
  observed?: string;
  via?: string;
  checkpoint?: string;
  blobId?: string; // Walrus blob id: also seeds the barcode
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt>{k}</dt>
      <dd className="text-right font-semibold">{v}</dd>
    </div>
  );
}

// Bars are derived from the blob id, so each receipt's barcode is unique to its stored memory.
function Barcode({ seed }: { seed: string }) {
  return (
    <div className="flex h-10 items-stretch gap-px" aria-hidden>
      {[...seed].map((c, i) => (
        <span key={i} className="inline-block" style={{ width: 1 + (c.charCodeAt(0) % 4), background: i % 2 ? INK : "transparent" }} />
      ))}
    </div>
  );
}

export function Receipt(p: Props) {
  const color = p.verdict === "HIT" ? "#17663F" : p.verdict === "MISS" ? "#A32A1E" : "#5C5A55";
  return (
        <article className="w-[340px] font-mono text-[13px] leading-5" style={{ color: INK, filter: "drop-shadow(0 10px 24px rgba(15,23,42,0.14))" }}>
      <div className="px-6 pb-4 pt-6" style={{ background: PAPER }}>
        <header className="text-center">
          <p className="text-base font-bold">Receipts</p>
          <p>{p.source}</p>
        </header>
        <hr className="my-3 border-t border-dashed" style={{ borderColor: INK }} />
        <p>{p.claim}</p>
        <dl className="mt-3 space-y-1">
          <Row k="Confidence" v={`${Math.round(p.confidence * 100)}%`} />
          {p.called && <Row k="Called" v={p.called} />}
          {p.observed && <Row k="Observed" v={p.observed} />}
          {p.via && <Row k="Checked via" v={p.via} />}
          {p.checkpoint && <Row k="Sui checkpoint" v={p.checkpoint} />}
        </dl>
        <div className="my-5 flex justify-center">
          <span className="-rotate-6 border-2 px-3 py-1 text-xl font-bold" style={{ color, borderColor: color }}>
            {p.verdict}
          </span>
        </div>
        {p.blobId && (
          <>
            <Barcode seed={p.blobId} />
            <p className="mt-1 break-all text-[10px]">walrus:{p.blobId}</p>
          </>
        )}
      </div>
      <div
        aria-hidden
        className="h-3"
        style={{
          background: `linear-gradient(135deg, ${PAPER} 25%, transparent 25%) -6px 0, linear-gradient(225deg, ${PAPER} 25%, transparent 25%) -6px 0`,
          backgroundSize: "12px 12px",
        }}
      />
    </article>
  );
}
