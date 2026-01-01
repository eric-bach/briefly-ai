import { sendEmailNotification } from "../app/api/summarize/route";
import { PublishCommand, PublishCommandOutput } from "@aws-sdk/client-sns";

// Simple assertion helper
function expect(actual: unknown, expected: unknown, message: string) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        console.error(`FAIL: ${message}`);
        console.error(`  Expected: ${JSON.stringify(expected)}`);
        console.error(`  Actual:   ${JSON.stringify(actual)}`);
        throw new Error(message);
    } else {
        console.log(`PASS: ${message}`);
    }
}

async function runTests() {
    console.log('Running sendEmailNotification integration tests...');
    let passed = 0;
    let failed = 0;

    // Set dummy env vars
    const originalTopic = process.env.NOTIFICATION_TOPIC_ARN;
    process.env.NOTIFICATION_TOPIC_ARN = "arn:aws:sns:us-east-1:123456789012:test-topic";

    try {
        // Test 1: Should send email when user has notifications enabled
        console.log("Test 1: User with notifications enabled");
        let snsCalled = false;
        let snsCommand: PublishCommand | null = null;
        
        const mockProfileEnabled = async (userId: string) => ({
            userId,
            targetId: "profile" as const, // Fix type literal
            notificationEmail: "test@example.com",
            emailNotificationsEnabled: true,
            updatedAt: "now"
        });

        const mockSendSns = async (cmd: PublishCommand) => {
            snsCalled = true;
            snsCommand = cmd;
            return {} as PublishCommandOutput;
        };

        await sendEmailNotification("user-1", "http://video.url", "Summary text", mockProfileEnabled, mockSendSns);

        expect(snsCalled, true, "SNS should be called");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((snsCommand as any)?.input?.TopicArn, "arn:aws:sns:us-east-1:123456789012:test-topic", "TopicArn matches");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((snsCommand as any)?.input?.Subject, "Briefly AI: Summary for http://video.url", "Subject matches");
        passed++;

        // Test 2: Should NOT send email when user has notifications disabled
        console.log("Test 2: User with notifications disabled");
        snsCalled = false;
        
        const mockProfileDisabled = async (userId: string) => ({
            userId,
            targetId: "profile" as const,
            notificationEmail: "test@example.com",
            emailNotificationsEnabled: false,
            updatedAt: "now"
        });

        await sendEmailNotification("user-2", "http://video.url", "Summary text", mockProfileDisabled, mockSendSns);

        expect(snsCalled, false, "SNS should NOT be called");
        passed++;

        // Test 3: Should NOT send email when user has no email set
        console.log("Test 3: User with no email set");
        snsCalled = false;
        
        const mockProfileNoEmail = async (userId: string) => ({
            userId,
            targetId: "profile" as const,
            emailNotificationsEnabled: true,
            updatedAt: "now"
        });

        await sendEmailNotification("user-3", "http://video.url", "Summary text", mockProfileNoEmail, mockSendSns);

        expect(snsCalled, false, "SNS should NOT be called");
        passed++;

        // Test 4: Should return early if TOPIC_ARN is not set
        console.log("Test 4: TOPIC_ARN not set");
        process.env.NOTIFICATION_TOPIC_ARN = "";
        snsCalled = false;
        let profileCalled = false;
        
        const mockProfileSpy = async () => {
            profileCalled = true;
            return null;
        };

        await sendEmailNotification("user-4", "http://video.url", "Summary text", mockProfileSpy, mockSendSns);

        expect(profileCalled, false, "Should not even fetch profile if topic missing");
        expect(snsCalled, false, "SNS should NOT be called");
        passed++;

    } catch (e) {
        console.error('Test failed with exception:', e);
        failed++;
    } finally {
        process.env.NOTIFICATION_TOPIC_ARN = originalTopic;
    }

    console.log(`\nResult: ${passed} passed, ${failed} failed.`);
    if (failed > 0) process.exit(1);
}

runTests().catch(err => {
    console.error(err);
    process.exit(1);
});