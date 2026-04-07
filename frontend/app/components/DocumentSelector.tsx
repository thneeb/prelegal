"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatMessage } from "../types/nda";
import { DOCUMENT_CONFIGS } from "../document_configs";
import { sendSelectionMessage } from "../utils/selectionApi";
import ChatInput from "./ChatInput";
import ChatMessageBubble from "./ChatMessage";
import DocumentCard from "./DocumentCard";

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I'm here to help you create a legal document. You can browse the available document types on the right, or just tell me what you need — for example: \"I need an NDA\" or \"I want to set up a data processing agreement.\"",
};

export default function DocumentSelector() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isLoading]);

  useEffect(() => {
    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    };
  }, []);

  function handleLogout() {
    localStorage.removeItem("prelegal_user");
    router.replace("/login/");
  }

  function navigateToDoc(docId: string) {
    if (navTimerRef.current) {
      clearTimeout(navTimerRef.current);
      navTimerRef.current = null;
    }
    localStorage.setItem("prelegal_selected_doc", docId);
    router.push("/create/");
  }

  async function handleSend(text: string) {
    const userMessage: ChatMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setIsLoading(true);
    setError(null);

    try {
      const response = await sendSelectionMessage(nextMessages);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.reply },
      ]);
      if (response.selected_document) {
        // Small delay so the user sees the AI's reply before navigating
        const docId = response.selected_document;
        navTimerRef.current = setTimeout(() => navigateToDoc(docId), 1200);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const docs = Object.values(DOCUMENT_CONFIGS);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Left panel — selection chat */}
      <aside className="w-96 min-w-80 flex-shrink-0 flex flex-col bg-white shadow-lg border-r border-gray-200 z-10">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between" style={{ backgroundColor: "#032147" }}>
          <div>
            <h1 className="text-lg font-bold text-white">Prelegal</h1>
            <p className="text-xs mt-0.5" style={{ color: "#ecad0a" }}>
              AI-powered legal document creator
            </p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs text-blue-300 hover:text-white transition-colors"
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

        <ChatInput onSend={handleSend} disabled={isLoading} />
      </aside>

      {/* Right panel — document grid */}
      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-gray-200 border-b border-gray-300 px-6 py-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            Available Documents
          </span>
        </div>

        <div className="max-w-4xl mx-auto p-6">
          <p className="text-sm text-gray-500 mb-4">
            Select a document type to get started, or describe what you need in the chat.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {docs.map((doc) => (
              <DocumentCard
                key={doc.id}
                id={doc.id}
                name={doc.name}
                description={doc.description}
                onSelect={navigateToDoc}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
