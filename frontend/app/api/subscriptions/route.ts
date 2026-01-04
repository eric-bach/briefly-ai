import { NextResponse } from 'next/server';
import {
  saveSubscription,
  deleteSubscription,
  listSubscriptions,
  getUserProfile,
} from '@/lib/db';
import { parseInput } from '@/lib/youtube-utils';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

async function fetchChannelDetails(channelId: string) {
  if (!YOUTUBE_API_KEY) return null;
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${YOUTUBE_API_KEY}`
    );
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      return {
        title: data.items[0].snippet.title,
      };
    }
  } catch (e) {
    console.error('Failed to fetch channel details', e);
  }
  return null;
}

async function resolveChannelId(videoUrl: string) {
  // Basic extraction if it's a video ID
  // But we need to call API to get channel ID if we only have video ID.
  // However, parseInput gives us 'video' type and value is videoID.
  // use videos endpoint.
  if (!YOUTUBE_API_KEY) return null;
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoUrl}&key=${YOUTUBE_API_KEY}`
    );
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      return {
        channelId: data.items[0].snippet.channelId,
        channelTitle: data.items[0].snippet.channelTitle,
      };
    }
  } catch (e) {
    console.error('Failed to resolve channel from video', e);
  }
  return null;
}

export async function GET(req: Request) {
  // Mock User ID for now since we don't have real auth session in headers yet/simplified
  // Dashboard uses 'test-user' or derives from settings?
  // 'route.ts' (summarize) uses 'test-user' hardcoded in one place, but getUserProfile uses it.
  // Dashboard fetches /api/user/settings which uses a hardcoded user likely.
  // Let's assume 'test-user' for consistency with current prototype state.
  const userId = 'test-user';

  try {
    const subscriptions = await listSubscriptions(userId);
    return NextResponse.json({ subscriptions });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to list subscriptions' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const userId = 'test-user';
  try {
    const body = await req.json();
    const { input } = body; // Can be video URL or channel URL

    if (!input) {
      return NextResponse.json({ error: 'Input required' }, { status: 400 });
    }

    const parsed = parseInput(input);
    let channelId = '';
    let channelTitle = '';

    if (parsed.type === 'channel') {
      // If it starts with @, we need to resolve handle.
      // Or if it's an ID.
      // Our parseInput returns ID or handle.
      // YouTube API 'channels' endpoint supports 'forHandle' param? No, need 'forHandle' or query.
      // Actually 'channels?id=...' works for ID.
      // For handle, use 'channels?forHandle=...' (if supported? deprecated? No 'forUsername' is deprecated).
      // Actually 'forHandle' parameter is available on 'channels' list.

      const output = parsed.value;
      if (output.startsWith('@')) {
        // Resolve handle
        if (!YOUTUBE_API_KEY)
          return NextResponse.json(
            { error: 'API Key missing' },
            { status: 500 }
          );
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=${encodeURIComponent(
            output
          )}&key=${YOUTUBE_API_KEY}`
        );
        const data = await res.json();
        if (data.items?.length) {
          channelId = data.items[0].id;
          channelTitle = data.items[0].snippet.title;
        } else {
          return NextResponse.json(
            { error: 'Channel not found' },
            { status: 404 }
          );
        }
      } else {
        // Assume ID
        channelId = output;
        const details = await fetchChannelDetails(channelId);
        if (details) {
          channelTitle = details.title;
        } else {
          // Could be invalid ID
          return NextResponse.json(
            { error: 'Channel not found with that ID' },
            { status: 404 }
          );
        }
      }
    } else if (parsed.type === 'video') {
      const details = await resolveChannelId(parsed.value);
      if (details) {
        channelId = details.channelId;
        channelTitle = details.channelTitle;
      } else {
        return NextResponse.json({ error: 'Video not found' }, { status: 404 });
      }
    }

    if (!channelId) {
      return NextResponse.json(
        { error: 'Could not resolve channel ID' },
        { status: 400 }
      );
    }

    await saveSubscription({
      userId,
      channelId,
      channelTitle,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, channelId, channelTitle });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const userId = 'test-user';
  try {
    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get('channelId');

    if (!channelId) {
      return NextResponse.json(
        { error: 'Channel ID required' },
        { status: 400 }
      );
    }

    await deleteSubscription(userId, channelId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete subscription' },
      { status: 500 }
    );
  }
}
