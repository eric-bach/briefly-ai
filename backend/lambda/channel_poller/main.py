import os
import base64
import json
import boto3
import uuid
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from botocore.config import Config
from markdown_utils import convert_markdown_to_html
from aws_lambda_powertools import Logger

# Initialize clients
dynamodb = boto3.resource('dynamodb')
agentcore = boto3.client('bedrock-agentcore', config=Config(read_timeout=1200))
ses = boto3.client('ses')

logger = Logger(service="channel_poller")

TABLE_NAME = os.environ.get('TABLE_NAME')
if TABLE_NAME is None:
    raise ValueError("TABLE_NAME environment variable is not set")
SES_SOURCE_EMAIL = os.environ.get('SES_SOURCE_EMAIL')
if SES_SOURCE_EMAIL is None:
    raise ValueError("SES_SOURCE_EMAIL environment variable is not set")
AGENT_RUNTIME_ARN = os.environ.get('AGENT_RUNTIME_ARN')
if AGENT_RUNTIME_ARN is None:
    raise ValueError("AGENT_RUNTIME_ARN environment variable is not set")

@logger.inject_lambda_context
def handler(event, context):
    logger.info("⚙️ Starting Channel Poller")

    table = dynamodb.Table(TABLE_NAME)

    logger.info("Checking for channels to poll")

    # Get all unique channels to poll
    # TODO Create a separate table for Subscriptions so we don't need to Scan the GSI and then perform a deduplication step
    response = table.scan(
        IndexName='SubscriptionsByChannelIndex',
        ProjectionExpression='targetId, channelTitle'
    )
    items = response.get('Items', [])
    while 'LastEvaluatedKey' in response:
        response = table.scan(
            IndexName='SubscriptionsByChannelIndex',
            ProjectionExpression='targetId, channelTitle',
            ExclusiveStartKey=response['LastEvaluatedKey']
        )
        items.extend(response.get('Items', []))
        
    # Deduplicate channels and store channel_id -> channel_title mapping
    channels = {}  # channel_id -> channel_title
    for item in items:
        # targetId is "SUBSCRIPTION#<channelId>"
        tid = item.get('targetId', '')
        channel_title = item.get('channelTitle', '')
        if tid.startswith('SUBSCRIPTION#'):
            channel_id = tid.replace('SUBSCRIPTION#', '')
            # Keep first non-empty title we find for each channel
            if channel_id not in channels or (not channels[channel_id] and channel_title):
                channels[channel_id] = channel_title
            logger.info(f"Found channel: {channel_title} ({tid})")    
    
    logger.info(f"Found {len(channels)} unique channels to poll.")
    
    for channel_id, channel_title in channels.items():
        process_channel(channel_title, channel_id, table)
        
    return {"statusCode": 200, "body": "Polling complete"}

