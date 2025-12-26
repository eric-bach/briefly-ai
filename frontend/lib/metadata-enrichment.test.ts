import { fetchMetadata } from "../app/api/user/prompts/route";

// Simple assertion helper
function expect(actual: unknown, expected: unknown, message: string) {
    if (actual !== expected) {
        console.error(`FAIL: ${message}`);
        console.error(`  Expected: ${expected}`);
        console.error(`  Actual:   ${actual}`);
        throw new Error(message);
    } else {
        console.log(`PASS: ${message}`);
    }
}

async function runTests() {
    console.log('Running fetchMetadata unit tests...');
    let passed = 0;
    let failed = 0;

    // Save original fetch
    const originalFetch = global.fetch;

    // Set a dummy API key so the function doesn't bail out early
    process.env.YOUTUBE_API_KEY = 'test-key';

    try {
        // Mock global.fetch for YouTube API
        global.fetch = (async (url: string | URL | Request) => {
            const urlStr = url.toString();
            if (urlStr.includes('videos') && urlStr.includes('id=test-video-id')) {
                return {
                    ok: true,
                    json: async () => ({
                        items: [{
                            snippet: {
                                title: "Test Video Title",
                                channelTitle: "Test Channel",
                                thumbnails: {
                                    default: { url: "http://example.com/thumb.jpg" }
                                }
                            }
                        }]
                    })
                } as Response;
            }
            if (urlStr.includes('channels') && urlStr.includes('id=test-channel-id')) {
                return {
                    ok: true,
                    json: async () => ({
                        items: [{
                            snippet: {
                                title: "Test Channel Title",
                                thumbnails: {
                                    default: { url: "http://example.com/channel-thumb.jpg" }
                                }
                            }
                        }]
                    })
                } as Response;
            }
            return { ok: false, json: async () => ({ items: [] }) } as Response;
        }) as typeof global.fetch;

        // Test 1: Video metadata
        console.log("Testing video metadata enrichment...");
        const videoMetadata = await fetchMetadata('test-video-id', 'video');
        expect(videoMetadata?.title, "Test Video Title", "Should return correct video title");
        expect(videoMetadata?.thumbnail, "http://example.com/thumb.jpg", "Should return correct video thumbnail");
        expect(videoMetadata?.channelTitle, "Test Channel", "Should return correct channel title for video");
        passed++;

        // Test 2: Channel metadata
        console.log("Testing channel metadata enrichment...");
        const channelMetadata = await fetchMetadata('test-channel-id', 'channel');
        expect(channelMetadata?.title, "Test Channel Title", "Should return correct channel title");
        expect(channelMetadata?.thumbnail, "http://example.com/channel-thumb.jpg", "Should return correct channel thumbnail");
        passed++;

        // Test 3: No results
        console.log("Testing no results...");
        const noMetadata = await fetchMetadata('non-existent', 'video');
        expect(noMetadata, null, "Should return null when no items found");
        passed++;

    } catch (e) {
        console.error('Test failed with exception:', e);
        failed++;
    } finally {
        // Restore
        global.fetch = originalFetch;
    }

    console.log(`\nResult: ${passed} passed, ${failed} failed.`);
    if (failed > 0) process.exit(1);
}

runTests().catch(err => {
    console.error(err);
    process.exit(1);
});