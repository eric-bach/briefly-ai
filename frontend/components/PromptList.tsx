import { PromptOverride } from "@/lib/db";
import { User, Video, ExternalLink } from "lucide-react";
import Image from "next/image";
import { Tooltip } from "./ui/tooltip";

interface PromptListProps {
  prompts: PromptOverride[];
  onEdit: (prompt: PromptOverride) => void;
  onDelete: (prompt: PromptOverride) => void;
}

export function PromptList({ prompts, onEdit, onDelete }: PromptListProps) {
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
            <th className="px-6 py-3 font-semibold">Target</th>
            <th className="px-6 py-3 font-semibold">Prompt Content</th>
            <th className="px-6 py-3 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {prompts.map((prompt) => {
            const link = prompt.type === 'video' 
              ? `https://www.youtube.com/watch?v=${prompt.targetId}`
              : `https://www.youtube.com/${prompt.targetId.startsWith('@') ? prompt.targetId : `channel/${prompt.targetId}`}`;

            return (
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
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    {prompt.targetThumbnail ? (
                      <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0 border border-gray-100">
                        <Image 
                          src={prompt.targetThumbnail} 
                          alt={prompt.targetTitle || "Thumbnail"} 
                          fill 
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                        {prompt.type === 'video' ? <Video className="w-5 h-5 text-gray-400" /> : <User className="w-5 h-5 text-gray-400" />}
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <Tooltip content={`ID: ${prompt.targetId}`}>
                        <a 
                          href={link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-gray-900 hover:text-red-600 transition-colors truncate flex items-center gap-1"
                        >
                          {prompt.targetTitle || prompt.targetId}
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      </Tooltip>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 max-w-xs">
                  <p className="truncate text-gray-900" title={prompt.prompt}>
                    {prompt.prompt}
                  </p>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => onEdit(prompt)}
                      className="text-red-600 hover:text-red-700 font-medium transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(prompt)}
                      className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}