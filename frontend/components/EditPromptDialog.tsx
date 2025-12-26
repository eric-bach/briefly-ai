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
import { Tooltip } from "@/components/ui/tooltip";

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
          <div className="space-y-2">
            <Label>Target ({prompt?.type})</Label>
            <Tooltip content={`ID: ${prompt?.targetId}`}>
               <p className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded truncate cursor-help">
                 {prompt?.targetTitle || prompt?.channelTitle || prompt?.targetId}
               </p>
            </Tooltip>
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
