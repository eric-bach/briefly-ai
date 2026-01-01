import { NextRequest } from 'next/server';
import {
  handleGet,
  handlePost,
  manageSnsSubscription,
} from '../app/api/user/settings/route';

// Simple assertion helper
function expect(actual: unknown, expected: unknown, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    console.error(`FAIL: ${message}`);
    console.error(`  Expected: ${JSON.stringify(expected)}`);
    console.error(`  Actual:   ${JSON.stringify(actual)}`);
    throw new Error(message);
  } else {
    console.log(`PASS: ${message}`);
  }
}

async function runTests() {
  console.log('Running User Settings API tests with dependency injection...');
  let passed = 0;
  let failed = 0;

  try {
    // Mock DB State
    const mockDb: Record<string, unknown> = {};

    const mockGet = async (userId: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (mockDb[userId] as any) || null;
    };

    const mockSave = async (profile: { userId: string }) => {
      mockDb[profile.userId] = profile;
    };

    // Test 1: GET default settings (no profile exists)
    console.log('Testing GET default settings...');
    const req1 = new NextRequest('http://localhost/api/user/settings');
    const res1 = await handleGet(req1, mockGet);
    const data1 = await res1.json();

    expect(
      data1.profile.emailNotificationsEnabled,
      false,
      'Should have notifications disabled by default'
    );
    passed++;

    // Test 2: POST update settings
    console.log('Testing POST update settings...');
    const updateBody = {
      notificationEmail: 'test@example.com',
      emailNotificationsEnabled: true,
    };
    const req2 = new NextRequest('http://localhost/api/user/settings', {
      method: 'POST',
      body: JSON.stringify(updateBody),
    });
    // We pass a dummy get that returns null first time
    const res2 = await handlePost(req2, mockSave, async () => null);
    const data2 = await res2.json();

    expect(data2.success, true, 'POST should return success');
    expect(
      data2.profile.notificationEmail,
      'test@example.com',
      'Should save notification email'
    );
    expect(
      data2.profile.emailNotificationsEnabled,
      true,
      'Should save notification toggle'
    );
    passed++;

    // Test 3: GET updated settings
    console.log('Testing GET updated settings...');
    const req3 = new NextRequest('http://localhost/api/user/settings');
    const res3 = await handleGet(req3, mockGet);
    const data3 = await res3.json();

    expect(
      data3.profile.notificationEmail,
      'test@example.com',
      'GET should return updated email'
    );
    expect(
      data3.profile.emailNotificationsEnabled,
      true,
      'GET should return updated toggle'
    );
    passed++;

    // Test 4: manageSnsSubscription logic (basic unit test)
    console.log('Testing manageSnsSubscription (smoke test)...');
    await manageSnsSubscription('test@example.com', true);
    console.log('PASS: manageSnsSubscription handled enabled=true');
    passed++;

    await manageSnsSubscription('test@example.com', false);
    console.log('PASS: manageSnsSubscription handled enabled=false');
    passed++;
  } catch (e) {
    console.error('Test failed with exception:', e);
    failed++;
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

// Only run if specifically executed directly (not imported)
// if (require.main === module) {
//     runTests().catch(err => {
//         console.error(err);
//         process.exit(1);
//     });
// }
