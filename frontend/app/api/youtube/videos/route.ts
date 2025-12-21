import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const channelInput = searchParams.get("channelId");
  const videoInput = searchParams.get("videoId");

  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "YouTube API key is not configured" },
      { status: 500 }
    );
  }

  try {
    // 1. Handle Video ID Lookup
    if (videoInput) {
      const videosApiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoInput}&key=${apiKey}`;
      const response = await fetch(videosApiUrl);

      if (!response.ok) {
         const errorData = await response.json();
         return NextResponse.json(
           { error: errorData.error.message || "Failed to fetch video details" },
           { status: response.status }
         );
      }
      
      const data = await response.json();
      return NextResponse.json(data);
    }

    // 2. Handle Channel Lookup
    if (!channelInput) {
      return NextResponse.json(
        { error: "Channel Name/ID or Video ID is required" },
        { status: 400 }
      );
    }
    
    let channelId = channelInput;
    // Check if input looks like a Channel ID (starts with UC, ~24 chars)
    // Precise regex: ^UC[\w-]{21}[AQgw]$ but a simpler check is often enough
    const isChannelId = /^UC[\w-]{22}$/.test(channelInput);

    if (!isChannelId) {
      // Try to resolve handle or name
      let resolveUrl = "";

      if (channelInput.startsWith("@")) {
        // Resolve Handle
        resolveUrl = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(
          channelInput
        )}&key=${apiKey}`;
      } else {
        // Search by name
        resolveUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(
          channelInput
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
      if (channelInput.startsWith("@")) {
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
