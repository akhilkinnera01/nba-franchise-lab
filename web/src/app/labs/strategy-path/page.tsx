import { EmptyStatePanel } from '@/components/empty-state-panel';
import { StrategyPathSimulator } from '@/components/strategy-path-simulator';
import { ApiClientError, listTeamHealthSummaries } from '@/lib/api/client';

export const dynamic = 'force-dynamic';

interface StrategyPathPageProps {
  searchParams?: Promise<{
    team?: string;
  }>;
}

export default async function StrategyPathPage({
  searchParams,
}: StrategyPathPageProps) {
  const params = await searchParams;

  try {
    const payload = await listTeamHealthSummaries();
    return (
      <StrategyPathSimulator
        teams={payload.teams}
        initialTeamId={params?.team ? Number(params.team) : undefined}
      />
    );
  } catch (error) {
    if (error instanceof ApiClientError) {
      return (
        <EmptyStatePanel
          eyebrow="Strategy Path Simulator"
          title="The route planner is in place, but the live feed is offline."
          body="This surface composes multi-step plans around the current franchise context. Once the backend is reachable, the planner will adapt to the live team summary route."
        />
      );
    }

    throw error;
  }
}
