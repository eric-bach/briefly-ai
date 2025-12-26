import { NextRequest, NextResponse } from "next/server";
import { getPromptOverride, savePromptOverride, listPromptOverrides, deletePromptOverride, PromptOverride } from "@/lib/db";
import { resolvePromptOverride } from "@/lib/prompt-utils";

// TODO: Implement proper server-side authentication with Amplify
const getUserId = async (req: NextRequest) => {
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
  } catch (error: any) {
    console.error("Error in GET /api/user/prompts:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
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
    
    const override: PromptOverride = {
      userId,
      targetId,
      prompt,
      type,
      updatedAt: new Date().toISOString(),
    };

    await savePromptOverride(override);

    return NextResponse.json({ success: true, override });
  } catch (error: any) {
    console.error("Error in POST /api/user/prompts:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
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
  } catch (error: any) {
    console.error("Error in DELETE /api/user/prompts:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
