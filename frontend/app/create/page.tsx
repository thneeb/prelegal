"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DOCUMENT_CONFIGS } from "../document_configs";
import NdaCreatorClient from "../components/NdaCreatorClient";
import GenericCreatorClient from "../components/GenericCreatorClient";
import { isAuthenticated } from "../utils/authUtils";

export default function CreatePage() {
  const router = useRouter();
  const [docId, setDocId] = useState<string | null>(null);
  const [initialFormData, setInitialFormData] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login/");
      return;
    }
    const selected = localStorage.getItem("prelegal_selected_doc") ?? "mnda";
    setDocId(selected);

    // One-shot reopen data: read and immediately clear
    const resumeRaw = localStorage.getItem("prelegal_resume_data");
    if (resumeRaw) {
      localStorage.removeItem("prelegal_resume_data");
      try {
        setInitialFormData(JSON.parse(resumeRaw));
      } catch {
        // Ignore malformed data
      }
    }
  }, [router]);

  if (!docId) return null;

  if (docId === "mnda") {
    return <NdaCreatorClient initialFormData={initialFormData ?? undefined} />;
  }

  const config = DOCUMENT_CONFIGS[docId];
  if (!config) {
    return <NdaCreatorClient />;
  }

  return (
    <GenericCreatorClient
      config={config}
      initialFormData={initialFormData ?? undefined}
    />
  );
}
