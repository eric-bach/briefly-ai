import fs from 'fs';
import path from 'path';

const componentPath = path.join(process.cwd(), 'components', 'EmailStatusIndicator.tsx');

function runRenderTests() {
  console.log('Running EmailStatusIndicator render verification...');

  if (!fs.existsSync(componentPath)) {
    console.error('FAIL: Component file not found');
    process.exit(1);
  }

  const content = fs.readFileSync(componentPath, 'utf8');

  // Check 1: Link to profile
  if (content.includes('href="/profile"') && content.includes('<Link')) {
    console.log('PASS: Links to /profile');
  } else {
    console.error('FAIL: Does not link to /profile');
    process.exit(1);
  }

  // Check 2: Visual states
  if (content.includes('bg-green-100') && content.includes('bg-gray-100')) {
     console.log('PASS: Has active/inactive visual states');
  } else {
     console.error('FAIL: Missing visual states (green/gray)');
     process.exit(1);
  }
  
  // Check 3: Logic usage
  if (content.includes('enabled ?') || content.includes('enabled &&')) {
      console.log('PASS: Uses enabled prop for conditional rendering');
  } else {
      console.error('FAIL: Does not use enabled prop');
      process.exit(1);
  }
}

runRenderTests();
