"""Decision-intelligence evaluation for free-agent signing scenarios."""

from __future__ import annotations

from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict, Field

if TYPE_CHECKING:
    from engine.cap_exceptions import CapExceptionAvailability, CapExceptionResult
    from engine.cap_projection import TeamCapProjectionResult
    from engine.season_simulator import SeasonSimulationResult, TeamSeasonSimulationResult
    from engine.team_strength import TeamStrengthResult


class FreeAgentSigningInput(BaseModel):
    """Validated input for one free-agent signing evaluation."""

    model_config = ConfigDict(extra="forbid")

    team_id: int
    team_name: str = Field(min_length=1)
    player_name: str = Field(min_length=1)
    exception_code: str = Field(min_length=1)
    baseline_team_strength: TeamStrengthResult
    signed_team_strength: TeamStrengthResult
    baseline_season: SeasonSimulationResult
    signed_season: SeasonSimulationResult
    baseline_cap_projection: TeamCapProjectionResult
    signed_cap_projection: TeamCapProjectionResult
    cap_exception_result: CapExceptionResult


class FreeAgentSigningResult(BaseModel):
    """Performance and cap delta summary for one signing."""

    model_config = ConfigDict(extra="forbid")

    team_id: int
    team_name: str
    player_name: str
    exception_code: str
    exception_available: bool
    exception_amount_cents: int | None = None
    wins_delta: float
    playoff_probability_delta: float
    net_rating_delta: float
    current_cap_room_delta_cents: int | None = None
    cap_room_delta_cents_by_season: dict[str, int | None] = Field(default_factory=dict)


def evaluate_free_agent_signing(signing: FreeAgentSigningInput) -> FreeAgentSigningResult:
    """Compare pre/post team outlook for one free-agent signing."""

    baseline_season_result = _season_result(signing.baseline_season, signing.team_id)
    signed_season_result = _season_result(signing.signed_season, signing.team_id)
    exception = _exception(signing.cap_exception_result, signing.exception_code)
    cap_room_delta_cents_by_season = _cap_room_deltas_by_season(
        signing.signed_cap_projection,
        signing.baseline_cap_projection,
    )
    current_season = signing.baseline_cap_projection.season_results[0].season

    return FreeAgentSigningResult(
        team_id=signing.team_id,
        team_name=signing.team_name,
        player_name=signing.player_name,
        exception_code=signing.exception_code,
        exception_available=exception.available,
        exception_amount_cents=exception.amount_cents,
        wins_delta=signed_season_result.expected_wins - baseline_season_result.expected_wins,
        playoff_probability_delta=(
            signed_season_result.playoff_probability - baseline_season_result.playoff_probability
        ),
        net_rating_delta=(
            signing.signed_team_strength.neutral_court_net_rating
            - signing.baseline_team_strength.neutral_court_net_rating
        ),
        current_cap_room_delta_cents=cap_room_delta_cents_by_season.get(current_season),
        cap_room_delta_cents_by_season=cap_room_delta_cents_by_season,
    )


def _season_result(season: SeasonSimulationResult, team_id: int) -> TeamSeasonSimulationResult:
    """Return the season result for one team identifier."""

    for team_result in season.team_results:
        if team_result.team_id == team_id:
            return team_result
    raise ValueError(f"Team {team_id} was not present in the supplied season result.")


def _exception(
    cap_exception_result: CapExceptionResult,
    exception_code: str,
) -> CapExceptionAvailability:
    """Return one cap exception record by code."""

    for exception in cap_exception_result.exceptions:
        if exception.code == exception_code:
            return exception
    raise ValueError(f"Exception code {exception_code} was not present in the cap result.")


def _delta(signed_value: int | None, baseline_value: int | None) -> int | None:
    """Return one integer delta when both values are present."""

    if signed_value is None or baseline_value is None:
        return None
    return signed_value - baseline_value


def _cap_room_deltas_by_season(
    signed_cap_projection: TeamCapProjectionResult,
    baseline_cap_projection: TeamCapProjectionResult,
) -> dict[str, int | None]:
    """Return season-labeled cap-room deltas across the full projection window."""

    baseline_by_season = {
        season_result.season: season_result
        for season_result in baseline_cap_projection.season_results
    }
    signed_by_season = {
        season_result.season: season_result
        for season_result in signed_cap_projection.season_results
    }
    return {
        season: _delta(
            signed_by_season[season].cap_room_cents,
            baseline_by_season[season].cap_room_cents,
        )
        for season in baseline_by_season
        if season in signed_by_season
    }


def _rebuild_free_agent_evaluator_models() -> None:
    """Resolve forward references for typed free-agent evaluation models."""

    from engine.cap_exceptions import CapExceptionResult
    from engine.cap_projection import TeamCapProjectionResult
    from engine.season_simulator import SeasonSimulationResult
    from engine.team_strength import TeamStrengthResult

    FreeAgentSigningInput.model_rebuild(
        _types_namespace={
            "CapExceptionResult": CapExceptionResult,
            "SeasonSimulationResult": SeasonSimulationResult,
            "TeamCapProjectionResult": TeamCapProjectionResult,
            "TeamStrengthResult": TeamStrengthResult,
        }
    )


_rebuild_free_agent_evaluator_models()
