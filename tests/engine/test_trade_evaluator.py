"""Tests for full trade impact evaluation."""

from __future__ import annotations

from engine.cap_projection import SeasonCapProjectionResult, TeamCapProjectionResult
from engine.playoff_simulator import PlayoffBracketResult, PlayoffTeamResult
from engine.season_simulator import SeasonSimulationResult, TeamSeasonSimulationResult
from engine.team_strength import TeamStrengthResult
from engine.trade_evaluator import TradeImpactInput, evaluate_trade_impact
from engine.trade_validator import (
    TradeTeamValidationResult,
    TradeValidationResult,
)


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


def test_evaluate_trade_impact_computes_team_level_deltas() -> None:
    """Trade evaluation should compare pre/post performance and cap outcomes."""

    result = evaluate_trade_impact(
        TradeImpactInput(
            trade_validation=TradeValidationResult(
                season="2024-25",
                valid=True,
                team_results=(
                    TradeTeamValidationResult(
                        team_id=1,
                        team_name="Team A",
                        apron_status="below_first_apron",
                        outgoing_salary_cents=1_000_000_000,
                        incoming_salary_cents=900_000_000,
                        maximum_incoming_salary_cents=2_250_000_000,
                        post_trade_standard_contract_count=14,
                        valid=True,
                    ),
                    TradeTeamValidationResult(
                        team_id=2,
                        team_name="Team B",
                        apron_status="below_first_apron",
                        outgoing_salary_cents=900_000_000,
                        incoming_salary_cents=1_000_000_000,
                        maximum_incoming_salary_cents=2_050_000_000,
                        post_trade_standard_contract_count=14,
                        valid=True,
                    ),
                ),
            ),
            involved_team_ids=(1, 2),
            baseline_team_strengths=(
                _team_strength(1, "Team A", 2.0),
                _team_strength(2, "Team B", 1.0),
            ),
            scenario_team_strengths=(
                _team_strength(1, "Team A", 3.5),
                _team_strength(2, "Team B", 0.2),
            ),
            baseline_season=SeasonSimulationResult(
                iterations=100,
                total_games_per_iteration=82,
                team_results=(
                    TeamSeasonSimulationResult(
                        team_id=1,
                        team_name="Team A",
                        conference="East",
                        expected_wins=44.0,
                        win_standard_deviation=4.0,
                        playoff_probability=0.72,
                        average_seed=4.5,
                        seed_probabilities={4: 0.6, 5: 0.4},
                    ),
                    TeamSeasonSimulationResult(
                        team_id=2,
                        team_name="Team B",
                        conference="East",
                        expected_wins=41.0,
                        win_standard_deviation=4.2,
                        playoff_probability=0.55,
                        average_seed=6.1,
                        seed_probabilities={6: 0.7, 7: 0.3},
                    ),
                ),
            ),
            scenario_season=SeasonSimulationResult(
                iterations=100,
                total_games_per_iteration=82,
                team_results=(
                    TeamSeasonSimulationResult(
                        team_id=1,
                        team_name="Team A",
                        conference="East",
                        expected_wins=48.0,
                        win_standard_deviation=4.1,
                        playoff_probability=0.86,
                        average_seed=3.2,
                        seed_probabilities={3: 0.6, 4: 0.4},
                    ),
                    TeamSeasonSimulationResult(
                        team_id=2,
                        team_name="Team B",
                        conference="East",
                        expected_wins=37.0,
                        win_standard_deviation=4.4,
                        playoff_probability=0.33,
                        average_seed=8.0,
                        seed_probabilities={8: 0.5, 9: 0.5},
                    ),
                ),
            ),
            baseline_playoffs=PlayoffBracketResult(
                iterations=100,
                champion_probabilities={1: 0.08, 2: 0.04},
                team_results=(
                    PlayoffTeamResult(
                        team_id=1,
                        team_name="Team A",
                        conference="East",
                        seed=4,
                        finals_probability=0.15,
                        championship_probability=0.08,
                    ),
                    PlayoffTeamResult(
                        team_id=2,
                        team_name="Team B",
                        conference="East",
                        seed=6,
                        finals_probability=0.09,
                        championship_probability=0.04,
                    ),
                ),
            ),
            scenario_playoffs=PlayoffBracketResult(
                iterations=100,
                champion_probabilities={1: 0.13, 2: 0.02},
                team_results=(
                    PlayoffTeamResult(
                        team_id=1,
                        team_name="Team A",
                        conference="East",
                        seed=3,
                        finals_probability=0.2,
                        championship_probability=0.13,
                    ),
                    PlayoffTeamResult(
                        team_id=2,
                        team_name="Team B",
                        conference="East",
                        seed=8,
                        finals_probability=0.04,
                        championship_probability=0.02,
                    ),
                ),
            ),
            pre_trade_cap_projections=(
                TeamCapProjectionResult(
                    team_id=1,
                    team_name="Team A",
                    season_results=(
                        SeasonCapProjectionResult(
                            season="2024-25",
                            committed_salary_cents=17_000_000_000,
                            cap_hold_cents=0,
                            total_team_salary_cents=17_000_000_000,
                            salary_cap_cents=14_058_800_000,
                            luxury_tax_cents=17_081_400_000,
                            cap_room_cents=-2_941_200_000,
                            tax_room_cents=81_400_000,
                            standard_contract_count=14,
                        ),
                        SeasonCapProjectionResult(
                            season="2025-26",
                            committed_salary_cents=16_000_000_000,
                            cap_hold_cents=0,
                            total_team_salary_cents=16_000_000_000,
                            salary_cap_cents=15_464_700_000,
                            luxury_tax_cents=18_789_500_000,
                            cap_room_cents=-535_300_000,
                            tax_room_cents=2_789_500_000,
                            standard_contract_count=12,
                        ),
                    ),
                ),
                TeamCapProjectionResult(
                    team_id=2,
                    team_name="Team B",
                    season_results=(
                        SeasonCapProjectionResult(
                            season="2024-25",
                            committed_salary_cents=15_500_000_000,
                            cap_hold_cents=0,
                            total_team_salary_cents=15_500_000_000,
                            salary_cap_cents=14_058_800_000,
                            luxury_tax_cents=17_081_400_000,
                            cap_room_cents=-1_441_200_000,
                            tax_room_cents=1_581_400_000,
                            standard_contract_count=14,
                        ),
                        SeasonCapProjectionResult(
                            season="2025-26",
                            committed_salary_cents=14_900_000_000,
                            cap_hold_cents=0,
                            total_team_salary_cents=14_900_000_000,
                            salary_cap_cents=15_464_700_000,
                            luxury_tax_cents=18_789_500_000,
                            cap_room_cents=564_700_000,
                            tax_room_cents=3_889_500_000,
                            standard_contract_count=12,
                        ),
                    ),
                ),
            ),
            post_trade_cap_projections=(
                TeamCapProjectionResult(
                    team_id=1,
                    team_name="Team A",
                    season_results=(
                        SeasonCapProjectionResult(
                            season="2024-25",
                            committed_salary_cents=16_900_000_000,
                            cap_hold_cents=0,
                            total_team_salary_cents=16_900_000_000,
                            salary_cap_cents=14_058_800_000,
                            luxury_tax_cents=17_081_400_000,
                            cap_room_cents=-2_841_200_000,
                            tax_room_cents=181_400_000,
                            standard_contract_count=14,
                        ),
                        SeasonCapProjectionResult(
                            season="2025-26",
                            committed_salary_cents=15_700_000_000,
                            cap_hold_cents=0,
                            total_team_salary_cents=15_700_000_000,
                            salary_cap_cents=15_464_700_000,
                            luxury_tax_cents=18_789_500_000,
                            cap_room_cents=-235_300_000,
                            tax_room_cents=3_089_500_000,
                            standard_contract_count=12,
                        ),
                    ),
                ),
                TeamCapProjectionResult(
                    team_id=2,
                    team_name="Team B",
                    season_results=(
                        SeasonCapProjectionResult(
                            season="2024-25",
                            committed_salary_cents=15_600_000_000,
                            cap_hold_cents=0,
                            total_team_salary_cents=15_600_000_000,
                            salary_cap_cents=14_058_800_000,
                            luxury_tax_cents=17_081_400_000,
                            cap_room_cents=-1_541_200_000,
                            tax_room_cents=1_481_400_000,
                            standard_contract_count=14,
                        ),
                        SeasonCapProjectionResult(
                            season="2025-26",
                            committed_salary_cents=15_100_000_000,
                            cap_hold_cents=0,
                            total_team_salary_cents=15_100_000_000,
                            salary_cap_cents=15_464_700_000,
                            luxury_tax_cents=18_789_500_000,
                            cap_room_cents=364_700_000,
                            tax_room_cents=3_689_500_000,
                            standard_contract_count=12,
                        ),
                    ),
                ),
            ),
        )
    )
    results_by_team_id = {team_result.team_id: team_result for team_result in result.team_results}

    assert result.trade_valid is True
    assert results_by_team_id[1].wins_delta == 4.0
    assert results_by_team_id[1].championship_probability_delta == 0.05
    assert results_by_team_id[2].wins_delta == -4.0
    assert results_by_team_id[1].cap_room_delta_cents_by_season == {
        "2024-25": 100_000_000,
        "2025-26": 300_000_000,
    }
    assert results_by_team_id[2].current_tax_room_delta_cents == -100_000_000
    assert results_by_team_id[2].tax_room_delta_cents_by_season == {
        "2024-25": -100_000_000,
        "2025-26": -200_000_000,
    }
