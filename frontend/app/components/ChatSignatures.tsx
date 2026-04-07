"use client";

import SignatureField from "./SignatureField";

interface ChatSignaturesProps {
  party1Signature: string;
  party2Signature: string;
  onParty1Change: (dataUrl: string) => void;
  onParty2Change: (dataUrl: string) => void;
}

export default function ChatSignatures({
  party1Signature,
  party2Signature,
  onParty1Change,
  onParty2Change,
}: ChatSignaturesProps) {
  return (
    <div className="border-t border-gray-200 px-4 pt-3 pb-2 space-y-3">
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#032147" }}>
        Signatures
      </p>
      <SignatureField label="Party 1 Signature" value={party1Signature} onChange={onParty1Change} />
      <SignatureField label="Party 2 Signature" value={party2Signature} onChange={onParty2Change} />
    </div>
  );
}
