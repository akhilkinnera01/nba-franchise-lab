"""Trade salary-matching validation built on loaded CBA rules."""

from __future__ import annotations

from collections import Counter
from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict, Field, model_validator

from engine.cba_rules import (
    CbaRuleSet,
    SecondApronTradeRestrictions,
    TradeMatchingBracket,
    TradeMatchingSingleRule,
)

if TYPE_CHECKING:
    from collections.abc import Iterable


class TradeContractInput(BaseModel):
    """One player contract included in a proposed trade."""

    model_config = ConfigDict(extra="forbid")

    player_id: str = Field(min_length=1)
    player_name: str = Field(min_length=1)
    salary_cents: int = Field(ge=0)


class TradeTeamSideInput(BaseModel):
    """One team's side of a proposed trade."""

    model_config = ConfigDict(extra="forbid")

    team_id: int
    team_name: str = Field(min_length=1)
    current_team_salary_cents: int = Field(ge=0)
    pre_trade_standard_contract_count: int = Field(gt=0)
    outgoing_contracts: tuple[TradeContractInput, ...] = Field(default_factory=tuple)
    incoming_contracts: tuple[TradeContractInput, ...] = Field(default_factory=tuple)
    sends_cash: bool = False


class TradeTeamValidationResult(BaseModel):
    """Validation output for one team in the trade."""

    model_config = ConfigDict(extra="forbid")

    team_id: int
    team_name: str
    apron_status: str
    outgoing_salary_cents: int
    incoming_salary_cents: int
    maximum_incoming_salary_cents: int
    post_trade_standard_contract_count: int
    valid: bool
    matched_rule_description: str | None = None
    violations: tuple[str, ...] = Field(default_factory=tuple)


class TradeValidationInput(BaseModel):
    """Validated input for a multi-team trade proposal."""

    model_config = ConfigDict(extra="forbid")

    season: str
    cba_rule: CbaRuleSet
    teams: tuple[TradeTeamSideInput, ...]

    @model_validator(mode="after")
    def validate_trade(self) -> TradeValidationInput:
        """Require a season-aligned trade with unique team entries."""

        if self.cba_rule.season != self.season:
            raise ValueError("cba_rule.season must match the trade season.")
        if len(self.teams) < 2:
            raise ValueError("At least two teams are required in a trade.")
        team_ids = [team.team_id for team in self.teams]
        if len(set(team_ids)) != len(team_ids):
            raise ValueError("Trade team entries must use unique team IDs.")
        if _contract_counter(team.outgoing_contracts for team in self.teams) != _contract_counter(
            team.incoming_contracts for team in self.teams
        ):
            raise ValueError(
                "Trade outgoing and incoming contract sets must describe the same assets."
            )
        return self


class TradeValidationResult(BaseModel):
    """Aggregate trade validation output across every team."""

    model_config = ConfigDict(extra="forbid")

    season: str
    valid: bool
    team_results: tuple[TradeTeamValidationResult, ...]
    violations: tuple[str, ...] = Field(default_factory=tuple)


def validate_trade(trade: TradeValidationInput) -> TradeValidationResult:
    """Validate one proposed trade against salary-matching and roster rules."""

    team_results: list[TradeTeamValidationResult] = []
    all_violations: list[str] = []
    for team in trade.teams:
        team_result = _validate_team_side(team=team, cba_rule=trade.cba_rule)
        team_results.append(team_result)
        all_violations.extend(team_result.violations)

    return TradeValidationResult(
        season=trade.season,
        valid=not all_violations,
        team_results=tuple(team_results),
        violations=tuple(all_violations),
    )


