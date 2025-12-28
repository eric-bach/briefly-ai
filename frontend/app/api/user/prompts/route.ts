import { NextRequest, NextResponse } from "next/server";
import { getPromptOverride, savePromptOverride, listPromptOverrides, deletePromptOverride, PromptOverride } from "@/lib/db";
import { resolvePromptOverride } from "@/lib/prompt-utils";

// TODO: Implement proper server-side authentication with Amplify
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getUserId = async (_req: NextRequest) => {
  return "test-user";
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetId = searchParams.get("targetId");
    const videoId = searchParams.get("videoId");
    const channelId = searchParams.get("channelId");

    const userId = await getUserId(req);
    let override: PromptOverride | null = null;

    if (targetId) {
      // Direct lookup (legacy/specific)
      override = await getPromptOverride(userId, targetId);
      return NextResponse.json({ override });
    } else if (videoId || channelId) {
      // Smart lookup with precedence
      override = await resolvePromptOverride(
        userId, 
        videoId || undefined, 
        channelId || undefined
      );
      return NextResponse.json({ override });
    } else {
      // List all prompts
      const limit = parseInt(searchParams.get("limit") || "20");
      const nextToken = searchParams.get("nextToken") || undefined;
      const filter = searchParams.get("filter") || undefined;

      const result = await listPromptOverrides(userId, limit, nextToken, filter);
      return NextResponse.json(result);
    }
  } catch (error: unknown) {
    console.error("Error in GET /api/user/prompts:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function fetchMetadata(targetId: string, type: 'video' | 'channel') {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;

  try {
    if (type === 'video') {
      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${targetId}&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        return {
          title: data.items[0].snippet.title,
          thumbnail: data.items[0].snippet.thumbnails?.default?.url,
          channelTitle: data.items[0].snippet.channelTitle
        };
      }
    } else {
      let url = `https://www.googleapis.com/youtube/v3/channels?part=snippet&key=${apiKey}`;
      if (targetId.startsWith('@')) {
        url += `&forHandle=${encodeURIComponent(targetId)}`;
      } else {
        url += `&id=${targetId}`;
      }
      
      const res = await fetch(url);
      const data = await res.json();
       if (data.items && data.items.length > 0) {
        return {
          title: data.items[0].snippet.title,
          thumbnail: data.items[0].snippet.thumbnails?.default?.url
        };
      }
    }
  } catch (e) {
    console.error("Failed to fetch metadata", e);
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { targetId, prompt, type } = body;

    if (!targetId || !prompt || !type) {
      return NextResponse.json(
        { error: "Missing required fields: targetId, prompt, type" },
        { status: 400 }
      );
    }

    const userId = await getUserId(req);
    
    // Fetch metadata (title, thumbnail)
    const metadata = await fetchMetadata(targetId, type);

    const override: PromptOverride = {
      userId,
      targetId,
      prompt,
      type,
      updatedAt: new Date().toISOString(),
      targetTitle: metadata?.title,
      targetThumbnail: metadata?.thumbnail,
      channelTitle: metadata?.channelTitle,
    };

    await savePromptOverride(override);

    return NextResponse.json({ success: true, override });
  } catch (error: unknown) {
    console.error("Error in POST /api/user/prompts:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  return POST(req);
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetId = searchParams.get("targetId");

    if (!targetId) {
      return NextResponse.json(
        { error: "Missing required field: targetId" },
        { status: 400 }
      );
    }

    const userId = await getUserId(req);
    await deletePromptOverride(userId, targetId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error in DELETE /api/user/prompts:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
