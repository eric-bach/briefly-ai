import { NextRequest, NextResponse } from "next/server";
import { getPromptOverride, savePromptOverride, PromptOverride } from "@/lib/db";

// TODO: Implement proper server-side authentication with Amplify
const getUserId = async (req: NextRequest) => {
  return "test-user";
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetId = searchParams.get("targetId");

    if (!targetId) {
      return NextResponse.json({ error: "Missing targetId" }, { status: 400 });
    }

    const userId = await getUserId(req);
    const override = await getPromptOverride(userId, targetId);

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
