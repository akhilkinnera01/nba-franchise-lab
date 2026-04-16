"""Games-played injury risk heuristics for player projection."""

from __future__ import annotations

from statistics import pstdev

from pydantic import BaseModel, ConfigDict, Field, model_validator

DEFAULT_REGULAR_SEASON_GAMES = 82
DEFAULT_RECENCY_WINDOW = 3


class HistoricalAvailabilitySeason(BaseModel):
    """One historical season of player availability.

    Args:
        season: Season label formatted like `2023-24`.
        age: Player age during the season.
        games_played: Games appeared in during the season.
        games_available: Total games available in that season.
    """

    model_config = ConfigDict(extra="forbid")

    season: str = Field(pattern=r"^\d{4}-\d{2}$")
    age: int = Field(ge=0)
    games_played: int = Field(ge=0)
    games_available: int = Field(default=DEFAULT_REGULAR_SEASON_GAMES, gt=0)

    @model_validator(mode="after")
    def validate_bounds(self) -> HistoricalAvailabilitySeason:
        """Reject impossible season-level availability values."""

        if self.games_played > self.games_available:
            raise ValueError("games_played cannot exceed games_available.")
        return self


class InjuryRiskInput(BaseModel):
    """Validated input for recency-weighted injury risk estimation."""

    model_config = ConfigDict(extra="forbid")

    player_id: str = Field(min_length=1)
    player_name: str = Field(min_length=1)
    seasons: tuple[HistoricalAvailabilitySeason, ...]
    recency_window: int = Field(default=DEFAULT_RECENCY_WINDOW, gt=0)
    projected_games_available: int = Field(default=DEFAULT_REGULAR_SEASON_GAMES, gt=0)

    @model_validator(mode="after")
    def validate_history(self) -> InjuryRiskInput:
        """Require at least one historical season."""

        if not self.seasons:
            raise ValueError("At least one historical availability season is required.")
        return self


class InjuryRiskResult(BaseModel):
    """One recency-weighted injury risk estimate for downstream projections."""

    model_config = ConfigDict(extra="forbid")

    player_id: str
    player_name: str
    weighted_availability: float
    injury_risk_score: float
    projected_games_played: float
    availability_volatility: float
    recent_seasons_considered: int


def evaluate_injury_risk(player: InjuryRiskInput) -> InjuryRiskResult:
    """Estimate availability risk from historical games-played patterns.

    Formula:
    - Sort seasons from oldest to newest.
    - Keep the most recent `recency_window` seasons.
    - Convert each season into an availability ratio.
    - Compute a recency-weighted average where newer seasons get larger weights.
    - Define `injury_risk_score = 1 - weighted_availability`.

    The volatility term is reported separately for downstream use, but it does
    not directly change the risk score in this first-pass heuristic.
    """

    sorted_seasons = sorted(player.seasons, key=lambda season: _season_start_year(season.season))
    recent_seasons = tuple(sorted_seasons[-player.recency_window :])
    availability_ratios = tuple(
        season.games_played / season.games_available for season in recent_seasons
    )
    weights = tuple(range(1, len(recent_seasons) + 1))
    total_weight = sum(weights)
    weighted_availability = (
        sum(
            weight * availability_ratio
            for weight, availability_ratio in zip(weights, availability_ratios, strict=True)
        )
        / total_weight
    )
    availability_volatility = (
        0.0 if len(availability_ratios) == 1 else float(pstdev(availability_ratios))
    )
    injury_risk_score = 1 - weighted_availability

    return InjuryRiskResult(
        player_id=player.player_id,
        player_name=player.player_name,
        weighted_availability=weighted_availability,
        injury_risk_score=injury_risk_score,
        projected_games_played=weighted_availability * player.projected_games_available,
        availability_volatility=availability_volatility,
        recent_seasons_considered=len(recent_seasons),
    )


def _season_start_year(season_label: str) -> int:
    """Return the numeric start year encoded in a project season label."""

    return int(season_label.split("-", maxsplit=1)[0])
