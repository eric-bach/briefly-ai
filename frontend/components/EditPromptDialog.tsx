"use client";

import { useState, useEffect } from "react";
import { PromptOverride } from "@/lib/db";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import Image from "next/image";

interface EditPromptDialogProps {
  prompt: PromptOverride | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedPrompt: string) => Promise<void>;
}

export function EditPromptDialog({
  prompt,
  isOpen,
  onClose,
  onSave,
}: EditPromptDialogProps) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (prompt) setContent(prompt.prompt);
  }, [prompt]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(content);
      onClose();
    } catch (e) {
      console.error(e);
      alert("Failed to save prompt override.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Prompt Override</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2 w-full min-w-0 relative">
            <Label>Target ({prompt?.type})</Label>
            <div className="flex gap-3 items-center">
              {prompt?.targetThumbnail && (
                <div className="relative w-16 h-10 flex-shrink-0 rounded overflow-hidden border border-gray-100">
                  <Image
                    src={prompt.targetThumbnail}
                    alt="Target thumbnail"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="group relative flex-grow min-w-0">
                 <input 
                   readOnly
                   value={prompt?.targetTitle || prompt?.channelTitle || prompt?.targetId || ''}
                   className="text-sm font-normal text-gray-900 bg-gray-50 px-2 py-2 rounded block w-full border-none focus:ring-0 cursor-default"
                 />
                 <div className="absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-sm top-full left-1/2 transform -translate-x-1/2 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                   ID: {prompt?.targetId}
                   <div className="absolute w-2 h-2 bg-gray-900 transform rotate-45 left-1/2 -translate-x-1/2 -top-1"></div>
                 </div>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="prompt-content">Prompt Instructions</Label>
            <Textarea
              id="prompt-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[150px]"
              placeholder="Enter summarization instructions..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !content.trim()}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
