"use client";

import SignatureField from "./SignatureField";

interface ChatSignaturesProps {
  party1Signature: string;
  party2Signature: string;
  onParty1Change: (dataUrl: string) => void;
  onParty2Change: (dataUrl: string) => void;
  party1Label?: string;
  party2Label?: string;
}

export default function ChatSignatures({
  party1Signature,
  party2Signature,
  onParty1Change,
  onParty2Change,
  party1Label = "Party 1",
  party2Label = "Party 2",
}: ChatSignaturesProps) {
  return (
    <div className="border-t border-gray-200 px-4 pt-3 pb-2 space-y-3">
      <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "#032147" }}>
        Signatures
      </p>
      <SignatureField label={`${party1Label} Signature`} value={party1Signature} onChange={onParty1Change} />
      <SignatureField label={`${party2Label} Signature`} value={party2Signature} onChange={onParty2Change} />
    </div>
  );
}
