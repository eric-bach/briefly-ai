import { NextRequest, NextResponse } from "next/server";
import { getPromptOverride, savePromptOverride, PromptOverride } from "@/lib/db";
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
    } else if (videoId || channelId) {
      // Smart lookup with precedence
      override = await resolvePromptOverride(
        userId, 
        videoId || undefined, 
        channelId || undefined
      );
    } else {
      return NextResponse.json({ error: "Missing targetId, videoId, or channelId" }, { status: 400 });
    }

    return NextResponse.json({ override });
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
