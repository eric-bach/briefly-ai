# Spec: User Prompt Overrides

## Overview

This track enables users to save custom summarization prompts (overrides) for specific YouTube videos or entire channels. This ensures a consistent, personalized experience for recurring content types without requiring manual prompt entry every time.

## Functional Requirements

- **Storage:** Use a DynamoDB table to store overrides, keyed by `userId` and either `videoId` or `channelId`.
- **API:** Implement a new Next.js API route `/api/user/prompts` to handle CRUD (Create, Read, Update, Delete) operations for these overrides.
- **Discovery & Loading:**
  - When a video is selected for summarization, the app checks for a Video-level override first.
  - If none exists, it checks for a Channel-level override.
  - If found, the override is automatically loaded into the prompt customization field.
- **Saving Overrides:**
  - If a user enters a custom prompt that differs from a saved override (or the default), a toast notification will appear after the summary begins, offering a "Save" action.
  - The "Save" action will prompt the user to choose between saving for the "This Video Only" or "This Entire Channel".
- **One-Time Toggle:**
  - If a saved override is loaded, a toggle will appear in the "Prompt Customization" area allowing the user to "Skip for this summary" without deleting the saved record.
- **Precedence:** Video-specific overrides ALWAYS take precedence over Channel-level overrides.

## Non-Functional Requirements

- **Performance:** Prompt lookup should add minimal latency (<200ms) to the dashboard loading state.
- **UX:** The saving process must be non-intrusive (using toast notifications).

## Acceptance Criteria

- [ ] Users can save a custom prompt for a specific video via a toast notification.
- [ ] Users can save a custom prompt for an entire channel via a toast notification.
- [ ] Saved prompts are correctly retrieved and applied when visiting a video/channel again.
- [ ] Video-level overrides correctly "shadow" channel-level overrides.
- [ ] The "Use Saved Prompt" toggle correctly enables/disables the override for a single run.
- [ ] DynamoDB table is correctly provisioned and accessible via the API.

## Out of Scope

- Management UI for viewing _all_ saved overrides (this can be a future "Settings" enhancement).
- Sharing prompt overrides between users.
