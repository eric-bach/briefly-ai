/* eslint-disable */
const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, '../app/(main)/profile/page.tsx');
const editDialogPath = path.join(__dirname, '../components/EditPromptDialog.tsx');
const deleteDialogPath = path.join(__dirname, '../components/DeletePromptDialog.tsx');

if (fs.existsSync(editDialogPath) && fs.existsSync(deleteDialogPath)) {
    console.log('PASS: Dialog components exist');
} else {
    console.error('FAIL: Dialog components missing');
    process.exit(1);
}

const pageContent = fs.readFileSync(pagePath, 'utf8');
if (pageContent.includes('<EditPromptDialog') && pageContent.includes('<DeletePromptDialog')) {
    console.log('PASS: Profile page uses dialog components');
} else {
    console.error('FAIL: Profile page implementation incomplete');
    process.exit(1);
}
if (pageContent.includes('method: "PUT"') && pageContent.includes('method: "DELETE"')) {
    console.log('PASS: Profile page has update/delete logic');
} else {
    console.error('FAIL: Profile page missing update/delete logic');
    process.exit(1);
}
