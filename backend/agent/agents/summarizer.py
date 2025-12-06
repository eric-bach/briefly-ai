from strands.agent import Agent
from agent.tools.youtube_tools import get_video_transcript

system_instructions = """
You are a YouTube Video Summarizer Agent.
Your goal is to help users understand the content of YouTube videos without watching them.

When a user provides a YouTube video URL:
1. Use the `get_video_transcript` tool to fetch the text content.
2. If the transcript is successfully retrieved, summarize the key points.
3. Your summary should be concise, structured (bullet points are good), and capture the main ideas.
4. If you cannot get the transcript, apologize and explain why (e.g., no subtitles available).
"""

summarizer_agent = Agent(
    name="youtube_summarizer",
    #model="us.amazon.nova-2-lite-v1:0", # Or let it default, but explicit is often better
    model="us.anthropic.claude-haiku-4-5-20251001-v1:0",
    system_prompt=system_instructions,
    tools=[get_video_transcript]
)    