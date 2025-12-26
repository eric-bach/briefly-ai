# Plan: Email Delivery of Summaries

This plan outlines the steps to implement email notifications for video summaries, including profile management, backend integration with AWS SNS, and dashboard indicators.

## Phase 1: Database & Infrastructure [checkpoint: ]

- [x] Task: Update Database Schema & Types
  - [x] Add `notificationEmail` and `emailNotificationsEnabled` to the user profile record in DynamoDB.
  - [x] Update any related TypeScript interfaces in `frontend/lib/db.ts` or backend models.
- [x] Task: AWS SNS Infrastructure (CDK)
  - [x] Define an SNS Topic for video summaries in the CDK stack.
  - [x] Configure necessary IAM permissions for the backend to publish to this topic and manage subscriptions.
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Database & Infrastructure' (Protocol in workflow.md)

## Phase 2: Backend API & Email Logic [checkpoint: ]

- [ ] Task: Implement Settings API
  - [ ] Create/Update API endpoints to GET and POST user notification settings (email, toggle).
  - [ ] Write failing tests for retrieving and updating these settings.
  - [ ] Implement handlers and verify tests pass.
- [ ] Task: Implement SNS Subscription Management
  - [ ] Update the backend logic to handle SNS email subscriptions/unsubscriptions when the notification email changes or the toggle is flipped.
- [ ] Task: Implement Email Publish Logic
  - [ ] Update the summary generation flow to publish to SNS upon completion if notifications are enabled.
  - [ ] Write failing tests mocking SNS to verify the correct subject format (`Briefly AI: [Title]`) and body content.
  - [ ] Implement and verify tests pass.
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Backend API & Email Logic' (Protocol in workflow.md)

## Phase 3: Frontend - Profile Settings [checkpoint: ]

- [ ] Task: Implement Email Management UI in `/profile`
  - [ ] Add a field to display and edit the notification email address.
  - [ ] Write failing tests for the email input and edit state.
  - [ ] Implement UI and verify tests pass.
- [ ] Task: Implement Global Notification Toggle
  - [ ] Add a Switch/Toggle component for "Enable Email Notifications".
  - [ ] Write failing tests for toggle state changes.
  - [ ] Implement logic and verify tests pass.
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Frontend - Profile Settings' (Protocol in workflow.md)

## Phase 4: Frontend - Dashboard Indicator [checkpoint: ]

- [ ] Task: Create Email Status Indicator Component
  - [ ] Design a badge/icon component with Active (colored) and Inactive (greyed out) states.
  - [ ] Write failing tests for rendering states and navigation logic.
- [ ] Task: Integrate Indicator into Dashboard
  - [ ] Place the indicator near the "Summarize" button.
  - [ ] Connect it to the user's notification settings.
  - [ ] Implement the link to `/profile` for the inactive state.
  - [ ] Verify tests pass.
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Frontend - Dashboard Indicator' (Protocol in workflow.md)

## Phase 5: Final Polish & Verification [checkpoint: ]

- [ ] Task: End-to-End Verification
  - [ ] Manually verify the full flow: edit email -> confirm SNS link -> generate summary -> receive email.
- [ ] Task: Perform final linting and type check
- [ ] Task: Conductor - User Manual Verification 'Phase 5: Final Polish & Verification' (Protocol in workflow.md)
