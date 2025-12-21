

// Logic to test:
// 1. Constructing the payload for the save API.
// 2. Calling the API.
// 3. Handling the response (success/failure).

// Since we can't easily mock fetch in a standalone node script without setup, 
// we will focus on a helper function that we will create to handle the save operation.

// We'll create a helper 'saveOverride' in prompt-utils.ts (or similar) to handle the API call.

import { PromptOverride } from './db';

// Mock fetch
const globalFetch = global.fetch;

async function saveOverrideApi(
    userId: string, // In real app, this is handled by server session, but client might need to know context? No, client just sends targetId.
    // Actually, the API determines User ID. Client just sends: targetId, prompt, type.
    targetId: string,
    prompt: string,
    type: 'video' | 'channel'
): Promise<boolean> {
    try {
        const res = await fetch('/api/user/prompts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetId, prompt, type })
        });
        return res.ok;
    } catch (e) {
        return false;
    }
}

async function runTests() {
    console.log('Running save override tests...');
    let passed = 0;
    let failed = 0;

    // Test 1: Successful Save
    global.fetch = async (input, init) => {
        if (init?.method === 'POST' && input === '/api/user/prompts') {
            const body = JSON.parse(init.body as string);
            if (body.targetId === 'vid1' && body.type === 'video') {
                return { ok: true, json: async () => ({ success: true }) } as Response;
            }
        }
        return { ok: false } as Response;
    };

    const success = await saveOverrideApi('user1', 'vid1', 'New Prompt', 'video');
    if (success) passed++;
    else { console.error('FAIL: Save should succeed'); failed++; }

    // Test 2: Failed Save
    global.fetch = async () => ({ ok: false } as Response);
    const fail = await saveOverrideApi('user1', 'vid1', 'New Prompt', 'video');
    if (!fail) passed++;
    else { console.error('FAIL: Save should fail'); failed++; }

    console.log(`\nResult: ${passed} passed, ${failed} failed.`);
    if (failed > 0) process.exit(1);
    
    // Restore
    global.fetch = globalFetch;
}

runTests();
