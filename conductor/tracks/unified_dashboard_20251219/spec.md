# Spec: Unified Dashboard with Smart Input

## Goal
Simplify the user experience by unifying the single-video summarization and channel exploration features into a single route (`/dashboard`) with a smart input field.

## Requirements
- **Smart Input Detection:**
  - If input is a valid YouTube video URL, trigger the summarization flow for that video.
  - If input is a YouTube channel URL, ID, or name, trigger the channel explorer flow to list recent videos.
- **Unified UI:**
  - Move functionality from `/youtube/page.tsx` into `/dashboard/page.tsx`.
  - Maintain prompt customization capabilities for all summaries.
- **Route Consolidation:**
  - Redirect or remove the `/youtube` route.
- **UI/UX:**
  - Clean, minimalist interface following product guidelines.
  - Show loading states during URL/Channel resolution.

## Success Criteria
- Users can enter either a video link or a channel name into the same box and get the expected behavior.
- The `/youtube` route is no longer needed.
