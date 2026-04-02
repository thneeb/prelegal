"use client";

import { useEffect, useRef, useState } from "react";
import { NdaFormData, defaultFormData } from "../types/nda";
import { buildFullDocument, loadTemplate } from "../utils/templateUtils";
import NdaForm from "./NdaForm";
import NdaPreview from "./NdaPreview";

export default function NdaCreatorClient() {
  const [formData, setFormData] = useState<NdaFormData>(defaultFormData);
  const [standardTermsRaw, setStandardTermsRaw] = useState<string>("");
  const [markdown, setMarkdown] = useState<string>("");
  const [downloading, setDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Load the standard terms once on mount
  useEffect(() => {
    loadTemplate("Mutual-NDA.md")
      .then((raw) => setStandardTermsRaw(raw))
      .catch(console.error);
  }, []);

  // Rebuild the markdown whenever form data or template changes
  useEffect(() => {
    if (!standardTermsRaw) return;
    setMarkdown(buildFullDocument(standardTermsRaw, formData));
  }, [formData, standardTermsRaw]);

  async function handleDownload() {
    if (!previewRef.current) return;
    setDownloading(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);

      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      let y = 0;
      while (y < imgHeight) {
        if (y > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, -y, imgWidth, imgHeight);
        y += pageHeight;
      }

      const party1 = formData.party1Company || formData.party1Name || "party1";
      const party2 = formData.party2Company || formData.party2Name || "party2";
      const filename = `Mutual-NDA_${party1}_${party2}.pdf`
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .replace(/_+/g, "_");

      pdf.save(filename);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("PDF generation failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Left panel — form */}
      <aside className="w-96 min-w-80 flex-shrink-0 flex flex-col bg-white shadow-lg border-r border-gray-200 z-10">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 bg-blue-900">
          <h1 className="text-lg font-bold text-white">Mutual NDA Creator</h1>
          <p className="text-xs text-blue-200 mt-0.5">Fill in the details to generate your NDA</p>
        </div>
        {/* Scrollable form */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <NdaForm
            data={formData}
            onChange={setFormData}
            onDownload={handleDownload}
            downloading={downloading}
          />
        </div>
      </aside>

      {/* Right panel — preview */}
      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-gray-200 border-b border-gray-300 px-6 py-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            Live Preview
          </span>
          <span className="text-xs text-gray-400">
            Updates automatically as you type
          </span>
        </div>
        <div className="max-w-4xl mx-auto my-6 shadow-xl rounded-lg overflow-hidden ring-1 ring-gray-200">
          <NdaPreview markdown={markdown} data={formData} previewRef={previewRef} />
        </div>
      </main>
    </div>
  );
}
