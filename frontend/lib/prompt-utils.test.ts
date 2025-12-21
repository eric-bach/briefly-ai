
import { resolvePromptOverride } from './prompt-utils';
import { PromptOverride } from './db';

// Simple assertion helper
function expect(actual: any, expected: any, message: string) {
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
    console.log('Running tests for prompt-utils precedence logic...');
    let passed = 0;
    let failed = 0;

    const userId = 'user1';
    const videoId = 'video123';
    const channelId = 'channel456';

    const videoOverride: PromptOverride = {
        userId,
        targetId: videoId,
        type: 'video',
        prompt: 'Video Specific Prompt',
        updatedAt: new Date().toISOString()
    };

    const channelOverride: PromptOverride = {
        userId,
        targetId: channelId,
        type: 'channel',
        prompt: 'Channel Specific Prompt',
        updatedAt: new Date().toISOString()
    };

    try {
        // Test 1: Video Override Exists (Should take precedence)
        const mockFetcher1 = async (u: string, t: string) => {
            if (t === videoId) return videoOverride;
            if (t === channelId) return channelOverride;
            return null;
        };

        const result1 = await resolvePromptOverride(userId, videoId, channelId, mockFetcher1);
        expect(result1, videoOverride, 'Video override should take precedence');
        passed++;

        // Test 2: No Video Override, Channel Override Exists
        const mockFetcher2 = async (u: string, t: string) => {
            if (t === videoId) return null;
            if (t === channelId) return channelOverride;
            return null;
        };

        const result2 = await resolvePromptOverride(userId, videoId, channelId, mockFetcher2);
        expect(result2, channelOverride, 'Channel override should be returned when no video override');
        passed++;

        // Test 3: No Overrides
        const mockFetcher3 = async () => null;

        const result3 = await resolvePromptOverride(userId, videoId, channelId, mockFetcher3);
        expect(result3, null, 'Should return null when no overrides exist');
        passed++;
        
        // Test 4: Only Video ID provided (no channel)
        const mockFetcher4 = async (u: string, t: string) => {
             if (t === videoId) return videoOverride;
             return null;
        };
        const result4 = await resolvePromptOverride(userId, videoId, undefined, mockFetcher4);
        expect(result4, videoOverride, 'Should return video override when channelId is missing');
        passed++;

        // Test 5: Only Channel ID provided (no video)
         const mockFetcher5 = async (u: string, t: string) => {
             if (t === channelId) return channelOverride;
             return null;
        };
        const result5 = await resolvePromptOverride(userId, undefined, channelId, mockFetcher5);
        expect(result5, channelOverride, 'Should return channel override when videoId is missing');
        passed++;


    } catch (e) {
        console.error('Test failed with exception:', e);
        failed++;
    }

    console.log(`\nResult: ${passed} passed, ${failed} failed.`);
    if (failed > 0) process.exit(1);
}

runTests();
