# Plan: Unified Dashboard with Smart Input

## Phase 1: Analysis & Infrastructure
- [ ] Task: Analyze existing `YouTubeViewer` component and API routes (`api/youtube/videos`) to understand how channel searching works.
- [ ] Task: Define the "Smart Input" logic (regex/parsing) to distinguish between Video URLs and Channel identifiers.
- [ ] Task: Conductor - User Manual Verification 'Analysis & Infrastructure' (Protocol in workflow.md)

## Phase 2: Implementation
- [ ] Task: Update `/dashboard/page.tsx` state management to handle both "Video Mode" and "Channel Mode".
- [ ] Task: Implement the smart input parsing logic in the frontend.
- [ ] Task: Integrate the channel video listing UI (from `/youtube/page.tsx`) into the dashboard.
- [ ] Task: Ensure prompt customization settings correctly apply to videos selected from a channel list.
- [ ] Task: Conductor - User Manual Verification 'Implementation' (Protocol in workflow.md)

## Phase 3: Cleanup & Finalization
- [ ] Task: Remove the `/frontend/app/(main)/youtube` directory.
- [ ] Task: Update any navigation components (e.g., `Navbar.tsx`) to remove links to the old YouTube page.
- [ ] Task: Verify the "No Dark Mode" and "Clean/Modern" aesthetic is maintained.
- [ ] Task: Conductor - User Manual Verification 'Cleanup & Finalization' (Protocol in workflow.md)
