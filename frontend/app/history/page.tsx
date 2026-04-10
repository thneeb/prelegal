"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, clearAuth } from "../utils/authUtils";
import { listDocuments, getDocument, DocumentRecord } from "../utils/historyApi";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function HistoryPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reopening, setReopening] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login/");
      return;
    }
    listDocuments()
      .then(setDocs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [router]);

  function handleLogout() {
    clearAuth();
    router.replace("/login/");
  }

  async function handleReopen(doc: DocumentRecord) {
    setReopening(doc.id);
    try {
      const full = await getDocument(doc.id);
      localStorage.setItem("prelegal_selected_doc", full.document_type);
      if (full.form_data) {
        localStorage.setItem("prelegal_resume_data", JSON.stringify(full.form_data));
      }
      router.push("/create/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open document.");
      setReopening(null);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Left panel */}
      <aside className="w-72 flex-shrink-0 flex flex-col bg-white shadow-lg border-r border-gray-200 z-10">
        <div
          className="px-5 py-4 border-b border-gray-200 flex items-center justify-between"
          style={{ backgroundColor: "#032147" }}
        >
          <div>
            <h1 className="text-lg font-bold text-white">Prelegal</h1>
            <p className="text-xs mt-0.5" style={{ color: "#ecad0a" }}>
              Document history
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-xs text-blue-300 hover:text-white transition-colors"
            >
              ← Documents
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs text-blue-300 hover:text-white transition-colors"
            >
              Log out
            </button>
          </div>
        </div>

        <div className="flex-1 px-4 py-4 overflow-y-auto">
          <p className="text-xs" style={{ color: "#888888" }}>
            Documents you have downloaded are listed here. Click{" "}
            <span className="font-medium">Reopen</span> to continue editing.
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="sticky top-0 z-10 bg-gray-200 border-b border-gray-300 px-6 py-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            My Documents
          </span>
        </div>

        <div className="max-w-3xl mx-auto p-6">
          {loading && (
            <p className="text-sm text-gray-400">Loading your documents…</p>
          )}

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <span className="flex-1">{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="font-bold hover:text-amber-900"
              >
                ✕
              </button>
            </div>
          )}

          {!loading && docs.length === 0 && !error && (
            <div className="text-center py-16">
              <p className="text-gray-400 text-sm">No documents yet.</p>
              <p className="text-gray-400 text-xs mt-1">
                Documents appear here after you download a PDF.
              </p>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="mt-4 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                style={{ backgroundColor: "#753991" }}
              >
                Create a document
              </button>
            </div>
          )}

          {docs.length > 0 && (
            <div className="space-y-3">
              {docs.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p
                      className="text-sm font-semibold truncate"
                      style={{ color: "#032147" }}
                    >
                      {doc.document_name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#888888" }}>
                      {formatDate(doc.created_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleReopen(doc)}
                    disabled={reopening === doc.id}
                    className="flex-shrink-0 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity disabled:opacity-60"
                    style={{ backgroundColor: "#209dd7" }}
                  >
                    {reopening === doc.id ? "Opening…" : "Reopen"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
