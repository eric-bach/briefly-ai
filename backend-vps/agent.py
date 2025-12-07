import os
import sys
import json
import re
from dotenv import load_dotenv
from strands import Agent, tool
from strands.models.gemini import GeminiModel
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import WebshareProxyConfig

# Load environment variables
load_dotenv()

# Ensure backend root is in python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

system_instructions = """
You are a YouTube Video Summarizer Agent.
Your goal is to help users understand the content of YouTube videos without watching them.

When a user provides a YouTube video URL:
1. Use the `get_video_transcript` tool to fetch the text content.
2. If the transcript is successfully retrieved, summarize the key points.
3. Your summary should be concise, structured (bullet points are good), and capture the main ideas.
4. If you cannot get the transcript, apologize and explain why (e.g., no subtitles available).
"""

gemini_model = GeminiModel(
    client_args={
        "api_key": os.environ.get("GEMINI_API_KEY"),
    },
    model_id=os.environ.get("GEMINI_MODEL_ID")
)

app = BedrockAgentCoreApp()

def extract_video_id(url: str) -> str:
    """
    Extracts the video ID from a YouTube URL.
    Supports standard and short URLs.
    """
    # Regex for standard and short URLs
    # e.g. https://www.youtube.com/watch?v=VIDEO_ID
    # e.g. https://youtu.be/VIDEO_ID
    regex = r"(?:v=|\/)([0-9A-Za-z_-]{11}).*"
    match = re.search(regex, url)
    if match:
        return match.group(1)
    raise ValueError("Invalid YouTube URL. Could not extract video ID.")

def fetch_transcript(video_url: str) -> str:
    """
    Fetches the transcript for a YouTube video.
    Returns the transcript as a single string.
    """
    try:
        video_id = extract_video_id(video_url)
        api = YouTubeTranscriptApi(
            proxy_config=WebshareProxyConfig(
                proxy_username=os.environ.get("WEBSHARE_USERNAME"),
                proxy_password=os.environ.get("WEBSHARE_PASSWORD")
            )
        )
        transcript = api.fetch(video_id)
        
        # Custom formatting - transcript items are objects with .text attribute
        text_transcript = " ".join([item.text for item in transcript])
        return text_transcript
    except Exception as e:
        # In a real app, we might want to log this or raise specific exceptions
        print("Error fetching transcript: ", str(e)) 
        return f"Error fetching transcript: {str(e)}"

@tool
def get_video_transcript(video_url: str) -> str:
    """
    Fetches the transcript/subtitles for a YouTube video given its URL.
    Use this tool when the user provides a YouTube link and asks for a summary or content extraction.
    """
    return fetch_transcript(video_url)

@app.entrypoint
async def invoke(payload):
    print(f"Received payload: {json.dumps(payload)}")

    video_url = payload.get('videoUrl', '')
    if not video_url:
        yield "Error: Missing video_url parameter"

    try:
        #agent = Agent()
        agent = Agent(
            name="youtube_summarizer",
            model=gemini_model,
            system_prompt=system_instructions,
            tools=[get_video_transcript]
        )    
        async for event in agent.stream_async(f"Summarize this YouTube video: {video_url}"):
            if "data" in event:
                yield event["data"]
        print("\nAgent completed")
    except Exception as e:
        error_response = {"error": str(e), "type": "stream_error"}
        print(f"Streaming error: {error_response}")
        yield error_response
    
if __name__ == "__main__":
    print("Agent started...")
    app.run()
