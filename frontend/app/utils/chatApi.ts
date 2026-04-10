import { ChatMessage } from "../types/nda";
import { clearAuth, getAuthHeaders } from "./authUtils";

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
    headers: getAuthHeaders(),
    body: JSON.stringify({
      messages,
      current_fields: currentFields,
      document_type: documentType,
    }),
  });

  if (res.status === 401) {
    clearAuth();
    window.location.href = "/login/";
    throw new Error("Session expired. Please sign in again.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json();
}
