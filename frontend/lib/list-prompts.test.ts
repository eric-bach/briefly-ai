import * as db from "./db";

async function runListTests() {
  console.log('Running DB List Prompts tests...');
  
  if (typeof (db as any).listPromptOverrides !== 'function') {
      console.error('FAIL: listPromptOverrides function is missing in db.ts');
      process.exit(1);
  } else {
      console.log('PASS: listPromptOverrides function exists');
  }
}

runListTests();