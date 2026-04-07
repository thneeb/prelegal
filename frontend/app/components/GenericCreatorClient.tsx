"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatMessage } from "../types/nda";
import { DocumentConfig } from "../document_configs";
import {
  GenericFormData,
  buildGenericDocument,
  loadTemplate,
} from "../utils/templateUtils";
import { sendChatMessage } from "../utils/chatApi";
import ChatInput from "./ChatInput";
import ChatMessageBubble from "./ChatMessage";
import ChatSignatures from "./ChatSignatures";
import GenericPreview from "./GenericPreview";

const PDF_MARGIN = 36; // pt (0.5 inch)

interface GenericCreatorClientProps {
  config: DocumentConfig;
}

export default function GenericCreatorClient({ config }: GenericCreatorClientProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<GenericFormData>({});
  const [standardTermsRaw, setStandardTermsRaw] = useState<string>("");
  const [coverMarkdown, setCoverMarkdown] = useState<string>("");
  const [standardTermsMarkdown, setStandardTermsMarkdown] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: `Hi! I'm here to help you fill out your ${config.name}. Let's get started — ${getFirstQuestion(config)}`,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const standardTermsRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  function handleLogout() {
    localStorage.removeItem("prelegal_user");
    localStorage.removeItem("prelegal_selected_doc");
    router.replace("/login/");
  }

  function handleBack() {
    localStorage.removeItem("prelegal_selected_doc");
    router.push("/");
  }

  // Load template
  useEffect(() => {
    loadTemplate(config.templateFile)
      .then((raw) => setStandardTermsRaw(raw))
      .catch(console.error);
  }, [config.templateFile]);

  // Rebuild preview whenever form data or template changes
  useEffect(() => {
    const { coverPage, standardTerms } = buildGenericDocument(
      standardTermsRaw,
      formData,
      config
    );
    setCoverMarkdown(coverPage);
    setStandardTermsMarkdown(standardTerms);
  }, [formData, standardTermsRaw, config]);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isLoading]);

  async function handleSend(text: string) {
    const userMessage: ChatMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setIsLoading(true);
    setError(null);

    // Strip signatures before sending
    const { party1Signature: _p1, party2Signature: _p2, ...safeFields } = formData;

    try {
      const response = await sendChatMessage(nextMessages, safeFields, config.id);
      setMessages((prev) => [...prev, { role: "assistant", content: response.reply }]);
      if (Object.keys(response.field_updates).length > 0) {
        setFormData((prev) => ({ ...prev, ...response.field_updates }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

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

      const p1 = formData.party1Company || formData.party1Name || "party1";
      const p2 = formData.party2Company || formData.party2Name || "party2";
      const filename = `${config.id}_${p1}_${p2}.pdf`
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
        <div
          className="px-5 py-4 border-b border-gray-200 flex items-start justify-between"
          style={{ backgroundColor: "#032147" }}
        >
          <div className="flex-1 min-w-0 mr-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBack}
                className="text-blue-300 hover:text-white transition-colors text-xs"
                title="Back to document selection"
              >
                ← Back
              </button>
            </div>
            <h1 className="text-sm font-bold text-white mt-1 leading-tight">{config.name}</h1>
            <p className="text-xs mt-0.5" style={{ color: "#ecad0a" }}>
              Chat with AI to fill your document
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs text-blue-300 hover:text-white transition-colors flex-shrink-0"
          >
            Log out
          </button>
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {messages.map((msg, i) => (
            <ChatMessageBubble key={i} role={msg.role} content={msg.content} />
          ))}
          {isLoading && <ChatMessageBubble role="assistant" content="" isLoading />}
          <div ref={messagesEndRef} />
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-3 mb-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={() => setError(null)}
              className="flex-shrink-0 font-bold hover:text-amber-900"
            >
              ✕
            </button>
          </div>
        )}

        {/* Signatures */}
        <ChatSignatures
          party1Signature={formData.party1Signature ?? ""}
          party2Signature={formData.party2Signature ?? ""}
          onParty1Change={(v) => setFormData((prev) => ({ ...prev, party1Signature: v }))}
          onParty2Change={(v) => setFormData((prev) => ({ ...prev, party2Signature: v }))}
          party1Label={config.party1Label}
          party2Label={config.party2Label}
        />

        {/* Download button */}
        <div className="px-3 py-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="w-full rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ backgroundColor: "#753991" }}
          >
            {downloading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Generating PDF…
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                </svg>
                Download PDF
              </>
            )}
          </button>
        </div>

        <ChatInput onSend={handleSend} disabled={isLoading} />
      </aside>

      {/* Right panel — preview */}
      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-gray-200 border-b border-gray-300 px-6 py-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            Live Preview
          </span>
          <span className="text-xs text-gray-400">Updates automatically as you type</span>
        </div>
        <div className="max-w-4xl mx-auto my-6 shadow-xl rounded-lg overflow-hidden ring-1 ring-gray-200">
          <GenericPreview
            coverMarkdown={coverMarkdown}
            standardTermsMarkdown={standardTermsMarkdown}
            data={formData}
            config={config}
            previewRef={previewRef}
            standardTermsRef={standardTermsRef}
          />
        </div>
      </main>
    </div>
  );
}

function getFirstQuestion(config: DocumentConfig): string {
  // Return the first non-null question from the backend config
  // We hardcode the first question per doc type for the greeting
  const firstQuestions: Record<string, string> = {
    "ai-addendum": "what date should this AI Addendum be effective from?",
    baa: "what date should this BAA be effective from?",
    csa: "what date should this Cloud Service Agreement be effective from?",
    "design-partner": "what date should this Design Partner Agreement be effective from?",
    dpa: "what date should this Data Processing Agreement be effective from?",
    partnership: "what date should this Partnership Agreement be effective from?",
    pilot: "what date should this Pilot Agreement be effective from?",
    psa: "what date should this Professional Services Agreement be effective from?",
    sla: "what Subscription Period does this SLA cover?",
    "software-license": "what date should this Software License Agreement be effective from?",
  };
  return firstQuestions[config.id] ?? "what date should this agreement be effective from?";
}
