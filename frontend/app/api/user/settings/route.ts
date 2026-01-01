import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile, saveUserProfile, UserProfile } from '@/lib/db';

// TODO: Implement proper server-side authentication with Amplify
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getUserId = async (_req: NextRequest) => {
  return 'test-user';
};

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
        targetId: 'PROFILE#data',
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
      targetId: 'PROFILE#data',
      notificationEmail,
      emailNotificationsEnabled: !!emailNotificationsEnabled,
      updatedAt: new Date().toISOString(),
    };

    console.log('Saving profile:', profile);

    await dbSave(profile);

    // Manage SNS subscription if email or enabled status changed
    const emailChanged = notificationEmail !== oldProfile?.notificationEmail;
    const statusChanged =
      emailNotificationsEnabled !== oldProfile?.emailNotificationsEnabled;

    console.log(
      `[SettingsAPI] emailChanged: ${emailChanged}, statusChanged: ${statusChanged}`
    );
    console.log(
      `[SettingsAPI] oldEmail: ${oldProfile?.notificationEmail}, newEmail: ${notificationEmail}`
    );
    console.log(
      `[SettingsAPI] oldEnabled: ${oldProfile?.emailNotificationsEnabled}, newEnabled: ${emailNotificationsEnabled}`
    );

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
