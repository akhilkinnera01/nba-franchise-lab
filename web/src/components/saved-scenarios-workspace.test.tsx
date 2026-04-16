import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { SavedScenariosWorkspace } from '@/components/saved-scenarios-workspace';
import { useAuth } from '@/components/auth-provider';
import {
  addScenarioComment,
  getMe,
  getScenario,
  getScenarioFeedback,
  listSavedScenarios,
  saveScenario,
  setScenarioReaction,
  unsaveScenario,
  updateMe,
} from '@/lib/api/client';
import type { ScenarioEnvelope } from '@/lib/api/types';

vi.mock('@/components/auth-provider', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  addScenarioComment: vi.fn(),
  getMe: vi.fn(),
  getScenario: vi.fn(),
  getScenarioFeedback: vi.fn(),
  listSavedScenarios: vi.fn(),
  saveScenario: vi.fn(),
  setScenarioReaction: vi.fn(),
  unsaveScenario: vi.fn(),
  updateMe: vi.fn(),
}));

const useAuthMock = vi.mocked(useAuth);
const getMeMock = vi.mocked(getMe);
const getScenarioMock = vi.mocked(getScenario);
const getScenarioFeedbackMock = vi.mocked(getScenarioFeedback);
const listSavedScenariosMock = vi.mocked(listSavedScenarios);
const saveScenarioMock = vi.mocked(saveScenario);
const setScenarioReactionMock = vi.mocked(setScenarioReaction);
const unsaveScenarioMock = vi.mocked(unsaveScenario);
const updateMeMock = vi.mocked(updateMe);
const addScenarioCommentMock = vi.mocked(addScenarioComment);

describe('SavedScenariosWorkspace', () => {
  beforeEach(() => {
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

    getMeMock.mockReset();
    getScenarioMock.mockReset();
    getScenarioFeedbackMock.mockReset();
    listSavedScenariosMock.mockReset();
    saveScenarioMock.mockReset();
    setScenarioReactionMock.mockReset();
    unsaveScenarioMock.mockReset();
    updateMeMock.mockReset();
    addScenarioCommentMock.mockReset();
  });

  it('shows the sign-in prompt when no account is loaded', () => {
    render(<SavedScenariosWorkspace />);

    expect(
      screen.getByText(
        'A scenario library with profile controls, reactions, and reopen paths.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send sign-in link' })).toBeInTheDocument();
  });

  it('loads the saved library and selected scenario inspector', async () => {
    useAuthMock.mockReturnValue({
      client: null,
      status: 'signed-in',
      session: {
        access_token: 'supabase-token',
        user: {
          email: 'akhil@example.com',
        },
      } as never,
      user: {
        email: 'akhil@example.com',
      } as never,
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

    getMeMock.mockResolvedValue({
      user_id: 'user_123',
      email: 'akhil@example.com',
      display_name: 'Akhil',
      avatar_url: null,
      saved_scenario_count: 1,
    });
    listSavedScenariosMock.mockResolvedValue({
      items: [
        {
          scenario_id: 'scn_saved',
          scenario_type: 'trade',
          title: 'Saved trade',
          notes: 'A strong control-room test case.',
          created_at: '2026-04-14T00:00:00Z',
          saved_at: '2026-04-14T00:05:00Z',
          share_url: 'http://localhost:8000/scenarios/scn_saved',
        },
      ],
    });
    getScenarioMock.mockResolvedValue({
      scenario_id: 'scn_saved',
      scenario_type: 'trade',
      title: 'Saved trade',
      notes: 'A strong control-room test case.',
      created_at: '2026-04-14T00:00:00Z',
      engine_version: '0.1.0',
      data_version: 'local-dev',
      share_url: 'http://localhost:8000/scenarios/scn_saved',
      request: { teams: [{ team_id: 1 }] },
      result: { trade_valid: true },
    } as ScenarioEnvelope);
    getScenarioFeedbackMock.mockResolvedValue({
      scenario_id: 'scn_saved',
      upvotes: 3,
      downvotes: 1,
      viewer_reaction: 1,
      comments: [],
    });

    render(<SavedScenariosWorkspace />);

    await waitFor(() => {
      expect(screen.getByText('Saved trade')).toBeInTheDocument();
    });

    expect(screen.getByText('1 saved scenarios')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Compare' })).toBeInTheDocument();
  });
});
