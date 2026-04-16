"""Tests for injury scenario evaluation."""

from __future__ import annotations

from engine.injury_evaluator import InjuryImpactInput, evaluate_injury_impact
from engine.playoff_simulator import PlayoffBracketResult, PlayoffTeamResult
from engine.season_simulator import SeasonSimulationResult, TeamSeasonSimulationResult
from engine.team_strength import TeamStrengthResult


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


def test_evaluate_injury_impact_reports_performance_drop() -> None:
    """Injury evaluation should surface the basketball downside from missing games."""

    result = evaluate_injury_impact(
        InjuryImpactInput(
            team_id=1,
            team_name="Injury Team",
            player_name="Lead Guard",
            projected_games_missed=25,
            baseline_team_strength=_team_strength(1, "Injury Team", 4.0),
            injured_team_strength=_team_strength(1, "Injury Team", 1.5),
            baseline_season=SeasonSimulationResult(
                iterations=100,
                total_games_per_iteration=82,
                team_results=(
                    TeamSeasonSimulationResult(
                        team_id=1,
                        team_name="Injury Team",
                        conference="West",
                        expected_wins=49.0,
                        win_standard_deviation=4.1,
                        playoff_probability=0.88,
                        average_seed=3.1,
                        seed_probabilities={3: 0.7, 4: 0.3},
                    ),
                ),
            ),
            injured_season=SeasonSimulationResult(
                iterations=100,
                total_games_per_iteration=82,
                team_results=(
                    TeamSeasonSimulationResult(
                        team_id=1,
                        team_name="Injury Team",
                        conference="West",
                        expected_wins=43.0,
                        win_standard_deviation=4.3,
                        playoff_probability=0.67,
                        average_seed=6.0,
                        seed_probabilities={5: 0.4, 6: 0.6},
                    ),
                ),
            ),
            baseline_playoffs=PlayoffBracketResult(
                iterations=100,
                champion_probabilities={1: 0.11},
                team_results=(
                    PlayoffTeamResult(
                        team_id=1,
                        team_name="Injury Team",
                        conference="West",
                        seed=3,
                        finals_probability=0.18,
                        championship_probability=0.11,
                    ),
                ),
            ),
            injured_playoffs=PlayoffBracketResult(
                iterations=100,
                champion_probabilities={1: 0.05},
                team_results=(
                    PlayoffTeamResult(
                        team_id=1,
                        team_name="Injury Team",
                        conference="West",
                        seed=6,
                        finals_probability=0.09,
                        championship_probability=0.05,
                    ),
                ),
            ),
        )
    )

    assert result.net_rating_delta == -2.5
    assert result.wins_delta == -6.0
    assert result.projected_games_missed == 25
    assert result.championship_probability_delta == -0.06
