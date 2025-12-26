const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'app', '(main)', 'dashboard', 'page.tsx');

try {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // We expect to find " (Optional)" with a leading space in the code
  if (content.includes('" (Optional)"')) {
    console.log('PASS: Found correct label with space " (Optional)"');
    process.exit(0);
  } else if (content.includes('"(Optional)"')) {
    console.error('FAIL: Found label without space "(Optional)"');
    process.exit(1);
  } else {
    console.error('FAIL: Could not find target string in file.');
    process.exit(1);
  }
} catch (err) {
  console.error('Error reading file:', err);
  process.exit(1);
}