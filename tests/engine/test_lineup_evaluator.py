"""Tests for lineup change evaluation."""

from __future__ import annotations

from engine.lineup_evaluator import LineupChangeInput, evaluate_lineup_change
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


def test_evaluate_lineup_change_reports_delta_vs_baseline() -> None:
    """Lineup evaluation should compare the adjusted lineup back to the baseline."""

    result = evaluate_lineup_change(
        LineupChangeInput(
            team_id=1,
            team_name="Lineup Team",
            change_label="Start the small-ball closing lineup full time",
            baseline_team_strength=_team_strength(1, "Lineup Team", 1.2),
            adjusted_team_strength=_team_strength(1, "Lineup Team", 2.4),
            baseline_season=SeasonSimulationResult(
                iterations=100,
                total_games_per_iteration=82,
                team_results=(
                    TeamSeasonSimulationResult(
                        team_id=1,
                        team_name="Lineup Team",
                        conference="East",
                        expected_wins=41.0,
                        win_standard_deviation=4.0,
                        playoff_probability=0.5,
                        average_seed=6.5,
                        seed_probabilities={6: 0.5, 7: 0.5},
                    ),
                ),
            ),
            adjusted_season=SeasonSimulationResult(
                iterations=100,
                total_games_per_iteration=82,
                team_results=(
                    TeamSeasonSimulationResult(
                        team_id=1,
                        team_name="Lineup Team",
                        conference="East",
                        expected_wins=44.0,
                        win_standard_deviation=4.1,
                        playoff_probability=0.67,
                        average_seed=5.4,
                        seed_probabilities={5: 0.6, 6: 0.4},
                    ),
                ),
            ),
        )
    )

    assert result.net_rating_delta == 1.2
    assert result.wins_delta == 3.0
    assert result.playoff_probability_delta == approx(0.17)
