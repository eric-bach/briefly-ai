import unittest
from unittest.mock import MagicMock, patch
import sys
import os
from datetime import datetime, timezone

# Add directory to path to import main
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Mock boto3 before importing main since it might not be installed locally
sys.modules['boto3'] = MagicMock()

# Mock aws_lambda_powertools
mock_powertools = MagicMock()
mock_logger = MagicMock()

def identity_decorator(func=None, **kwargs):
    if callable(func):
        return func
    def wrapper(f):
        return f
    return wrapper

mock_logger.inject_lambda_context.side_effect = identity_decorator
mock_powertools.Logger.return_value = mock_logger
sys.modules['aws_lambda_powertools'] = mock_powertools

# Set Environment Variables required by main.py
os.environ['TABLE_NAME'] = 'TEST_TABLE'
os.environ['SES_SOURCE_EMAIL'] = 'test@example.com'
os.environ['AGENT_RUNTIME_ARN'] = 'arn:aws:bedrock:us-east-1:123456789012:agent-runtime/test-agent'

from main import handler, process_channel

class TestChannelPoller(unittest.TestCase):
    
    @patch('main.dynamodb')
    @patch('main.agentcore')
    @patch('main.ses')
    @patch('main.urllib.request.urlopen')
    def test_poller_new_video_fresh(self, mock_urlopen, mock_ses, mock_bedrock, mock_dynamodb):
        # Mock Feed content (Fresh video)
        now = datetime.now(timezone.utc)
        rss_content = f"""
        <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
         <entry>
          <id>yt:video:VIDEO123</id>
          <yt:videoId>VIDEO123</yt:videoId>
          <title>New Video Title</title>
          <link rel="alternate" href="https://www.youtube.com/watch?v=VIDEO123"/>
          <published>{now.isoformat()}</published>
         </entry>
        </feed>
        """
        mock_response = MagicMock()
        mock_response.read.return_value = rss_content.encode('utf-8')
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response
        
        # Mock DynamoDB Table
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        
        # Mock Scan response (channels)
        mock_table.scan.return_value = {
            'Items': [{'targetId': 'SUBSCRIPTION#CHANNEL1'}]
        }
        
        # Mock Tracker Get (None = First Run)
        mock_table.get_item.return_value = {} # No tracker yet
        
        # Mock Subscribers Query
        mock_table.query.return_value = {
            'Items': [
                {'userId': 'user1', 'targetId': 'SUBSCRIPTION#CHANNEL1'}
            ]
        }
        
        # Mock User Profile Get
        def get_item_side_effect(Key):
            if Key.get('targetId') == 'PROFILE#data':
                return {'Item': {'emailNotificationsEnabled': True, 'notificationEmail': 'test@example.com'}}
            return {} # for tracker
            
        mock_table.get_item.side_effect = get_item_side_effect
        
        # Mock Bedrock Response
        mock_bedrock.invoke_agent_runtime.return_value = {
            'completion': [{'chunk': {'bytes': b'Summary of the video'}}]
        }
        
        # Run Handler
        response = handler({}, {})
        
        # Assertions
        self.assertEqual(response['statusCode'], 200)
        
        # Check if email sent (Should be sent because fresh)
        mock_ses.send_email.assert_called_once()
        call_args = mock_ses.send_email.call_args[1]
        self.assertEqual(call_args['Destination']['ToAddresses'], ['test@example.com'])
        self.assertIn('New Video Title', call_args['Message']['Subject']['Data'])

    @patch('main.dynamodb')
    @patch('main.agentcore')
    @patch('main.ses')
    @patch('main.urllib.request.urlopen')
    def test_poller_new_video_stale(self, mock_urlopen, mock_ses, mock_bedrock, mock_dynamodb):
        # Mock Feed content (Stale video > 24h old)
        old_date = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc).isoformat()
        rss_content = f"""
        <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
         <entry>
          <id>yt:video:VIDEO123</id>
          <yt:videoId>VIDEO123</yt:videoId>
          <title>Old Video Title</title>
          <link rel="alternate" href="https://www.youtube.com/watch?v=VIDEO123"/>
          <published>{old_date}</published>
         </entry>
        </feed>
        """
        mock_response = MagicMock()
        mock_response.read.return_value = rss_content.encode('utf-8')
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response
        
        # Mock DynamoDB
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_table.scan.return_value = {
            'Items': [{'targetId': 'SUBSCRIPTION#CHANNEL1'}]
        }
        # First Run (No tracker)
        mock_table.get_item.return_value = {} 
        
        # Run Handler
        handler({}, {})
        
        # Assertions
        # Should NOT send email
        mock_ses.send_email.assert_not_called()
        # Should UPDATE tracker
        mock_table.put_item.assert_called()
        call_args = mock_table.put_item.call_args[1]
        self.assertEqual(call_args['Item']['lastVideoId'], 'VIDEO123')

    @patch('main.dynamodb')
    @patch('main.agentcore')
    @patch('main.ses')
    @patch('main.urllib.request.urlopen')

    def test_poller_no_new_video(self, mock_urlopen, mock_ses, mock_bedrock, mock_dynamodb):
         # Mock Feed content
        rss_content = """
        <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
         <entry>
          <yt:videoId>VIDEO123</yt:videoId>
          <title>New Video Title</title>
          <link rel="alternate" href="https://www.youtube.com/watch?v=VIDEO123"/>
         </entry>
        </feed>
        """
        mock_response = MagicMock()
        mock_response.read.return_value = rss_content.encode('utf-8')
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response
        
        # Mock Table
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_table.scan.return_value = {'Items': [{'targetId': 'SUBSCRIPTION#CHANNEL1'}]}
        
        # Mock Tracker Get (SAME VIDEO ID)
        mock_table.get_item.return_value = {'Item': {'lastVideoId': 'VIDEO123'}}
        
        # Run Handler
        handler({}, {})
        
        # Assertions
        mock_ses.send_email.assert_not_called()
        mock_bedrock.invoke_agent_runtime.assert_not_called()

    @patch('main.dynamodb')
    @patch('main.agentcore')
    @patch('main.ses')
    @patch('main.urllib.request.urlopen')
    def test_poller_new_video_raw_stream(self, mock_urlopen, mock_ses, mock_bedrock, mock_dynamodb):
        # Mock Feed content (Fresh video)
        now = datetime.now(timezone.utc)
        rss_content = f"""
        <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
         <entry>
          <id>yt:video:VIDEO_RAW</id>
          <yt:videoId>VIDEO_RAW</yt:videoId>
          <title>Raw Stream Video</title>
          <link rel="alternate" href="https://www.youtube.com/watch?v=VIDEO_RAW"/>
          <published>{now.isoformat()}</published>
         </entry>
        </feed>
        """
        mock_response = MagicMock()
        mock_response.read.return_value = rss_content.encode('utf-8')
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response
        
        # Mock DynamoDB
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_table.scan.return_value = {'Items': [{'targetId': 'SUBSCRIPTION#CHANNEL1', 'channelTitle': 'Test Channel'}]}
        
        # Mock Tracker and User Profile
        def get_item_side_effect(Key):
            if Key.get('targetId') == 'PROFILE#data':
                return {'Item': {'emailNotificationsEnabled': True, 'notificationEmail': 'test@example.com'}}
            return {}
            
        mock_table.get_item.side_effect = get_item_side_effect
        mock_table.query.return_value = {'Items': [{'userId': 'user1', 'targetId': 'SUBSCRIPTION#CHANNEL1'}]}
        
        # Mock Bedrock Response with RAW STREAM (No data: prefix)
        mock_stream = MagicMock()
        # simulate iter_lines yielding bytes
        mock_stream.iter_lines.return_value = [b"Raw summary part 1 ", b"part 2"]
        
        mock_bedrock.invoke_agent_runtime.return_value = {
            'response': mock_stream
        }
        
        # Run Handler
        response = handler({}, {})
        
        # Assertions
        self.assertEqual(response['statusCode'], 200)
        mock_ses.send_email.assert_called_once()
        call_args = mock_ses.send_email.call_args[1]
        self.assertIn('Raw summary part 1 part 2', call_args['Message']['Body']['Text']['Data'])

    @patch('main.dynamodb')
    @patch('main.agentcore')
    @patch('main.ses')
    @patch('main.urllib.request.urlopen')
    def test_email_markdown_formatting(self, mock_urlopen, mock_ses, mock_bedrock, mock_dynamodb):
        # Mock Feed content
        now = datetime.now(timezone.utc)
        rss_content = f"""
        <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
         <entry>
          <yt:videoId>VIDEO_MD</yt:videoId>
          <title>Markdown Video</title>
          <link rel="alternate" href="https://www.youtube.com/watch?v=VIDEO_MD"/>
          <published>{now.isoformat()}</published>
         </entry>
        </feed>
        """
        mock_response = MagicMock()
        mock_response.read.return_value = rss_content.encode('utf-8')
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response
        
        # Mock DynamoDB
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_table.scan.return_value = {'Items': [{'targetId': 'SUBSCRIPTION#CHANNEL_MD'}]}
        mock_table.get_item.return_value = {} # No tracker yet
        
        # Mock Subscribers
        mock_table.query.return_value = {
            'Items': [{'userId': 'user1', 'targetId': 'SUBSCRIPTION#CHANNEL_MD'}]
        }
        
        # Mock User Profile
        def get_item_side_effect(Key):
            if Key.get('targetId') == 'PROFILE#data':
                return {'Item': {'emailNotificationsEnabled': True, 'notificationEmail': 'test@example.com'}}
            return {}
        mock_table.get_item.side_effect = get_item_side_effect
        
        # Mock Bedrock Response with Markdown
        markdown_summary = b"### Key Takeaways\n\n- Point A\n- Point B\n\n**Conclusion**"
        mock_bedrock.invoke_agent_runtime.return_value = {
            'completion': [{'chunk': {'bytes': markdown_summary}}]
        }
        
        # Run Handler
        handler({}, {})
        
        # Assertions
        mock_ses.send_email.assert_called_once()
        call_args = mock_ses.send_email.call_args[1]
        html_body = call_args['Message']['Body']['Html']['Data']
        
        # Check for HTML tags
        self.assertIn('<h3>Key Takeaways</h3>', html_body)
        self.assertIn('<ul>', html_body)
        self.assertIn('<li>Point A</li>', html_body)
        self.assertIn('<li>Point B</li>', html_body)
        self.assertIn('<strong>Conclusion</strong>', html_body)

if __name__ == '__main__':
    unittest.main()
