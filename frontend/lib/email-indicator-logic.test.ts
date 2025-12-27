
// Logic for email indicator state
// Active: emailNotificationsEnabled is true
// Inactive: emailNotificationsEnabled is false

export interface EmailIndicatorState {
    status: 'active' | 'inactive';
    label: string;
    colorClass: string;
}

export function getEmailIndicatorState(enabled: boolean): EmailIndicatorState {
    if (enabled) {
        return {
            status: 'active',
            label: 'Email Notifications Active',
            colorClass: 'text-green-600 bg-green-100'
        };
    }
    return {
        status: 'inactive',
        label: 'Email Notifications Disabled',
        colorClass: 'text-gray-400 bg-gray-100'
    };
}

function expectEmailLogic(actual: any, expected: any, message: string) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        console.error(`FAIL: ${message}`);
        console.error(`  Expected: ${JSON.stringify(expected)}`);
        console.error(`  Actual:   ${JSON.stringify(actual)}`);
        process.exit(1);
    } else {
        console.log(`PASS: ${message}`);
    }
}

function runEmailLogicTests() {
    console.log('Running email indicator logic tests...');
    
    // Test 1: Enabled
    expectEmailLogic(
        getEmailIndicatorState(true), 
        {
            status: 'active',
            label: 'Email Notifications Active',
            colorClass: 'text-green-600 bg-green-100'
        }, 
        'Should return active state when enabled'
    );

    // Test 2: Disabled
    expectEmailLogic(
        getEmailIndicatorState(false), 
        {
            status: 'inactive',
            label: 'Email Notifications Disabled',
            colorClass: 'text-gray-400 bg-gray-100'
        }, 
        'Should return inactive state when disabled'
    );
}

// Only run if this is the main module (not imported)
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('email-indicator-logic.test.ts')) {
    runEmailLogicTests();
}
