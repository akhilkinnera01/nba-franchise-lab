"""Decision-intelligence evaluation for lineup changes."""

from __future__ import annotations

from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict, Field

if TYPE_CHECKING:
    from engine.season_simulator import SeasonSimulationResult, TeamSeasonSimulationResult
    from engine.team_strength import TeamStrengthResult


class LineupChangeInput(BaseModel):
    """Validated input for one lineup-change evaluation."""

    model_config = ConfigDict(extra="forbid")

    team_id: int
    team_name: str = Field(min_length=1)
    change_label: str = Field(min_length=1)
    baseline_team_strength: TeamStrengthResult
    adjusted_team_strength: TeamStrengthResult
    baseline_season: SeasonSimulationResult
    adjusted_season: SeasonSimulationResult


class LineupChangeResult(BaseModel):
    """Performance delta summary for one lineup adjustment."""

    model_config = ConfigDict(extra="forbid")

    team_id: int
    team_name: str
    change_label: str
    wins_delta: float
    playoff_probability_delta: float
    net_rating_delta: float


def evaluate_lineup_change(lineup: LineupChangeInput) -> LineupChangeResult:
    """Compare baseline and adjusted lineup outcomes for one team."""

    baseline_season_result = _season_result(lineup.baseline_season, lineup.team_id)
    adjusted_season_result = _season_result(lineup.adjusted_season, lineup.team_id)

    return LineupChangeResult(
        team_id=lineup.team_id,
        team_name=lineup.team_name,
        change_label=lineup.change_label,
        wins_delta=adjusted_season_result.expected_wins - baseline_season_result.expected_wins,
        playoff_probability_delta=(
            adjusted_season_result.playoff_probability - baseline_season_result.playoff_probability
        ),
        net_rating_delta=(
            lineup.adjusted_team_strength.neutral_court_net_rating
            - lineup.baseline_team_strength.neutral_court_net_rating
        ),
    )


def _season_result(season: SeasonSimulationResult, team_id: int) -> TeamSeasonSimulationResult:
    """Return the season result for one team identifier."""

    for team_result in season.team_results:
        if team_result.team_id == team_id:
            return team_result
    raise ValueError(f"Team {team_id} was not present in the supplied season result.")


def _rebuild_lineup_evaluator_models() -> None:
    """Resolve forward references for typed lineup-evaluation models."""

    from engine.season_simulator import SeasonSimulationResult
    from engine.team_strength import TeamStrengthResult

    LineupChangeInput.model_rebuild(
        _types_namespace={
            "SeasonSimulationResult": SeasonSimulationResult,
            "TeamStrengthResult": TeamStrengthResult,
        }
    )


_rebuild_lineup_evaluator_models()