def _validate_team_side(
    *,
    team: TradeTeamSideInput,
    cba_rule: CbaRuleSet,
) -> TradeTeamValidationResult:
    """Validate one team's salary-matching compliance."""

    violations: list[str] = []
    outgoing_salary_cents = sum(contract.salary_cents for contract in team.outgoing_contracts)
    incoming_salary_cents = sum(contract.salary_cents for contract in team.incoming_contracts)
    post_trade_standard_contract_count = (
        team.pre_trade_standard_contract_count
        - len(team.outgoing_contracts)
        + len(team.incoming_contracts)
    )
    apron_status = _apron_status(
        team_salary_cents=team.current_team_salary_cents,
        cba_rule=cba_rule,
    )
    matched_rule, maximum_incoming_salary_cents = _matching_rule_for_team(
        outgoing_salary_cents=outgoing_salary_cents,
        apron_status=apron_status,
        cba_rule=cba_rule,
    )

    if incoming_salary_cents > maximum_incoming_salary_cents:
        violations.append(
            f"{team.team_name} exceeds the incoming salary limit under the matched rule."
        )

    if (
        isinstance(matched_rule, (TradeMatchingSingleRule, SecondApronTradeRestrictions))
        and not matched_rule.can_take_back_more_salary_than_sent
        and incoming_salary_cents > outgoing_salary_cents
    ):
        violations.append(
            f"{team.team_name} cannot take back more salary than it sends "
            "under the active apron rule."
        )
    if isinstance(matched_rule, SecondApronTradeRestrictions):
        if (
            len(team.outgoing_contracts) > 1
            and incoming_salary_cents > 0
            and not matched_rule.can_aggregate_contracts
        ):
            violations.append(
                f"{team.team_name} cannot aggregate multiple outgoing contracts "
                "while above the second apron."
            )
        if team.sends_cash and not matched_rule.can_send_cash_in_trades:
            violations.append(
                f"{team.team_name} cannot send cash in trades while above the second apron."
            )
    elif (
        len(team.outgoing_contracts) > 1
        and incoming_salary_cents > 0
        and not cba_rule.trade_matching.simultaneous_aggregation_allowed
    ):
        violations.append(
            f"{team.team_name} cannot aggregate multiple outgoing contracts "
            "under the active CBA rules."
        )
    elif team.sends_cash and not cba_rule.trade_matching.cash_in_trades_allowed:
        violations.append(f"{team.team_name} cannot send cash under the active CBA rules.")

    if (
        post_trade_standard_contract_count
        > cba_rule.roster_limits.regular_season_standard_contracts
    ):
        violations.append(
            f"{team.team_name} would exceed the regular-season roster limit after the trade."
        )
    if post_trade_standard_contract_count < 0:
        violations.append(
            f"{team.team_name} cannot trade away more standard contracts than it has."
        )

    return TradeTeamValidationResult(
        team_id=team.team_id,
        team_name=team.team_name,
        apron_status=apron_status,
        outgoing_salary_cents=outgoing_salary_cents,
        incoming_salary_cents=incoming_salary_cents,
        maximum_incoming_salary_cents=maximum_incoming_salary_cents,
        post_trade_standard_contract_count=post_trade_standard_contract_count,
        valid=not violations,
        matched_rule_description=matched_rule.description if matched_rule is not None else None,
        violations=tuple(violations),
    )


def _apron_status(*, team_salary_cents: int, cba_rule: CbaRuleSet) -> str:
    """Return the trade-matching status bucket for one team salary level."""

    if (
        cba_rule.second_apron_cents is not None
        and team_salary_cents >= cba_rule.second_apron_cents
    ):
        return "second_apron_or_above"
    if cba_rule.first_apron_cents is not None and team_salary_cents >= cba_rule.first_apron_cents:
        return "first_apron_or_above"
    if cba_rule.cba_version == "2017" and (
        cba_rule.luxury_tax_cents is not None and team_salary_cents >= cba_rule.luxury_tax_cents
    ):
        return "taxpaying_or_above"
    return "below_first_apron"


def _matching_rule_for_team(
    *,
    outgoing_salary_cents: int,
    apron_status: str,
    cba_rule: CbaRuleSet,
) -> tuple[TradeMatchingBracket | TradeMatchingSingleRule | SecondApronTradeRestrictions, int]:
    """Return the applicable matching rule plus its computed incoming maximum."""

    if (
        apron_status == "second_apron_or_above"
        and cba_rule.trade_matching.second_apron_trade_restrictions is not None
    ):
        rule = cba_rule.trade_matching.second_apron_trade_restrictions
        return rule, _maximum_incoming_salary(
            outgoing_salary_cents=outgoing_salary_cents,
            incoming_multiplier=rule.incoming_multiplier,
            incoming_addend_cents=rule.incoming_addend_cents,
        )

    if apron_status in {"first_apron_or_above", "taxpaying_or_above"}:
        if cba_rule.trade_matching.first_apron_or_above_rule is None:
            raise ValueError("No first-apron trade rule was loaded for this season.")
        first_apron_rule = cba_rule.trade_matching.first_apron_or_above_rule
        return first_apron_rule, _maximum_incoming_salary(
            outgoing_salary_cents=outgoing_salary_cents,
            incoming_multiplier=first_apron_rule.incoming_multiplier,
            incoming_addend_cents=first_apron_rule.incoming_addend_cents,
        )

    for bracket in cba_rule.trade_matching.below_first_apron_brackets:
        if (
            bracket.minimum_outgoing_cents is not None
            and outgoing_salary_cents < bracket.minimum_outgoing_cents
        ):
            continue
        if (
            bracket.maximum_outgoing_cents is not None
            and outgoing_salary_cents > bracket.maximum_outgoing_cents
        ):
            continue
        return bracket, _maximum_incoming_salary(
            outgoing_salary_cents=outgoing_salary_cents,
            incoming_multiplier=bracket.incoming_multiplier,
            incoming_addend_cents=bracket.incoming_addend_cents,
        )

    raise ValueError("No below-first-apron trade bracket matched the outgoing salary.")


def _contract_counter(
    contract_groups: Iterable[tuple[TradeContractInput, ...]],
) -> Counter[tuple[str, int]]:
    """Return a multiset keyed by contract identity across every team side."""

    counter: Counter[tuple[str, int]] = Counter()
    for contracts in contract_groups:
        for contract in contracts:
            counter[(contract.player_id, contract.salary_cents)] += 1
    return counter


def _maximum_incoming_salary(
    *,
    outgoing_salary_cents: int,
    incoming_multiplier: float,
    incoming_addend_cents: int,
) -> int:
    """Return the highest incoming salary allowed by one matching formula."""

    return int(outgoing_salary_cents * incoming_multiplier) + incoming_addend_cents
