import { NextResponse } from 'next/server';
import {
  BedrockAgentCoreClient,
  InvokeAgentRuntimeCommand,
} from '@aws-sdk/client-bedrock-agentcore';
import { getUserProfile, UserProfile } from '@/lib/db';
import {
  SESClient,
  SendEmailCommand,
  SendEmailCommandOutput,
} from '@aws-sdk/client-ses';

const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

function generateSessionId(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }
  return result;
}

// Type definitions for DI
type GetUserProfileFn = (userId: string) => Promise<UserProfile | null>;
type SendEmailFn = (
  command: SendEmailCommand
) => Promise<SendEmailCommandOutput>;

export async function sendEmailNotification(
  userId: string,
  videoUrl: string,
  summary: string,
  // DI overrides
  _getUserProfile: GetUserProfileFn = getUserProfile,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _sendEmail: SendEmailFn = (cmd) => sesClient.send(cmd) as Promise<any>
) {
  // Legacy topic check removed for SES
  // const topicArn = process.env.NOTIFICATION_TOPIC_ARN;

  try {
    const profile = await _getUserProfile(userId);
    if (
      !profile ||
      !profile.emailNotificationsEnabled ||
      !profile.notificationEmail
    ) {
      console.log(
        `Email notifications disabled or missing email for user ${userId}`
      );
      return;
    }

    console.log(`Sending email notification to ${profile.notificationEmail}`);

    // Try to extract a title from the URL or just use URL
    const title = videoUrl;

    // Use the user's email as both Source and Destination for now (simplest for Sandbox)
    // In production, Source should be a verified domain/email like 'noreply@briefly.ai'
    const command = new SendEmailCommand({
      Source: profile.notificationEmail,
      Destination: {
        ToAddresses: [profile.notificationEmail],
      },
      Message: {
        Subject: {
          Data: `Briefly AI: Summary for ${title}`,
        },
        Body: {
          Text: {
            Data: summary,
          },
        },
      },
    });

    const response = await _sendEmail(command);
    console.log(`Email notification sent to ${profile.notificationEmail}`);
  } catch (error) {
    console.error('Failed to send email notification:', error);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { videoUrl, additionalInstructions } = body;

    if (!videoUrl) {
      return NextResponse.json({ error: 'Missing videoUrl' }, { status: 400 });
    }

    const agentRuntimeArn =
      process.env.NEXT_PUBLIC_BEDROCK_AGENTCORE_RUNTIME_ARN;

    if (!agentRuntimeArn) {
      return NextResponse.json(
        {
          error:
            'Server configuration error: Missing NEXT_PUBLIC_BEDROCK_AGENTCORE_RUNTIME_ARN',
        },
        { status: 500 }
      );
    }

    const client = new BedrockAgentCoreClient({ region: 'us-east-1' });
    const input = {
      runtimeSessionId: generateSessionId(33),
      agentRuntimeArn: agentRuntimeArn,
      qualifier: 'DEFAULT',
      payload: new TextEncoder().encode(
        JSON.stringify({ videoUrl, additionalInstructions })
      ),
    };

    const command = new InvokeAgentRuntimeCommand(input);
    const response = await client.send(command);

    if (!response.response) {
      return NextResponse.json(
        { error: 'Empty response from agent' },
        { status: 500 }
      );
    }

    // Stream the response directly
    const sourceStream = response.response.transformToWebStream
      ? response.response.transformToWebStream()
      : new ReadableStream({
          async start(controller) {
            // Fallback for async iterable if transformToWebStream isn't available
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            for await (const chunk of response.response as any) {
              controller.enqueue(chunk);
            }
            controller.close();
          },
        });

    // Capture the summary for email notification
    let fullSummary = '';
    const decoder = new TextDecoder();

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        fullSummary += decoder.decode(chunk, { stream: true });
        controller.enqueue(chunk);
      },
      async flush() {
        fullSummary += decoder.decode();
        // Await email notification to ensure execution before process termination
        try {
          console.log('Sending email notification...');
          await sendEmailNotification('test-user', videoUrl, fullSummary);
        } catch (e) {
          console.error('Error sending email notification:', e);
        }
      },
    });

    const stream = sourceStream.pipeThrough(transformStream);

    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    console.error('Error in proxy:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: (error as Error).message || String(error),
      },
      { status: 500 }
    );
  }
}
