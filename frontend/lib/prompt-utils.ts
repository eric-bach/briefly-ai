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
