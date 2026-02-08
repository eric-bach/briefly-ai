import { NextResponse } from 'next/server';
import { BedrockAgentCoreClient, InvokeAgentRuntimeCommand } from '@aws-sdk/client-bedrock-agentcore';
import { getUserProfile, UserProfile } from '@/lib/db';
import { SESClient, SendEmailCommand, SendEmailCommandOutput } from '@aws-sdk/client-ses';
import { marked } from 'marked';
import { parseInput } from '@/lib/youtube-utils';

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
type SendEmailFn = (command: SendEmailCommand) => Promise<SendEmailCommandOutput>;

// Update return type to include channel title
interface VideoDetails {
  title: string;
  channelTitle: string;
}

async function fetchVideoDetails(videoId: string): Promise<VideoDetails | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      const snippet = data.items[0].snippet;
      return {
        title: snippet.title,
        channelTitle: snippet.channelTitle,
      };
    }
  } catch (e) {
    console.error('Failed to fetch video details', e);
  }
  return null;
}

function sanitizeSessionId(channelTitle: string, videoTitle: string): string {
  // 1. Sanitize strings (replace non-alphanumeric with hyphen)
  const clean = (s: string) => {
    return s
      .replace(/ /g, '-')
      .replace(/[^a-zA-Z0-9\-_]/g, '')
      .replace(/-+/g, '-');
  };

  const cClean = clean(channelTitle);
  const vClean = clean(videoTitle);

  // 2. Add randomness (short UUID or random string)
  const shortUuid = Math.random().toString(36).substring(2, 10);

  // 3. Construct and Truncate
  // Max length ~80-100.
  const cTrunc = cClean.substring(0, 20);
  const vTrunc = vClean.substring(0, 50);

  let sessionId = `${cTrunc}-${vTrunc}-${shortUuid}`;

  // Ensure we don't exceed length (e.g. 95)
  if (sessionId.length > 95) {
    sessionId = sessionId.substring(0, 95);
  }

  return sessionId;
}

export async function sendEmailNotification(
  userId: string,
  videoUrl: string,
  summary: string,
  // DI overrides
  _getUserProfile: GetUserProfileFn = getUserProfile,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _sendEmail: SendEmailFn = (cmd) => sesClient.send(cmd) as Promise<any>,
) {
  try {
    const profile = await _getUserProfile(userId);
    if (!profile || !profile.emailNotificationsEnabled || !profile.notificationEmail) {
      console.log(`Email notifications disabled or missing email for user ${userId}`);
      return;
    }

    console.log(`Sending email notification to ${profile.notificationEmail}`);

    // Try to extract a title from the URL
    let title = videoUrl;
    const parsed = parseInput(videoUrl);
    if (parsed.type === 'video') {
      const details = await fetchVideoDetails(parsed.value);
      if (details) {
        title = details.title;
      }
    }

    // Use the user's email as both Source and Destination for now (simplest for Sandbox)
    // In production, Source should be a verified domain/email like 'noreply@briefly.ai'
    // Parse Markdown to HTML
    const htmlContent = marked.parse(summary);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { margin-bottom: 24px; border-bottom: 2px solid #ef4444; padding-bottom: 12px; }
            .header h1 { color: #111; margin: 0; font-size: 24px; }
            .content { background: #fff; }
            .content h1, .content h2, .content h3 { color: #111; margin-top: 24px; }
            .content p { margin-bottom: 16px; }
            .content ul, .content ol { margin-bottom: 16px; padding-left: 24px; }
            .content li { margin-bottom: 8px; }
            .footer { margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px; font-size: 12px; color: #666; text-align: center; }
            a { color: #ef4444; text-decoration: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Briefly AI Summary</h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: #666;">
                 Summary for: <a href="${videoUrl}">${title}</a>
              </p>
            </div>
            <div class="content">
              ${htmlContent}
            </div>
            <div class="footer">
              <p>Generated by Briefly AI</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const command = new SendEmailCommand({
      Source: process.env.SES_SOURCE_EMAIL || profile.notificationEmail,
      Destination: {
        ToAddresses: [profile.notificationEmail],
      },
      Message: {
        Subject: {
          Data: `Briefly AI: Summary for ${title}`,
        },
        Body: {
          Html: {
            Data: emailHtml,
            Charset: 'UTF-8',
          },
          Text: {
            Data: summary, // Fallback plain text
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

    const agentRuntimeArn = process.env.NEXT_PUBLIC_BEDROCK_AGENTCORE_RUNTIME_ARN;

    if (!agentRuntimeArn) {
      return NextResponse.json(
        {
          error: 'Server configuration error: Missing NEXT_PUBLIC_BEDROCK_AGENTCORE_RUNTIME_ARN',
        },
        { status: 500 },
      );
    }

    // Generate Descriptive Session ID
    let sessionId = generateSessionId(33); // Fallback

    const parsed = parseInput(videoUrl);
    if (parsed.type === 'video') {
      const details = await fetchVideoDetails(parsed.value);
      if (details) {
        sessionId = sanitizeSessionId(details.channelTitle, details.title);
      }
    }

    const client = new BedrockAgentCoreClient({ region: 'us-east-1' });
    const input = {
      runtimeSessionId: sessionId,
      agentRuntimeArn: agentRuntimeArn,
      qualifier: 'DEFAULT',
      payload: new TextEncoder().encode(JSON.stringify({ videoUrl, additionalInstructions })),
    };

    const command = new InvokeAgentRuntimeCommand(input);
    const response = await client.send(command);

    if (!response.response) {
      return NextResponse.json({ error: 'Empty response from agent' }, { status: 500 });
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
          // Note: using 'test-user' or the user from context if we had auth here.
          // For now, retaining original logic with 'test-user' but note that sendEmailNotification
          // might re-fetch title which is slightly inefficient but fine.
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
      { status: 500 },
    );
  }
}
