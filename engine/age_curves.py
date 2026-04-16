"""Historical age-curve generation for BPM-based player projections."""

from __future__ import annotations

from collections import defaultdict
from itertools import pairwise
from statistics import mean, stdev

from pydantic import BaseModel, ConfigDict, Field, FiniteFloat

DEFAULT_MINIMUM_MINUTES = 1_000


class HistoricalPlayerValueSeason(BaseModel):
    """One historical player season used to estimate year-over-year BPM aging.

    Args:
        player_id: Canonical player identifier.
        season: Season label formatted like `2022-23`.
        age: Player age during that season.
        box_plus_minus: Observed BPM for the season.
        minutes_played: Total minutes used to filter out noisy low-minute samples.
        position_group: Broad position bucket used for age-curve grouping.
        archetype: Role bucket used for age-curve grouping.
    """

    model_config = ConfigDict(extra="forbid")

    player_id: str = Field(min_length=1)
    season: str = Field(pattern=r"^\d{4}-\d{2}$")
    age: int = Field(ge=0)
    box_plus_minus: FiniteFloat
    minutes_played: FiniteFloat = Field(ge=0)
    position_group: str = Field(min_length=1)
    archetype: str = Field(min_length=1)


class AgeCurvePoint(BaseModel):
    """One empirical BPM delta bucket for a position/archetype/age slice."""

    model_config = ConfigDict(extra="forbid")

    position_group: str
    archetype: str
    age: int
    expected_bpm_delta: float
    std_dev: float
    sample_size: int


def build_age_curves(
    seasons: tuple[HistoricalPlayerValueSeason, ...] | list[HistoricalPlayerValueSeason],
    *,
    minimum_minutes: int = DEFAULT_MINIMUM_MINUTES,
) -> tuple[AgeCurvePoint, ...]:
    """Aggregate empirical year-over-year BPM deltas by age group.

    The generator follows the Phase 2 plan's first-principles approach:
    filter to stable workloads, pair consecutive seasons for the same player,
    measure the BPM change, and bucket those deltas by position group,
    archetype, and the starting age of the transition.
    """

    if minimum_minutes <= 0:
        raise ValueError("minimum_minutes must be positive.")

    seasons_by_player: dict[str, list[HistoricalPlayerValueSeason]] = defaultdict(list)
    for season in seasons:
        if season.minutes_played >= minimum_minutes:
            seasons_by_player[season.player_id].append(season)

    grouped_deltas: dict[tuple[str, str, int], list[float]] = defaultdict(list)
    for player_history in seasons_by_player.values():
        sorted_history = sorted(
            player_history,
            key=lambda season: _season_start_year(season.season),
        )
        for current_season, next_season in pairwise(sorted_history):
            if not _is_consecutive_season_pair(current_season, next_season):
                continue
            grouped_deltas[
                (current_season.position_group, current_season.archetype, current_season.age)
            ].append(next_season.box_plus_minus - current_season.box_plus_minus)

    curve_points = [
        AgeCurvePoint(
            position_group=position_group,
            archetype=archetype,
            age=age,
            expected_bpm_delta=float(mean(deltas)),
            std_dev=0.0 if len(deltas) == 1 else float(stdev(deltas)),
            sample_size=len(deltas),
        )
        for (position_group, archetype, age), deltas in grouped_deltas.items()
    ]
    return tuple(
        sorted(curve_points, key=lambda point: (point.position_group, point.archetype, point.age))
    )


def _season_start_year(season_label: str) -> int:
    """Return the numeric start year encoded in a project season label."""

    return int(season_label.split("-", maxsplit=1)[0])


def _is_consecutive_season_pair(
    current_season: HistoricalPlayerValueSeason,
    next_season: HistoricalPlayerValueSeason,
) -> bool:
    """Return whether two player seasons form a valid aging transition."""

    return (
        current_season.position_group == next_season.position_group
        and current_season.archetype == next_season.archetype
        and _season_start_year(next_season.season) == _season_start_year(current_season.season) + 1
        and next_season.age == current_season.age + 1
    )
