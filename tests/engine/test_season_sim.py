"""Tests for Monte Carlo regular-season simulation."""

from __future__ import annotations

from engine.season_simulator import (
    MAX_MONTE_CARLO_ITERATIONS,
    ScheduledGameInput,
    SeasonSimulationInput,
    SeasonTeamInput,
    simulate_season,
)
from engine.team_strength import TeamStrengthResult
from pytest import approx, raises


def _team(
    team_id: int,
    team_name: str,
    conference: str,
    neutral_net_rating: float,
) -> SeasonTeamInput:
    """Build one season-simulation team input."""

    return SeasonTeamInput(
        conference=conference,
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


def _home_and_away_schedule(
    team_ids: tuple[int, ...],
    repeats: int,
) -> tuple[ScheduledGameInput, ...]:
    """Generate a simple conference round-robin schedule for tests."""

    schedule: list[ScheduledGameInput] = []
    for _ in range(repeats):
        for index, home_team_id in enumerate(team_ids):
            for away_team_id in team_ids[index + 1 :]:
                schedule.append(
                    ScheduledGameInput(home_team_id=home_team_id, away_team_id=away_team_id)
                )
                schedule.append(
                    ScheduledGameInput(home_team_id=away_team_id, away_team_id=home_team_id)
                )
    return tuple(schedule)


def test_regular_season_simulation_preserves_the_total_game_count() -> None:
    """Expected wins across the league should match the schedule's game count."""

    teams = (
        _team(1, "East Favorite", "East", 7.0),
        _team(2, "East Bubble", "East", 1.0),
        _team(3, "East Rebuild", "East", -5.0),
        _team(4, "West Favorite", "West", 6.0),
        _team(5, "West Bubble", "West", 0.5),
        _team(6, "West Rebuild", "West", -6.0),
    )
    schedule = _home_and_away_schedule((1, 2, 3), repeats=8) + _home_and_away_schedule(
        (4, 5, 6),
        repeats=8,
    )

    result = simulate_season(
        SeasonSimulationInput(
            teams=teams,
            schedule=schedule,
            iterations=2_000,
            playoff_spots_per_conference=2,
            random_seed=7,
        )
    )

    assert sum(team_result.expected_wins for team_result in result.team_results) == approx(
        len(schedule)
    )


def test_regular_season_simulation_orders_teams_by_strength() -> None:
    """Stronger teams should earn more wins and playoff odds on average."""

    teams = (
        _team(1, "East Favorite", "East", 8.0),
        _team(2, "East Bubble", "East", 1.0),
        _team(3, "East Rebuild", "East", -6.0),
        _team(4, "West Favorite", "West", 7.0),
        _team(5, "West Bubble", "West", 0.0),
        _team(6, "West Rebuild", "West", -7.0),
    )
    schedule = _home_and_away_schedule((1, 2, 3), repeats=10) + _home_and_away_schedule(
        (4, 5, 6),
        repeats=10,
    )

    result = simulate_season(
        SeasonSimulationInput(
            teams=teams,
            schedule=schedule,
            iterations=3_000,
            playoff_spots_per_conference=2,
            random_seed=13,
        )
    )
    results_by_team_id = {team_result.team_id: team_result for team_result in result.team_results}

    assert results_by_team_id[1].expected_wins > results_by_team_id[2].expected_wins
    assert results_by_team_id[2].expected_wins > results_by_team_id[3].expected_wins
    assert results_by_team_id[1].playoff_probability > results_by_team_id[3].playoff_probability
    assert sum(results_by_team_id[1].seed_probabilities.values()) == approx(1.0)


def test_regular_season_simulation_rejects_unbounded_iteration_counts() -> None:
    """The simulator should cap iterations to avoid pathological workloads."""

    teams = (
        _team(1, "East Favorite", "East", 6.0),
        _team(2, "East Bubble", "East", 0.0),
    )
    schedule = (
        ScheduledGameInput(home_team_id=1, away_team_id=2),
        ScheduledGameInput(home_team_id=2, away_team_id=1),
    )

    with raises(ValueError):
        SeasonSimulationInput(
            teams=teams,
            schedule=schedule,
            iterations=MAX_MONTE_CARLO_ITERATIONS + 1,
        )
