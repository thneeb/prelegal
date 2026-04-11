import { clearAuth, getAuthHeaders } from "./authUtils";

export interface DocumentRecord {
  id: number;
  document_type: string;
  document_name: string;
  created_at: string;
  form_data?: Record<string, string>;
}

async function handleResponse<T>(res: Response): Promise<T> {
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

export async function saveDocument(
  documentType: string,
  documentName: string,
  formData: Record<string, string>
): Promise<DocumentRecord> {
  const res = await fetch("/api/documents", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      document_type: documentType,
      document_name: documentName,
      form_data: formData,
    }),
  });
  return handleResponse<DocumentRecord>(res);
}

export async function listDocuments(): Promise<DocumentRecord[]> {
  const res = await fetch("/api/documents", { headers: getAuthHeaders() });
  return handleResponse<DocumentRecord[]>(res);
}

export async function getDocument(id: number): Promise<DocumentRecord> {
  const res = await fetch(`/api/documents/${id}`, { headers: getAuthHeaders() });
  return handleResponse<DocumentRecord>(res);
}
