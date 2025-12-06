# Architecture & Engineering Guidelines

This document defines the architectural principles, patterns, and constraints for this project.  
It is intended as **context for AI coding assistants and human contributors**.

---

## 1. High-Level System Overview

We are building an **agentic application** using **Strands Agents** and deploying it on **AWS ECS Fargate**.

Core goals:

- Strong **separation of concerns** (infra vs orchestration vs domain logic).
- An **agent-first design**, where Strands Agents coordinate tasks and tools.
- Cloud-native, **stateless containers** suitable for ECS Fargate.
- Observable, debuggable, and testable system.

Conceptual components:

1. **Agent Orchestrator Layer**

   - Strands-based agents and tool definitions.
   - Conversation / task graph logic.
   - Responsible for: orchestrating workflows (e.g. “summarize new YouTube video and email it”).

2. **Application Service Layer**

   - Business/domain services implemented as functions/classes (NOT inside agent code).
   - E.g. YouTube API client, transcript processing, email sender, persistence adapter.
   - Agents call into these via tool bindings.

3. **Infrastructure Layer**

   - AWS ECS Fargate task definitions, networking, IAM roles, logging.
   - Supporting infra like SQS/EventBridge (if used for triggers), Secrets Manager, CloudWatch.
   - CI/CD pipelines, build & deployment configs (e.g. GitHub Actions, AWS CodeBuild).

4. **Interface / Integration Layer**
   - HTTP APIs / webhooks (if any).
   - Event consumers (e.g. SNS/EventBridge for “new video” events).
   - Optional user-facing UI or CLI.

---

## 2. Separation of Concerns

### 2.1 General Principles

- **Agent code = orchestration & reasoning**
  - Decide _what_ to do and _in what order_.
  - Call tools with appropriate parameters.
  - Maintain context and react to tool outcomes.
- **Tools = pure, deterministic capabilities**

  - No business logic in agents – keep it in tools/services.
  - Tools provide stable APIs to the outside world (e.g. `fetch_youtube_transcript(video_id)`).
  - Tools should be idempotent where possible.

- **Domain services vs infra**
  - Domain services: YouTube summarization, email composition, business rules.
  - Infra: AWS SDK wrappers, clients for external APIs, configuration, logging.

We want agents to be **easily testable** by injecting fake tools and mocking external systems.

### 2.2 Directory Structure (Example)

> This is a guideline; the assistant should respect it where possible.

```text
/agent/
  agents/
    youtube_summarizer_agent.py
  tools/
    youtube_tools.py
    email_tools.py
    storage_tools.py
  prompts/
    system/
    examples/

 /app/
  ser
```
