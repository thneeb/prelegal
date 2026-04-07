"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DOCUMENT_CONFIGS } from "../document_configs";
import NdaCreatorClient from "../components/NdaCreatorClient";
import GenericCreatorClient from "../components/GenericCreatorClient";

export default function CreatePage() {
  const router = useRouter();
  const [docId, setDocId] = useState<string | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("prelegal_user")) {
      router.replace("/login/");
      return;
    }
    const selected = localStorage.getItem("prelegal_selected_doc") ?? "mnda";
    setDocId(selected);
  }, [router]);

  if (!docId) return null;

  if (docId === "mnda") {
    return <NdaCreatorClient />;
  }

  const config = DOCUMENT_CONFIGS[docId];
  if (!config) {
    // Unknown doc type — fall back to MNDA
    return <NdaCreatorClient />;
  }

  return <GenericCreatorClient config={config} />;
}
