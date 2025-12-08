import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { videoUrl } = body;

    if (!videoUrl) {
      return NextResponse.json({ error: "Missing videoUrl" }, { status: 400 });
    }

    const backendUrl = "http://5.78.128.67:8080/invocations";

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ videoUrl }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Backend error: ${response.status} ${errorText}` },
        { status: response.status }
      );
    }

    // Check if the response body is available for streaming
    if (!response.body) {
      return NextResponse.json(
        { error: "No response body from backend" },
        { status: 500 }
      );
    }

    // Proxy the response stream
    return new NextResponse(response.body, {
      status: 200,
      headers: {
        // Forward headers if needed, or set content-type
        "Content-Type": response.headers.get("Content-Type") || "text/plain",
      },
    });
  } catch (error: any) {
    console.error("Error in proxy:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}
