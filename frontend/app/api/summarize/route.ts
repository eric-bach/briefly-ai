import { NextResponse } from "next/server";
import {
  BedrockAgentCoreClient,
  InvokeAgentRuntimeCommand,
} from "@aws-sdk/client-bedrock-agentcore";

function generateSessionId(length: number): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }
  return result;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { videoUrl } = body;

    if (!videoUrl) {
      return NextResponse.json({ error: "Missing videoUrl" }, { status: 400 });
    }

    const agentRuntimeArn =
      process.env.NEXT_PUBLIC_BEDROCK_AGENTCORE_RUNTIME_ARN;

    if (!agentRuntimeArn) {
      return NextResponse.json(
        {
          error:
            "Server configuration error: Missing NEXT_PUBLIC_BEDROCK_AGENTCORE_RUNTIME_ARN",
        },
        { status: 500 }
      );
    }

    const client = new BedrockAgentCoreClient({ region: "us-east-1" });
    const input = {
      runtimeSessionId: generateSessionId(33),
      agentRuntimeArn: agentRuntimeArn,
      qualifier: "DEFAULT",
      payload: new TextEncoder().encode(JSON.stringify({ videoUrl })),
    };

    const command = new InvokeAgentRuntimeCommand(input);
    const response = await client.send(command);

    // The response body from Bedrock Agent Core is a readable stream or byte array
    // dependent on the specific SDK version details, but usually `response.response.body`
    // or we transform it. Based on user snippet:
    // "const textResponse = await response.response.transformToString();"
    // However, the snippet shows `response.response`? Wait, the snippet was:
    // const response = await client.send(command);
    // const textResponse = await response.response.transformToString();

    // Let's verify the snippet:
    // const command = new InvokeAgentRuntimeCommand(input);
    // const response = await client.send(command);
    // const textResponse = await response.response.transformToString();

    if (!response.response) {
      return NextResponse.json(
        { error: "Empty response from agent" },
        { status: 500 }
      );
    }

    // Stream the response directly
    // @ts-ignore - The SDK types might not perfectly align with Web Streams yet, but the underlying stream is compatible
    const stream = response.response.transformToWebStream
      ? response.response.transformToWebStream()
      : new ReadableStream({
          async start(controller) {
            // Fallback for async iterable if transformToWebStream isn't available
            for await (const chunk of response.response as any) {
              controller.enqueue(chunk);
            }
            controller.close();
          },
        });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
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
