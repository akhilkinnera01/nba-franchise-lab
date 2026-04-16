import { EmptyStatePanel } from '@/components/empty-state-panel';
import { LabsHub } from '@/components/labs-hub';
import { ApiClientError, listTeamHealthSummaries } from '@/lib/api/client';

export const dynamic = 'force-dynamic';

export default async function LabsPage() {
  try {
    const payload = await listTeamHealthSummaries();
    return <LabsHub teams={payload.teams} />;
  } catch (error) {
    if (error instanceof ApiClientError) {
      return (
        <EmptyStatePanel
          eyebrow="Labs"
          title="The Phase 5 lab suite is ready, but the live team feed is offline."
          body="The new surfaces are built to reuse live team context when the API is reachable. Once the backend is available, this index becomes the control room for draft, counterfactual, strategy, shock, rebuild, and daily challenge surfaces."
        />
      );
    }

    throw error;
  }
}
