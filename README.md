# Briefly AI

Briefly AI is a YouTube Video Summarizer Agent.

## Features

- YouTube Video Summarizer Agent

## Getting Started

The project contains 3 backends for various deployment options:

    - `backend-agentcore`: Deployment to Bedrock AgentCore using AgentCore CLI
    - `backend-cdk`: Deployment to Bedrock AgentCore using AWS CDK
    - `backend-vps`: Deployment to a VPS

1. Clone the repository

2. Install dependencies

   ```
   cd backend-agentcore
   cd backend-cdk
   cd backend-vps
   uv sync
   ```

3. Run the agent

   ```
   cd backend-agentcore
   uv run python agent_deployment/agent.py

   cd backend-cdk
   uv run python agent_deployment/agent.py

   cd backend-vps
   docker compose up -d --build
   ```

## Deployment

### Backend

#### Option 1: AgentCore CLI

1. uv run agentcore launch

2. uv run agentcore invoke '{"videoUrl": "https://www.youtube.com/watch?v=8bMh8azh3CY"}'

#### Option 2: AWS CDK

1. Deploy the backend using AWS CDK

   ```
   cd infrastructure
   ./deploy.sh
   ```

2. Invoke AgentCore Runtime.

   NOTE: Remove the leading "www." from the video URL to ensure it encodes.

   ```
   aws bedrock-agentcore invoke-agent-runtime \
    --agent-runtime-arn arn:aws:bedrock-agentcore:us-east-1:524849261220:runtime/RUNTIME_ID \
    --qualifier DEFAULT \
    --payload $(echo '{"videoUrl": "http://youtube.com/watch?v=8bMh8azh3CY"}' | base64) \
    --output json > response.json
   ```

#### Option 3: VPS

1. Copy the contents of `backend-vps` to your VPS.

2. Run the agent

   ```
   cd backend-vps
   docker compose up -d --build
   ```

3. Invoke the agent

   ```

   ```

### Frontend

1. The frontend infrastructure (Cognito User Pool) is deployed using AWS CDK.

```
cd infrastructure
cd deploy.sh
```

2. The frontend application is deployed on Vercel.
