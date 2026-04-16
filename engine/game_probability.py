"""Single-game win probability helpers for projected team strengths."""

from __future__ import annotations

from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict, model_validator

if TYPE_CHECKING:
    from engine.team_strength import TeamStrengthResult

REGULAR_SEASON_GAMES = 82
NET_RATING_TO_WIN_PERCENTAGE_MULTIPLIER = 2.7


class GameWinProbabilityInput(BaseModel):
    """Validated input for one projected matchup.

    Args:
        home_team: The team listed as the home side in the modeled game.
        away_team: The road opponent.
        neutral_site: When true, both teams use their neutral-court net ratings.
    """

    model_config = ConfigDict(extra="forbid")

    home_team: TeamStrengthResult
    away_team: TeamStrengthResult
    neutral_site: bool = False

    @model_validator(mode="after")
    def validate_unique_teams(self) -> GameWinProbabilityInput:
        """Reject matchups that accidentally point at the same team twice."""

        if self.home_team.team_id == self.away_team.team_id:
            raise ValueError("home_team and away_team must be different franchises.")
        return self


class GameWinProbabilityResult(BaseModel):
    """Projected win probabilities for one game."""

    model_config = ConfigDict(extra="forbid")

    home_team_id: int
    home_team_name: str
    away_team_id: int
    away_team_name: str
    home_team_net_rating_used: float
    away_team_net_rating_used: float
    home_team_win_percentage: float
    away_team_win_percentage: float
    home_team_win_probability: float
    away_team_win_probability: float


def net_rating_to_win_percentage(net_rating: float) -> float:
    """Convert projected net rating into one expected regular-season win rate.

    Formula from the project plan:

    `win_percentage = (net_rating * 2.7 + 41) / 82`

    The output is clipped to the valid probability interval `[0, 1]`.
    """

    raw_win_percentage = (
        net_rating * NET_RATING_TO_WIN_PERCENTAGE_MULTIPLIER + 41
    ) / REGULAR_SEASON_GAMES
    return min(max(raw_win_percentage, 0.0), 1.0)


def calculate_game_win_probability(game: GameWinProbabilityInput) -> GameWinProbabilityResult:
    """Estimate one game's win probability from projected team strengths.

    The function converts both teams' relevant net ratings into expected win
    percentages, then combines them via the classic log5 formula:

    `P(A beats B) = (A - A * B) / (A + B - 2 * A * B)`

    where `A` and `B` are the teams' expected win rates in a neutral schedule.
    """

    home_net_rating = (
        game.home_team.neutral_court_net_rating
        if game.neutral_site
        else game.home_team.home_court_net_rating
    )
    away_net_rating = game.away_team.neutral_court_net_rating

    home_team_win_percentage = net_rating_to_win_percentage(home_net_rating)
    away_team_win_percentage = net_rating_to_win_percentage(away_net_rating)
    home_team_win_probability = _log5_probability(
        team_a_win_percentage=home_team_win_percentage,
        team_b_win_percentage=away_team_win_percentage,
    )

    return GameWinProbabilityResult(
        home_team_id=game.home_team.team_id,
        home_team_name=game.home_team.team_name,
        away_team_id=game.away_team.team_id,
        away_team_name=game.away_team.team_name,
        home_team_net_rating_used=home_net_rating,
        away_team_net_rating_used=away_net_rating,
        home_team_win_percentage=home_team_win_percentage,
        away_team_win_percentage=away_team_win_percentage,
        home_team_win_probability=home_team_win_probability,
        away_team_win_probability=1.0 - home_team_win_probability,
    )


def _log5_probability(
    *,
    team_a_win_percentage: float,
    team_b_win_percentage: float,
) -> float:
    """Return the log5 win probability for team A against team B."""

    if team_a_win_percentage == team_b_win_percentage:
        return 0.5

    denominator = (
        team_a_win_percentage
        + team_b_win_percentage
        - 2 * team_a_win_percentage * team_b_win_percentage
    )
    if denominator == 0:
        return 1.0 if team_a_win_percentage > team_b_win_percentage else 0.0

    probability = (
        team_a_win_percentage - team_a_win_percentage * team_b_win_percentage
    ) / denominator
    return min(max(probability, 0.0), 1.0)


def _rebuild_game_probability_models() -> None:
    """Resolve forward references for typed game-probability models."""

    from engine.team_strength import TeamStrengthResult

    GameWinProbabilityInput.model_rebuild(
        _types_namespace={"TeamStrengthResult": TeamStrengthResult}
    )


_rebuild_game_probability_models()
