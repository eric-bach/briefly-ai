import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get("channelId"); // Keeping query param name for compatibility

  if (!input) {
    return NextResponse.json(
      { error: "Channel Name or ID is required" },
      { status: 400 }
    );
  }

  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "YouTube API key is not configured" },
      { status: 500 }
    );
  }

  try {
    let channelId = input;

    // Check if input looks like a Channel ID (starts with UC, ~24 chars)
    // Precise regex: ^UC[\w-]{21}[AQgw]$ but a simpler check is often enough
    const isChannelId = /^UC[\w-]{22}$/.test(input);

    if (!isChannelId) {
      // Try to resolve handle or name
      let resolveUrl = "";

      if (input.startsWith("@")) {
        // Resolve Handle
        resolveUrl = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(
          input
        )}&key=${apiKey}`;
      } else {
        // Search by name
        resolveUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(
          input
        )}&key=${apiKey}&maxResults=1`;
      }

      const resolveRes = await fetch(resolveUrl);

      if (!resolveRes.ok) {
        // If search fails, we might just try treating it as an ID or fail
        // But let's throw to catch block
        const errorData = await resolveRes.json();
        throw new Error(
          errorData.error?.message || "Failed to resolve channel"
        );
      }

      const resolveData = await resolveRes.json();

      if (!resolveData.items || resolveData.items.length === 0) {
        return NextResponse.json(
          { error: "Channel not found" },
          { status: 404 }
        );
      }

      // Extract ID based on endpoint used
      if (input.startsWith("@")) {
        channelId = resolveData.items[0].id;
      } else {
        channelId = resolveData.items[0].id.channelId;
      }
    }

    // Now fetch videos with the resolved channelId
    let videosApiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=12&order=date&type=video&key=${apiKey}`;

    const pageToken = searchParams.get("pageToken");
    if (pageToken) {
      videosApiUrl += `&pageToken=${pageToken}`;
    }

    const response = await fetch(videosApiUrl);

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        {
          error:
            errorData.error.message || "Failed to fetch videos from YouTube",
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error fetching YouTube videos:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
