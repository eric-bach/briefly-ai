# Plan: UI Improvements & Navbar Enhancements

This plan outlines the steps to implement the UI improvements specified in `spec.md`, following the project's TDD-based workflow.

## Phase 1: Preparation & Minor Fixes [checkpoint: 47296b2]
- [x] Task: Identify and verify components for modification (Navbar, YouTubeViewer/Accordion)
- [x] Task: Fix "Additional Instructions (Optional)" label formatting [699b986]
    - [x] Write failing test for the label text
    - [x] Update the label in the component
    - [x] Verify test passes
- [x] Task: Conductor - User Manual Verification 'Phase 1: Preparation & Minor Fixes' (Protocol in workflow.md)

## Phase 2: Navbar Link Updates [checkpoint: 2cbb027]
- [x] Task: Update Logo link to point to `/` [04aa083]
    - [x] Write failing test for Logo link destination
    - [x] Update Navbar component
    - [x] Verify test passes
- [x] Task: Update "Sumarizer" link to "Summarize" [04aa083]
    - [x] Write failing test for link label text
    - [x] Update Navbar component
    - [x] Verify test passes
- [x] Task: Conductor - User Manual Verification 'Phase 2: Navbar Link Updates' (Protocol in workflow.md)

## Phase 3: User Dropdown Implementation
- [ ] Task: Install/Verify Dropdown Menu component (Shadcn/Radix)
- [ ] Task: Replace direct User info with Dropdown Menu
    - [ ] Write failing tests for Dropdown presence and "Sign Out" option
    - [ ] Implement DropdownMenu in Navbar
    - [ ] Integrate existing Sign Out logic into the dropdown
    - [ ] Verify tests pass
- [ ] Task: Ensure mobile responsiveness for the new dropdown
- [ ] Task: Conductor - User Manual Verification 'Phase 3: User Dropdown Implementation' (Protocol in workflow.md)

## Phase 4: Final Verification & Cleanup
- [ ] Task: Run full test suite and verify coverage (>80%)
- [ ] Task: Perform final linting and type checks
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Final Verification & Cleanup' (Protocol in workflow.md)
