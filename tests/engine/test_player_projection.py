"""Tests for the player projection layer."""

from __future__ import annotations

from engine.age_curves import AgeCurvePoint
from engine.injury_risk import InjuryRiskResult
from engine.player_projection import PlayerProjectionInput, project_player
from engine.player_value import PlayerValueResult
from pytest import approx, raises


def test_project_player_keeps_the_baseline_when_no_adjustments_exist() -> None:
    """The projection layer should preserve the current value model by default."""

    projection = project_player(
        PlayerProjectionInput(
            player_value=PlayerValueResult(
                player_id="player:1628973",
                player_name="Jalen Brunson",
                box_plus_minus=5.5,
                minutes_share=0.3,
                weighted_box_plus_minus=1.65,
            )
        )
    )

    assert projection.projected_box_plus_minus == approx(5.5)
    assert projection.age_adjustment == approx(0.0)
    assert projection.injury_adjustment == approx(0.0)
    assert projection.projected_minutes_share == approx(0.3)
    assert projection.projected_weighted_box_plus_minus == approx(1.65)


def test_project_player_combines_age_and_injury_adjustments() -> None:
    """Age curves and injury risk should both move the final projection."""

    projection = project_player(
        PlayerProjectionInput(
            player_value=PlayerValueResult(
                player_id="player:203954",
                player_name="Joel Embiid",
                box_plus_minus=8.8,
                minutes_share=0.32,
                weighted_box_plus_minus=2.816,
            ),
            age_curve=AgeCurvePoint(
                position_group="big",
                archetype="star",
                age=29,
                expected_bpm_delta=-0.2,
                std_dev=0.1,
                sample_size=12,
            ),
            injury_risk=InjuryRiskResult(
                player_id="player:203954",
                player_name="Joel Embiid",
                weighted_availability=0.8,
                injury_risk_score=0.2,
                projected_games_played=65.6,
                availability_volatility=0.05,
                recent_seasons_considered=3,
            ),
        )
    )

    assert projection.age_adjustment == approx(-0.2)
    assert projection.injury_adjustment == approx(-0.2)
    assert projection.projected_box_plus_minus == approx(8.4)
    assert projection.projected_minutes_share == approx(0.256)
    assert projection.projected_weighted_box_plus_minus == approx(2.1504)
    assert projection.projected_games_played == approx(65.6)


def test_project_player_allows_custom_injury_penalty_scale() -> None:
    """The caller can tune how strongly availability risk hits projected BPM."""

    projection = project_player(
        PlayerProjectionInput(
            player_value=PlayerValueResult(
                player_id="player:1629029",
                player_name="De'Aaron Fox",
                box_plus_minus=3.5,
            ),
            injury_risk=InjuryRiskResult(
                player_id="player:1629029",
                player_name="De'Aaron Fox",
                weighted_availability=0.9,
                injury_risk_score=0.1,
                projected_games_played=73.8,
                availability_volatility=0.01,
                recent_seasons_considered=3,
            ),
            injury_penalty_scale=1.5,
        )
    )

    assert projection.injury_adjustment == approx(-0.15)
    assert projection.projected_box_plus_minus == approx(3.35)


def test_player_projection_input_rejects_mismatched_player_ids() -> None:
    """Projection inputs should not silently combine different players."""

    with raises(ValueError):
        PlayerProjectionInput(
            player_value=PlayerValueResult(
                player_id="player:201939",
                player_name="Stephen Curry",
                box_plus_minus=6.0,
            ),
            injury_risk=InjuryRiskResult(
                player_id="player:203954",
                player_name="Joel Embiid",
                weighted_availability=0.75,
                injury_risk_score=0.25,
                projected_games_played=61.5,
                availability_volatility=0.03,
                recent_seasons_considered=3,
            ),
        )
