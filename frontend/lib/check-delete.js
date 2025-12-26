const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, '../app/api/user/prompts/route.ts'), 'utf8');
if (content.includes('export async function DELETE')) {
    console.log('PASS: DELETE found');
} else {
    console.error('FAIL: DELETE not found');
    process.exit(1);
}
