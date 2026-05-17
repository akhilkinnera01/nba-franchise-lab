import { EmptyStatePanel } from '@/components/empty-state-panel';
import { RebuildPlanner } from '@/components/rebuild-planner';
import { ApiClientError, listTeamHealthSummaries } from '@/lib/api/client';

export const dynamic = 'force-dynamic';

interface RebuildPlannerPageProps {
  searchParams?: Promise<{
    team?: string;
  }>;
}

export default async function RebuildPlannerPage({
  searchParams,
}: RebuildPlannerPageProps) {
  const params = await searchParams;

  try {
    const payload = await listTeamHealthSummaries();
    return (
      <RebuildPlanner
        teams={payload.teams}
        initialTeamId={params?.team ? Number(params.team) : undefined}
      />
    );
  } catch (error) {
    if (error instanceof ApiClientError) {
      return (
        <EmptyStatePanel
          eyebrow="Rebuild Planner"
          title="The rebuild planner is ready, but the live team feed is offline."
          body="This surface decomposes a reset into phases the front office can actually execute. Once the backend is reachable, it will adapt to the live franchise summary."
        />
      );
    }

    throw error;
  }
}
