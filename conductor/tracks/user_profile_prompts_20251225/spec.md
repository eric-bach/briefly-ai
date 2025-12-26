# Specification: User Profile & Prompt Management

## Overview
This track introduces a dedicated "User Profile" page accessible via the new Dropdown Menu in the Navigation Bar. The primary feature of this page is a comprehensive management interface for the user's saved prompt overrides. Users will be able to view, filter, edit, and delete their saved prompts.

## Functional Requirements

### 1. Navigation
- **Access Point:** The "My Account" label in the Navbar Dropdown Menu (implemented in the previous track) should be a clickable link or have a "Profile" / "Manage Prompts" link added to the dropdown menu that navigates to `/profile`.

### 2. User Profile Page (`/profile`)
- **Layout:** A clean, responsive layout using the application's existing design system (Tailwind CSS, Shadcn/Radix UI).
- **Header:** Displays the user's basic info (e.g., "My Saved Prompts" or similar title).

### 3. Prompt Management List
- **Display:** A paginated list or table of saved prompt overrides.
- **Columns/Fields:**
    - **Target Type:** Icon or text indicating if it's for a "Video" or "Channel".
    - **Target ID:** The Video ID or Channel ID.
    - **Prompt Content:** A truncated view of the prompt text.
    - **Last Updated:** Date/Time of the last modification.
- **Pagination:** Standard pagination controls (Next/Prev, Page Numbers) to handle large numbers of prompts.

### 4. Filtering
- **Search:** A text input to filter prompts by their content.

### 5. Editing Prompts
- **Interaction:** Clicking an "Edit" button on a row opens a modal or inline editor.
- **Behavior:**
    - Users can modify the prompt text.
    - **Save:** Changes are NOT auto-saved. The user must click a "Save" button to commit changes.
    - **Cancel:** Users can cancel editing to discard changes.

### 6. Deleting Prompts
- **Interaction:** Clicking a "Delete" button on a row.
- **Safety:** A confirmation dialog (modal) must appear asking "Are you sure you want to delete this prompt override?".
- **Action:** Upon confirmation, the prompt is permanently deleted from the database and removed from the list.

## Non-Functional Requirements
- **Performance:** Pagination should be server-side or efficient client-side if the dataset is small (initially likely small, but design for scale).
- **Security:** Ensure users can only view and manage their *own* prompts.
- **UX:** Use existing UI components (Shadcn/Radix) for consistency.

## Acceptance Criteria
- [ ] User can navigate to `/profile` from the Navbar dropdown.
- [ ] The Profile page displays a list of saved prompts.
- [ ] The list shows Target Type, ID, Truncated Content, and Date.
- [ ] Users can filter the list by prompt text content.
- [ ] Users can edit a prompt and save changes via a "Save" button.
- [ ] Users can delete a prompt, with a mandatory confirmation dialog.
- [ ] Pagination works correctly for the list.
