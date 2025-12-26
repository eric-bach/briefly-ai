const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, '../app/(main)/profile/page.tsx');
const navbarPath = path.join(__dirname, '../components/Navbar.tsx');

if (fs.existsSync(pagePath)) {
    console.log('PASS: Profile page exists');
} else {
    console.error('FAIL: Profile page missing');
    process.exit(1);
}

const navbarContent = fs.readFileSync(navbarPath, 'utf8');
if (navbarContent.includes('href="/profile"') && navbarContent.includes('Manage Prompts')) {
    console.log('PASS: Navbar link to profile exists');
} else {
    console.error('FAIL: Navbar link to profile missing');
    process.exit(1);
}
