/* eslint-disable */
const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, '../app/(main)/profile/page.tsx');
const listCompPath = path.join(__dirname, '../components/PromptList.tsx');

if (fs.existsSync(listCompPath)) {
    console.log('PASS: PromptList component exists');
} else {
    console.error('FAIL: PromptList component missing');
    process.exit(1);
}

const pageContent = fs.readFileSync(pagePath, 'utf8');
if (pageContent.includes('<PromptList') && pageContent.includes('fetchPrompts')) {
    console.log('PASS: Profile page uses PromptList and has fetching logic');
} else {
    console.error('FAIL: Profile page implementation incomplete');
    process.exit(1);
}
