import os
import json
import boto3
import uuid
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

# Initialize clients
dynamodb = boto3.resource('dynamodb')
agentcore = boto3.client('bedrock-agentcore')
ses = boto3.client('ses')

from aws_lambda_powertools import Logger
logger = Logger()

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
    logger.info("▶️ Starting Channel Poller")
    table = dynamodb.Table(TABLE_NAME)
    
    # Get all unique channels to poll
    # TODO Create a separate table for Subscriptions so we don't need to Scan the GSI and then perform a deduplication step
    
    response = table.scan(
        IndexName='SubscriptionsByChannelIndex',
        ProjectionExpression='targetId'
    )
    items = response.get('Items', [])
    while 'LastEvaluatedKey' in response:
        response = table.scan(
            IndexName='SubscriptionsByChannelIndex',
            ProjectionExpression='targetId',
            ExclusiveStartKey=response['LastEvaluatedKey']
        )
        items.extend(response.get('Items', []))
        
    # Deduplicate channels
    channel_ids = set()
    for item in items:
        # targetId is "SUBSCRIPTION#<channelId>"
        tid = item.get('targetId', '')
        if tid.startswith('SUBSCRIPTION#'):
            channel_ids.add(tid.replace('SUBSCRIPTION#', ''))
            
    logger.info(f"Found {len(channel_ids)} unique channels to poll.")
    
    for channel_id in channel_ids:
        process_channel(channel_id, table)
        
    return {"statusCode": 200, "body": "Polling complete"}

def process_channel(channel_id, table):
    logger.info(f"Getting latest video for channel: {channel_id}")
    
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
    
    if last_video_id == video_id:
        logger.info(f"⚠️ Video {video_id} already processed for channel {channel_id}.")
        return

    # Handle the case where this is the first run for this channel
    # If the video is older than 24 hours, skip it
    if not last_video_id:
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
            
    logger.info(f"New video detected: {video_id} ({latest_video['title']})")
    
    # Notify Subscribers
    success = notify_subscribers(channel_id, video_url, latest_video['title'], table)

    if success:
        # Update Tracker
        table.put_item(Item={
            'userId': tracker_pk,
            'targetId': tracker_sk,
            'lastVideoId': video_id,
            'lastUpdated': datetime.now(timezone.utc).isoformat(),
            'channelId': channel_id
        })
    else:
        logger.warning(f"⚠️ Failed to notify all subscribers for channel {channel_id}. Will retry next run.")

def get_channel_feed(channel_id):
    url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
    try:
        with urllib.request.urlopen(url) as response:
            xml_content = response.read()
            return xml_content
    except Exception as e:
        logger.error(f"Error fetching feed for {channel_id}: {e}")
        return None

def parse_feed(xml_content):
    if not xml_content:
        return None
    
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

def notify_subscribers(channel_id, video_url, video_title, table):
    response = table.query(
        IndexName='SubscriptionsByChannelIndex',
        KeyConditionExpression='targetId = :tid',
        ExpressionAttributeValues={':tid': f"SUBSCRIPTION#{channel_id}"}
    )
    
    subscribers = response.get('Items', [])
    logger.info(f"Notifying {len(subscribers)} subscribers for video {video_url}")
    
    all_success = True

    for sub in subscribers:
        user_id = sub['userId']
        user_profile = table.get_item(Key={'userId': user_id, 'targetId': 'PROFILE#data'}).get('Item')
        
        if not user_profile or not user_profile.get('emailNotificationsEnabled') or not user_profile.get('notificationEmail'):
            logger.info(f"⚠️ Skipping user {user_id}: Email disabled or missing.")
            continue
            
        email = user_profile['notificationEmail']
        # TODO: Lookup the user's global prompt
        # TODO: Future: save the prompt on the subscription to prevent lookup on each notification
        custom_prompt = sub.get('customPrompt', '') 
        
        try:
            summary = invoke_agent(video_url, custom_prompt)
            send_email(email, video_title, summary, video_url)
        except Exception as e:
            logger.error(f"Failed to notify {user_id}: {e}")
            all_success = False

    return all_success

def invoke_agent(video_url, instructions):
    logger.info(f"⚙️ Invoking agent with video URL: {video_url}")

    payload = json.dumps({
        "videoUrl": video_url,
        "additionalInstructions": instructions
    })

    session_id = str(uuid.uuid4())
    logger.info(f"Session ID: {session_id} ({len(session_id)})")
    
    response = agentcore.invoke_agent_runtime(
        agentRuntimeArn=AGENT_RUNTIME_ARN,
        payload=payload,
        runtimeSessionId=session_id
    )
    
    logger.info(f"Agent response: {response}")
    
    summary = ""
    for event in response.get('completion', []):
        if 'chunk' in event:
             summary += event['chunk']['bytes'].decode('utf-8')
             
    return summary

def send_email(to_address, title, summary, video_url):
    logger.info(f"Sending video summary to {to_address}")

    subject = f"New Video Summary: {title}"
    body_html = f"""
    <h1>New Video: <a href="{video_url}">{title}</a></h1>
    <p>{summary.replace(chr(10), '<br>')}</p>
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
