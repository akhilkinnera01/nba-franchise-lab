"""Multi-season cap projection from contracts, cap rules, and cap holds."""

from __future__ import annotations

from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict, Field, model_validator

if TYPE_CHECKING:
    from engine.cba_rules import CbaRuleSet


class ContractProjectionInput(BaseModel):
    """One contract timeline used in a cap projection."""

    model_config = ConfigDict(extra="forbid")

    player_id: str = Field(min_length=1)
    player_name: str = Field(min_length=1)
    annual_salary_cents: dict[str, int] = Field(default_factory=dict)


class CapHoldInput(BaseModel):
    """One explicit free-agent cap hold assigned to a season."""

    model_config = ConfigDict(extra="forbid")

    player_id: str = Field(min_length=1)
    player_name: str = Field(min_length=1)
    season: str
    cap_hold_cents: int = Field(ge=0)


class TeamCapProjectionInput(BaseModel):
    """Validated input for one multi-season team cap projection."""

    model_config = ConfigDict(extra="forbid")

    team_id: int
    team_name: str = Field(min_length=1)
    projection_seasons: tuple[str, ...]
    cap_rules: tuple[CbaRuleSet, ...]
    contracts: tuple[ContractProjectionInput, ...] = Field(default_factory=tuple)
    cap_holds: tuple[CapHoldInput, ...] = Field(default_factory=tuple)
    team_salary_overrides: dict[str, int] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_projection_inputs(self) -> TeamCapProjectionInput:
        """Require one matching cap rule for every projected season."""

        if not self.projection_seasons:
            raise ValueError("At least one projection season is required.")
        available_rule_seasons = {cap_rule.season for cap_rule in self.cap_rules}
        missing_rule_seasons = [
            season for season in self.projection_seasons if season not in available_rule_seasons
        ]
        if missing_rule_seasons:
            raise ValueError("Every projection season must have a matching cap rule.")
        for season in self.team_salary_overrides:
            if season not in self.projection_seasons:
                raise ValueError("Every team salary override must target a projected season.")
            if any(contract.annual_salary_cents.get(season, 0) > 0 for contract in self.contracts):
                raise ValueError(
                    "team_salary_overrides cannot overlap seasons that also carry contract detail."
                )
        return self


class SeasonCapProjectionResult(BaseModel):
    """One season-level cap sheet projection."""

    model_config = ConfigDict(extra="forbid")

    season: str
    committed_salary_cents: int
    cap_hold_cents: int
    total_team_salary_cents: int
    salary_cap_cents: int | None = None
    luxury_tax_cents: int | None = None
    first_apron_cents: int | None = None
    second_apron_cents: int | None = None
    cap_room_cents: int | None = None
    tax_room_cents: int | None = None
    first_apron_room_cents: int | None = None
    second_apron_room_cents: int | None = None
    standard_contract_count: int
    expiring_player_ids: tuple[str, ...] = Field(default_factory=tuple)
    expiring_salary_cents: int = 0


class TeamCapProjectionResult(BaseModel):
    """Multi-season cap sheet output for one team."""

    model_config = ConfigDict(extra="forbid")

    team_id: int
    team_name: str
    season_results: tuple[SeasonCapProjectionResult, ...]


def project_team_cap(team: TeamCapProjectionInput) -> TeamCapProjectionResult:
    """Project one team's cap sheet over the requested seasons."""

    cap_rule_by_season = {cap_rule.season: cap_rule for cap_rule in team.cap_rules}
    season_results: list[SeasonCapProjectionResult] = []
    for season in team.projection_seasons:
        cap_rule = cap_rule_by_season[season]
        committed_salary_cents = team.team_salary_overrides.get(
            season,
            sum(contract.annual_salary_cents.get(season, 0) for contract in team.contracts),
        )
        cap_hold_cents = sum(
            cap_hold.cap_hold_cents for cap_hold in team.cap_holds if cap_hold.season == season
        )
        total_team_salary_cents = committed_salary_cents + cap_hold_cents
        standard_contract_count = sum(
            1 for contract in team.contracts if contract.annual_salary_cents.get(season, 0) > 0
        )
        expiring_contracts = tuple(
            contract
            for contract in team.contracts
            if contract.annual_salary_cents.get(season, 0) > 0
            and _next_season(season) not in contract.annual_salary_cents
        )

        season_results.append(
            SeasonCapProjectionResult(
                season=season,
                committed_salary_cents=committed_salary_cents,
                cap_hold_cents=cap_hold_cents,
                total_team_salary_cents=total_team_salary_cents,
                salary_cap_cents=cap_rule.salary_cap_cents,
                luxury_tax_cents=cap_rule.luxury_tax_cents,
                first_apron_cents=cap_rule.first_apron_cents,
                second_apron_cents=cap_rule.second_apron_cents,
                cap_room_cents=_room(cap_rule.salary_cap_cents, total_team_salary_cents),
                tax_room_cents=_room(cap_rule.luxury_tax_cents, total_team_salary_cents),
                first_apron_room_cents=_room(
                    cap_rule.first_apron_cents,
                    total_team_salary_cents,
                ),
                second_apron_room_cents=_room(
                    cap_rule.second_apron_cents,
                    total_team_salary_cents,
                ),
                standard_contract_count=standard_contract_count,
                expiring_player_ids=tuple(contract.player_id for contract in expiring_contracts),
                expiring_salary_cents=sum(
                    contract.annual_salary_cents.get(season, 0) for contract in expiring_contracts
                ),
            )
        )

    return TeamCapProjectionResult(
        team_id=team.team_id,
        team_name=team.team_name,
        season_results=tuple(season_results),
    )


def _room(threshold_cents: int | None, total_team_salary_cents: int) -> int | None:
    """Return the remaining room beneath one monetary threshold."""

    if threshold_cents is None:
        return None
    return threshold_cents - total_team_salary_cents


def _next_season(season: str) -> str:
    """Return the next project season label."""

    start_year = int(season[:4]) + 1
    end_year_suffix = (start_year + 1) % 100
    return f"{start_year}-{end_year_suffix:02d}"


def _rebuild_cap_projection_models() -> None:
    """Resolve forward references for typed cap-projection models."""

    from engine.cba_rules import CbaRuleSet

    TeamCapProjectionInput.model_rebuild(_types_namespace={"CbaRuleSet": CbaRuleSet})


_rebuild_cap_projection_models()
