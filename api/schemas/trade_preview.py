"""Browser-facing trade preview schemas for the Phase 4 workspace."""

from __future__ import annotations

from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict, Field

if TYPE_CHECKING:
    from api.schemas.trade_comparables import ComparableTradeMatch
    from api.schemas.trade_validation import TradeValidationResponse


class TradePreviewOutcomeSnapshot(BaseModel):
    """One team's season/playoff/cap snapshot inside the trade preview."""

    model_config = ConfigDict(extra="forbid")

    expected_wins: float
    win_standard_deviation: float
    playoff_probability: float
    championship_probability: float
    average_seed: float
    seed_probabilities: dict[int, float] = Field(default_factory=dict)
    current_cap_room_cents: int | None = None
    current_tax_room_cents: int | None = None
    cap_room_cents_by_season: dict[str, int | None] = Field(default_factory=dict)
    tax_room_cents_by_season: dict[str, int | None] = Field(default_factory=dict)


class TradePreviewDeltaSummary(BaseModel):
    """High-level deltas for one team across the previewed trade."""

    model_config = ConfigDict(extra="forbid")

    trade_valid: bool
    wins_delta: float
    playoff_probability_delta: float
    championship_probability_delta: float
    net_rating_delta: float
    current_cap_room_delta_cents: int | None = None
    current_tax_room_delta_cents: int | None = None
    cap_room_delta_cents_by_season: dict[str, int | None] = Field(default_factory=dict)
    tax_room_delta_cents_by_season: dict[str, int | None] = Field(default_factory=dict)


class TradePreviewTeamResult(BaseModel):
    """Full browser-facing preview record for one involved team."""

    model_config = ConfigDict(extra="forbid")

    team_id: int
    team_name: str
    baseline: TradePreviewOutcomeSnapshot
    scenario: TradePreviewOutcomeSnapshot
    delta: TradePreviewDeltaSummary


class TradePreviewResponse(BaseModel):
    """One browser-safe trade preview response for the Phase 4 workspace."""

    model_config = ConfigDict(extra="forbid")

    season: str
    simulation_scope_note: str
    validation: TradeValidationResponse
    team_results: tuple[TradePreviewTeamResult, ...]
    comparable_trades: tuple[ComparableTradeMatch, ...] = Field(default_factory=tuple)


def _rebuild_trade_preview_schema_models() -> None:
    """Resolve forward references for trade-preview transport models."""

    from api.schemas.trade_comparables import ComparableTradeMatch
    from api.schemas.trade_validation import TradeValidationResponse

    TradePreviewResponse.model_rebuild(
        _types_namespace={
            "ComparableTradeMatch": ComparableTradeMatch,
            "TradeValidationResponse": TradeValidationResponse,
        }
    )


_rebuild_trade_preview_schema_models()
