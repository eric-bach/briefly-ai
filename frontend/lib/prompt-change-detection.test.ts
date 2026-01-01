(function() {

// Logic to test:
// A "Save" toast should trigger IF:
// 1. The user has entered a custom prompt (not empty).
// 2. The custom prompt is DIFFERENT from the currently loaded override (or different from empty if no override).
// 3. The summary generation has started (or completed?). The spec says "after the summary begins".

// We can extract this logic into a utility function or just test the state transitions.
// Since it's UI logic inside a component, we might want to extract the "shouldShowSavePrompt" logic to a pure function for easy testing.

function shouldShowSavePrompt(
    currentInput: string,
    originalOverride: string | null,
    hasStarted: boolean
): boolean {
    if (!hasStarted) return false;
    if (!currentInput || currentInput.trim() === '') return false;
    
    // If no original override, and we have input, it's new -> Save
    if (originalOverride === null) return true;

    // If we have an original override, only show if different
    return currentInput.trim() !== originalOverride.trim();
}

function runTests() {
    console.log('Running prompt change detection tests...');
    let passed = 0;
    let failed = 0; // Tracking for summary

    // Test 1: Not started yet
    if (shouldShowSavePrompt('New Prompt', null, false) === false) passed++;
    else { console.error('FAIL: Should not show before start'); failed++; }

    // Test 2: Started, new prompt, no previous override
    if (shouldShowSavePrompt('New Prompt', null, true) === true) passed++;
    else { console.error('FAIL: Should show for new prompt'); failed++; }

    // Test 3: Started, prompt matches override
    if (shouldShowSavePrompt('Existing Prompt', 'Existing Prompt', true) === false) passed++;
    else { console.error('FAIL: Should not show if matches override'); failed++; }

    // Test 4: Started, prompt differs from override
    if (shouldShowSavePrompt('Modified Prompt', 'Existing Prompt', true) === true) passed++;
    else { console.error('FAIL: Should show if modified'); failed++; }

    // Test 5: Started, empty prompt
    if (shouldShowSavePrompt('', null, true) === false) passed++;
    else { console.error('FAIL: Should not show for empty prompt'); failed++; }
    
     // Test 6: Started, whitespace only
    if (shouldShowSavePrompt('   ', null, true) === false) passed++;
    else { console.error('FAIL: Should not show for whitespace prompt'); failed++; }

    console.log(`\nResult: ${passed} passed, ${failed} failed.`);
    if (failed > 0) process.exit(1);
}

runTests();
})();
