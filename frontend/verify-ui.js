const fs = require('fs');
const path = require('path');

const dashboardPath = path.join(__dirname, 'app', '(main)', 'dashboard', 'page.tsx');
const navbarPath = path.join(__dirname, 'components', 'Navbar.tsx');

let allPassed = true;

const contentNavbar = fs.readFileSync(navbarPath, 'utf8');
const contentDashboard = fs.readFileSync(dashboardPath, 'utf8');

// Phase 1 Check
console.log('Verifying Phase 1: Label spacing...');
if (contentDashboard.includes('" (Optional)"')) {
    console.log('PASS: Label spacing');
} else {
    console.error('FAIL: Label spacing');
    allPassed = false;
}

// Phase 2 Check: Logo link
console.log('Verifying Phase 2: Logo link...');
const logoLinkRegex = /<Link\s+href="\/"[^>]*>[\s\S]*?Briefly AI[\s\S]*?<\/Link>/;
if (logoLinkRegex.test(contentNavbar)) {
    console.log('PASS: Logo link points to /');
} else {
    console.error('FAIL: Logo link does not point to /');
    allPassed = false;
}

// Phase 2 Check: Summarize link label
console.log('Verifying Phase 2: Summarize link label...');
if (contentNavbar.includes('Summarize') && !contentNavbar.includes('Summarizer')) {
    console.log('PASS: Summarize link label');
} else if (contentNavbar.includes('Summarizer')) {
    console.error('FAIL: Found old label "Summarizer"');
    allPassed = false;
} else {
    console.error('FAIL: Summarize link label not found');
    allPassed = false;
}

if (!allPassed) {
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED');
  process.exit(0);
}