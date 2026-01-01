import { PromptOverride } from "./db";

async function runTests() {
  console.log('Running tests for prompt overrides...');
  let passed = 0;
  let failed = 0;

  const mockDb = {
    getPromptOverride: async (userId: string, targetId: string): Promise<PromptOverride | null> => {
      if (userId === 'user1' && targetId === 'video1') {
        return {
          userId: 'user1',
          targetId: 'video1',
          prompt: 'Custom video prompt',
          type: 'video',
          updatedAt: new Date().toISOString()
        } as PromptOverride;
      }
      return null;
    }
  };

  // Test 1: Retrieve existing override
  const override = await mockDb.getPromptOverride('user1', 'video1');
  if (override && override.prompt === 'Custom video prompt') {
    console.log('PASS: Retrieve existing override');
    passed++;
  } else {
    console.error('FAIL: Retrieve existing override');
    failed++;
  }

  // Test 2: Retrieve non-existent override
  const none = await mockDb.getPromptOverride('user1', 'video2');
  if (none === null) {
    console.log('PASS: Retrieve non-existent override');
    passed++;
  } else {
    console.error('FAIL: Retrieve non-existent override');
    failed++;
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTests().catch(console.error);