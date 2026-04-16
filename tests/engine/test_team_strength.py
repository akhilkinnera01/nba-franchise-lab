"""Tests for team-strength projection from projected player contributions."""

from __future__ import annotations

from engine.player_projection import PlayerProjectionResult
from engine.team_strength import TeamStrengthInput, project_team_strength
from pytest import approx, raises


def test_project_team_strength_sums_weighted_player_contributions() -> None:
    """Neutral-court team strength should sum weighted projected BPM values."""

    projection = project_team_strength(
        TeamStrengthInput(
            team_id=1610612738,
            team_name="Boston Celtics",
            player_projections=(
                PlayerProjectionResult(
                    player_id="p1",
                    player_name="Player One",
                    baseline_box_plus_minus=5.0,
                    age_adjustment=0.2,
                    injury_adjustment=-0.1,
                    projected_box_plus_minus=5.1,
                    projected_minutes_share=0.3,
                    projected_weighted_box_plus_minus=1.53,
                ),
                PlayerProjectionResult(
                    player_id="p2",
                    player_name="Player Two",
                    baseline_box_plus_minus=2.0,
                    age_adjustment=0.0,
                    injury_adjustment=0.0,
                    projected_box_plus_minus=2.0,
                    projected_minutes_share=0.2,
                    projected_weighted_box_plus_minus=0.4,
                ),
                PlayerProjectionResult(
                    player_id="p3",
                    player_name="Player Three",
                    baseline_box_plus_minus=-1.0,
                    age_adjustment=0.0,
                    injury_adjustment=0.0,
                    projected_box_plus_minus=-1.0,
                    projected_minutes_share=0.1,
                    projected_weighted_box_plus_minus=-0.1,
                ),
            ),
        )
    )

    assert projection.neutral_court_net_rating == approx(1.83)
    assert projection.home_court_net_rating == approx(4.83)
    assert projection.total_minutes_share == approx(0.6)
    assert projection.players_considered == 3


def test_project_team_strength_applies_league_average_offset() -> None:
    """The caller can carry a league-average baseline into team strength."""

    projection = project_team_strength(
        TeamStrengthInput(
            team_id=1610612752,
            team_name="New York Knicks",
            player_projections=(
                PlayerProjectionResult(
                    player_id="p1",
                    player_name="Player One",
                    baseline_box_plus_minus=4.0,
                    age_adjustment=0.0,
                    injury_adjustment=0.0,
                    projected_box_plus_minus=4.0,
                    projected_minutes_share=0.25,
                    projected_weighted_box_plus_minus=1.0,
                ),
            ),
            league_average_net_rating=0.3,
            home_court_adjustment=2.7,
        )
    )

    assert projection.neutral_court_net_rating == approx(1.3)
    assert projection.home_court_net_rating == approx(4.0)


def test_team_strength_input_rejects_empty_rotations() -> None:
    """The team-strength layer needs at least one player projection."""

    with raises(ValueError):
        TeamStrengthInput(
            team_id=1610612747,
            team_name="Los Angeles Lakers",
            player_projections=(),
        )


def test_team_strength_input_rejects_impossible_total_minutes_share() -> None:
    """Projected team minute shares should not blow past a full rotation."""

    with raises(ValueError):
        TeamStrengthInput(
            team_id=1610612748,
            team_name="Miami Heat",
            player_projections=(
                PlayerProjectionResult(
                    player_id="p1",
                    player_name="Player One",
                    baseline_box_plus_minus=2.0,
                    age_adjustment=0.0,
                    injury_adjustment=0.0,
                    projected_box_plus_minus=2.0,
                    projected_minutes_share=0.7,
                    projected_weighted_box_plus_minus=1.4,
                ),
                PlayerProjectionResult(
                    player_id="p2",
                    player_name="Player Two",
                    baseline_box_plus_minus=1.0,
                    age_adjustment=0.0,
                    injury_adjustment=0.0,
                    projected_box_plus_minus=1.0,
                    projected_minutes_share=0.5,
                    projected_weighted_box_plus_minus=0.5,
                ),
            ),
        )
