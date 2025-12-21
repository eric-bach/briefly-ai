import { getPromptOverride, PromptOverride } from './db';

/**
 * Resolves the appropriate prompt override based on precedence:
 * 1. Video-specific override (targetId = videoId)
 * 2. Channel-specific override (targetId = channelId)
 * 3. null (no override)
 * 
 * @param userId 
 * @param videoId 
 * @param channelId 
 * @param fetcher Optional dependency injection for testing
 */
export async function resolvePromptOverride(
  userId: string,
  videoId?: string,
  channelId?: string,
  fetcher: (userId: string, targetId: string) => Promise<PromptOverride | null> = getPromptOverride
): Promise<PromptOverride | null> {
  // 1. Check for Video Override
  if (videoId) {
    const videoOverride = await fetcher(userId, videoId);
    if (videoOverride) {
      return videoOverride;
    }
  }

  // 2. Check for Channel Override
  if (channelId) {
    const channelOverride = await fetcher(userId, channelId);
    if (channelOverride) {
      return channelOverride;
    }
  }

  return null;
}

/**
 * Determines if the "Save Prompt" toast should be shown.
 * 
 * @param currentInput The current text in the custom prompt area.
 * @param originalOverride The prompt text that was originally loaded (or null).
 * @param hasStarted Whether the summarization process has started.
 */
export function shouldShowSavePrompt(
  currentInput: string,
  originalOverride: string | null,
  hasStarted: boolean
): boolean {
  if (!hasStarted) return false;
  if (!currentInput || currentInput.trim() === '') return false;
  
  // If no original override, and we have input, it's new -> Save
  if (originalOverride === null) return true;

  // If we have an original override, only show if different
  return currentInput.trim() !== originalOverride.trim();
}

/**
 * Saves a prompt override to the backend.
 */
export async function saveOverride(
  targetId: string,
  prompt: string,
  type: 'video' | 'channel'
): Promise<boolean> {
  try {
    const res = await fetch('/api/user/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId, prompt, type })
    });
    return res.ok;
  } catch (e) {
    console.error("Failed to save override", e);
    return false;
  }
}
