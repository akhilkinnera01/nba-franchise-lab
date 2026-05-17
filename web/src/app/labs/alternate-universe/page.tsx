import { EmptyStatePanel } from '@/components/empty-state-panel';
import { HistoricalAlternateUniverse } from '@/components/historical-alternate-universe';
import { ApiClientError, listTeamHealthSummaries } from '@/lib/api/client';

export const dynamic = 'force-dynamic';

interface AlternateUniversePageProps {
  searchParams?: Promise<{
    team?: string;
  }>;
}

export default async function AlternateUniversePage({
  searchParams,
}: AlternateUniversePageProps) {
  const params = await searchParams;

  try {
    const payload = await listTeamHealthSummaries();
    return (
      <HistoricalAlternateUniverse
        teams={payload.teams}
        initialTeamId={params?.team ? Number(params.team) : undefined}
      />
    );
  } catch (error) {
    if (error instanceof ApiClientError) {
      return (
        <EmptyStatePanel
          eyebrow="Historical Alternate Universe"
          title="The counterfactual rail is ready, but the live league feed is offline."
          body="This surface rewinds a franchise branch using the same team context as the rest of the control room. Once the backend is reachable, it will anchor alternate-history thinking to the live roster model."
        />
      );
    }

    throw error;
  }
}