def process_channel(channel_title, channel_id, table):
    logger.info(f"Getting latest video for channel: {channel_title} ({channel_id})")
    
    # Fetch RSS Feed
    feed_xml = get_channel_feed(channel_id)
    latest_video = parse_feed(feed_xml)
    
    if not latest_video:
        logger.info(f"⚠️ No video found for channel {channel_id}")
        return

    video_id = latest_video['videoId']
    video_url = latest_video['link']
    
    # Check if there is a new video
    tracker_pk = "system"
    tracker_sk = f"CHANNEL#{channel_id}"
    
    tracker_item = table.get_item(Key={'userId': tracker_pk, 'targetId': tracker_sk}).get('Item')
    
    last_video_id = tracker_item.get('lastVideoId') if tracker_item else None
    pending_video_id = tracker_item.get('pendingVideoId') if tracker_item else None
    retry_count = int(tracker_item.get('retryCount', 0)) if tracker_item else 0
    
    if last_video_id == video_id:
        logger.info(f"⚠️ Video {video_id} already processed for channel {channel_id}.")
        return
        
    # Determine if this is a retry or a new video
    if video_id == pending_video_id:
        logger.info(f"🔄 Retrying video {video_id} (Attempt {retry_count + 1})")
        retry_count += 1
    else:
        logger.info(f"🆕 New video detected: {video_id} (Resetting retry count)")
        retry_count = 0

    # Max retries reached?
    if retry_count > 3:
        logger.error(f"❌ Max retries reached for video {video_id}. Skipping and notifying failure.")
        notify_failure(channel_id, latest_video['title'], video_url, table)
        
        # Mark as processed so we don't retry forever, but clear pending state
        table.put_item(Item={
            'userId': tracker_pk,
            'targetId': tracker_sk,
            'lastVideoId': video_id, # Treat as stuck/done
            'lastUpdated': datetime.now(timezone.utc).isoformat(),
            'channelId': channel_id,
            # Clear pending state
            'pendingVideoId': None,
            'retryCount': 0
        })
        return

    # Handle the case where this is the first run for this channel
    # If the video is older than 24 hours, skip it
    if not last_video_id and not pending_video_id:
        published_str = latest_video['published']
        try:
            # Handle Z or offset
            published_dt = datetime.fromisoformat(published_str.replace("Z", "+00:00"))
            now = datetime.now(timezone.utc)
            age = now - published_dt
            if age.total_seconds() > 86400: # 24 hours
                logger.info(f"⚠️ Video {video_id} was uploaded more than 24 hours ago, age: {age}. Skipping.")
                # Just update tracker so next video is new
                table.put_item(Item={
                    'userId': tracker_pk,
                    'targetId': tracker_sk,
                    'lastVideoId': video_id,
                    'lastUpdated': datetime.now(timezone.utc).isoformat(),
                    'channelId': channel_id
                })
                return
        except Exception as e:
            logger.error(f"🛑 Error parsing date {published_str}: {e}")
            
    logger.info(f"Processing video: {video_id} ({latest_video['title']})")
    
    # Notify Subscribers
    success = notify_subscribers(channel_id, channel_title, video_url, latest_video['title'], table)

    if success:
        # Update Tracker - Success!
        table.put_item(Item={
            'userId': tracker_pk,
            'targetId': tracker_sk,
            'lastVideoId': video_id,
            'lastUpdated': datetime.now(timezone.utc).isoformat(),
            'channelId': channel_id,
            # Clear pending state
            'pendingVideoId': None,
            'retryCount': 0
        })
    else:
        logger.warning(f"⚠️ Failed to notify all subscribers for channel {channel_id}. Scheduling retry.")
        # Update Tracker - Schedule Retry
        table.put_item(Item={
            'userId': tracker_pk,
            'targetId': tracker_sk,
            'lastVideoId': last_video_id, # Keep last successful video
            'lastUpdated': datetime.now(timezone.utc).isoformat(),
            'channelId': channel_id,
            # Set pending state
            'pendingVideoId': video_id,
            'retryCount': retry_count
        })

def get_channel_feed(channel_id):
    url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"

    logger.info(f"Fetching feed for channel: {url}")

    try:
        with urllib.request.urlopen(url) as response:
            xml_content = response.read()
            return xml_content
    except Exception as e:  
        logger.error(f"Error fetching feed for {url}: {e}")
        return None

def parse_feed(xml_content):
    if not xml_content:
        return None
    
    logger.info("Parsing feed")
    
    root = ET.fromstring(xml_content)
    ns = {'yt': 'http://www.youtube.com/xml/schemas/2015', 'media': 'http://search.yahoo.com/mrss/', 'atom': 'http://www.w3.org/2005/Atom'}
    
    # Get the latest entry
    entry = root.find('atom:entry', ns)
    if entry is None:
        return None
        
    video_id_elem = entry.find('yt:videoId', ns)
    title_elem = entry.find('atom:title', ns)
    link_elem = entry.find('atom:link', ns)
    published_elem = entry.find('atom:published', ns)
    
    video_id = video_id_elem.text if video_id_elem is not None else None
    title = title_elem.text if title_elem is not None else "Unknown Title"
    link = link_elem.get('href') if link_elem is not None else ""
    published = published_elem.text if published_elem is not None else ""
    
    if not video_id:
        return None
    
    return {
        'videoId': video_id,
        'title': title,
        'link': link,
        'published': published
    }

