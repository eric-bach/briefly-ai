import { NextRequest } from "next/server";
import * as db from "./db";
import { GET, POST } from "../app/api/user/prompts/route";

// Mock the db module
jest.mock("./db");
const mockedDb = db as jest.Mocked<typeof db>;

// Since we don't have jest, I'll do a simple mock replacement
const originalGet = db.getPromptOverride;
const originalSave = db.savePromptOverride;

async function runApiTests() {
  console.log('Running API Handler tests...');
  let passed = 0;
  let failed = 0;

  // Mock implementation
  (db as any).getPromptOverride = async (userId: string, targetId: string) => {
    if (targetId === 'test-video') {
        return { userId, targetId, prompt: 'Saved prompt', type: 'video', updatedAt: '' };
    }
    return null;
  };

  // Test GET
  try {
    const req = new NextRequest("http://localhost/api/user/prompts?targetId=test-video");
    const response = await GET(req);
    const data = await response.json();
    
    if (data.override?.prompt === 'Saved prompt') {
        console.log('PASS: GET handler returns override');
        passed++;
    } else {
        console.error('FAIL: GET handler returns override');
        failed++;
    }
  } catch (e) {
    console.error('FAIL: GET handler threw error', e);
    failed++;
  }

  // Restore
  (db as any).getPromptOverride = originalGet;
  (db as any).savePromptOverride = originalSave;

  console.log(`\nResult: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runApiTests();
