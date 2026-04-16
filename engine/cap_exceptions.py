"""Cap exception availability logic for projected team cap sheets."""

from __future__ import annotations

from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict, Field

if TYPE_CHECKING:
    from engine.cap_projection import SeasonCapProjectionResult
    from engine.cba_rules import CbaRuleSet


class CapExceptionInput(BaseModel):
    """Validated input for one season's cap exception evaluation."""

    model_config = ConfigDict(extra="forbid")

    projected_season: SeasonCapProjectionResult
    cba_rule: CbaRuleSet
    exception_amount_overrides: dict[str, int] = Field(default_factory=dict)


class CapExceptionAvailability(BaseModel):
    """Availability result for one specific exception path."""

    model_config = ConfigDict(extra="forbid")

    code: str
    available: bool
    amount_cents: int | None = None
    reason: str


class CapExceptionResult(BaseModel):
    """Aggregate exception availability for one projected season."""

    model_config = ConfigDict(extra="forbid")

    season: str
    exceptions: tuple[CapExceptionAvailability, ...]


def determine_cap_exceptions(cap_input: CapExceptionInput) -> CapExceptionResult:
    """Determine which cap exceptions remain available for one projected season."""

    projected_season = cap_input.projected_season
    cba_rule = cap_input.cba_rule
    if projected_season.season != cba_rule.season:
        raise ValueError("projected_season.season must match cba_rule.season.")

    total_team_salary_cents = projected_season.total_team_salary_cents
    has_cap_room = (projected_season.cap_room_cents or 0) > 0
    at_or_above_first_apron = (
        cba_rule.first_apron_cents is not None
        and total_team_salary_cents >= cba_rule.first_apron_cents
    )
    at_or_above_second_apron = (
        cba_rule.second_apron_cents is not None
        and total_team_salary_cents >= cba_rule.second_apron_cents
    )

    exceptions = (
        _exception(
            code="room_mid_level",
            available=has_cap_room,
            amount_cents=cap_input.exception_amount_overrides.get("room_mid_level"),
            reason=(
                "Room exception available because the team projects below the salary cap."
                if has_cap_room
                else "Room exception unavailable because the team projects over the salary cap."
            ),
        ),
        _exception(
            code="non_taxpayer_mid_level",
            available=not has_cap_room and not at_or_above_first_apron,
            amount_cents=cap_input.exception_amount_overrides.get("non_taxpayer_mid_level"),
            reason=(
                "Standard non-taxpayer mid-level exception remains "
                "available below the first apron."
                if not has_cap_room and not at_or_above_first_apron
                else (
                    "Non-taxpayer mid-level exception unavailable because "
                    "the team uses cap room or projects too high."
                )
            ),
        ),
        _exception(
            code="taxpayer_mid_level",
            available=(
                not has_cap_room and at_or_above_first_apron and not at_or_above_second_apron
            ),
            amount_cents=cap_input.exception_amount_overrides.get("taxpayer_mid_level"),
            reason=(
                "Taxpayer mid-level exception remains available between "
                "the first and second aprons."
                if not has_cap_room and at_or_above_first_apron and not at_or_above_second_apron
                else (
                    "Taxpayer mid-level exception unavailable because the "
                    "team is below the first apron, above the second apron, "
                    "or using cap room."
                )
            ),
        ),
        _exception(
            code="bi_annual_exception",
            available=not has_cap_room and not at_or_above_first_apron,
            amount_cents=cap_input.exception_amount_overrides.get("bi_annual_exception"),
            reason=(
                "Bi-annual exception remains available below the first apron."
                if not has_cap_room and not at_or_above_first_apron
                else (
                    "Bi-annual exception unavailable because the team uses "
                    "cap room or projects at or above the first apron."
                )
            ),
        ),
        _exception(
            code="veteran_minimum",
            available=True,
            amount_cents=cap_input.exception_amount_overrides.get("veteran_minimum"),
            reason="Veteran minimum contracts remain available regardless of cap position.",
        ),
    )
    return CapExceptionResult(season=projected_season.season, exceptions=exceptions)


def _exception(
    *,
    code: str,
    available: bool,
    amount_cents: int | None,
    reason: str,
) -> CapExceptionAvailability:
    """Return one typed exception availability record."""

    return CapExceptionAvailability(
        code=code,
        available=available,
        amount_cents=amount_cents,
        reason=reason,
    )


def _rebuild_cap_exception_models() -> None:
    """Resolve forward references for typed cap-exception models."""

    from engine.cap_projection import SeasonCapProjectionResult
    from engine.cba_rules import CbaRuleSet

    CapExceptionInput.model_rebuild(
        _types_namespace={
            "SeasonCapProjectionResult": SeasonCapProjectionResult,
            "CbaRuleSet": CbaRuleSet,
        }
    )


_rebuild_cap_exception_models()
