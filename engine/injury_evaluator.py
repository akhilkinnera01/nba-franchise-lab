"""Decision-intelligence evaluation for injury scenarios."""

from __future__ import annotations

from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict, Field

if TYPE_CHECKING:
    from engine.playoff_simulator import PlayoffBracketResult
    from engine.season_simulator import SeasonSimulationResult, TeamSeasonSimulationResult
    from engine.team_strength import TeamStrengthResult


class InjuryImpactInput(BaseModel):
    """Validated input for one injury-impact evaluation."""

    model_config = ConfigDict(extra="forbid")

    team_id: int
    team_name: str = Field(min_length=1)
    player_name: str = Field(min_length=1)
    projected_games_missed: int = Field(ge=0)
    baseline_team_strength: TeamStrengthResult
    injured_team_strength: TeamStrengthResult
    baseline_season: SeasonSimulationResult
    injured_season: SeasonSimulationResult
    baseline_playoffs: PlayoffBracketResult
    injured_playoffs: PlayoffBracketResult


class InjuryImpactResult(BaseModel):
    """Performance delta summary for one injury scenario."""

    model_config = ConfigDict(extra="forbid")

    team_id: int
    team_name: str
    player_name: str
    projected_games_missed: int
    wins_delta: float
    playoff_probability_delta: float
    championship_probability_delta: float
    net_rating_delta: float


def evaluate_injury_impact(injury: InjuryImpactInput) -> InjuryImpactResult:
    """Compare baseline and injury-adjusted team outcomes."""

    baseline_season_result = _season_result(injury.baseline_season, injury.team_id)
    injured_season_result = _season_result(injury.injured_season, injury.team_id)

    return InjuryImpactResult(
        team_id=injury.team_id,
        team_name=injury.team_name,
        player_name=injury.player_name,
        projected_games_missed=injury.projected_games_missed,
        wins_delta=injured_season_result.expected_wins - baseline_season_result.expected_wins,
        playoff_probability_delta=(
            injured_season_result.playoff_probability - baseline_season_result.playoff_probability
        ),
        championship_probability_delta=(
            injury.injured_playoffs.champion_probabilities.get(injury.team_id, 0.0)
            - injury.baseline_playoffs.champion_probabilities.get(injury.team_id, 0.0)
        ),
        net_rating_delta=(
            injury.injured_team_strength.neutral_court_net_rating
            - injury.baseline_team_strength.neutral_court_net_rating
        ),
    )


def _season_result(season: SeasonSimulationResult, team_id: int) -> TeamSeasonSimulationResult:
    """Return the season result for one team identifier."""

    for team_result in season.team_results:
        if team_result.team_id == team_id:
            return team_result
    raise ValueError(f"Team {team_id} was not present in the supplied season result.")


def _rebuild_injury_evaluator_models() -> None:
    """Resolve forward references for typed injury-evaluation models."""

    from engine.playoff_simulator import PlayoffBracketResult
    from engine.season_simulator import SeasonSimulationResult
    from engine.team_strength import TeamStrengthResult

    InjuryImpactInput.model_rebuild(
        _types_namespace={
            "PlayoffBracketResult": PlayoffBracketResult,
            "SeasonSimulationResult": SeasonSimulationResult,
            "TeamStrengthResult": TeamStrengthResult,
        }
    )


_rebuild_injury_evaluator_models()
