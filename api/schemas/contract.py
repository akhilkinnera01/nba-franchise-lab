"""Contract-related transport schemas."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class PlayerContractSummary(BaseModel):
    """One player's contract snapshot in roster responses."""

    model_config = ConfigDict(extra="forbid")

    current_salary_cents: int | None = Field(default=None, ge=0)
    contract_type: str | None = None
    contract_start_year: int
    contract_end_year: int
    annual_salary_cents: dict[str, int] = Field(default_factory=dict)
