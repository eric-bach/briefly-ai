import { parseInput } from './youtube-utils';

const tests = [
  // Video URLs
  { input: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', expected: { type: 'video', value: 'dQw4w9WgXcQ' } },
  { input: 'https://youtu.be/dQw4w9WgXcQ', expected: { type: 'video', value: 'dQw4w9WgXcQ' } },
  { input: 'https://www.youtube.com/shorts/dQw4w9WgXcQ', expected: { type: 'video', value: 'dQw4w9WgXcQ' } },
  
  // Channels
  { input: 'UC_x5XG1OV2P6uZZ5FSM9Ttw', expected: { type: 'channel', value: 'UC_x5XG1OV2P6uZZ5FSM9Ttw' } },
  { input: '@google', expected: { type: 'channel', value: '@google' } },
  { input: 'Google Developers', expected: { type: 'channel', value: 'Google Developers' } },
  
  // Channel URLs - Extracting handle/ID
  { input: 'https://www.youtube.com/@google', expected: { type: 'channel', value: '@google' } },
  { input: 'https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw', expected: { type: 'channel', value: 'UC_x5XG1OV2P6uZZ5FSM9Ttw' } },
];

let passed = 0;
let failed = 0;

console.log('Running tests for youtube-utils.ts...');

for (const t of tests) {
  const result = parseInput(t.input);
  const isMatch = result.type === t.expected.type && result.value === t.expected.value;
  
  if (isMatch) {
    passed++;
  } else {
    failed++;
    console.error(`FAIL: ${t.input}`);
    console.error(`  Expected: ${JSON.stringify(t.expected)}`);
    console.error(`  Got:      ${JSON.stringify(result)}`);
  }
}

console.log(`
Result: ${passed} passed, ${failed} failed.`);

if (failed > 0) {
  process.exit(1);
}
