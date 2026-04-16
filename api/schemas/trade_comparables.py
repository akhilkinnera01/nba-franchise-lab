"""Comparable-trade request and response schemas."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class ComparableTradePlayerAsset(BaseModel):
    """One player asset used to query historical trade comparables."""

    model_config = ConfigDict(extra="forbid")

    player_id: str = Field(min_length=1)
    player_name: str = Field(min_length=1)
    salary_cents: int = Field(ge=0)
    age: int = Field(ge=0)
    projected_box_plus_minus: float


class ComparableTradePickAsset(BaseModel):
    """One draft-pick asset used to query historical trade comparables."""

    model_config = ConfigDict(extra="forbid")

    season: int = Field(ge=1900)
    round: int = Field(ge=1)
    pick_range_start: int = Field(ge=1)
    pick_range_end: int = Field(ge=1)


class ComparableTradeRequest(BaseModel):
    """Browser-facing request for comparable historical trades."""

    model_config = ConfigDict(extra="forbid")

    season: str = Field(min_length=1)
    teams_involved_count: int = Field(ge=2)
    outgoing_players: tuple[ComparableTradePlayerAsset, ...] = Field(default_factory=tuple)
    incoming_players: tuple[ComparableTradePlayerAsset, ...] = Field(default_factory=tuple)
    draft_picks: tuple[ComparableTradePickAsset, ...] = Field(default_factory=tuple)
    limit: int = Field(default=5, ge=1, le=10)


class ComparableTradeMatch(BaseModel):
    """One scored comparable historical trade."""

    model_config = ConfigDict(extra="forbid")

    trade_id: str
    description: str
    season: str
    similarity_score: float


class ComparableTradeResponse(BaseModel):
    """Top comparable historical trades for one proposed package."""

    model_config = ConfigDict(extra="forbid")

    matches: tuple[ComparableTradeMatch, ...]
