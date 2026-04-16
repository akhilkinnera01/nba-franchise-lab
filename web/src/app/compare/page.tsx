import { ScenarioCompareWorkspace } from '@/components/scenario-compare-workspace';

export const dynamic = 'force-dynamic';

interface ComparePageProps {
  searchParams?: {
    left?: string;
    right?: string;
  };
}

export default function ComparePage({ searchParams }: ComparePageProps) {
  return (
    <ScenarioCompareWorkspace
      initialLeftScenarioId={searchParams?.left}
      initialRightScenarioId={searchParams?.right}
    />
  );
}
