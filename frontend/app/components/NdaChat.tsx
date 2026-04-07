"use client";

import { useEffect, useRef, useState } from "react";
import { ChatMessage, NdaFormData } from "../types/nda";
import { sendChatMessage } from "../utils/chatApi";
import ChatInput from "./ChatInput";
import ChatMessageBubble from "./ChatMessage";
import ChatSignatures from "./ChatSignatures";

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I'm here to help you fill out your Mutual NDA. Let's start — what is the purpose of this agreement? For example: \"Evaluating a potential technology partnership\" or \"Discussing a potential business relationship.\"",
};

interface NdaChatProps {
  formData: NdaFormData;
  onChange: (data: NdaFormData) => void;
  onDownload: () => void;
  downloading: boolean;
}

export default function NdaChat({ formData, onChange, onDownload, downloading }: NdaChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isLoading]);

  async function handleSend(text: string) {
    const userMessage: ChatMessage = { role: "user", content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setIsLoading(true);
    setError(null);

    // Strip signatures before sending — large base64 strings the AI can't use
    const { party1Signature: _p1, party2Signature: _p2, ...safeFields } = formData;

    try {
      const response = await sendChatMessage(nextMessages, safeFields);
      setMessages((prev) => [...prev, { role: "assistant", content: response.reply }]);
      if (Object.keys(response.field_updates).length > 0) {
        onChange({ ...formData, ...response.field_updates });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
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
        party1Signature={formData.party1Signature}
        party2Signature={formData.party2Signature}
        onParty1Change={(v) => onChange({ ...formData, party1Signature: v })}
        onParty2Change={(v) => onChange({ ...formData, party2Signature: v })}
      />

      {/* Download button */}
      <div className="px-3 py-2">
        <button
          type="button"
          onClick={onDownload}
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

      {/* Chat input */}
      <ChatInput onSend={handleSend} disabled={isLoading} />
    </div>
  );
}
