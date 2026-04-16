"""Tests for free-agent signing evaluation."""

from __future__ import annotations

from engine.cap_exceptions import CapExceptionAvailability, CapExceptionResult
from engine.cap_projection import SeasonCapProjectionResult, TeamCapProjectionResult
from engine.free_agent_evaluator import FreeAgentSigningInput, evaluate_free_agent_signing
from engine.season_simulator import SeasonSimulationResult, TeamSeasonSimulationResult
from engine.team_strength import TeamStrengthResult
from pytest import approx


def _team_strength(team_id: int, team_name: str, neutral_net_rating: float) -> TeamStrengthResult:
    """Build one minimal team-strength result."""

    return TeamStrengthResult(
        team_id=team_id,
        team_name=team_name,
        player_contribution_sum=neutral_net_rating,
        neutral_court_net_rating=neutral_net_rating,
        home_court_net_rating=neutral_net_rating + 3.0,
        total_minutes_share=1.0,
        players_considered=8,
    )


def test_evaluate_free_agent_signing_combines_performance_and_cap_deltas() -> None:
    """Free-agent evaluation should surface both basketball and cap consequences."""

    result = evaluate_free_agent_signing(
        FreeAgentSigningInput(
            team_id=1,
            team_name="Signing Team",
            player_name="Impact Wing",
            exception_code="room_mid_level",
            baseline_team_strength=_team_strength(1, "Signing Team", 0.5),
            signed_team_strength=_team_strength(1, "Signing Team", 2.0),
            baseline_season=SeasonSimulationResult(
                iterations=100,
                total_games_per_iteration=82,
                team_results=(
                    TeamSeasonSimulationResult(
                        team_id=1,
                        team_name="Signing Team",
                        conference="West",
                        expected_wins=37.0,
                        win_standard_deviation=4.2,
                        playoff_probability=0.28,
                        average_seed=9.2,
                        seed_probabilities={9: 0.6, 10: 0.4},
                    ),
                ),
            ),
            signed_season=SeasonSimulationResult(
                iterations=100,
                total_games_per_iteration=82,
                team_results=(
                    TeamSeasonSimulationResult(
                        team_id=1,
                        team_name="Signing Team",
                        conference="West",
                        expected_wins=42.0,
                        win_standard_deviation=4.0,
                        playoff_probability=0.51,
                        average_seed=7.1,
                        seed_probabilities={7: 0.6, 8: 0.4},
                    ),
                ),
            ),
            baseline_cap_projection=TeamCapProjectionResult(
                team_id=1,
                team_name="Signing Team",
                season_results=(
                    SeasonCapProjectionResult(
                        season="2024-25",
                        committed_salary_cents=13_500_000_000,
                        cap_hold_cents=0,
                        total_team_salary_cents=13_500_000_000,
                        salary_cap_cents=14_058_800_000,
                        cap_room_cents=558_800_000,
                        standard_contract_count=12,
                    ),
                    SeasonCapProjectionResult(
                        season="2025-26",
                        committed_salary_cents=14_400_000_000,
                        cap_hold_cents=0,
                        total_team_salary_cents=14_400_000_000,
                        salary_cap_cents=15_464_700_000,
                        cap_room_cents=1_064_700_000,
                        standard_contract_count=10,
                    ),
                ),
            ),
            signed_cap_projection=TeamCapProjectionResult(
                team_id=1,
                team_name="Signing Team",
                season_results=(
                    SeasonCapProjectionResult(
                        season="2024-25",
                        committed_salary_cents=14_000_000_000,
                        cap_hold_cents=0,
                        total_team_salary_cents=14_000_000_000,
                        salary_cap_cents=14_058_800_000,
                        cap_room_cents=58_800_000,
                        standard_contract_count=13,
                    ),
                    SeasonCapProjectionResult(
                        season="2025-26",
                        committed_salary_cents=15_000_000_000,
                        cap_hold_cents=0,
                        total_team_salary_cents=15_000_000_000,
                        salary_cap_cents=15_464_700_000,
                        cap_room_cents=464_700_000,
                        standard_contract_count=11,
                    ),
                ),
            ),
            cap_exception_result=CapExceptionResult(
                season="2024-25",
                exceptions=(
                    CapExceptionAvailability(
                        code="room_mid_level",
                        available=True,
                        amount_cents=7_983_000_000,
                        reason="Room exception available.",
                    ),
                ),
            ),
        )
    )

    assert result.exception_available is True
    assert result.wins_delta == 5.0
    assert result.playoff_probability_delta == approx(0.23)
    assert result.current_cap_room_delta_cents == -500_000_000
    assert result.cap_room_delta_cents_by_season == {
        "2024-25": -500_000_000,
        "2025-26": -600_000_000,
    }
