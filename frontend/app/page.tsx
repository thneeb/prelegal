"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NdaCreatorClient from "./components/NdaCreatorClient";

export default function Home() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("prelegal_user")) {
      setAuthenticated(true);
    } else {
      router.replace("/login/");
    }
  }, [router]);

  if (!authenticated) return null;

  return <NdaCreatorClient />;
}
