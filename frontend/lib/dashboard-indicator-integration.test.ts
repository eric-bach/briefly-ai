import fs from 'fs';
import path from 'path';

const dashboardPath = path.join(process.cwd(), 'app', '(main)', 'dashboard', 'page.tsx');

function runIntegrationTest() {
  console.log('Running Dashboard Integration verification...');

  if (!fs.existsSync(dashboardPath)) {
    console.error('FAIL: Dashboard file not found');
    process.exit(1);
  }

  const content = fs.readFileSync(dashboardPath, 'utf8');

  // Check for component usage
  if (content.includes('<EmailStatusIndicator')) {
    console.log('PASS: EmailStatusIndicator is integrated');
  } else {
    console.error('FAIL: EmailStatusIndicator is NOT found in dashboard');
    process.exit(1);
  }
}

runIntegrationTest();
