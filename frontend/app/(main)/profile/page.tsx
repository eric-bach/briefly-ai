"use client";

import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { PromptList } from "@/components/PromptList";
import { EditPromptDialog } from "@/components/EditPromptDialog";
import { DeletePromptDialog } from "@/components/DeletePromptDialog";
import { PromptOverride } from "@/lib/db";
import { Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react";

export default function ProfilePage() {
  const [prompts, setPrompts] = useState<PromptOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [prevTokens, setPrevTokens] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [limit] = useState(10);

  // Interaction state
  const [selectedPrompt, setSelectedPrompt] = useState<PromptOverride | null>(
    null
  );
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const fetchPrompts = useCallback(async (
    token?: string | null,
    isPrev: boolean = false
  ) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.append("limit", limit.toString());
      if (token) params.append("nextToken", token);
      if (search) params.append("filter", search);

      const res = await fetch(`/api/user/prompts?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch prompts");

      const data = await res.json();
      setPrompts(data.items || []);

      if (isPrev) {
        setPrevTokens((prev) => prev.slice(0, -1));
      } else if (token) {
        setPrevTokens((prev) => [...prev, token]);
      }

      setNextToken(data.nextToken || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  }, [limit, search]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchPrompts();
    }, 300);
    return () => clearTimeout(timeout);
  }, [fetchPrompts]);

  const handleNext = () => {
    if (nextToken) fetchPrompts(nextToken);
  };

  const handlePrev = () => {
    const prevToken = prevTokens[prevTokens.length - 1] || null;
    fetchPrompts(prevToken, true);
  };

  const handleEditClick = (prompt: PromptOverride) => {
    setSelectedPrompt(prompt);
    setIsEditOpen(true);
  };

  const handleDeleteClick = (prompt: PromptOverride) => {
    setSelectedPrompt(prompt);
    setIsDeleteOpen(true);
  };

  const handleSave = async (updatedPrompt: string) => {
    if (!selectedPrompt) return;
    const res = await fetch("/api/user/prompts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetId: selectedPrompt.targetId,
        type: selectedPrompt.type,
        prompt: updatedPrompt,
      }),
    });
    if (!res.ok) throw new Error("Failed to update prompt");
    fetchPrompts();
  };

  const handleDelete = async () => {
    if (!selectedPrompt) return;
    const res = await fetch(
      `/api/user/prompts?targetId=${encodeURIComponent(
        selectedPrompt.targetId
      )}`,
      {
        method: "DELETE",
      }
    );
    if (!res.ok) throw new Error("Failed to delete prompt");
    fetchPrompts();
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-50">
      <Navbar />
      <div className="w-full max-w-5xl pt-32 p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">My Saved Prompts</h1>
            <p className="text-gray-600">
              Manage your custom summarization instructions.
            </p>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search prompts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none transition-all bg-white"
            />
          </div>
        </div>

        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading && prompts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-500">
              <Loader2 className="w-8 h-8 animate-spin text-red-600" />
              <p>Fetching your prompts...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-red-600">
              <p>Error: {error}</p>
              <button
                onClick={() => fetchPrompts()}
                className="mt-4 text-sm font-medium hover:underline"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              <PromptList
                prompts={prompts}
                onEdit={handleEditClick}
                onDelete={handleDeleteClick}
              />

              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                <button
                  onClick={handlePrev}
                  disabled={prevTokens.length === 0 || loading}
                  className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <div className="text-xs text-gray-400 italic">
                  {loading
                    ? "Loading..."
                    : prompts.length === 0
                    ? "No prompts found"
                    : ""}
                </div>
                <button
                  onClick={handleNext}
                  disabled={!nextToken || loading}
                  className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <EditPromptDialog
        isOpen={isEditOpen}
        prompt={selectedPrompt}
        onClose={() => setIsEditOpen(false)}
        onSave={handleSave}
      />

      <DeletePromptDialog
        isOpen={isDeleteOpen}
        prompt={selectedPrompt}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
