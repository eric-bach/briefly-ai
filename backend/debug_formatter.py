from youtube_transcript_api.formatters import TextFormatter

transcript = [
    {"text": "Hello", "start": 0.0, "duration": 1.0},
    {"text": "World", "start": 1.0, "duration": 1.0}
]

try:
    formatter = TextFormatter()
    result = formatter.format_transcript(transcript)
    print("Success:")
    print(result)
except Exception as e:
    print(f"Error: {e}")
