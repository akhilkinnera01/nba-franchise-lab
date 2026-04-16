"""Full decision-intelligence evaluation for trade scenarios."""

from __future__ import annotations

from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict, Field, model_validator

if TYPE_CHECKING:
    from collections.abc import Mapping

    from engine.cap_projection import SeasonCapProjectionResult, TeamCapProjectionResult
    from engine.playoff_simulator import PlayoffBracketResult
    from engine.season_simulator import SeasonSimulationResult, TeamSeasonSimulationResult
    from engine.team_strength import TeamStrengthResult
    from engine.trade_validator import TradeValidationResult


class TeamTradeImpactResult(BaseModel):
    """One team's delta summary from a proposed trade."""

    model_config = ConfigDict(extra="forbid")

    team_id: int
    team_name: str
    trade_valid: bool
    wins_delta: float
    playoff_probability_delta: float
    championship_probability_delta: float
    net_rating_delta: float
    current_cap_room_delta_cents: int | None = None
    current_tax_room_delta_cents: int | None = None
    cap_room_delta_cents_by_season: dict[str, int | None] = Field(default_factory=dict)
    tax_room_delta_cents_by_season: dict[str, int | None] = Field(default_factory=dict)


class TradeImpactInput(BaseModel):
    """Validated input for one trade impact evaluation."""

    model_config = ConfigDict(extra="forbid")

    trade_validation: TradeValidationResult
    involved_team_ids: tuple[int, ...]
    baseline_team_strengths: tuple[TeamStrengthResult, ...]
    scenario_team_strengths: tuple[TeamStrengthResult, ...]
    baseline_season: SeasonSimulationResult
    scenario_season: SeasonSimulationResult
    baseline_playoffs: PlayoffBracketResult
    scenario_playoffs: PlayoffBracketResult
    pre_trade_cap_projections: tuple[TeamCapProjectionResult, ...]
    post_trade_cap_projections: tuple[TeamCapProjectionResult, ...]

    @model_validator(mode="after")
    def validate_team_scope(self) -> TradeImpactInput:
        """Require at least one involved team identifier."""

        if not self.involved_team_ids:
            raise ValueError("At least one involved team must be evaluated.")
        return self


class TradeImpactResult(BaseModel):
    """Aggregate decision-intelligence output for a trade proposal."""

    model_config = ConfigDict(extra="forbid")

    trade_valid: bool
    violations: tuple[str, ...] = Field(default_factory=tuple)
    team_results: tuple[TeamTradeImpactResult, ...]


def evaluate_trade_impact(trade: TradeImpactInput) -> TradeImpactResult:
    """Compare pre/post performance, title odds, and cap sheets for a trade."""

    baseline_strengths = {team.team_id: team for team in trade.baseline_team_strengths}
    scenario_strengths = {team.team_id: team for team in trade.scenario_team_strengths}
    baseline_season = {team.team_id: team for team in trade.baseline_season.team_results}
    scenario_season = {team.team_id: team for team in trade.scenario_season.team_results}
    baseline_cap = {
        cap_projection.team_id: {
            season_result.season: season_result for season_result in cap_projection.season_results
        }
        for cap_projection in trade.pre_trade_cap_projections
        if cap_projection.season_results
    }
    scenario_cap = {
        cap_projection.team_id: {
            season_result.season: season_result for season_result in cap_projection.season_results
        }
        for cap_projection in trade.post_trade_cap_projections
        if cap_projection.season_results
    }

    team_results = tuple(
        _team_trade_impact_result(
            team_id=team_id,
            trade=trade,
            baseline_strengths=baseline_strengths,
            scenario_strengths=scenario_strengths,
            baseline_season=baseline_season,
            scenario_season=scenario_season,
            baseline_cap=baseline_cap,
            scenario_cap=scenario_cap,
        )
        for team_id in trade.involved_team_ids
    )

    return TradeImpactResult(
        trade_valid=trade.trade_validation.valid,
        violations=trade.trade_validation.violations,
        team_results=team_results,
    )


def _delta(
    scenario_cap_sheet: SeasonCapProjectionResult | None,
    baseline_cap_sheet: SeasonCapProjectionResult | None,
    field_name: str,
) -> int | None:
    """Return the integer delta between two cap-sheet fields when both exist."""

    if scenario_cap_sheet is None or baseline_cap_sheet is None:
        return None
    scenario_value = getattr(scenario_cap_sheet, field_name)
    baseline_value = getattr(baseline_cap_sheet, field_name)
    if scenario_value is None or baseline_value is None:
        return None
    return int(scenario_value - baseline_value)


