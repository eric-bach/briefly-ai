# Plan: User Profile & Prompt Management

This plan outlines the steps to implement the user profile page for managing saved prompt overrides, following the project's TDD-based workflow.

## Phase 1: API Development [checkpoint: da69b6d]

- [x] Task: Design and implement `GET /api/user/prompts` to support pagination and filtering [59be37b]
  - [x] Write failing test for fetching prompts with limit, offset, and filter query params
  - [x] Update `GET` handler in `frontend/app/api/user/prompts/route.ts` (or create new)
  - [x] Verify tests pass
- [x] Task: Design and implement `PUT /api/user/prompts` (or specific route) for updating a prompt [59be37b]
  - [x] Write failing test for updating a prompt's content
  - [x] Implement `PUT` (or `PATCH`) handler
  - [x] Verify tests pass
- [x] Task: Design and implement `DELETE /api/user/prompts` for deleting a prompt [59be37b]
  - [x] Write failing test for deleting a prompt
  - [x] Implement `DELETE` handler
  - [x] Verify tests pass
- [x] Task: Conductor - User Manual Verification 'Phase 1: API Development' (Protocol in workflow.md)

## Phase 2: Frontend Setup & Navigation [checkpoint: 9a176b2]

- [x] Task: Create empty `/profile` page
  - [x] Create `frontend/app/(main)/profile/page.tsx`
  - [x] Add basic layout and header
- [x] Task: Add navigation link to Navbar Dropdown
  - [x] Update `Navbar.tsx` to include "Manage Prompts" or "Profile" link in the user dropdown
- [x] Task: Conductor - User Manual Verification 'Phase 2: Frontend Setup & Navigation' (Protocol in workflow.md)

## Phase 3: Prompt List UI (Read-Only) [checkpoint: dd55d4a]

- [x] Task: Create `PromptList` component [implicit]
  - [x] Scaffold component with props for data
- [x] Task: Implement fetching logic in Profile page [implicit]
  - [x] Use `SWR` or `useEffect` to fetch data from API
- [x] Task: Render prompt data in a table/list [implicit]
  - [x] Display Target Type, ID, Truncated Content, Date
- [x] Task: Implement Pagination controls [implicit]
  - [x] Add Next/Prev buttons and page indicators
- [x] Task: Implement Search/Filter input [implicit]
  - [x] Add input field and debounce search logic
- [x] Task: Conductor - User Manual Verification 'Phase 3: Prompt List UI (Read-Only)' (Protocol in workflow.md)

## Phase 4: Edit & Delete Interactions [checkpoint: c788c57]

- [x] Task: Implement Edit Prompt Modal/UI [implicit]
  - [x] Create Edit Dialog component
  - [x] Connect "Edit" button to open dialog
  - [x] Implement save logic calling the API
- [x] Task: Implement Delete Prompt Dialog [implicit]
  - [x] Create Confirmation Dialog component
  - [x] Connect "Delete" button to open dialog
  - [x] Implement delete logic calling the API
- [x] Task: Conductor - User Manual Verification 'Phase 4: Edit & Delete Interactions' (Protocol in workflow.md)

## Phase 5: Friendly Target IDs (Enhancement)

- [x] Task: Update Database Schema & Types [e1e14b6]
  - [x] Update `PromptOverride` interface in `frontend/lib/db.ts` to include `targetTitle` and `targetThumbnail`.
- [x] Task: Update Backend to Enrich Data [e1e14b6]
  - [x] Update `POST /api/user/prompts` to fetch video/channel details (title, thumbnail) from YouTube API before saving.
  - [x] Update `GET /api/user/prompts` to return new fields.
- [x] Task: Create Tooltip Component [e1e14b6]
  - [x] Create `frontend/components/ui/tooltip.tsx` (using Radix UI or custom Tailwind implementation).
- [x] Task: Update `PromptList` Component [e1e14b6]
  - [x] Render Title, Thumbnail, and Link.
  - [x] Add Tooltip for ID.
- [x] Task: Refine PromptList UI [873c148, 4833165]
  - [x] Remove 'Type' column.
  - [x] Add 3-dot dropdown menu for actions.
  - [x] Truncate long target titles.
  - [x] Display channel name for video prompts.
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Friendly Target IDs'
## Phase 6: Final Polish [checkpoint: 5650b12]

- [x] Task: Verify mobile responsiveness [implicit]
- [x] Task: Perform final linting and type check [c9cbd71]
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Final Polish' (Protocol in workflow.md)