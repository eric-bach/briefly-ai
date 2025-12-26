"use client";

import { Navbar } from "@/components/Navbar";

export default function ProfilePage() {
  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-50">
      <Navbar />
      <div className="w-full max-w-5xl pt-32 p-8">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold text-gray-900">My Saved Prompts</h1>
          <p className="text-gray-600">
            Manage your custom summarization instructions for videos and channels.
          </p>
        </div>
        
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {/* Prompt List will go here */}
          <div className="text-center py-12 text-gray-500">
             <p>Loading your saved prompts...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
