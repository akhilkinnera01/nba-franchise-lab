import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ScenarioWorkspace } from '@/components/scenario-workspace';
import { useAuth } from '@/components/auth-provider';
import { encodeScenarioShareState } from '@/lib/scenario-share';
import type { TeamHealthSummary } from '@/lib/api/types';

vi.mock('@/components/trade-builder', () => ({
  TradeBuilder: () => <div>trade builder mock</div>,
}));

vi.mock('@/components/free-agent-scenario-tool', () => ({
  FreeAgentScenarioTool: () => <div>free-agent tool mock</div>,
}));

vi.mock('@/components/injury-scenario-tool', () => ({
  InjuryScenarioTool: () => <div>injury tool mock</div>,
}));

vi.mock('@/components/lineup-scenario-tool', () => ({
  LineupScenarioTool: () => <div>lineup tool mock</div>,
}));

vi.mock('@/components/auth-provider', () => ({
  useAuth: vi.fn(),
}));

const useAuthMock = vi.mocked(useAuth);

const sampleTeams: TeamHealthSummary[] = [
  {
    team_id: 1610612737,
    abbreviation: 'ATL',
    full_name: 'Atlanta Hawks',
    conference: 'East',
    division: 'Southeast',
    season: '2024-25',
    wins: 41,
    losses: 41,
    net_rating: 1.5,
    offensive_rating: 116.2,
    defensive_rating: 114.7,
    pace: 100.1,
    roster_count: 15,
    standard_contract_count: 14,
    committed_salary_cents: 5_800_000_000,
    cap_room_cents: 8_258_800_000,
    tax_room_cents: 11_281_400_000,
    first_apron_room_cents: 12_013_200_000,
    second_apron_room_cents: 13_093_100_000,
  },
  {
    team_id: 1610612738,
    abbreviation: 'BOS',
    full_name: 'Boston Celtics',
    conference: 'East',
    division: 'Atlantic',
    season: '2024-25',
    wins: 60,
    losses: 22,
    net_rating: 8.9,
    offensive_rating: 121.4,
    defensive_rating: 112.5,
    pace: 98.5,
    roster_count: 15,
    standard_contract_count: 15,
    committed_salary_cents: 4_800_000_000,
    cap_room_cents: 9_258_800_000,
    tax_room_cents: 12_281_400_000,
    first_apron_room_cents: 13_013_200_000,
    second_apron_room_cents: 14_093_100_000,
  },
];

describe('ScenarioWorkspace', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/scenarios');
    useAuthMock.mockReturnValue({
      client: null,
      status: 'signed-out',
      session: null,
      user: null,
      email: null,
      displayName: null,
      avatarUrl: null,
      accessToken: null,
      error: null,
      isConfigured: false,
      signInWithEmail: vi.fn(),
      signInWithOtp: vi.fn(),
      signOut: vi.fn(),
    });
  });

  it('hydrates the selected tool from the encoded scenario state', async () => {
    render(
      <ScenarioWorkspace
        initialTeams={sampleTeams}
        initialEncodedState={encodeScenarioShareState({
          tool: 'free-agent',
          teamId: 1610612737,
          playerName: 'Example Wing',
          projectedBoxPlusMinus: 1.8,
          projectedMinutesShare: 0.24,
          annualSalaryCents: 1_200_000_000,
          contractYears: 2,
          annualRaiseRate: 0.05,
          exceptionCode: 'non_taxpayer_mid_level',
        })}
      />,
    );

    expect(screen.getByText('free-agent tool mock')).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.search).toContain('tool=free-agent');
    });
  });

  it('switches tools and keeps the URL shareable', async () => {
    const user = userEvent.setup();

    render(
      <ScenarioWorkspace
        initialTeams={sampleTeams}
        initialPrimaryTeamId={1610612737}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Lineup' }));
    expect(screen.getByText('lineup tool mock')).toBeInTheDocument();

    await waitFor(() => {
      expect(window.location.search).toContain('tool=lineup');
    });
    expect(screen.getByRole('button', { name: 'Copy live URL' })).toBeInTheDocument();
  });
});
