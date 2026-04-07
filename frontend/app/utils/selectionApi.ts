import { ChatMessage } from "../types/nda";

export interface SelectionApiResponse {
  reply: string;
  selected_document: string | null;
}

export async function sendSelectionMessage(
  messages: ChatMessage[]
): Promise<SelectionApiResponse> {
  const res = await fetch("/api/select-document", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json();
}
