"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Play, Youtube, ChevronDown, ChevronUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Skeleton } from "@/components/ui/skeleton";
import { Navbar } from "@/components/Navbar";

export default function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [url, setUrl] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasAutoStartedRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [summary, loading]);

  const generateSummary = useCallback(
    async (videoUrl: string, instructions: string) => {
      if (!videoUrl) return;

      setLoading(true);
      setSummary("");
      setError("");

      try {
        const response = await fetch("/api/summarize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            videoUrl,
            additionalInstructions: instructions,
          }),
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
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          setSummary((prev) => prev + chunk);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Handle URL query parameter for auto-starting
  useEffect(() => {
    const videoUrlParam = searchParams.get("videoUrl");
    if (videoUrlParam && !hasAutoStartedRef.current) {
      setUrl(videoUrlParam);
      hasAutoStartedRef.current = true;
      generateSummary(videoUrlParam, "");
    }
  }, [searchParams, generateSummary]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await generateSummary(url, customPrompt);
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-50">
      <Navbar />

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

        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 space-y-4">
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

          <div>
            <button
              type="button"
              onClick={() => setIsPromptOpen(!isPromptOpen)}
              className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              {isPromptOpen ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              Additional Instructions (Optional)
            </button>
            {isPromptOpen && (
              <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g. 'Don't spoil the ending', 'Focus on the technical details', 'Summarize in bullet points'..."
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all min-h-[100px] text-sm resize-y"
                />
              </div>
            )}
          </div>
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
