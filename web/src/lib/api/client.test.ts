import { afterEach, describe, expect, it, vi } from 'vitest';

import { setApiAuthToken } from '@/lib/api/auth';
import {
  ApiClientError,
  createTradeScenario,
  getDailyChallenge,
  getFeaturedScenarioOfWeek,
  getMe,
  getScenarioFeedback,
  previewFreeAgentScenario,
  findComparableTrades,
  getApiUrl,
  getPublicApiBaseUrl,
  getScenario,
  previewInjuryScenario,
  previewLineupScenario,
  previewTradeProposal,
  listTeamHealthSummaries,
  saveScenarioToLibrary,
  setScenarioReaction,
  storeBrowserTradeScenario,
  validateTradeProposal,
  unsaveScenarioFromLibrary,
} from '@/lib/api/client';

describe('api client', () => {
  afterEach(() => {
    setApiAuthToken(null);
    vi.restoreAllMocks();
  });

  it('builds URLs from the public API base and query params', () => {
    expect(getPublicApiBaseUrl()).toBe('http://localhost:8000');
    expect(getApiUrl('teams', { season: '2024-25' })).toBe(
      'http://localhost:8000/teams?season=2024-25',
    );
  });

  it('returns typed team payloads from the live summary route', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          season: '2024-25',
          meta: {
            as_of: '2026-04-14T12:15:00Z',
            source_status: 'complete',
            missing_fields: [],
          },
          teams: [
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
          ],
        }),
        { status: 200 },
      ),
    );

    const payload = await listTeamHealthSummaries('2024-25');

    expect(payload.season).toBe('2024-25');
    expect(payload.teams[0]?.abbreviation).toBe('ATL');
  });

  it('GETs the daily challenge and featured scenario payloads', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
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
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            feature_key: 'scenario-of-week',
            title: 'Scenario of the Week: Durant stays',
            eyebrow: 'Alternate universe',
            summary: 'Keep the Thunder core together and follow the ripple effects.',
            launch_url: '/labs/alternate-universe',
            tags: ['history'],
          }),
          { status: 200 },
        ),
      );

    const [challenge, featured] = await Promise.all([
      getDailyChallenge(),
      getFeaturedScenarioOfWeek(),
    ]);

    expect(fetchSpy).toHaveBeenNthCalledWith(
      1,
      'http://localhost:8000/features/daily-challenge',
      expect.objectContaining({
        method: 'GET',
      }),
    );
    expect(fetchSpy).toHaveBeenNthCalledWith(
      2,
      'http://localhost:8000/features/scenario-of-week',
      expect.objectContaining({
        method: 'GET',
      }),
    );
    expect(challenge.challenge_key).toBe('daily-2026-04-15');
    expect(featured.feature_key).toBe('scenario-of-week');
  });

  it('surfaces problem-detail responses as typed client errors', async () => {
    vi.spyOn(global, 'fetch').mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            type: 'resource_not_found',
            title: 'Resource not found',
            status: 404,
            detail: 'scenario scn_missing does not exist.',
            instance: '/scenarios/scn_missing',
            request_id: 'req_123',
            errors: [],
          }),
          { status: 404 },
        ),
    );

    await expect(getScenario('scn_missing')).rejects.toBeInstanceOf(
      ApiClientError,
    );
    await expect(getScenario('scn_missing')).rejects.toMatchObject({
      status: 404,
      detail: 'scenario scn_missing does not exist.',
    });
  });

  it('GETs the authenticated profile route with a bearer token', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          user_id: 'user_123',
          email: 'akhil@example.com',
          display_name: 'Akhil',
          avatar_url: null,
          saved_scenario_count: 2,
        }),
        { status: 200 },
      ),
    );

    const payload = await getMe('auth-token');

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:8000/me',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer auth-token',
        }),
      }),
    );
    expect(payload.saved_scenario_count).toBe(2);
  });

  it('sends the browser auth token to authenticated account routes', async () => {
    setApiAuthToken('supabase-token');
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          scenario_id: 'scn_feedback',
          upvotes: 3,
          downvotes: 1,
          viewer_reaction: 1,
          comments: [],
        }),
        { status: 200 },
      ),
    );

    const payload = await getScenarioFeedback('scn_feedback');

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:8000/scenarios/scn_feedback/feedback',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer supabase-token',
        }),
      }),
    );
    expect(payload.upvotes).toBe(3);
  });

  it('POSTs scenario creation payloads against the typed trade endpoint', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          scenario_id: 'scn_trade_1',
          scenario_type: 'trade',
          title: 'Try a smaller-ball look',
          notes: null,
          created_at: '2026-04-14T00:00:00Z',
          engine_version: '0.1.0',
          data_version: 'local-dev',
          share_url: 'http://localhost:8000/scenarios/scn_trade_1',
          request: { involved_team_ids: [1, 2] },
          result: { trade_valid: true },
        }),
        { status: 201 },
      ),
    );

    const payload = await createTradeScenario({
      title: 'Try a smaller-ball look',
      request: { involved_team_ids: [1, 2] },
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:8000/scenarios/trade',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(payload.scenario_type).toBe('trade');
  });

  it('POSTs browser trade store payloads to the browser store endpoint', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          scenario_id: 'scn_browser_trade',
          scenario_type: 'trade',
          title: 'Stored browser trade',
          notes: null,
          created_at: '2026-04-14T00:00:00Z',
          engine_version: '0.1.0',
          data_version: 'local-dev',
          share_url: 'http://localhost:8000/scenarios/scn_browser_trade',
          request: { season: '2024-25' },
          result: { trade_valid: true },
        }),
        { status: 201 },
      ),
    );

    const payload = await storeBrowserTradeScenario({
      teams: [
        {
          team_id: 1610612737,
          outgoing_player_ids: ['player:1629027'],
          outgoing_pick_notes: [],
          sends_cash: false,
        },
        {
          team_id: 1610612738,
          outgoing_player_ids: ['player:1628369'],
          outgoing_pick_notes: [],
          sends_cash: false,
        },
      ],
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:8000/scenarios/trade/browser',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(payload.scenario_id).toBe('scn_browser_trade');
  });

  it('POSTs authenticated scenario saves and DELETEs unsaves', async () => {
    const saveSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          scenario_id: 'scn_saved',
          scenario_type: 'trade',
          title: 'Stored scenario',
          notes: null,
          created_at: '2026-04-14T00:00:00Z',
          saved_at: '2026-04-14T00:05:00Z',
          share_url: 'http://localhost:8000/scenarios/scn_saved',
        }),
        { status: 201 },
      ),
    );

    const saved = await saveScenarioToLibrary('auth-token', 'scn_saved');

    expect(saveSpy).toHaveBeenCalledWith(
      'http://localhost:8000/scenarios/scn_saved/save',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer auth-token',
        }),
      }),
    );
    expect(saved.scenario_id).toBe('scn_saved');

    saveSpy.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(
      unsaveScenarioFromLibrary('auth-token', 'scn_saved'),
    ).resolves.toBeUndefined();
    expect(saveSpy).toHaveBeenCalledWith(
      'http://localhost:8000/scenarios/scn_saved/save',
      expect.objectContaining({
        method: 'DELETE',
      }),
    );
  });

  it('POSTs authenticated reactions with the current token', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          scenario_id: 'scn_reaction',
          value: 1,
        }),
        { status: 200 },
      ),
    );

    const payload = await setScenarioReaction('auth-token', 'scn_reaction', {
      value: 1,
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:8000/scenarios/scn_reaction/reaction',
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          Authorization: 'Bearer auth-token',
        }),
      }),
    );
    expect(payload.value).toBe(1);
  });

  it('POSTs browser trade validation payloads to the live validation endpoint', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          season: '2024-25',
          valid: true,
          validation_scope_note:
            'Salary matching, roster limits, and active apron restrictions are validated here.',
          violations: [],
          team_results: [],
        }),
        { status: 200 },
      ),
    );

    const payload = await validateTradeProposal({
      season: '2024-25',
      teams: [
        {
          team_id: 1610612737,
          outgoing_player_ids: ['player:1629027'],
        },
        {
          team_id: 1610612738,
          outgoing_player_ids: ['player:1628369'],
        },
      ],
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:8000/scenarios/trade/validate',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(payload.valid).toBe(true);
    expect(payload.season).toBe('2024-25');
  });

  it('POSTs browser trade preview payloads to the preview endpoint', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          season: '2024-25',
          simulation_scope_note: 'Preview scope note',
          validation: {
            season: '2024-25',
            valid: true,
            validation_scope_note: 'Salary matching and apron rules.',
            violations: [],
            team_results: [],
          },
          team_results: [],
          comparable_trades: [],
        }),
        { status: 200 },
      ),
    );

    const payload = await previewTradeProposal({
      season: '2024-25',
      teams: [
        {
          team_id: 1610612737,
          outgoing_player_ids: ['player:1629027'],
        },
        {
          team_id: 1610612738,
          outgoing_player_ids: ['player:1628369'],
        },
      ],
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:8000/scenarios/trade/preview',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(payload.validation.valid).toBe(true);
    expect(payload.team_results).toHaveLength(0);
  });

  it('POSTs comparable trade payloads to the comparables endpoint', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          matches: [
            {
              trade_id: 'txn_123',
              description: 'Atlanta sends a star guard for depth.',
              season: '2024-25',
              similarity_score: 0.84,
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const payload = await findComparableTrades({
      season: '2024-25',
      teams_involved_count: 2,
      outgoing_players: [],
      incoming_players: [],
      draft_picks: [],
      limit: 5,
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:8000/scenarios/trade/comparables',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(payload.matches[0]?.trade_id).toBe('txn_123');
  });

  it('POSTs browser free-agent preview payloads to the preview endpoint', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          season: '2024-25',
          simulation_scope_note: 'Preview scope note',
          team_id: 1610612737,
          team_name: 'Atlanta Hawks',
          player_name: 'Example Wing',
          exception_code: 'non_taxpayer_mid_level',
          exception_available: true,
          exception_amount_cents: 12_800_000_00,
          exception_reason: 'Available below the first apron.',
          baseline: {
            expected_wins: 42,
            win_standard_deviation: 4.2,
            playoff_probability: 0.68,
            championship_probability: 0.06,
            average_seed: 5.2,
            seed_probabilities: { 4: 0.3, 5: 0.4, 6: 0.3 },
            current_cap_room_cents: 1_250_000_000,
            current_tax_room_cents: 3_500_000_000,
            cap_room_cents_by_season: { '2024-25': 1_250_000_000 },
            tax_room_cents_by_season: { '2024-25': 3_500_000_000 },
          },
          scenario: {
            expected_wins: 45,
            win_standard_deviation: 4.2,
            playoff_probability: 0.72,
            championship_probability: 0.07,
            average_seed: 4.7,
            seed_probabilities: { 4: 0.4, 5: 0.4, 6: 0.2 },
            current_cap_room_cents: 1_120_000_000,
            current_tax_room_cents: 3_370_000_000,
            cap_room_cents_by_season: { '2024-25': 1_120_000_000 },
            tax_room_cents_by_season: { '2024-25': 3_370_000_000 },
          },
          delta: {
            wins_delta: 3,
            playoff_probability_delta: 0.04,
            championship_probability_delta: 0.01,
            net_rating_delta: 1.1,
            current_cap_room_delta_cents: -125_000_000,
            current_tax_room_delta_cents: -125_000_000,
            cap_room_delta_cents_by_season: { '2024-25': -125_000_000 },
            tax_room_delta_cents_by_season: { '2024-25': -125_000_000 },
          },
        }),
        { status: 200 },
      ),
    );

    const payload = await previewFreeAgentScenario({
      season: '2024-25',
      team_id: 1610612737,
      player_name: 'Example Wing',
      projected_box_plus_minus: 1.8,
      projected_minutes_share: 0.24,
      annual_salary_cents: 1_280_000_000,
      contract_years: 2,
      annual_raise_rate: 0.05,
      exception_code: 'non_taxpayer_mid_level',
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:8000/scenarios/free-agent/preview',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(payload.player_name).toBe('Example Wing');
    expect(payload.exception_available).toBe(true);
  });

  it('POSTs browser injury preview payloads to the preview endpoint', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          season: '2024-25',
          simulation_scope_note: 'Preview scope note',
          team_id: 1610612737,
          team_name: 'Atlanta Hawks',
          player_id: 'player:1629027',
          player_name: 'Trae Young',
          projected_games_missed: 20,
          baseline: {
            expected_wins: 42,
            win_standard_deviation: 4.2,
            playoff_probability: 0.68,
            championship_probability: 0.06,
            average_seed: 5.2,
            seed_probabilities: { 4: 0.3, 5: 0.4, 6: 0.3 },
            current_cap_room_cents: 1_250_000_000,
            current_tax_room_cents: 3_500_000_000,
            cap_room_cents_by_season: { '2024-25': 1_250_000_000 },
            tax_room_cents_by_season: { '2024-25': 3_500_000_000 },
          },
          scenario: {
            expected_wins: 39.5,
            win_standard_deviation: 4.2,
            playoff_probability: 0.64,
            championship_probability: 0.05,
            average_seed: 5.8,
            seed_probabilities: { 5: 0.5, 6: 0.5 },
            current_cap_room_cents: 1_250_000_000,
            current_tax_room_cents: 3_500_000_000,
            cap_room_cents_by_season: { '2024-25': 1_250_000_000 },
            tax_room_cents_by_season: { '2024-25': 3_500_000_000 },
          },
          delta: {
            wins_delta: -2.5,
            playoff_probability_delta: -0.04,
            championship_probability_delta: -0.01,
            net_rating_delta: -0.8,
            current_cap_room_delta_cents: null,
            current_tax_room_delta_cents: null,
            cap_room_delta_cents_by_season: {},
            tax_room_delta_cents_by_season: {},
          },
        }),
        { status: 200 },
      ),
    );

    const payload = await previewInjuryScenario({
      season: '2024-25',
      team_id: 1610612737,
      player_id: 'player:1629027',
      projected_games_missed: 20,
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:8000/scenarios/injury/preview',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(payload.player_name).toBe('Trae Young');
    expect(payload.projected_games_missed).toBe(20);
  });

  it('POSTs browser lineup preview payloads to the preview endpoint', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          season: '2024-25',
          simulation_scope_note: 'Preview scope note',
          team_id: 1610612738,
          team_name: 'Boston Celtics',
          change_label: 'Stagger stars harder',
          baseline: {
            expected_wins: 59,
            win_standard_deviation: 4.2,
            playoff_probability: 0.68,
            championship_probability: 0.06,
            average_seed: 5.2,
            seed_probabilities: { 4: 0.3, 5: 0.4, 6: 0.3 },
            current_cap_room_cents: 1_250_000_000,
            current_tax_room_cents: 3_500_000_000,
            cap_room_cents_by_season: { '2024-25': 1_250_000_000 },
            tax_room_cents_by_season: { '2024-25': 3_500_000_000 },
          },
          scenario: {
            expected_wins: 60.5,
            win_standard_deviation: 4.2,
            playoff_probability: 0.72,
            championship_probability: 0.07,
            average_seed: 4.7,
            seed_probabilities: { 4: 0.4, 5: 0.4, 6: 0.2 },
            current_cap_room_cents: 1_250_000_000,
            current_tax_room_cents: 3_500_000_000,
            cap_room_cents_by_season: { '2024-25': 1_250_000_000 },
            tax_room_cents_by_season: { '2024-25': 3_500_000_000 },
          },
          delta: {
            wins_delta: 1.5,
            playoff_probability_delta: 0.04,
            championship_probability_delta: 0.01,
            net_rating_delta: 0.6,
            current_cap_room_delta_cents: null,
            current_tax_room_delta_cents: null,
            cap_room_delta_cents_by_season: {},
            tax_room_delta_cents_by_season: {},
          },
        }),
        { status: 200 },
      ),
    );

    const payload = await previewLineupScenario({
      season: '2024-25',
      team_id: 1610612738,
      change_label: 'Stagger stars harder',
      net_rating_adjustment: 0.6,
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:8000/scenarios/lineup/preview',
      expect.objectContaining({
        method: 'POST',
      }),
    );
    expect(payload.team_name).toBe('Boston Celtics');
    expect(payload.delta.net_rating_delta).toBe(0.6);
  });
});