def _team_trade_impact_result(
    *,
    team_id: int,
    trade: TradeImpactInput,
    baseline_strengths: dict[int, TeamStrengthResult],
    scenario_strengths: dict[int, TeamStrengthResult],
    baseline_season: Mapping[int, TeamSeasonSimulationResult],
    scenario_season: Mapping[int, TeamSeasonSimulationResult],
    baseline_cap: dict[int, dict[str, SeasonCapProjectionResult]],
    scenario_cap: dict[int, dict[str, SeasonCapProjectionResult]],
) -> TeamTradeImpactResult:
    """Build the team-level trade impact record for one involved team."""

    cap_room_delta_cents_by_season = _season_field_deltas(
        scenario_cap.get(team_id, {}),
        baseline_cap.get(team_id, {}),
        "cap_room_cents",
    )
    tax_room_delta_cents_by_season = _season_field_deltas(
        scenario_cap.get(team_id, {}),
        baseline_cap.get(team_id, {}),
        "tax_room_cents",
    )
    current_cap_season = _current_cap_season(
        baseline_cap.get(team_id, {}),
        scenario_cap.get(team_id, {}),
    )

    return TeamTradeImpactResult(
        team_id=team_id,
        team_name=baseline_strengths[team_id].team_name,
        trade_valid=trade.trade_validation.valid,
        wins_delta=(
            scenario_season[team_id].expected_wins - baseline_season[team_id].expected_wins
        ),
        playoff_probability_delta=(
            scenario_season[team_id].playoff_probability
            - baseline_season[team_id].playoff_probability
        ),
        championship_probability_delta=(
            trade.scenario_playoffs.champion_probabilities.get(team_id, 0.0)
            - trade.baseline_playoffs.champion_probabilities.get(team_id, 0.0)
        ),
        net_rating_delta=(
            scenario_strengths[team_id].neutral_court_net_rating
            - baseline_strengths[team_id].neutral_court_net_rating
        ),
        current_cap_room_delta_cents=(
            None
            if current_cap_season is None
            else cap_room_delta_cents_by_season[current_cap_season]
        ),
        current_tax_room_delta_cents=(
            None
            if current_cap_season is None
            else tax_room_delta_cents_by_season[current_cap_season]
        ),
        cap_room_delta_cents_by_season=cap_room_delta_cents_by_season,
        tax_room_delta_cents_by_season=tax_room_delta_cents_by_season,
    )


def _season_field_deltas(
    scenario_cap_by_season: dict[str, SeasonCapProjectionResult],
    baseline_cap_by_season: dict[str, SeasonCapProjectionResult],
    field_name: str,
) -> dict[str, int | None]:
    """Return season-labeled deltas for one cap-sheet field."""

    return {
        season: _delta(
            scenario_cap_by_season[season],
            baseline_cap_by_season[season],
            field_name,
        )
        for season in baseline_cap_by_season
        if season in scenario_cap_by_season
    }


def _current_cap_season(
    baseline_cap_by_season: dict[str, SeasonCapProjectionResult],
    scenario_cap_by_season: dict[str, SeasonCapProjectionResult],
) -> str | None:
    """Return the earliest shared cap-projection season for convenience fields."""

    shared_seasons = sorted(set(baseline_cap_by_season) & set(scenario_cap_by_season))
    if not shared_seasons:
        return None
    return shared_seasons[0]


def _rebuild_trade_evaluator_models() -> None:
    """Resolve forward references for typed trade-evaluation models."""

    from engine.cap_projection import TeamCapProjectionResult
    from engine.playoff_simulator import PlayoffBracketResult
    from engine.season_simulator import SeasonSimulationResult
    from engine.team_strength import TeamStrengthResult
    from engine.trade_validator import TradeValidationResult

    TradeImpactInput.model_rebuild(
        _types_namespace={
            "PlayoffBracketResult": PlayoffBracketResult,
            "SeasonSimulationResult": SeasonSimulationResult,
            "TeamCapProjectionResult": TeamCapProjectionResult,
            "TeamStrengthResult": TeamStrengthResult,
            "TradeValidationResult": TradeValidationResult,
        }
    )


_rebuild_trade_evaluator_models()
