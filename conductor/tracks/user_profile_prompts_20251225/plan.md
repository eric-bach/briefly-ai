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
- [~] Task: Create empty `/profile` page
    - [ ] Create `frontend/app/(main)/profile/page.tsx`
    - [ ] Add basic layout and header
- [ ] Task: Add navigation link to Navbar Dropdown
    - [ ] Update `Navbar.tsx` to include "Manage Prompts" or "Profile" link in the user dropdown
- [x] Task: Conductor - User Manual Verification 'Phase 2: Frontend Setup & Navigation' (Protocol in workflow.md)

## Phase 3: Prompt List UI (Read-Only)
- [ ] Task: Create `PromptList` component
    - [ ] Scaffold component with props for data
- [ ] Task: Implement fetching logic in Profile page
    - [ ] Use `SWR` or `useEffect` to fetch data from API
- [ ] Task: Render prompt data in a table/list
    - [ ] Display Target Type, ID, Truncated Content, Date
- [ ] Task: Implement Pagination controls
    - [ ] Add Next/Prev buttons and page indicators
- [ ] Task: Implement Search/Filter input
    - [ ] Add input field and debounce search logic
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Prompt List UI (Read-Only)' (Protocol in workflow.md)

## Phase 4: Edit & Delete Interactions
- [ ] Task: Implement Edit Prompt Modal/UI
    - [ ] Create Edit Dialog component
    - [ ] Connect "Edit" button to open dialog
    - [ ] Implement save logic calling the API
- [ ] Task: Implement Delete Prompt Dialog
    - [ ] Create Confirmation Dialog component
    - [ ] Connect "Delete" button to open dialog
    - [ ] Implement delete logic calling the API
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Edit & Delete Interactions' (Protocol in workflow.md)

## Phase 5: Final Polish
- [ ] Task: Verify mobile responsiveness
- [ ] Task: Final linting and type check
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Final Polish' (Protocol in workflow.md)
