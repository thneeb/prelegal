import { ChatMessage, NdaFormData } from "../types/nda";

interface ChatApiRequest {
  messages: ChatMessage[];
  current_fields: Partial<NdaFormData>;
}

export interface ChatApiResponse {
  reply: string;
  field_updates: Partial<NdaFormData>;
}

export async function sendChatMessage(
  messages: ChatMessage[],
  currentFields: Partial<NdaFormData>
): Promise<ChatApiResponse> {
  const body: ChatApiRequest = { messages, current_fields: currentFields };

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json();
}
