"""Browser-facing request and response schemas for trade-builder validation."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class TradeValidationContractSummary(BaseModel):
    """One player contract resolved by the server for validation output."""

    model_config = ConfigDict(extra="forbid")

    player_id: str = Field(min_length=1)
    player_name: str = Field(min_length=1)
    salary_cents: int = Field(ge=0)


class TradeValidationTeamRequest(BaseModel):
    """One team's outgoing asset selection from the browser builder."""

    model_config = ConfigDict(extra="forbid")

    team_id: int
    outgoing_player_ids: tuple[str, ...] = Field(default_factory=tuple)
    outgoing_pick_notes: tuple[str, ...] = Field(default_factory=tuple)
    sends_cash: bool = False

    @model_validator(mode="after")
    def validate_unique_outgoing_players(self) -> TradeValidationTeamRequest:
        """Prevent duplicated outgoing player identifiers for one team."""

        if len(set(self.outgoing_player_ids)) != len(self.outgoing_player_ids):
            raise ValueError("Each team can only send one copy of each player contract.")
        return self


class TradeValidationRequest(BaseModel):
    """Request body for browser-driven trade validation."""

    model_config = ConfigDict(extra="forbid")

    season: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}$")
    teams: tuple[TradeValidationTeamRequest, ...]

    @model_validator(mode="after")
    def validate_teams(self) -> TradeValidationRequest:
        """Require at least two unique team selections for one proposed trade."""

        if len(self.teams) < 2:
            raise ValueError("At least two teams are required in a trade proposal.")
        team_ids = [team.team_id for team in self.teams]
        if len(set(team_ids)) != len(team_ids):
            raise ValueError("Trade builder teams must use unique team IDs.")
        return self


class TradeValidationTeamResult(BaseModel):
    """One team's validation result plus resolved outgoing and incoming assets."""

    model_config = ConfigDict(extra="forbid")

    team_id: int
    team_name: str
    apron_status: Literal[
        "below_first_apron",
        "first_apron_or_above",
        "second_apron_or_above",
        "taxpaying_or_above",
    ]
    outgoing_salary_cents: int = Field(ge=0)
    incoming_salary_cents: int = Field(ge=0)
    maximum_incoming_salary_cents: int = Field(ge=0)
    post_trade_standard_contract_count: int
    valid: bool
    matched_rule_description: str | None = None
    violations: tuple[str, ...] = Field(default_factory=tuple)
    outgoing_players: tuple[TradeValidationContractSummary, ...] = Field(default_factory=tuple)
    incoming_players: tuple[TradeValidationContractSummary, ...] = Field(default_factory=tuple)
    outgoing_pick_notes: tuple[str, ...] = Field(default_factory=tuple)
    incoming_pick_notes: tuple[str, ...] = Field(default_factory=tuple)


class TradeValidationResponse(BaseModel):
    """Aggregate validation response for the live trade builder."""

    model_config = ConfigDict(extra="forbid")

    season: str
    valid: bool
    validation_scope_note: str
    violations: tuple[str, ...] = Field(default_factory=tuple)
    team_results: tuple[TradeValidationTeamResult, ...]
