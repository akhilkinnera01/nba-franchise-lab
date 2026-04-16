"""Tests for historical BPM age-curve generation."""

from __future__ import annotations

from engine.age_curves import (
    HistoricalPlayerValueSeason,
    build_age_curves,
)
from pytest import approx, raises


def test_build_age_curves_aggregates_year_over_year_bpm_deltas() -> None:
    """The generator should group BPM deltas by age, position, and archetype."""

    curves = build_age_curves(
        (
            HistoricalPlayerValueSeason(
                player_id="p1",
                season="2021-22",
                age=22,
                box_plus_minus=1.0,
                minutes_played=1_800,
                position_group="guard",
                archetype="starter",
            ),
            HistoricalPlayerValueSeason(
                player_id="p1",
                season="2022-23",
                age=23,
                box_plus_minus=2.0,
                minutes_played=2_000,
                position_group="guard",
                archetype="starter",
            ),
            HistoricalPlayerValueSeason(
                player_id="p2",
                season="2021-22",
                age=22,
                box_plus_minus=0.0,
                minutes_played=1_700,
                position_group="guard",
                archetype="starter",
            ),
            HistoricalPlayerValueSeason(
                player_id="p2",
                season="2022-23",
                age=23,
                box_plus_minus=0.5,
                minutes_played=1_650,
                position_group="guard",
                archetype="starter",
            ),
        )
    )

    assert len(curves) == 1
    curve = curves[0]
    assert curve.position_group == "guard"
    assert curve.archetype == "starter"
    assert curve.age == 22
    assert curve.expected_bpm_delta == approx(0.75)
    assert curve.std_dev == approx(0.3535533906)
    assert curve.sample_size == 2


def test_build_age_curves_filters_low_minute_seasons() -> None:
    """The default age-curve generator should ignore seasons below 1000 minutes."""

    curves = build_age_curves(
        (
            HistoricalPlayerValueSeason(
                player_id="p1",
                season="2021-22",
                age=20,
                box_plus_minus=-1.0,
                minutes_played=900,
                position_group="wing",
                archetype="prospect",
            ),
            HistoricalPlayerValueSeason(
                player_id="p1",
                season="2022-23",
                age=21,
                box_plus_minus=0.0,
                minutes_played=1_400,
                position_group="wing",
                archetype="prospect",
            ),
        )
    )

    assert curves == ()


def test_build_age_curves_requires_consecutive_seasons_and_ages() -> None:
    """Gapped or inconsistent player histories should not contribute a delta."""

    curves = build_age_curves(
        (
            HistoricalPlayerValueSeason(
                player_id="p1",
                season="2020-21",
                age=22,
                box_plus_minus=1.0,
                minutes_played=1_500,
                position_group="big",
                archetype="rotation",
            ),
            HistoricalPlayerValueSeason(
                player_id="p1",
                season="2022-23",
                age=24,
                box_plus_minus=2.5,
                minutes_played=1_600,
                position_group="big",
                archetype="rotation",
            ),
        )
    )

    assert curves == ()


def test_build_age_curves_sorts_output_by_group_and_age() -> None:
    """Generated curve points should be ordered predictably for downstream storage."""

    curves = build_age_curves(
        (
            HistoricalPlayerValueSeason(
                player_id="guard-player",
                season="2021-22",
                age=23,
                box_plus_minus=2.0,
                minutes_played=1_900,
                position_group="guard",
                archetype="star",
            ),
            HistoricalPlayerValueSeason(
                player_id="guard-player",
                season="2022-23",
                age=24,
                box_plus_minus=2.5,
                minutes_played=1_950,
                position_group="guard",
                archetype="star",
            ),
            HistoricalPlayerValueSeason(
                player_id="big-player",
                season="2021-22",
                age=21,
                box_plus_minus=-0.5,
                minutes_played=1_700,
                position_group="big",
                archetype="rotation",
            ),
            HistoricalPlayerValueSeason(
                player_id="big-player",
                season="2022-23",
                age=22,
                box_plus_minus=0.0,
                minutes_played=1_750,
                position_group="big",
                archetype="rotation",
            ),
        )
    )

    assert [(curve.position_group, curve.archetype, curve.age) for curve in curves] == [
        ("big", "rotation", 21),
        ("guard", "star", 23),
    ]


def test_build_age_curves_rejects_invalid_minimum_minutes() -> None:
    """The minute threshold must stay positive."""

    with raises(ValueError):
        build_age_curves((), minimum_minutes=-1)
