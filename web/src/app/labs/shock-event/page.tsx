import { EmptyStatePanel } from '@/components/empty-state-panel';
import { ShockEventSimulator } from '@/components/shock-event-simulator';
import { ApiClientError, listTeamHealthSummaries } from '@/lib/api/client';

export const dynamic = 'force-dynamic';

interface ShockEventPageProps {
  searchParams?: {
    team?: string;
  };
}

export default async function ShockEventPage({
  searchParams,
}: ShockEventPageProps) {
  try {
    const payload = await listTeamHealthSummaries();
    return (
      <ShockEventSimulator
        teams={payload.teams}
        initialTeamId={searchParams?.team ? Number(searchParams.team) : undefined}
      />
    );
  } catch (error) {
    if (error instanceof ApiClientError) {
      return (
        <EmptyStatePanel
          eyebrow="Shock Event Simulator"
          title="The response rail is ready, but the live feed is offline."
          body="This surface maps how a roster reacts to injury, cap, or rotation shocks. Once the backend is reachable, it will use the live team context as its starting point."
        />
      );
    }

    throw error;
  }
}
