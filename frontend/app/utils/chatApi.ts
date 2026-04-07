import { ChatMessage } from "../types/nda";

export interface ChatApiResponse {
  reply: string;
  field_updates: Record<string, string>;
}

export async function sendChatMessage(
  messages: ChatMessage[],
  currentFields: Record<string, string>,
  documentType: string = "mnda"
): Promise<ChatApiResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      current_fields: currentFields,
      document_type: documentType,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json();
}
