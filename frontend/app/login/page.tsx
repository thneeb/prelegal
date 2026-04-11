"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, setToken } from "../utils/authUtils";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/");
    } else {
      setReady(true);
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Sign in failed. Please try again.");
        return;
      }
      setToken(data.token, data.email);
      router.push("/");
    } catch {
      setError("Unable to connect. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!ready) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        {/* Logo / brand */}
        <div className="text-center mb-10">
          <h1
            className="text-4xl font-bold tracking-tight"
            style={{ color: "#032147" }}
          >
            Pre<span style={{ color: "#209dd7" }}>legal</span>
          </h1>
          <p className="mt-2 text-sm" style={{ color: "#888888" }}>
            AI-powered legal documents in seconds
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-10">
          <h2
            className="text-xl font-semibold mb-6"
            style={{ color: "#032147" }}
          >
            Sign in to your account
          </h2>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <span className="flex-1">{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="flex-shrink-0 font-bold hover:text-amber-900"
              >
                ✕
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-1.5"
                style={{ color: "#032147" }}
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ "--tw-ring-color": "#209dd7" } as React.CSSProperties}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1.5"
                style={{ color: "#032147" }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ "--tw-ring-color": "#209dd7" } as React.CSSProperties}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg text-white text-sm font-semibold transition-opacity disabled:opacity-60"
              style={{ backgroundColor: "#753991" }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs" style={{ color: "#888888" }}>
            Don&apos;t have an account?{" "}
            <Link
              href="/signup/"
              className="font-medium"
              style={{ color: "#209dd7" }}
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
