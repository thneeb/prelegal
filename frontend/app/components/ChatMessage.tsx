"use client";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  isLoading?: boolean;
}

export default function ChatMessage({ role, content, isLoading = false }: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "rounded-br-sm text-white"
            : "rounded-bl-sm bg-gray-100 text-gray-800"
        }`}
        style={isUser ? { backgroundColor: "#209dd7" } : undefined}
      >
        {isLoading ? (
          <span className="flex gap-1 items-center h-4">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
          </span>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
