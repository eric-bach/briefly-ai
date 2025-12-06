import re
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.formatters import TextFormatter

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
        api = YouTubeTranscriptApi()
        transcript = api.fetch(video_id)
        
        # Custom formatting - transcript items are objects with .text attribute
        text_transcript = " ".join([item.text for item in transcript])
        return text_transcript
    except Exception as e:
        # In a real app, we might want to log this or raise specific exceptions
        print("Error fetching transcript: ", str(e)) 
        return f"Error fetching transcript: {str(e)}"
