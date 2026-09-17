// app/api/setup/route.ts
import {NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {SetupProgress} from '@/app/api/setup/types';
import {SetupStep} from '@/components/setup/setup-context';
import {countRealUsers} from '@/lib/services/core/system-user/service';
import {isSetupCompleted} from '@/lib/services/core/setup-completion';

/**
 * @method GET
 * @description Get current setup progress including team invitations
 */
export async function GET() {
    try {
        // Check database state to determine progress
        const userCount = await countRealUsers();
        const systemConfig = await db.systemConfig.findFirst();
        const oauthProviders = await db.oAuthProvider.count();
        const invitationCount = await db.invitationLink.count();

        console.log('🔍 Setup API: Database state check:', {
            userCount,
            hasSystemConfig: !!systemConfig,
            oauthProviders,
            invitationCount
        });

        const progress: SetupProgress = {
            currentStep: 'theme', // Always start by picking a theme
            completedSteps: [],
            adminCreated: userCount > 0,
            settingsConfigured: !!systemConfig,
            oauthConfigured: oauthProviders > 0,
            teamInvitesSent: invitationCount > 0,
            isComplete: false
        };

        // ENFORCE PROPER STEP ORDER - each step requires previous steps
        // Step 1: Admin must be created first
        if (progress.adminCreated) {
            progress.completedSteps.push('admin');
            console.log('✅ Setup API: Admin step completed');

            // Step 2: Settings can only be completed if admin exists
            if (progress.settingsConfigured) {
                progress.completedSteps.push('settings');
                console.log('✅ Setup API: Settings step completed');

                // Step 3: OAuth can only be completed if settings exist
                if (progress.oauthConfigured) {
                    progress.completedSteps.push('oauth');
                    console.log('✅ Setup API: OAuth step completed');

                    // Step 4: Team invites can only be sent if OAuth is configured
                    if (progress.teamInvitesSent) {
                        progress.completedSteps.push('team');
                        console.log('✅ Setup API: Team step completed');
                    }
                }
            }
        }

        // Determine current step based on completed steps
        if (progress.completedSteps.length === 0) {
            progress.currentStep = 'theme';
            console.log('🎬 Setup API: Starting with theme (no steps completed)');
        } else {
            const lastCompleted = progress.completedSteps[progress.completedSteps.length - 1];
            const stepOrder: SetupStep[] = ['theme', 'welcome', 'admin', 'settings', 'oauth', 'team', 'complete'];
            const nextStepIndex = stepOrder.indexOf(lastCompleted as SetupStep) + 1;
            progress.currentStep = stepOrder[nextStepIndex] || 'complete';
            console.log(`🔄 Setup API: Last completed: ${lastCompleted}, next step: ${progress.currentStep}`);
        }

        // Mark as complete only once the wizard's own completion step has
        // actually run — not once admin+settings+(oauth or team) merely
        // *could* be inferred from DB rows, since oauth/team are skippable
        // and skipping never creates a row, which would otherwise leave
        // isComplete permanently false even after the admin finished the wizard.
        if (await isSetupCompleted()) {
            progress.currentStep = 'complete';
            if (!progress.completedSteps.includes('complete')) {
                progress.completedSteps.push('complete');
            }
            progress.isComplete = true;
            console.log('🎉 Setup API: Setup is complete!');
        }

        console.log('📊 Setup API: Final progress:', progress);
        return NextResponse.json(progress);
    } catch (error) {
        console.error('❌ Setup API: Error occurred:', error);
        return NextResponse.json(
            {error: 'Failed to get setup progress'},
            {status: 500}
        );
    }
}