import { EmptyStatePanel } from '@/components/empty-state-panel';
import { DraftProspectLab } from '@/components/draft-prospect-lab';
import { ApiClientError, listTeamHealthSummaries } from '@/lib/api/client';

export const dynamic = 'force-dynamic';

interface DraftProspectPageProps {
  searchParams?: Promise<{
    team?: string;
  }>;
}

export default async function DraftProspectPage({
  searchParams,
}: DraftProspectPageProps) {
  const params = await searchParams;

  try {
    const payload = await listTeamHealthSummaries();
    return (
      <DraftProspectLab
        teams={payload.teams}
        initialTeamId={params?.team ? Number(params.team) : undefined}
      />
    );
  } catch (error) {
    if (error instanceof ApiClientError) {
      return (
        <EmptyStatePanel
          eyebrow="Draft Prospect Lab"
          title="The board is ready, but the live team context is offline."
          body="This surface uses the current franchise summary to rank archetypes and fit. Once the backend is reachable, the board will render against the live cap and roster context."
        />
      );
    }

    throw error;
  }
}
