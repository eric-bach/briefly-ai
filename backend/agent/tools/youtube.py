import os
import re
from strands import tool
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import WebshareProxyConfig

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
    raise ValueError("❌ Invalid YouTube URL. Could not extract video ID.")

@tool
def get_video_transcript(video_url: str) -> str:
    """
    Fetches the transcript/subtitles for a YouTube video given its URL.
    Use this tool when the user provides a YouTube link and asks for a summary or content extraction.

    Returns the transcript as a single string.
    """
    try:
        video_id = extract_video_id(video_url)
        
        print("Fetching transcript for video: ", video_id)

        api = YouTubeTranscriptApi(
            proxy_config=WebshareProxyConfig(
                proxy_username=os.environ.get("WEBSHARE_PROXY_USERNAME"),
                proxy_password=os.environ.get("WEBSHARE_PROXY_PASSWORD")
            )
        )
        transcript = api.fetch(video_id)
        
        text_transcript = " ".join([item.text for item in transcript])

        print("Transcript fetched successfully")

        return text_transcript
    except Exception as e:
        print("❌ Error fetching transcript: ", str(e)) 
        raise e