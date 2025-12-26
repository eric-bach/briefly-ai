const fs = require('fs');
const path = require('path');
const content = fs.readFileSync(path.join(__dirname, '../app/api/user/prompts/route.ts'), 'utf8');
if (content.includes('export async function PUT')) {
    console.log('PASS: PUT found');
} else {
    console.error('FAIL: PUT not found');
    process.exit(1);
}
