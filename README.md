# Briefly AI

Briefly AI is a YouTube Video Summarizer Agent.

## Features

- YouTube Video Summarizer Agent

## Getting Started

1. Clone the repository
2. Install dependencies

```
cd backend
uv sync
```

3. Run the agent

```
cd backend
docker compose up -d --build
```

## Deployment

### Backend

1. The backend is deployed using Docker Compose on a VPS (as the YouTube API requires a static IP address).

Google blocks many requests to the YouTube Data API when they originate from public cloud IP ranges (AWS, GCP, Azure). This often shows up as:

- 429 Too Many Requests
- 403 Forbidden
- The request cannot be completed because you have been blocked

### Frontend

1. The frontend infrastructure (Cognito User Pool) is deployed using AWS CDK.

```
cd infrastructure
cdk synth
cdk deploy
```

2. The frontend application is deployed on Vercel.