def notify_subscribers(channel_id, channel_title, video_url, video_title, table):
    logger.info(f"Notifying subscribers for video {video_url} from {channel_title}")
    
    response = table.query(
        IndexName='SubscriptionsByChannelIndex',
        KeyConditionExpression='targetId = :tid',
        ExpressionAttributeValues={':tid': f"SUBSCRIPTION#{channel_id}"}
    )
    
    subscribers = response.get('Items', [])
    logger.info(f"Found {len(subscribers)} subscribers for channel {channel_id}")
    
    all_success = True

    for sub in subscribers:
        user_id = sub['userId']
        user_profile = table.get_item(Key={'userId': user_id, 'targetId': 'PROFILE#data'}).get('Item')
        
        if not user_profile or not user_profile.get('emailNotificationsEnabled') or not user_profile.get('notificationEmail'):
            logger.info(f"⚠️ Skipping user {user_id}: Email disabled or missing.")
            continue
            
        email = user_profile['notificationEmail']
        
        # Lookup the user's custom prompt for this channel
        # PK = userId, SK = PROMPT#<channelId>
        prompt_override = table.get_item(Key={'userId': user_id, 'targetId': f"PROMPT#{channel_id}"}).get('Item')
        custom_prompt = prompt_override.get('prompt', '') if prompt_override else ''

        if custom_prompt:
             logger.info(f"Using custom prompt for user {user_id} on channel {channel_id}")
        
        try:
            summary = invoke_agent(video_url, custom_prompt, channel_title=channel_title, video_title=video_title)
            send_email(email, video_title, summary, video_url)
        except Exception as e:
            logger.error(f"Failed to notify {user_id}: {e}")
            all_success = False

    return all_success

def sanitize_session_id(channel_title, video_title):
    """
    Creates a sanitized session ID from channel and video titles.
    Format: {channel_title}-{video_title}-{uuid}
    Min length: 33 characters (AgentCore requirement)
    Max length: 95 characters (to be safe for AWS limits)
    Allowed chars: Alphanumeric, hyphen, underscore
    """
    import re
    
    MIN_SESSION_ID_LENGTH = 33
    
    # 1. Sanitize strings (replace non-alphanumeric with hyphen)
    # Remove any character that isn't a-z, A-Z, 0-9, -, or _
    # We allow - and _ but want to replace spaces with -
    
    def clean(s):
        if not s:
            return ""
        s = s.replace(" ", "-") # Spaces to hyphens
        s = re.sub(r'[^a-zA-Z0-9\-_]', '', s) # Remove illegal chars
        s = re.sub(r'-+', '-', s) # Collapse multiple hyphens
        s = s.strip('-') # Remove leading/trailing hyphens
        return s
        
    c_clean = clean(channel_title)
    v_clean = clean(video_title)
    
    # 2. Add randomness (full UUID) to ensure uniqueness and minimum length
    # Full UUID is 36 chars, which ensures we meet the 33 char minimum even with empty titles
    full_uuid = str(uuid.uuid4())
    
    # 3. Construct and Truncate
    # We have 95 chars total. UUID is 36 + 1 hyphen = 37.
    # We have ~58 chars for titles. Split roughly 20/38.
    
    c_trunc = c_clean[:20]
    v_trunc = v_clean[:38] # Give more room to video title
    
    # Build parts, filtering out empty strings to avoid leading/trailing hyphens
    parts = [p for p in [c_trunc, v_trunc, full_uuid] if p]
    session_id = "-".join(parts)
    
    # Final safety check for length
    session_id = session_id[:95]
    
    # Ensure minimum length (should always be met due to full UUID, but just in case)
    if len(session_id) < MIN_SESSION_ID_LENGTH:
        # Pad with additional UUID characters
        session_id = f"{session_id}-{str(uuid.uuid4()).replace('-', '')}"[:95]
    
    return session_id

