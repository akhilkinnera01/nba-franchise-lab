"""Tests for NBA-style playoff bracket simulation."""

from __future__ import annotations

from engine.playoff_simulator import (
    MAX_MONTE_CARLO_ITERATIONS,
    PlayoffBracketInput,
    PlayoffSeriesInput,
    PlayoffTeamInput,
    simulate_playoff_bracket,
    simulate_playoff_series,
)
from engine.team_strength import TeamStrengthResult
from pytest import raises


def _seeded_team(
    team_id: int,
    team_name: str,
    conference: str,
    seed: int,
    neutral_net_rating: float,
) -> PlayoffTeamInput:
    """Build one seeded playoff-team input for tests."""

    return PlayoffTeamInput(
        conference=conference,
        seed=seed,
        team_strength=TeamStrengthResult(
            team_id=team_id,
            team_name=team_name,
            player_contribution_sum=neutral_net_rating,
            neutral_court_net_rating=neutral_net_rating,
            home_court_net_rating=neutral_net_rating + 3.0,
            total_minutes_share=1.0,
            players_considered=8,
        ),
    )


def test_best_of_seven_series_favors_the_stronger_higher_seed() -> None:
    """A stronger higher seed should win a series more often than not."""

    result = simulate_playoff_series(
        PlayoffSeriesInput(
            higher_seed=_seeded_team(1, "Higher Seed", "East", 1, 7.0),
            lower_seed=_seeded_team(2, "Lower Seed", "East", 8, -2.0),
            iterations=4_000,
            random_seed=17,
        )
    )

    assert result.higher_seed_series_win_probability > 0.5


def test_playoff_bracket_reports_champion_probabilities() -> None:
    """Champion probabilities should sum to one across the bracket field."""

    result = simulate_playoff_bracket(
        PlayoffBracketInput(
            teams=(
                _seeded_team(1, "East One", "East", 1, 8.0),
                _seeded_team(2, "East Two", "East", 2, 3.0),
                _seeded_team(3, "East Three", "East", 3, -1.0),
                _seeded_team(4, "East Four", "East", 4, -4.0),
                _seeded_team(5, "West One", "West", 1, 7.0),
                _seeded_team(6, "West Two", "West", 2, 2.0),
                _seeded_team(7, "West Three", "West", 3, -2.0),
                _seeded_team(8, "West Four", "West", 4, -5.0),
            ),
            iterations=3_000,
            random_seed=23,
        )
    )
    team_results = {team_result.team_id: team_result for team_result in result.team_results}

    assert abs(sum(result.champion_probabilities.values()) - 1.0) < 1e-9
    assert team_results[1].championship_probability > team_results[4].championship_probability
    assert team_results[5].championship_probability > team_results[8].championship_probability


def test_playoff_simulators_reject_unbounded_iteration_counts() -> None:
    """The playoff helpers should cap iterations to avoid abusive workloads."""

    higher_seed = _seeded_team(1, "Higher Seed", "East", 1, 7.0)
    lower_seed = _seeded_team(2, "Lower Seed", "East", 8, -2.0)

    with raises(ValueError):
        PlayoffSeriesInput(
            higher_seed=higher_seed,
            lower_seed=lower_seed,
            iterations=MAX_MONTE_CARLO_ITERATIONS + 1,
        )

    with raises(ValueError):
        PlayoffBracketInput(
            teams=(
                _seeded_team(1, "East One", "East", 1, 8.0),
                _seeded_team(2, "East Two", "East", 2, 3.0),
                _seeded_team(3, "West One", "West", 1, 7.0),
                _seeded_team(4, "West Two", "West", 2, 2.0),
            ),
            iterations=MAX_MONTE_CARLO_ITERATIONS + 1,
        )
