"""Browser-safe preview schemas for Phase 4 scenario tools."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ScenarioPreviewOutcomeSnapshot(BaseModel):
    """One team outcome snapshot for a browser preview."""

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


class ScenarioPreviewDeltaSummary(BaseModel):
    """High-level delta summary for a browser preview."""

    model_config = ConfigDict(extra="forbid")

    wins_delta: float
    playoff_probability_delta: float
    championship_probability_delta: float
    net_rating_delta: float
    current_cap_room_delta_cents: int | None = None
    current_tax_room_delta_cents: int | None = None
    cap_room_delta_cents_by_season: dict[str, int | None] = Field(default_factory=dict)
    tax_room_delta_cents_by_season: dict[str, int | None] = Field(default_factory=dict)


class FreeAgentPreviewRequest(BaseModel):
    """Browser request for one free-agent preview."""

    model_config = ConfigDict(extra="forbid")

    season: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}$")
    team_id: int
    player_name: str = Field(min_length=1)
    projected_box_plus_minus: float
    projected_minutes_share: float = Field(ge=0, le=1)
    annual_salary_cents: int = Field(ge=0)
    contract_years: int = Field(default=1, ge=1, le=4)
    annual_raise_rate: float = Field(default=0.05, ge=0, le=0.08)
    exception_code: Literal[
        "room_mid_level",
        "non_taxpayer_mid_level",
        "taxpayer_mid_level",
        "bi_annual_exception",
        "veteran_minimum",
    ]


class FreeAgentPreviewResponse(BaseModel):
    """Browser response for one free-agent preview."""

    model_config = ConfigDict(extra="forbid")

    season: str
    simulation_scope_note: str
    team_id: int
    team_name: str
    player_name: str
    exception_code: str
    exception_available: bool
    exception_amount_cents: int | None = None
    exception_reason: str
    baseline: ScenarioPreviewOutcomeSnapshot
    scenario: ScenarioPreviewOutcomeSnapshot
    delta: ScenarioPreviewDeltaSummary


class InjuryPreviewRequest(BaseModel):
    """Browser request for one injury-impact preview."""

    model_config = ConfigDict(extra="forbid")

    season: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}$")
    team_id: int
    player_id: str = Field(min_length=1)
    projected_games_missed: int = Field(ge=0, le=82)


class InjuryPreviewResponse(BaseModel):
    """Browser response for one injury-impact preview."""

    model_config = ConfigDict(extra="forbid")

    season: str
    simulation_scope_note: str
    team_id: int
    team_name: str
    player_id: str
    player_name: str
    projected_games_missed: int
    baseline: ScenarioPreviewOutcomeSnapshot
    scenario: ScenarioPreviewOutcomeSnapshot
    delta: ScenarioPreviewDeltaSummary


class LineupPreviewRequest(BaseModel):
    """Browser request for one lineup-adjustment preview."""

    model_config = ConfigDict(extra="forbid")

    season: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}$")
    team_id: int
    change_label: str = Field(min_length=1)
    net_rating_adjustment: float = Field(ge=-10, le=10)


class LineupPreviewResponse(BaseModel):
    """Browser response for one lineup-adjustment preview."""

    model_config = ConfigDict(extra="forbid")

    season: str
    simulation_scope_note: str
    team_id: int
    team_name: str
    change_label: str
    baseline: ScenarioPreviewOutcomeSnapshot
    scenario: ScenarioPreviewOutcomeSnapshot
    delta: ScenarioPreviewDeltaSummary
