"use client";

import { useRef, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";

interface SignatureFieldProps {
  label: string;
  value: string;
  onChange: (dataUrl: string) => void;
}

export default function SignatureField({ label, value, onChange }: SignatureFieldProps) {
  const sigRef = useRef<SignatureCanvas>(null);

  // When value is cleared externally, clear the canvas too
  useEffect(() => {
    if (!value && sigRef.current && !sigRef.current.isEmpty()) {
      sigRef.current.clear();
    }
  }, [value]);

  function handleEnd() {
    if (sigRef.current) {
      onChange(sigRef.current.toDataURL("image/png"));
    }
  }

  function handleClear() {
    sigRef.current?.clear();
    onChange("");
  }

  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-600">{label}</label>
      <div className="border border-gray-300 rounded bg-white">
        <SignatureCanvas
          ref={sigRef}
          penColor="#1e3a5f"
          canvasProps={{ className: "w-full h-20 rounded", style: { width: "100%", height: 80 } }}
          onEnd={handleEnd}
        />
      </div>
      <button
        type="button"
        onClick={handleClear}
        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
      >
        Clear signature
      </button>
    </div>
  );
}
