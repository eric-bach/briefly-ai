# Specification: Email Delivery of Summaries

## Overview
This track enables users to receive AI-generated video summaries directly in their email inbox. Users can manage a dedicated notification email address and toggle the service globally from their profile.

## Functional Requirements

### 1. User Profile Management (`/profile`)
- **Notification Email:** 
    - Display the current notification email address.
    - Default to the user's sign-up email address if no override is provided.
    - Provide "Edit" functionality to change the email.
    - Changing the email should trigger a new AWS SNS verification/confirmation flow.
- **Global Toggle:**
    - A toggle switch to "Enable Email Notifications".
    - When ON, every successful summarization triggers an email.
    - When OFF, no emails are sent.

### 2. Dashboard Integration (`/dashboard`)
- **Email Status Indicator:**
    - A small badge or icon located near the "Summarize" button.
    - **Active State:** Visible and highlighted when email notifications are toggled ON.
    - **Inactive State:** Visible but greyed out when toggled OFF.
    - **Interaction:** Clicking the inactive indicator should navigate the user to the profile page to enable the feature.

### 3. Backend & Notification Logic
- **AWS SNS Integration:**
    - Use AWS SNS to deliver emails.
    - Handle email subscription and the mandatory verification flow (sending confirmation links).
- **Trigger:**
    - Upon successful generation of a summary, check if the user has email notifications enabled.
    - If enabled, publish a message to the SNS topic.
- **Email Content:**
    - **Subject:** `Briefly AI: [Video Title]`
    - **Body:** The full text of the AI-generated summary.

## Non-Functional Requirements
- **Reliability:** Email sending should be asynchronous to ensure it doesn't delay the UI's display of the summary.
- **Security:** Ensure users can only modify their own notification settings.

## Acceptance Criteria
- [ ] User can view and edit their notification email in the profile.
- [ ] Notification email defaults to the account email.
- [ ] A global toggle correctly enables/disables the notification service.
- [ ] dashboard displays a badge/icon indicating email status (Active vs. Inactive).
- [ ] Inactive dashboard badge links to the profile page.
- [ ] Emails are sent with the correct subject format: "Briefly AI: [Title]".
- [ ] New email addresses receive an SNS confirmation link before being used.

## Out of Scope
- Per-video email overrides (notifications are currently all-or-nothing).
- Customizing email templates or formats (HTML vs. Text).
