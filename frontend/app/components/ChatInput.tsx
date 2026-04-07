"use client";

import { useEffect, useRef } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Restore focus when the textarea is re-enabled after a loading state
  useEffect(() => {
    if (!disabled) {
      ref.current?.focus();
    }
  }, [disabled]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  function submit() {
    const text = ref.current?.value.trim();
    if (!text || disabled) return;
    ref.current!.value = "";
    onSend(text);
    ref.current?.focus();
  }

  return (
    <div className="flex items-end gap-2 px-3 py-2 border-t border-gray-200 bg-white">
      <textarea
        ref={ref}
        rows={1}
        disabled={disabled}
        onKeyDown={handleKeyDown}
        placeholder="Type a message…"
        className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ "--tw-ring-color": "#209dd7" } as React.CSSProperties}
      />
      <button
        type="button"
        onClick={submit}
        disabled={disabled}
        className="flex-shrink-0 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ backgroundColor: "#753991" }}
      >
        Send
      </button>
    </div>
  );
}
