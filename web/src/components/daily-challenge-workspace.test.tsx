import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DailyChallengeWorkspace } from '@/components/daily-challenge-workspace';
import { useAuth } from '@/components/auth-provider';
import {
  listSavedScenarios,
  submitDailyChallengeResponse,
} from '@/lib/api/client';

vi.mock('@/components/auth-provider', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  listSavedScenarios: vi.fn(),
  submitDailyChallengeResponse: vi.fn(),
}));

const useAuthMock = vi.mocked(useAuth);
const listSavedScenariosMock = vi.mocked(listSavedScenarios);
const submitDailyChallengeResponseMock = vi.mocked(
  submitDailyChallengeResponse,
);

describe('DailyChallengeWorkspace', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useAuthMock.mockReturnValue({
      client: null,
      status: 'signed-in',
      session: null,
      user: null,
      email: 'akhil@example.com',
      displayName: 'Akhil',
      avatarUrl: null,
      accessToken: 'supabase-token',
      error: null,
      isConfigured: true,
      signInWithEmail: vi.fn(),
      signInWithOtp: vi.fn(),
      signOut: vi.fn(),
    });
    listSavedScenariosMock.mockReset();
    submitDailyChallengeResponseMock.mockReset();
  });

  it('renders the featured challenge surfaces and loads saved scenarios', async () => {
    listSavedScenariosMock.mockResolvedValue({
      items: [
        {
          scenario_id: 'scn_saved',
          scenario_type: 'trade',
          title: 'Saved trade',
          notes: null,
          created_at: '2026-04-15T00:00:00Z',
          saved_at: '2026-04-15T00:05:00Z',
          share_url: 'http://localhost:8000/scenarios/scn_saved',
        },
      ],
    });

    render(
      <DailyChallengeWorkspace
        challenge={{
          challenge_key: 'daily-2026-04-15',
          challenge_date: '2026-04-15',
          template_id: 'trade-star-compression',
          title: 'Package three medium assets into one playoff-finisher',
          summary: 'The daily brief asks whether consolidation beats depth.',
          prompt: 'Open the trade workspace and find one clean consolidation path.',
          scenario_type: 'trade',
          launch_url: '/scenarios?tool=trade',
          tags: ['trade', 'apron'],
          submissions: [
            {
              submission_id: 1,
              challenge_key: 'daily-2026-04-15',
              scenario_id: 'scn_other',
              scenario_type: 'trade',
              title: 'Other trade',
              author_user_id: 'user_456',
              author_display_name: 'Jamie',
              note: 'Leaned into the depth side of the equation.',
              created_at: '2026-04-15T01:00:00Z',
              upvotes: 4,
              downvotes: 1,
              share_url: 'http://localhost:8000/scenarios/scn_other',
            },
          ],
        }}
        featuredScenario={{
          feature_key: 'scenario-of-week',
          title: 'Scenario of the Week: Durant stays',
          eyebrow: 'Alternate universe',
          summary: 'Keep the Thunder core together and follow the ripple effects.',
          launch_url: '/labs/alternate-universe',
          tags: ['history'],
        }}
      />,
    );

    expect(
      screen.getByText('Package three medium assets into one playoff-finisher'),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText('Scenario of the Week: Durant stays'),
    ).toHaveLength(2);

    await waitFor(() => {
      expect(listSavedScenariosMock).toHaveBeenCalledWith('supabase-token');
    });

    expect(screen.getByText('Jamie')).toBeInTheDocument();
    expect(
      screen.getByText('Leaned into the depth side of the equation.'),
    ).toBeInTheDocument();
  });

  it('submits the selected saved scenario and updates the streak', async () => {
    const user = userEvent.setup();

    listSavedScenariosMock.mockResolvedValue({
      items: [
        {
          scenario_id: 'scn_saved',
          scenario_type: 'trade',
          title: 'Saved trade',
          notes: null,
          created_at: '2026-04-15T00:00:00Z',
          saved_at: '2026-04-15T00:05:00Z',
          share_url: 'http://localhost:8000/scenarios/scn_saved',
        },
      ],
    });
    submitDailyChallengeResponseMock.mockResolvedValue({
      submission_id: 2,
      challenge_key: 'daily-2026-04-15',
      scenario_id: 'scn_saved',
      scenario_type: 'trade',
      title: 'Saved trade',
      author_user_id: 'user_123',
      author_display_name: 'Akhil',
      note: 'Pressed the upside path.',
      created_at: '2026-04-15T03:00:00Z',
      upvotes: 0,
      downvotes: 0,
      share_url: 'http://localhost:8000/scenarios/scn_saved',
    });

    render(
      <DailyChallengeWorkspace
        challenge={{
          challenge_key: 'daily-2026-04-15',
          challenge_date: '2026-04-15',
          template_id: 'trade-star-compression',
          title: 'Package three medium assets into one playoff-finisher',
          summary: 'The daily brief asks whether consolidation beats depth.',
          prompt: 'Open the trade workspace and find one clean consolidation path.',
          scenario_type: 'trade',
          launch_url: '/scenarios?tool=trade',
          tags: ['trade', 'apron'],
          submissions: [],
        }}
        featuredScenario={{
          feature_key: 'scenario-of-week',
          title: 'Scenario of the Week: Durant stays',
          eyebrow: 'Alternate universe',
          summary: 'Keep the Thunder core together and follow the ripple effects.',
          launch_url: '/labs/alternate-universe',
          tags: ['history'],
        }}
      />,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Submit saved scenario' }),
      ).toBeEnabled();
    });

    await user.type(
      screen.getByPlaceholderText('What logic makes this response worth sharing?'),
      'Pressed the upside path.',
    );
    await user.click(
      screen.getByRole('button', { name: 'Submit saved scenario' }),
    );

    await waitFor(() => {
      expect(submitDailyChallengeResponseMock).toHaveBeenCalledWith(
        'supabase-token',
        {
          challenge_key: 'daily-2026-04-15',
          scenario_id: 'scn_saved',
          note: 'Pressed the upside path.',
        },
      );
    });

    expect(
      screen.getByText('Challenge response submitted to the shared board.'),
    ).toBeInTheDocument();
    expect(screen.getByText('1 day')).toBeInTheDocument();
  });
});
