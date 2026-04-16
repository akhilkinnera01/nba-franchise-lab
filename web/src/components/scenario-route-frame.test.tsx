import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ScenarioRouteFrame } from '@/components/scenario-route-frame';

describe('ScenarioRouteFrame', () => {
  it('renders the shared intro, rail, footer, and body slots', () => {
    render(
      <ScenarioRouteFrame
        eyebrow="Compare"
        title="Read two stored scenarios as one decision diff."
        description="Load two scenario IDs and inspect them side by side."
        introSlot={<div>Intro controls</div>}
        rail={<div>Route rail</div>}
        footer={<div>Footer controls</div>}
      >
        <div>Workspace body</div>
      </ScenarioRouteFrame>,
    );

    expect(screen.getByText('Compare')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'Read two stored scenarios as one decision diff.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Intro controls')).toBeInTheDocument();
    expect(screen.getByText('Route rail')).toBeInTheDocument();
    expect(screen.getByText('Footer controls')).toBeInTheDocument();
    expect(screen.getByText('Workspace body')).toBeInTheDocument();
  });
});
