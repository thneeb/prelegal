import { ChatMessage } from "../types/nda";
import { clearAuth, getAuthHeaders } from "./authUtils";

export interface SelectionApiResponse {
  reply: string;
  selected_document: string | null;
}

export async function sendSelectionMessage(
  messages: ChatMessage[]
): Promise<SelectionApiResponse> {
  const res = await fetch("/api/select-document", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ messages }),
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
