"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import NdaCreatorClient from "./components/NdaCreatorClient";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (!localStorage.getItem("prelegal_user")) {
      router.replace("/login");
    }
  }, [router]);

  if (typeof window !== "undefined" && !localStorage.getItem("prelegal_user")) {
    return null;
  }

  return <NdaCreatorClient />;
}
