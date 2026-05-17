import { ScenarioCompareWorkspace } from '@/components/scenario-compare-workspace';

export const dynamic = 'force-dynamic';

interface ComparePageProps {
  searchParams?: Promise<{
    left?: string;
    right?: string;
  }>;
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const params = await searchParams;

  return (
    <ScenarioCompareWorkspace
      initialLeftScenarioId={params?.left}
      initialRightScenarioId={params?.right}
    />
  );
}
