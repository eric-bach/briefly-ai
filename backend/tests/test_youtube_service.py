from unittest.mock import patch, MagicMock
from app.services.youtube import extract_video_id, fetch_transcript

def test_extract_video_id():
    # Standard URL
    url1 = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    assert extract_video_id(url1) == "dQw4w9WgXcQ"
    
    # Short URL
    url2 = "https://youtu.be/dQw4w9WgXcQ?t=1"
    assert extract_video_id(url2) == "dQw4w9WgXcQ"
    
    # Complex URL
    url3 = "https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=youtu.be"
    assert extract_video_id(url3) == "dQw4w9WgXcQ"

@patch("app.services.youtube.YouTubeTranscriptApi")
def test_fetch_transcript_success(mock_api_class):
    # Mock the instance and its fetch method
    mock_instance = MagicMock()
    # Create mock objects with .text attribute
    mock_snippet1 = MagicMock()
    mock_snippet1.text = "Never gonna give you up"
    mock_snippet2 = MagicMock()
    mock_snippet2.text = "Never gonna let you down"
    
    mock_instance.fetch.return_value = [mock_snippet1, mock_snippet2]
    mock_api_class.return_value = mock_instance
    
    url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    result = fetch_transcript(url)
    
    assert "Never gonna give you up" in result
    assert "Never gonna let you down" in result
    mock_instance.fetch.assert_called_with("dQw4w9WgXcQ")

@patch("app.services.youtube.YouTubeTranscriptApi")
def test_fetch_transcript_failure(mock_api_class):
    mock_instance = MagicMock()
    mock_instance.fetch.side_effect = Exception("Subtitles disabled")
    mock_api_class.return_value = mock_instance
    
    url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    result = fetch_transcript(url)
    
    assert "Error fetching transcript" in result
    assert "Subtitles disabled" in result
