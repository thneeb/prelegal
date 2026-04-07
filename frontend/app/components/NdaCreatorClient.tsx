"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { NdaFormData, defaultFormData } from "../types/nda";
import { buildFullDocument, loadTemplate } from "../utils/templateUtils";
import NdaChat from "./NdaChat";
import NdaForm from "./NdaForm";
import NdaPreview from "./NdaPreview";
import TabSwitcher from "./TabSwitcher";

const PDF_MARGIN = 36; // pt (0.5 inch)

export default function NdaCreatorClient() {
  const router = useRouter();
  const [formData, setFormData] = useState<NdaFormData>(defaultFormData);
  const [standardTermsRaw, setStandardTermsRaw] = useState<string>("");
  const [markdown, setMarkdown] = useState<string>("");
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "form">("chat");
  const previewRef = useRef<HTMLDivElement>(null);
  const standardTermsRef = useRef<HTMLDivElement>(null);

  function handleLogout() {
    localStorage.removeItem("prelegal_user");
    router.replace("/login/");
  }

  useEffect(() => {
    loadTemplate("Mutual-NDA.md")
      .then((raw) => setStandardTermsRaw(raw))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!standardTermsRaw) return;
    setMarkdown(buildFullDocument(standardTermsRaw, formData));
  }, [formData, standardTermsRaw]);

  async function handleDownload() {
    if (!previewRef.current) return;
    setDownloading(true);
    try {
      const [{ toPng }, { default: jsPDF }] = await Promise.all([
        import("html-to-image"),
        import("jspdf"),
      ]);

      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const contentWidth = pageWidth - 2 * PDF_MARGIN;
      const contentHeight = pageHeight - 2 * PDF_MARGIN;

      async function addSectionToPdf(element: HTMLDivElement, isFirstSection: boolean) {
        const imgData = await toPng(element, { backgroundColor: "#ffffff", pixelRatio: 2 });
        const img = new Image();
        await new Promise<void>((resolve) => { img.onload = () => resolve(); img.src = imgData; });
        const imgHeight = (img.height * contentWidth) / img.width;

        let yOffset = 0;
        while (yOffset < imgHeight) {
          if (!isFirstSection || yOffset > 0) pdf.addPage();
          pdf.addImage(imgData, "PNG", PDF_MARGIN, PDF_MARGIN - yOffset, contentWidth, imgHeight);
          yOffset += contentHeight;
        }
      }

      await addSectionToPdf(previewRef.current, true);

      if (standardTermsRef.current) {
        await addSectionToPdf(standardTermsRef.current, false);
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
      {/* Left panel */}
      <aside className="w-96 min-w-80 flex-shrink-0 flex flex-col bg-white shadow-lg border-r border-gray-200 z-10">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 bg-blue-900 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-white">Mutual NDA Creator</h1>
            <p className="text-xs text-blue-200 mt-0.5">Chat with AI to fill your NDA</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs text-blue-300 hover:text-white transition-colors"
          >
            Log out
          </button>
        </div>

        {/* Tab switcher */}
        <TabSwitcher activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab content — both always mounted to preserve canvas state */}
        <div className="flex-1 overflow-hidden relative">
          <div className={activeTab === "chat" ? "absolute inset-0 flex flex-col" : "hidden"}>
            <NdaChat
              formData={formData}
              onChange={setFormData}
              onDownload={handleDownload}
              downloading={downloading}
            />
          </div>
          <div className={activeTab === "form" ? "absolute inset-0 overflow-y-auto px-4 py-4" : "hidden"}>
            <NdaForm
              data={formData}
              onChange={setFormData}
              onDownload={handleDownload}
              downloading={downloading}
            />
          </div>
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
          <NdaPreview
            markdown={markdown}
            data={formData}
            previewRef={previewRef}
            standardTermsRef={standardTermsRef}
          />
        </div>
      </main>
    </div>
  );
}
