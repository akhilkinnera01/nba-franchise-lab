"""Tests for the BPM-based player value model."""

from __future__ import annotations

from engine.player_value import (
    REGULAR_SEASON_TEAM_MINUTES,
    PlayerValueInput,
    evaluate_player_value,
    minutes_share_from_minutes_played,
)
from pydantic import ValidationError
from pytest import approx, raises


def test_minutes_share_from_minutes_played_uses_regular_season_team_minutes() -> None:
    """Regular-season workload should convert into one team-minute share."""

    assert minutes_share_from_minutes_played(2_400) == approx(2_400 / REGULAR_SEASON_TEAM_MINUTES)


def test_evaluate_player_value_uses_minutes_played_when_share_missing() -> None:
    """The model should derive weighted BPM from minutes played when needed."""

    result = evaluate_player_value(
        PlayerValueInput(
            player_id="player:203954",
            player_name="Joel Embiid",
            box_plus_minus=8.8,
            minutes_played=2_400,
        )
    )

    assert result.player_id == "player:203954"
    assert result.player_name == "Joel Embiid"
    assert result.box_plus_minus == 8.8
    assert result.minutes_share == approx(2_400 / REGULAR_SEASON_TEAM_MINUTES)
    assert result.weighted_box_plus_minus == approx(8.8 * (2_400 / REGULAR_SEASON_TEAM_MINUTES))


def test_evaluate_player_value_accepts_explicit_minutes_share() -> None:
    """Callers can pass a precomputed minutes share for downstream team modeling."""

    result = evaluate_player_value(
        PlayerValueInput(
            player_id="player:1628973",
            player_name="Jalen Brunson",
            box_plus_minus=5.7,
            minutes_share=0.31,
        )
    )

    assert result.minutes_share == approx(0.31)
    assert result.weighted_box_plus_minus == approx(1.767)


def test_player_value_input_rejects_conflicting_workload_fields() -> None:
    """The model should accept either minutes played or minutes share, not both."""

    with raises(ValidationError):
        PlayerValueInput(
            player_id="player:1629029",
            player_name="De'Aaron Fox",
            box_plus_minus=3.2,
            minutes_played=2_500,
            minutes_share=0.29,
        )


def test_minutes_share_from_minutes_played_rejects_invalid_bounds() -> None:
    """Minutes played cannot be negative or exceed the available team minutes."""

    with raises(ValueError):
        minutes_share_from_minutes_played(-1)

    with raises(ValueError):
        minutes_share_from_minutes_played(REGULAR_SEASON_TEAM_MINUTES + 1)
