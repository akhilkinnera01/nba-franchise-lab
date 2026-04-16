import { WorkspacePlaceholder } from '@/components/workspace-placeholder';

export default function MethodologyPage() {
  return (
    <WorkspacePlaceholder
      eyebrow="Methodology"
      title="Trust, assumptions, and formula notes stay inside the product."
      body="This route is becoming the permanent trust rail for the app: formula summaries, cap-rule caveats, simulation notes, and the limits of each scenario family. The shell is already in place so the full methodology experience can land without breaking the rest of the command center."
      primaryHref="/scenarios"
      primaryLabel="Return to the scenario desk"
    />
  );
}
