# Plan: User Prompt Overrides

## Phase 1: Infrastructure & Backend API
- [x] Task: Provision DynamoDB table (`PromptOverrides`) via AWS CDK in `infrastructure/lib/data_stack.py`.
- [x] Task: Create `frontend/app/api/user/prompts/route.ts` and define GET (lookup) and POST (upsert) handlers.
- [x] Task: Write unit tests for the API handlers (mocking DynamoDB).
- [x] Task: Implement the API logic using AWS SDK (v3) to interact with DynamoDB.
- [x] Task: Conductor - User Manual Verification 'Infrastructure & Backend API' (Protocol in workflow.md)

## Phase 2: Frontend - Retrieval & Precedence Logic [checkpoint: 5267f78]
- [x] Task: Create a utility in `frontend/lib/prompt-utils.ts` to handle override lookup and precedence (Video > Channel). c67f211
- [x] Task: Write tests for the precedence logic. c67f211
- [x] Task: Update `/dashboard/page.tsx` to fetch overrides when a video or channel is identified via Smart Input. 85055cd
- [x] Task: Integrate the "Skip for this summary" toggle state into the dashboard. a1d93b3
- [x] Task: Conductor - User Manual Verification 'Frontend - Retrieval & Precedence Logic' (Protocol in workflow.md) 5267f78

## Phase 3: Frontend - UI & Persistence
- [ ] Task: Implement change detection logic to trigger the "Save" toast when a custom prompt is used.
- [ ] Task: Implement the toast notification with "Save" action and selection (Video vs Channel).
- [ ] Task: Update the "Prompt Customization" UI to show an "Override Active" badge or indicator when loaded.
- [ ] Task: Verify end-to-end flow: custom prompt -> save -> refresh -> auto-load.
- [ ] Task: Conductor - User Manual Verification 'Frontend - UI & Persistence' (Protocol in workflow.md)