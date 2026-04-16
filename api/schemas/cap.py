"""Cap-sheet transport schemas."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class TeamCapProjectionSeason(BaseModel):
    """One season-level cap sheet exposed by the API."""

    model_config = ConfigDict(extra="forbid", from_attributes=True)

    season: str
    committed_salary_cents: int
    cap_hold_cents: int
    total_team_salary_cents: int
    salary_cap_cents: int | None = Field(default=None, ge=0)
    luxury_tax_cents: int | None = Field(default=None, ge=0)
    first_apron_cents: int | None = Field(default=None, ge=0)
    second_apron_cents: int | None = Field(default=None, ge=0)
    cap_room_cents: int | None = None
    tax_room_cents: int | None = None
    first_apron_room_cents: int | None = None
    second_apron_room_cents: int | None = None
    standard_contract_count: int
    expiring_player_ids: tuple[str, ...] = ()
    expiring_salary_cents: int = 0
