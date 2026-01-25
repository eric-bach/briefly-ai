# Briefly AI

Briefly AI is a YouTube Video Summarizer Agent.

## Features

- YouTube Video Summarizer Agent

## Getting Started

1. Clone the repository

2. Install dependencies

   ```
   cd backend\agent
   uv sync
   ```

3. Run the agent

   ```
   cd backend\agent
   uv run python agent.py
   ```

## Deployment

### Backend

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

### Frontend

1. The frontend application is deployed on Vercel.
