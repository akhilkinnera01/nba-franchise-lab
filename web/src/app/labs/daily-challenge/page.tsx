import { EmptyStatePanel } from '@/components/empty-state-panel';
import { DailyChallengeWorkspace } from '@/components/daily-challenge-workspace';
import {
  ApiClientError,
  getDailyChallenge,
  getFeaturedScenarioOfWeek,
} from '@/lib/api/client';

export const dynamic = 'force-dynamic';

export default async function DailyChallengePage() {
  try {
    const [challenge, featuredScenario] = await Promise.all([
      getDailyChallenge(),
      getFeaturedScenarioOfWeek(),
    ]);

    return (
      <DailyChallengeWorkspace
        challenge={challenge}
        featuredScenario={featuredScenario}
      />
    );
  } catch (error) {
    if (error instanceof ApiClientError) {
      return (
        <EmptyStatePanel
          eyebrow="Daily Challenge"
          title="The daily prompt is ready, but the feature feed is offline."
          body="This surface now uses the Phase 5 featured-content routes for the daily challenge and scenario of the week. Once the backend is reachable, challenge submissions and community vote totals will appear here automatically."
        />
      );
    }

    throw error;
  }
}
