"""Scenario request and response schemas for Phase 3 API routes."""

from __future__ import annotations

from datetime import datetime  # noqa: TC003
from typing import Annotated, Literal

from engine.free_agent_evaluator import (  # noqa: TC002
    FreeAgentSigningInput,
    FreeAgentSigningResult,
)
from engine.injury_evaluator import InjuryImpactInput, InjuryImpactResult  # noqa: TC002
from engine.lineup_evaluator import LineupChangeInput, LineupChangeResult  # noqa: TC002
from engine.trade_evaluator import TradeImpactInput, TradeImpactResult  # noqa: TC002
from pydantic import BaseModel, ConfigDict, Field

type ScenarioType = Literal["trade", "free-agent", "injury", "lineup"]


class ScenarioCreateMetadata(BaseModel):
    """Optional user-facing metadata stored alongside one scenario."""

    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=160)
    notes: str | None = Field(default=None, min_length=1, max_length=2_000)


class TradeScenarioCreateRequest(ScenarioCreateMetadata):
    """Create payload for one trade scenario."""

    request: TradeImpactInput


class FreeAgentScenarioCreateRequest(ScenarioCreateMetadata):
    """Create payload for one free-agent scenario."""

    request: FreeAgentSigningInput


class InjuryScenarioCreateRequest(ScenarioCreateMetadata):
    """Create payload for one injury scenario."""

    request: InjuryImpactInput


class LineupScenarioCreateRequest(ScenarioCreateMetadata):
    """Create payload for one lineup scenario."""

    request: LineupChangeInput


class ScenarioResponseBase(BaseModel):
    """Shared stored-scenario envelope fields."""

    model_config = ConfigDict(extra="forbid")

    scenario_id: str
    scenario_type: ScenarioType
    title: str | None = None
    notes: str | None = None
    created_at: datetime
    engine_version: str
    data_version: str
    share_url: str


class TradeScenarioResponse(ScenarioResponseBase):
    """Stored trade scenario envelope."""

    scenario_type: Literal["trade"]
    request: TradeImpactInput
    result: TradeImpactResult


class FreeAgentScenarioResponse(ScenarioResponseBase):
    """Stored free-agent scenario envelope."""

    scenario_type: Literal["free-agent"]
    request: FreeAgentSigningInput
    result: FreeAgentSigningResult


class InjuryScenarioResponse(ScenarioResponseBase):
    """Stored injury scenario envelope."""

    scenario_type: Literal["injury"]
    request: InjuryImpactInput
    result: InjuryImpactResult


class LineupScenarioResponse(ScenarioResponseBase):
    """Stored lineup scenario envelope."""

    scenario_type: Literal["lineup"]
    request: LineupChangeInput
    result: LineupChangeResult


ScenarioDetailResponse = Annotated[
    TradeScenarioResponse
    | FreeAgentScenarioResponse
    | InjuryScenarioResponse
    | LineupScenarioResponse,
    Field(discriminator="scenario_type"),
]
