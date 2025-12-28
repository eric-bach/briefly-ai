import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile, saveUserProfile, UserProfile } from '@/lib/db';
import {
  SNSClient,
  SubscribeCommand,
  UnsubscribeCommand,
  ListSubscriptionsByTopicCommand,
} from '@aws-sdk/client-sns';

const snsClient = new SNSClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const TOPIC_ARN = process.env.NOTIFICATION_TOPIC_ARN || '';

// TODO: Implement proper server-side authentication with Amplify
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getUserId = async (_req: NextRequest) => {
  return 'test-user';
};

export async function manageSnsSubscription(email: string, enabled: boolean) {
  if (!TOPIC_ARN) {
    console.warn('NOTIFICATION_TOPIC_ARN not set, skipping SNS management');
    return;
  }

  try {
    // 1. List existing subscriptions to see if this email is already there
    const listCommand = new ListSubscriptionsByTopicCommand({
      TopicArn: TOPIC_ARN,
    });

    const { Subscriptions } = await snsClient.send(listCommand);
    const existingSub = Subscriptions?.find((s) => s.Endpoint === email);

    if (enabled) {
      if (!existingSub) {
        // Subscribe
        const subCommand = new SubscribeCommand({
          TopicArn: TOPIC_ARN,
          Protocol: 'email',
          Endpoint: email,
        });
        await snsClient.send(subCommand);
        console.log(`Subscribed ${email} to SNS`);
      }
    } else {
      if (
        existingSub &&
        existingSub.SubscriptionArn &&
        existingSub.SubscriptionArn !== 'PendingConfirmation'
      ) {
        // Unsubscribe
        const unsubCommand = new UnsubscribeCommand({
          SubscriptionArn: existingSub.SubscriptionArn,
        });
        await snsClient.send(unsubCommand);
        console.log(`Unsubscribed ${email} from SNS`);
      }
    }
  } catch (error) {
    console.error('Error managing SNS subscription:', error);
  }
}

export async function GET(req: NextRequest) {
  return handleGet(req);
}

export async function handleGet(
  req: NextRequest,
  dbGet: typeof getUserProfile = getUserProfile
) {
  try {
    const userId = await getUserId(req);
    let profile = await dbGet(userId);

    if (!profile) {
      // Default profile
      profile = {
        userId,
        targetId: 'profile',
        emailNotificationsEnabled: false,
        updatedAt: new Date().toISOString(),
      };
    }

    return NextResponse.json({ profile });
  } catch (error: unknown) {
    console.error('Error in GET /api/user/settings:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return handlePost(req);
}

export async function handlePost(
  req: NextRequest,
  dbSave: typeof saveUserProfile = saveUserProfile,
  dbGet: typeof getUserProfile = getUserProfile
) {
  try {
    const body = await req.json();
    const { notificationEmail, emailNotificationsEnabled } = body;

    const userId = await getUserId(req);
    const oldProfile = await dbGet(userId);

    const profile: UserProfile = {
      userId,
      targetId: 'profile',
      notificationEmail,
      emailNotificationsEnabled: !!emailNotificationsEnabled,
      updatedAt: new Date().toISOString(),
    };

    console.log('Saving profile:', profile);

    await dbSave(profile);

    // Manage SNS subscription if email or enabled status changed
    if (
      notificationEmail &&
      (notificationEmail !== oldProfile?.notificationEmail ||
        emailNotificationsEnabled !== oldProfile?.emailNotificationsEnabled)
    ) {
      await manageSnsSubscription(
        notificationEmail,
        !!emailNotificationsEnabled
      );
    }

    return NextResponse.json({ success: true, profile });
  } catch (error: unknown) {
    console.error('Error in POST /api/user/settings:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
