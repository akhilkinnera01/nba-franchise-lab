import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ScenarioCompareWorkspace } from '@/components/scenario-compare-workspace';
import { useAuth } from '@/components/auth-provider';
import { getScenario, listSavedScenarios } from '@/lib/api/client';
import type { ScenarioEnvelope } from '@/lib/api/types';
import type { Session, User } from '@supabase/supabase-js';

vi.mock('@/components/auth-provider', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({
  getScenario: vi.fn(),
  listSavedScenarios: vi.fn(),
}));

const useAuthMock = vi.mocked(useAuth);
const getScenarioMock = vi.mocked(getScenario);
const listSavedScenariosMock = vi.mocked(listSavedScenarios);

describe('ScenarioCompareWorkspace', () => {
  beforeEach(() => {
    const mockUser: User = {
      id: 'user_123',
      email: 'akhil@example.com',
      aud: 'authenticated',
      role: 'authenticated',
      created_at: '2026-04-14T00:00:00Z',
      app_metadata: {},
      user_metadata: {},
    };
    const mockSession: Session = {
      access_token: 'supabase-token',
      refresh_token: 'refresh-token',
      expires_in: 3600,
      expires_at: 1_744_582_400,
      token_type: 'bearer',
      user: mockUser,
    };

    useAuthMock.mockReturnValue({
      client: null,
      status: 'signed-in',
      session: mockSession,
      user: mockUser,
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

    getScenarioMock.mockReset();
    listSavedScenariosMock.mockReset();
  });

  it('loads and compares two stored scenarios', async () => {
    listSavedScenariosMock.mockResolvedValue({
      items: [
        {
          scenario_id: 'scn_left',
          scenario_type: 'trade',
          title: 'Left trade',
          notes: null,
          created_at: '2026-04-14T00:00:00Z',
          saved_at: '2026-04-14T00:05:00Z',
          share_url: 'http://localhost:8000/scenarios/scn_left',
        },
      ],
    });
    const leftScenario: ScenarioEnvelope = {
      scenario_id: 'scn_left',
      scenario_type: 'trade',
      title: 'Left trade',
      notes: 'Trade build one.',
      created_at: '2026-04-14T00:00:00Z',
      engine_version: '0.1.0',
      data_version: 'local-dev',
      share_url: 'http://localhost:8000/scenarios/scn_left',
      request: { teams: [{ team_id: 1 }] },
      result: { trade_valid: true },
    };
    const rightScenario: ScenarioEnvelope = {
      scenario_id: 'scn_right',
      scenario_type: 'free-agent',
      title: 'Right signing',
      notes: 'Signing build two.',
      created_at: '2026-04-14T00:05:00Z',
      engine_version: '0.1.0',
      data_version: 'local-dev',
      share_url: 'http://localhost:8000/scenarios/scn_right',
      request: { team_id: 2 },
      result: { exception_available: true },
    };
    getScenarioMock.mockImplementation(async (scenarioId: string) =>
      scenarioId === 'scn_left' ? leftScenario : rightScenario,
    );

    render(
      <ScenarioCompareWorkspace
        initialLeftScenarioId="scn_left"
        initialRightScenarioId="scn_right"
      />,
    );

    await waitFor(() => {
      expect(screen.getByText('Structural differences and overlap')).toBeInTheDocument();
      expect(screen.getByText('Right signing')).toBeInTheDocument();
    });

    expect(screen.getByText('Comparison matrix')).toBeInTheDocument();
    expect(screen.getByText('Shared request keys')).toBeInTheDocument();
  });
});
