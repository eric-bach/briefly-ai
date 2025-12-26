import { PromptOverride } from "@/lib/db";
import { User, Video, ExternalLink, MoreVertical, Pencil, Trash } from "lucide-react";
import Image from "next/image";
import { Tooltip } from "./ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

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
                    <div className="flex flex-col min-w-0 max-w-[200px] md:max-w-[300px]">
                      <Tooltip content={`ID: ${prompt.targetId}`}>
                        <a 
                          href={link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="font-medium text-gray-900 hover:text-red-600 transition-colors truncate flex items-center gap-1"
                        >
                          <span className="truncate">{prompt.targetTitle || prompt.targetId}</span>
                          <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-50" />
                        </a>
                      </Tooltip>
                      <span className="text-xs text-gray-500 capitalize flex items-center gap-1">
                         {prompt.type === 'video' ? <Video className="w-3 h-3" /> : <User className="w-3 h-3" />}
                         {prompt.type}
                         {prompt.channelTitle && (
                           <>
                             <span className="text-gray-300">•</span>
                             <span className="truncate max-w-[120px]" title={prompt.channelTitle}>{prompt.channelTitle}</span>
                           </>
                         )}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 max-w-xs">
                  <p className="line-clamp-2 text-gray-900" title={prompt.prompt}>
                    {prompt.prompt}
                  </p>
                </td>
                <td className="px-6 py-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(prompt)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => onDelete(prompt)}
                        className="text-red-600 focus:text-red-600 focus:bg-red-50"
                      >
                        <Trash className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}