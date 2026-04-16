"""Tests for the games-played injury risk model."""

from __future__ import annotations

from engine.injury_risk import (
    DEFAULT_REGULAR_SEASON_GAMES,
    HistoricalAvailabilitySeason,
    InjuryRiskInput,
    evaluate_injury_risk,
)
from pytest import approx, raises


def test_evaluate_injury_risk_returns_zero_for_perfect_availability() -> None:
    """A player who never misses games should carry no injury risk penalty."""

    result = evaluate_injury_risk(
        InjuryRiskInput(
            player_id="player:201939",
            player_name="Stephen Curry",
            seasons=(
                HistoricalAvailabilitySeason(
                    season="2021-22",
                    age=33,
                    games_played=82,
                ),
                HistoricalAvailabilitySeason(
                    season="2022-23",
                    age=34,
                    games_played=82,
                ),
            ),
        )
    )

    assert result.weighted_availability == approx(1.0)
    assert result.injury_risk_score == approx(0.0)
    assert result.projected_games_played == approx(DEFAULT_REGULAR_SEASON_GAMES)
    assert result.availability_volatility == approx(0.0)


def test_evaluate_injury_risk_weights_recent_seasons_more_heavily() -> None:
    """Recent missed games should matter more than older healthy seasons."""

    result = evaluate_injury_risk(
        InjuryRiskInput(
            player_id="player:203954",
            player_name="Joel Embiid",
            seasons=(
                HistoricalAvailabilitySeason(
                    season="2021-22",
                    age=27,
                    games_played=82,
                ),
                HistoricalAvailabilitySeason(
                    season="2022-23",
                    age=28,
                    games_played=10,
                ),
            ),
        )
    )

    expected_weighted_availability = ((1 * 1.0) + (2 * (10 / 82))) / 3
    assert result.weighted_availability == approx(expected_weighted_availability)
    assert result.injury_risk_score == approx(1 - expected_weighted_availability)
    assert result.projected_games_played == approx(
        expected_weighted_availability * DEFAULT_REGULAR_SEASON_GAMES
    )
    assert result.recent_seasons_considered == 2


def test_evaluate_injury_risk_can_limit_the_recency_window() -> None:
    """Older seasons should drop out when the caller narrows the recency window."""

    result = evaluate_injury_risk(
        InjuryRiskInput(
            player_id="player:1629029",
            player_name="De'Aaron Fox",
            seasons=(
                HistoricalAvailabilitySeason(
                    season="2020-21",
                    age=23,
                    games_played=20,
                ),
                HistoricalAvailabilitySeason(
                    season="2021-22",
                    age=24,
                    games_played=70,
                ),
                HistoricalAvailabilitySeason(
                    season="2022-23",
                    age=25,
                    games_played=60,
                ),
            ),
            recency_window=2,
        )
    )

    expected_weighted_availability = ((1 * (70 / 82)) + (2 * (60 / 82))) / 3
    assert result.weighted_availability == approx(expected_weighted_availability)
    assert result.recent_seasons_considered == 2


def test_injury_risk_input_rejects_empty_history() -> None:
    """The model needs at least one historical season."""

    with raises(ValueError):
        InjuryRiskInput(
            player_id="player:1628973",
            player_name="Jalen Brunson",
            seasons=(),
        )


def test_historical_availability_season_rejects_impossible_games_played() -> None:
    """Games played cannot exceed the number of available games in a season."""

    with raises(ValueError):
        HistoricalAvailabilitySeason(
            season="2023-24",
            age=26,
            games_played=83,
        )
