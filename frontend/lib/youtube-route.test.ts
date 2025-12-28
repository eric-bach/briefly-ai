
import { GET } from "../app/api/youtube/videos/route";
import { NextRequest } from "next/server";

// Mock global fetch
const originalFetch = global.fetch;

async function runTests() {
    console.log('Running tests for YouTube API Route...');
    let passed = 0;
    let failed = 0;

    try {
        // Test 1: Get Video Details
        global.fetch = async (url: RequestInfo | URL) => {
            const u = url.toString();
            if (u.includes('videos') && u.includes('id=test-video-id')) {
                return {
                    ok: true,
                    json: async () => ({
                        items: [{ id: 'test-video-id', snippet: { channelId: 'test-channel-id', title: 'Test Video' } }]
                    })
                } as Response;
            }
            return { ok: false, status: 404 } as Response;
        };

        // Mock NextRequest
        const req = new NextRequest('http://localhost/api/youtube/videos?videoId=test-video-id');
        
        // Temporarily set API Key
        process.env.YOUTUBE_API_KEY = 'test-key';

        const res = await GET(req);
        const data = await res.json();

        if (data.items && data.items[0].snippet.channelId === 'test-channel-id') {
             console.log('PASS: Fetched video details');
             passed++;
        } else {
             console.error('FAIL: Fetched video details');
             console.error('Data:', data);
             failed++;
        }

    } catch (e) {
        console.error('Test error:', e);
        failed++;
    } finally {
        global.fetch = originalFetch;
    }
    
    console.log(`\nResult: ${passed} passed, ${failed} failed.`);
    if (failed > 0) process.exit(1);
}

runTests();
