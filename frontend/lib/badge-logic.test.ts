
(function() {
// Logic for showing the badge:
// Show if:
// 1. originalOverride is not null (meaning we loaded something).
// 2. We are NOT skipping it (isSkipped == false).

function shouldShowBadge(originalOverride: string | null, isSkipped: boolean): boolean {
    return originalOverride !== null && !isSkipped;
}

function expect(actual: unknown, expected: unknown, message: string) {
    if (actual !== expected) {
        console.error(`FAIL: ${message}`);
        console.error(`  Expected: ${expected}`);
        console.error(`  Actual:   ${actual}`);
    } else {
        console.log(`PASS: ${message}`);
    }
}

function runTests() {
    console.log('Running badge logic tests...');
    
    // Test 1: No override -> No badge
    expect(shouldShowBadge(null, false), false, 'No override should mean no badge');

    // Test 2: Override loaded, not skipped -> Show badge
    expect(shouldShowBadge('Some prompt', false), true, 'Override loaded should show badge');

    // Test 3: Override loaded, skipped -> No badge (or maybe a different state, but spec implies "Override Active")
    // If skipped, it's effectively not active.
    expect(shouldShowBadge('Some prompt', true), false, 'Skipped override should not show active badge');
}

runTests();
})();