def invoke_agent(video_url, instructions, channel_title="Briefly", video_title="Video"):
    logger.info(f"▶️ Summarizing video from {channel_title} for notification: {video_url}")

    payload = json.dumps({
        "videoUrl": video_url,
        "additionalInstructions": instructions
    })

    session_id = sanitize_session_id(channel_title, video_title)
    logger.info(f"Session ID: {session_id} ({len(session_id)})")
    
    logger.info(f"Invoking agent runtime with payload: {payload}")
    
    response = agentcore.invoke_agent_runtime(
        agentRuntimeArn=AGENT_RUNTIME_ARN,
        payload=payload,
        runtimeSessionId=session_id
    )
    
    logger.info(f"Agent response: {response}")
    
    summary = ""
    
    if 'completion' in response:
        for event in response['completion']:
            if 'chunk' in event:
                summary += event['chunk']['bytes'].decode('utf-8')
    elif 'response' in response:
        # Handle raw StreamingBody (e.g. SSE or raw text)
        stream = response['response']
        logger.info("Starting to read stream from response['response']")
        try:
            for line in stream.iter_lines(keepends=True):
                if line:
                    decoded_line = line.decode('utf-8')
                    logger.info(f"Stream line: {repr(decoded_line)}") # Log the raw line with repr to see invisible chars
                    
                    # if decoded_line.startswith('data: '):
                    #     data_str = decoded_line[6:]
                    #     try:
                    #         data = json.loads(data_str)
                    #         logger.info(f"Parsed data chunk: {data}")
                    #         if 'chunk' in data and 'bytes' in data['chunk']:
                    #             b_content = data['chunk']['bytes']
                    #             if isinstance(b_content, str):
                    #                 # Try standard base64 decode typical for AWS bytes in JSON
                    #                 try:
                    #                     decoded_chunk = base64.b64decode(b_content).decode('utf-8')
                    #                     logger.info(f"Decoded chunk: {repr(decoded_chunk)}")
                    #                     summary += decoded_chunk
                    #                 except Exception as e:
                    #                     logger.error(f"Base64 decode failed, using raw: {e}")
                    #                     summary += b_content
                    #             else:
                    #                 # If it's already bytes (unlikely in this JSON structure but possible in some SDKs)
                    #                 summary += b_content.decode('utf-8')
                    #     except Exception as e:
                    #         logger.error(f"Error parsing SSE line json: {e}")
                    # else:
                    # Treat as raw text (e.g. if the agent is just streaming text directly)
                    #logger.info(f"Non-SSE line: {repr(decoded_line)}")
                    
                    summary += decoded_line
        except Exception as e:
            logger.error(f"Error iterating stream: {e}")
             
    logger.info(f"Final Summary length: {len(summary)}")
    logger.info(f"Summary content: {summary}")

    # Check for "apology" messages indicating transcript is unavailable
    fail_phrases = [
        "I couldn't retrieve the transcript",
        "subtitles or transcripts are disabled for this video",
        "transcripts are disabled for this video",
        "I wasn't able to retrieve the transcript",
        "it seems that subtitles are disabled", 
        "I cannot access the transcript"
    ]
    
    for phrase in fail_phrases:
        if phrase in summary:
            logger.warning(f"Detected failure phrase in summary: {phrase}")
            raise ValueError("Transcript unavailable from agent")
    
    return summary

def send_email(to_address, title, summary, video_url):
    logger.info(f"Sending video summary to {to_address}")

    subject = f"New Video Summary: {title}"
    
    html_summary = convert_markdown_to_html(summary)
    
    body_html = f"""
    <h1>New Video: <a href="{video_url}">{title}</a></h1>
    {html_summary}
    <p><small>Sent by Briefly AI Poller</small></p>
    """
    
    ses.send_email(
        Source=SES_SOURCE_EMAIL,
        Destination={'ToAddresses': [to_address]},
        Message={
            'Subject': {'Data': subject},
            'Body': {
                'Html': {'Data': body_html},
                'Text': {'Data': summary} 
            }
        }
    )

def notify_failure(channel_id, video_title, video_url, table):
    logger.info(f"Notifying subscribers of failure for video {video_url}")
    
    response = table.query(
        IndexName='SubscriptionsByChannelIndex',
        KeyConditionExpression='targetId = :tid',
        ExpressionAttributeValues={':tid': f"SUBSCRIPTION#{channel_id}"}
    )
    
    subscribers = response.get('Items', [])
    
    for sub in subscribers:
        user_id = sub['userId']
        user_profile = table.get_item(Key={'userId': user_id, 'targetId': 'PROFILE#data'}).get('Item')
        
        if not user_profile or not user_profile.get('emailNotificationsEnabled') or not user_profile.get('notificationEmail'):
            continue
            
        email = user_profile['notificationEmail']
        
        subject = f"Unable to Process Video: {video_title}"
        
        body_html = f"""
        <h1>Video Processing Failed</h1>
        <p>We detected a new video from a channel you are subscribed to, but we were unable to generate a summary for it after multiple attempts.</p>
        <p><strong>Video:</strong> <a href="{video_url}">{video_title}</a></p>
        <p>This usually happens when transcripts are not available for the video yet. We will skip this video and resume normal processing for the next upload.</p>
        <p><small>Sent by Briefly AI</small></p>
        """
        
        try:
            ses.send_email(
                Source=SES_SOURCE_EMAIL,
                Destination={'ToAddresses': [email]},
                Message={
                    'Subject': {'Data': subject},
                    'Body': {
                        'Html': {'Data': body_html},
                        'Text': {'Data': f"Unable to process video: {video_title}. {video_url}"} 
                    }
                }
            )
        except Exception as e:
            logger.error(f"Failed to send failure notification to {email}: {e}")

