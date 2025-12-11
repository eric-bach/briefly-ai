"use client";

import { useAuthenticator } from "@aws-amplify/ui-react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play, Youtube } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { user, signOut } = useAuthenticator((context) => [context.user]);
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [summary, loading]);

  const handleSignOut = () => {
    signOut && signOut();
    router.push("/");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setSummary("");
    setError("");

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ videoUrl: url }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch summary");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split("\n");
        // Keep the last partial line in the buffer
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim() === "") continue;
          if (line.startsWith("data: ")) {
            try {
              const dataContent = line.slice(6);
              // The backend sends a JSON string encoded value
              const parsed = JSON.parse(dataContent);

              if (typeof parsed === "string") {
                setSummary((prev) => prev + parsed);
              } else if (parsed && typeof parsed === "object") {
                if (parsed.error) {
                  console.error("Stream error:", parsed);
                  // Try to extract a readable message
                  let errorMessage = parsed.error;
                  if (typeof errorMessage === "string") {
                    try {
                      const errorObj = JSON.parse(errorMessage);
                      if (errorObj.error?.message) {
                        errorMessage = errorObj.error.message;
                      }
                    } catch {
                      // usage as is
                    }
                  } else if (errorMessage.message) {
                    errorMessage = errorMessage.message;
                  }
                  setError(String(errorMessage));
                }
              }
            } catch (e) {
              console.error("Failed to parse SSE message", line);
            }
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-50">
      <nav className="w-full bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center fixed top-0 left-0 z-10">
        <div className="flex items-center gap-2 font-bold text-xl text-gray-900">
          <div className="p-1.5 bg-red-100 rounded-lg">
            <Youtube className="w-5 h-5 text-red-600" />
          </div>
          Briefly AI
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600 hidden sm:block">
            {user?.signInDetails?.loginId}
          </span>
          <button
            onClick={handleSignOut}
            className="text-sm font-medium text-gray-600 hover:text-red-600 transition-colors"
          >
            Sign out
          </button>
        </div>
      </nav>

      <div className="w-full max-w-3xl space-y-8 pt-32 p-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-red-100 rounded-full">
              <Youtube className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Video Summarizer
          </h1>
          <p className="text-lg text-gray-600">
            Paste a YouTube link below to get an instant AI-powered summary
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <form onSubmit={handleSubmit} className="flex gap-4">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Summarizing...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  Summarize
                </>
              )}
            </button>
          </form>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {loading && !summary && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-4">
            <Skeleton className="h-8 w-1/3" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
            <div className="space-y-2 pt-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          </div>
        )}

        {summary && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 prose prose-gray max-w-none">
            <h3 className="text-xl font-semibold mb-4 text-gray-900">
              Summary
            </h3>
            <div className="prose prose-red max-w-none">
              <ReactMarkdown>{summary}</ReactMarkdown>
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
