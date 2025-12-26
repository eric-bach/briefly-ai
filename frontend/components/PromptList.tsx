import { PromptOverride } from "@/lib/db";
import { Youtube, User, Video } from "lucide-react";

interface PromptListProps {
  prompts: PromptOverride[];
}

export function PromptList({ prompts }: PromptListProps) {
  if (prompts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No saved prompts found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 font-semibold">Type</th>
            <th className="px-6 py-3 font-semibold">Target ID</th>
            <th className="px-6 py-3 font-semibold">Prompt Content</th>
            <th className="px-6 py-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {prompts.map((prompt) => (
            <tr
              key={prompt.targetId}
              className="hover:bg-gray-50 transition-colors"
            >
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  {prompt.type === "video" ? (
                    <Video className="w-4 h-4 text-red-600" />
                  ) : (
                    <User className="w-4 h-4 text-blue-600" />
                  )}
                  <span className="capitalize">{prompt.type}</span>
                </div>
              </td>
              <td className="px-6 py-4 font-mono text-xs text-gray-600">
                {prompt.targetId}
              </td>
              <td className="px-6 py-4 max-w-xs">
                <p className="truncate text-gray-900" title={prompt.prompt}>
                  {prompt.prompt}
                </p>
              </td>
              <td className="px-6 py-4 text-right text-gray-400">
                {/* Actions will be implemented in Phase 4 */}
                <span className="text-xs italic">Read-only</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
