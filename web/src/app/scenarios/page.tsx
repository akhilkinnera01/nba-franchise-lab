import { EmptyStatePanel } from '@/components/empty-state-panel';
import { ScenarioWorkspace } from '@/components/scenario-workspace';
import { ApiClientError, listTeamHealthSummaries } from '@/lib/api/client';

export const dynamic = 'force-dynamic';

interface ScenariosPageProps {
  searchParams?: {
    primaryTeam?: string;
    tool?: string;
    state?: string;
  };
}

export default async function ScenariosPage({
  searchParams,
}: ScenariosPageProps) {
  try {
    const teamPayload = await listTeamHealthSummaries();
    return (
      <ScenarioWorkspace
        initialTeams={teamPayload.teams}
        initialPrimaryTeamId={
          searchParams?.primaryTeam
            ? Number(searchParams.primaryTeam)
            : undefined
        }
        initialTool={searchParams?.tool}
        initialEncodedState={searchParams?.state}
      />
    );
  } catch (error) {
    if (error instanceof ApiClientError) {
      return (
        <EmptyStatePanel
          eyebrow="Scenarios"
          title="The trade workspace is ready, but the API is offline."
          body="The builder depends on the live teams, roster, cap, and trade-validation routes. Once the backend is reachable, this page becomes the first full decision workspace."
        />
      );
    }

    throw error;
  }
}
