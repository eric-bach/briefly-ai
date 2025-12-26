# Specification: UI Improvements & Navbar Enhancements

## Overview
This track focuses on several specific UI improvements to the application's navigation bar and input forms. The goals are to improve navigation flow, clarify labeling, enhance the user account interface with a dropdown menu, and fix minor formatting issues.

## Functional Requirements

### 1. Navigation Bar - Logo
- **Current Behavior:** Clicking the "Briefly AI" logo redirects to `/dashboard`.
- **New Behavior:** Clicking the "Briefly AI" logo must redirect to the root path `/`.

### 2. Navigation Bar - Summarize Link
- **Current Behavior:** The link labeled "Sumarizer" points to `/dashboard`.
- **New Behavior:** The link label must be changed to "Summarize". The destination `/dashboard` remains unchanged.

### 3. Navigation Bar - User Menu
- **Current Behavior:** Displays the user's email and a "Sign Out" link directly.
- **New Behavior:**
    - Replace the direct display with a Dropdown Menu component (using Shadcn/Radix UI patterns).
    - **Trigger:** Displays a User icon (avatar/person) and/or the user's email.
    - **Menu Content:**
        - "Sign Out" option.
    - **Future-proofing:** The structure should allow for easily adding more options later (e.g., Settings, Profile).

### 4. Input Form - Accordion Label
- **Current Behavior:** The accordion label reads "Additional Instructions(Optional)" (missing space).
- **New Behavior:** Update the label to read "Additional Instructions (Optional)".

## Non-Functional Requirements
- **Styling:** Ensure the new User Dropdown matches the existing application theme and Shadcn/Radix UI design language.
- **Responsiveness:** Ensure the changes work correctly on mobile devices.

## Acceptance Criteria
- [ ] Clicking "Briefly AI" takes the user to the landing page (`/`).
- [ ] The Navbar link says "Summarize" instead of "Sumarizer".
- [ ] A User Dropdown menu is implemented.
    - [ ] Clicking the trigger reveals the "Sign out" option.
    - [ ] Clicking "Sign out" successfully logs the user out.
- [ ] The "Additional Instructions" accordion label has correct spacing.
