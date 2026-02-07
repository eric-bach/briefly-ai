import unittest
from unittest.mock import MagicMock, patch
import sys
import os
import json
from datetime import datetime, timezone

# Add directory to path to import main
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Mock boto3 before importing main since it might not be installed locally
sys.modules['boto3'] = MagicMock()
sys.modules['botocore'] = MagicMock()
sys.modules['botocore.config'] = MagicMock()

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

    @patch('main.dynamodb')
    @patch('main.agentcore')
    @patch('main.ses')
    @patch('main.urllib.request.urlopen')
    def test_retry_increment(self, mock_urlopen, mock_ses, mock_bedrock, mock_dynamodb):
        # Mock Feed
        rss_content = self._create_rss("VIDEO_RETRY", "Retry Video", datetime.now(timezone.utc).isoformat())
        self._mock_feed(mock_urlopen, rss_content)
        
        # Mock DynamoDB
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_table.scan.return_value = {'Items': [{'targetId': 'SUBSCRIPTION#CHANNEL_RETRY'}]}
        
        # Mock Tracker (First attempt, no previous retry)
        mock_table.get_item.return_value = {'Item': {'lastVideoId': 'OLD_VIDEO'}}
        
        # Mock Subscribers
        mock_table.query.return_value = {
            'Items': [{'userId': 'user1', 'targetId': 'SUBSCRIPTION#CHANNEL_RETRY'}]
        }
        
        # Mock User Profile (Enabled)
        def get_item_side_effect(Key):
            if Key.get('targetId') == 'PROFILE#data':
                return {'Item': {'emailNotificationsEnabled': True, 'notificationEmail': 'test@example.com'}}
            tracker_pk = "system"
            tracker_sk = f"CHANNEL#CHANNEL_RETRY"
            if Key.get('userId') == tracker_pk and Key.get('targetId') == tracker_sk:
                 return {'Item': {'lastVideoId': 'OLD_VIDEO', 'retryCount': 0}}
            return {}
        mock_table.get_item.side_effect = get_item_side_effect

        # Mock Bedrock FAILURE (raises exception)
        mock_bedrock.invoke_agent_runtime.side_effect = Exception("Bedrock Error")
        
        # Run Handler
        handler({}, {})
        
        # Assertions
        # Should NOT send email (success email)
        mock_ses.send_email.assert_not_called()
        
        # Should UPDATE tracker with retry info
        # Check the last call to put_item
        call_args = mock_table.put_item.call_args[1]
        item = call_args['Item']
        self.assertEqual(item['pendingVideoId'], 'VIDEO_RETRY')
        self.assertEqual(item['retryCount'], 0) # 0 start, incremented to 0? Wait, logic is: retry_count = tracker else 0. new video -> retry=0. notify fails -> retry=retry (0). Next run it will be pending so retry=1. 
        # Wait, if failure, we want to start tracking.
        # Logic in main:
        # if video_id == pending_video_id: ...
        # else: retry_count = 0
        # ...
        # if success: ...
        # else: ... pendingVideoId=video_id, retryCount=retry_count (which is 0)
        
        # Next run: video_id == pending (VIDEO_RETRY) -> retry_count += 1 (becomes 1)
        # So first failure sets retryCount=0. 
        self.assertEqual(item['retryCount'], 0)

    @patch('main.dynamodb')
    @patch('main.agentcore')
    @patch('main.ses')
    @patch('main.urllib.request.urlopen')
    def test_max_retries_exceeded(self, mock_urlopen, mock_ses, mock_bedrock, mock_dynamodb):
        # Mock Feed
        rss_content = self._create_rss("VIDEO_MAX", "Max Retry Video", datetime.now(timezone.utc).isoformat())
        self._mock_feed(mock_urlopen, rss_content)
        
        # Mock DynamoDB
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_table.scan.return_value = {'Items': [{'targetId': 'SUBSCRIPTION#CHANNEL_MAX'}]}
        
        # Mock Tracker (Retry count 4 - triggers max retry logic)
        # Actually logic is > 3. So if we enter with 3, we inc to 4. 
        # Logic: 
        # retry_count = tracker (3)
        # matches pending -> retry_count += 1 (4)
        # if retry_count > 3 -> Fail.
        
        def get_item_side_effect(Key):
            if Key.get('targetId') == 'PROFILE#data':
                return {'Item': {'emailNotificationsEnabled': True, 'notificationEmail': 'test@example.com'}}
            tracker_pk = "system"
            tracker_sk = f"CHANNEL#CHANNEL_MAX"
            if Key.get('userId') == tracker_pk and Key.get('targetId') == tracker_sk:
                 return {'Item': {'lastVideoId': 'OLD', 'pendingVideoId': 'VIDEO_MAX', 'retryCount': 3}}
            return {}
        mock_table.get_item.side_effect = get_item_side_effect
        
        # Mock Subscribers
        mock_table.query.return_value = {
            'Items': [{'userId': 'user1', 'targetId': 'SUBSCRIPTION#CHANNEL_MAX'}]
        }

        # Run Handler
        handler({}, {})
        
        # Assertions
        # Should send FAILURE email
        mock_ses.send_email.assert_called_once()
        call_args = mock_ses.send_email.call_args[1]
        self.assertIn('Unable to Process Video', call_args['Message']['Subject']['Data'])
        
        # Should clear pending state
        call_args_db = mock_table.put_item.call_args[1]
        item = call_args_db['Item']
        self.assertEqual(item['lastVideoId'], 'VIDEO_MAX')
        self.assertIsNone(item['pendingVideoId'])
        self.assertEqual(item['retryCount'], 0)

    @patch('main.dynamodb')
    @patch('main.agentcore')
    @patch('main.ses')
    @patch('main.urllib.request.urlopen')
    def test_success_after_retry(self, mock_urlopen, mock_ses, mock_bedrock, mock_dynamodb):
        # Mock Feed
        rss_content = self._create_rss("VIDEO_SUCCESS", "Success Video", datetime.now(timezone.utc).isoformat())
        self._mock_feed(mock_urlopen, rss_content)
        
        # Mock DynamoDB
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_table.scan.return_value = {'Items': [{'targetId': 'SUBSCRIPTION#CHANNEL_S'}]}
        
        # Mock Tracker (Retry count 2)
        def get_item_side_effect(Key):
            if Key.get('targetId') == 'PROFILE#data':
                return {'Item': {'emailNotificationsEnabled': True, 'notificationEmail': 'test@example.com'}}
            tracker_pk = "system"
            tracker_sk = f"CHANNEL#CHANNEL_S"
            if Key.get('userId') == tracker_pk and Key.get('targetId') == tracker_sk:
                 return {'Item': {'lastVideoId': 'OLD', 'pendingVideoId': 'VIDEO_SUCCESS', 'retryCount': 2}}
            return {}
        mock_table.get_item.side_effect = get_item_side_effect
        
        # Mock Subscribers
        mock_table.query.return_value = {
            'Items': [{'userId': 'user1', 'targetId': 'SUBSCRIPTION#CHANNEL_S'}]
        }
        
        # Mock Bedrock SUCCESS
        mock_bedrock.invoke_agent_runtime.return_value = {'completion': [{'chunk': {'bytes': b'Summary'}}]}

        # Run Handler
        handler({}, {})
        
        # Assertions
        # Should send SUCCESS email
        mock_ses.send_email.assert_called_once()
        self.assertIn('New Video Summary', mock_ses.send_email.call_args[1]['Message']['Subject']['Data'])
        
        # Should clear pending state
        call_args_db = mock_table.put_item.call_args[1]
        item = call_args_db['Item']
        self.assertEqual(item['lastVideoId'], 'VIDEO_SUCCESS')
        self.assertIsNone(item['pendingVideoId'])
        self.assertEqual(item['retryCount'], 0)

    @patch('main.dynamodb')
    @patch('main.agentcore')
    @patch('main.ses')
    @patch('main.urllib.request.urlopen')
    def test_custom_channel_prompt(self, mock_urlopen, mock_ses, mock_bedrock, mock_dynamodb):
        # Mock Feed
        rss_content = self._create_rss("VIDEO_CUSTOM", "Custom Prompt Video", datetime.now(timezone.utc).isoformat())
        self._mock_feed(mock_urlopen, rss_content)
        
        # Mock DynamoDB
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_table.scan.return_value = {'Items': [{'targetId': 'SUBSCRIPTION#CHANNEL_CUSTOM'}]}
        
        # Mock Tracker
        mock_table.get_item.return_value = {'Item': {'lastVideoId': 'OLD'}}
        
        # Mock Subscribers
        mock_table.query.return_value = {
            'Items': [{'userId': 'user1', 'targetId': 'SUBSCRIPTION#CHANNEL_CUSTOM'}]
        }
        
        # Mock User Profile AND Custom Prompt
        def get_item_side_effect(Key):
            if Key.get('targetId') == 'PROFILE#data':
                return {'Item': {'emailNotificationsEnabled': True, 'notificationEmail': 'test@example.com'}}
            tracker_pk = "system"
            tracker_sk = f"CHANNEL#CHANNEL_CUSTOM"
            if Key.get('userId') == tracker_pk and Key.get('targetId') == tracker_sk:
                 return {'Item': {'lastVideoId': 'OLD', 'pendingVideoId': None, 'retryCount': 0}}
            
            # MOCK CUSTOM PROMPT
            if Key.get('userId') == 'user1' and Key.get('targetId') == 'PROMPT#CHANNEL_CUSTOM':
                return {'Item': {'prompt': 'My Custom Prompt Instructions'}}
                
            return {}
        mock_table.get_item.side_effect = get_item_side_effect

        # Mock Bedrock
        mock_bedrock.invoke_agent_runtime.return_value = {'completion': [{'chunk': {'bytes': b'Summary'}}]}

        # Run Handler
        handler({}, {})
        
        # Assertions
        # Check if Bedrock was called with custom prompt
        # We need to check the payload passed to invoke_agent_runtime
        call_args = mock_bedrock.invoke_agent_runtime.call_args[1]
        payload = json.loads(call_args['payload'])
        self.assertEqual(payload['additionalInstructions'], 'My Custom Prompt Instructions')

    @patch('main.dynamodb')
    @patch('main.agentcore')
    @patch('main.ses')
    @patch('main.urllib.request.urlopen')
    def test_poller_transcript_unavailable(self, mock_urlopen, mock_ses, mock_bedrock, mock_dynamodb):
        # Mock Feed
        rss_content = self._create_rss("VIDEO_NO_TRANSCRIPT", "No Transcript Video", datetime.now(timezone.utc).isoformat())
        self._mock_feed(mock_urlopen, rss_content)
        
        # Mock DynamoDB
        mock_table = MagicMock()
        mock_dynamodb.Table.return_value = mock_table
        mock_table.scan.return_value = {'Items': [{'targetId': 'SUBSCRIPTION#CHANNEL_NT'}]}
        
        # Mock Tracker
        def get_item_side_effect(Key):
            if Key.get('targetId') == 'PROFILE#data':
                return {'Item': {'emailNotificationsEnabled': True, 'notificationEmail': 'test@example.com'}}
            tracker_pk = "system"
            tracker_sk = f"CHANNEL#CHANNEL_NT"
            if Key.get('userId') == tracker_pk and Key.get('targetId') == tracker_sk:
                 return {'Item': {'lastVideoId': 'OLD', 'pendingVideoId': None, 'retryCount': 0}}
            return {}
        mock_table.get_item.side_effect = get_item_side_effect
        
        # Mock Subscribers
        mock_table.query.return_value = {
            'Items': [{'userId': 'user1', 'targetId': 'SUBSCRIPTION#CHANNEL_NT'}]
        }
        
        # Mock Bedrock - Returns Apology
        apology_msg = "I apologize, but I wasn't able to retrieve the transcript for the YouTube video."
        mock_bedrock.invoke_agent_runtime.return_value = {'completion': [{'chunk': {'bytes': apology_msg.encode('utf-8')}}]}

        # Run Handler
        handler({}, {})
        
        # Assertions
        # Should NOT send email
        mock_ses.send_email.assert_not_called()
        
        # Should UPDATE tracker with retry info
        call_args = mock_table.put_item.call_args[1]
        item = call_args['Item']
        self.assertEqual(item['pendingVideoId'], 'VIDEO_NO_TRANSCRIPT')
        self.assertEqual(item['retryCount'], 0)

    def _create_rss(self, video_id, title, published):
        return f"""
        <feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
         <entry>
          <id>yt:video:{video_id}</id>
          <yt:videoId>{video_id}</yt:videoId>
          <title>{title}</title>
          <link rel="alternate" href="https://www.youtube.com/watch?v={video_id}"/>
          <published>{published}</published>
         </entry>
        </feed>
        """
        
    def _mock_feed(self, mock_urlopen, content):
        mock_response = MagicMock()
        mock_response.read.return_value = content.encode('utf-8')
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

if __name__ == '__main__':
    unittest.main()
