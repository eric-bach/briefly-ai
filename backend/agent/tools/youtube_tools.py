from strands.tools import tool
from app.services.youtube import fetch_transcript

@tool
def get_video_transcript(video_url: str) -> str:
    """
    Fetches the transcript/subtitles for a YouTube video given its URL.
    Use this tool when the user provides a YouTube link and asks for a summary or content extraction.
    """
    return fetch_transcript(video_url)
