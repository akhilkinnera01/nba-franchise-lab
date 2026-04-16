"""Typed loading helpers for versioned NBA CBA rule sets."""

from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml  # type: ignore[import-untyped]
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

DEFAULT_CBA_RULES_ROOT = Path(__file__).resolve().parent.parent / "data" / "cba"
SEASON_LABEL_PATTERN = r"^\d{4}-\d{2}$"
MONEY_FRAGMENT_PATTERN = re.compile(r"\$([0-9,]+)")
PERCENT_PLUS_AMOUNT_PATTERN = re.compile(
    r"(?P<percent>\d+)% of outgoing salary plus \$(?P<amount>[0-9,]+)",
    flags=re.IGNORECASE,
)
OUTGOING_PLUS_AMOUNT_PATTERN = re.compile(
    r"Outgoing salary plus \$(?P<amount>[0-9,]+)",
    flags=re.IGNORECASE,
)
PERCENT_ONLY_PATTERN = re.compile(
    r"(?P<percent>\d+)% of outgoing salary",
    flags=re.IGNORECASE,
)


class EffectiveSeasons(BaseModel):
    """Season window claimed by one versioned CBA ruleset."""

    model_config = ConfigDict(extra="forbid")

    start: str = Field(pattern=SEASON_LABEL_PATTERN)
    end: str | None = Field(default=None, pattern=SEASON_LABEL_PATTERN)

    @field_validator("end", mode="before")
    @classmethod
    def normalize_blank_end(cls, value: object) -> object:
        """Treat blank YAML season windows as open-ended."""

        if value == "":
            return None
        return value


class RosterLimitsRule(BaseModel):
    """Season-independent roster limits in one CBA version."""

    model_config = ConfigDict(extra="forbid")

    offseason_maximum: int = Field(gt=0)
    regular_season_standard_contracts: int = Field(gt=0)
    two_way_contracts: int = Field(ge=0)
    inactive_limit_per_game: int = Field(ge=0)


class TradeMatchingBracket(BaseModel):
    """One outgoing-salary bracket for matching incoming trade salary."""

    model_config = ConfigDict(extra="forbid")

    minimum_outgoing_cents: int | None = Field(default=None, ge=0)
    maximum_outgoing_cents: int | None = Field(default=None, ge=0)
    incoming_multiplier: float = Field(gt=0)
    incoming_addend_cents: int = Field(default=0, ge=0)
    description: str = Field(min_length=1)


class TradeMatchingSingleRule(BaseModel):
    """One single formula for incoming trade salary."""

    model_config = ConfigDict(extra="forbid")

    incoming_multiplier: float = Field(gt=0)
    incoming_addend_cents: int = Field(default=0, ge=0)
    description: str = Field(min_length=1)
    can_take_back_more_salary_than_sent: bool = True


class SecondApronTradeRestrictions(TradeMatchingSingleRule):
    """Additional second-apron trade restrictions."""

    can_aggregate_contracts: bool = True
    can_send_cash_in_trades: bool = True
    can_use_preexisting_trade_exceptions: bool = True
    can_trade_first_round_pick_seven_years_out_if_previous_pick_frozen: bool = True


class TradeMatchingRules(BaseModel):
    """Normalized trade-matching configuration for one loaded season."""

    model_config = ConfigDict(extra="forbid")

    simultaneous_aggregation_allowed: bool = True
    cash_in_trades_allowed: bool = True
    below_first_apron_brackets: tuple[TradeMatchingBracket, ...] = Field(default_factory=tuple)
    first_apron_or_above_rule: TradeMatchingSingleRule | None = None
    second_apron_trade_restrictions: SecondApronTradeRestrictions | None = None


class CbaRuleTemplate(BaseModel):
    """One YAML-backed versioned CBA rule template."""

    model_config = ConfigDict(extra="forbid")

    cba_version: str = Field(min_length=1)
    effective_seasons: EffectiveSeasons
    threshold_sources: dict[str, Any] = Field(default_factory=dict)
    roster_limits: RosterLimitsRule
    rookie_scale: dict[str, Any] = Field(default_factory=dict)
    bird_rights: dict[str, Any] = Field(default_factory=dict)
    trade_matching: dict[str, Any] = Field(default_factory=dict)
    salary_maximums: dict[str, Any] = Field(default_factory=dict)
    minimum_salary: dict[str, Any] = Field(default_factory=dict)
    exceptions: dict[str, Any] = Field(default_factory=dict)
    sign_and_trade: dict[str, Any] = Field(default_factory=dict)
    over_38_rule: dict[str, Any] = Field(default_factory=dict)
    apron_rules: dict[str, Any] = Field(default_factory=dict)
    notes: tuple[str, ...] = Field(default_factory=tuple)
    raw_payload: dict[str, Any] = Field(default_factory=dict, exclude=True, repr=False)


class CapThresholdsInput(BaseModel):
    """Season-level monetary thresholds supplied alongside a rules template."""

    model_config = ConfigDict(extra="forbid")

    season: str = Field(pattern=SEASON_LABEL_PATTERN)
    salary_floor: str | int | None = None
    salary_cap: str | int | None = None
    luxury_tax: str | int | None = None
    first_apron: str | int | None = None
    second_apron: str | int | None = None


class CbaRuleSet(BaseModel):
    """One fully loaded season-specific CBA ruleset."""

    model_config = ConfigDict(extra="forbid")

    season: str = Field(pattern=SEASON_LABEL_PATTERN)
    cba_version: str
    salary_floor_cents: int | None = Field(default=None, ge=0)
    salary_cap_cents: int | None = Field(default=None, ge=0)
    luxury_tax_cents: int | None = Field(default=None, ge=0)
    first_apron_cents: int | None = Field(default=None, ge=0)
    second_apron_cents: int | None = Field(default=None, ge=0)
    roster_limits: RosterLimitsRule
    trade_matching: TradeMatchingRules
    salary_maximums: dict[str, Any] = Field(default_factory=dict)
    minimum_salary: dict[str, Any] = Field(default_factory=dict)
    exceptions: dict[str, Any] = Field(default_factory=dict)
    sign_and_trade: dict[str, Any] = Field(default_factory=dict)
    apron_rules: dict[str, Any] = Field(default_factory=dict)
    raw_rule_payload: dict[str, Any] = Field(default_factory=dict, exclude=True, repr=False)

    @model_validator(mode="after")
    def validate_apron_consistency(self) -> CbaRuleSet:
        """Keep pre-2023 rulesets from pretending to have second-apron values."""

        if self.cba_version == "2017" and (
            self.first_apron_cents is not None or self.second_apron_cents is not None
        ):
            raise ValueError("The 2017 CBA ruleset should not carry apron thresholds.")
        return self


def resolve_cba_version_for_season(
    season: str,
    *,
    rules_root: Path = DEFAULT_CBA_RULES_ROOT,
) -> str:
    """Return the CBA version tag active for one project season label."""

    return _template_for_season(season, rules_root=rules_root).cba_version


def load_cba_rules(
    *,
    rules_root: Path = DEFAULT_CBA_RULES_ROOT,
) -> tuple[CbaRuleTemplate, ...]:
    """Load and validate every versioned CBA YAML file beneath the rules root."""

    return _load_cba_rule_templates(str(rules_root))


def load_cba_rules_for_season(
    season: str,
    *,
    thresholds: CapThresholdsInput,
    rules_root: Path = DEFAULT_CBA_RULES_ROOT,
) -> CbaRuleSet:
    """Load the active CBA ruleset for one season and merge its money thresholds."""

    return load_cap_rule_for_season(season, thresholds=thresholds, rules_root=rules_root)


def load_cap_rule_for_season(
    season: str,
    *,
    thresholds: CapThresholdsInput,
    rules_root: Path = DEFAULT_CBA_RULES_ROOT,
) -> CbaRuleSet:
    """Load one season-specific CBA ruleset from the versioned YAML configs."""

    if thresholds.season != season:
        raise ValueError("thresholds.season must match the requested season.")

    template = _template_for_season(season, rules_root=rules_root)
    return CbaRuleSet(
        season=season,
        cba_version=template.cba_version,
        salary_floor_cents=_money_to_cents(thresholds.salary_floor),
        salary_cap_cents=_money_to_cents(thresholds.salary_cap),
        luxury_tax_cents=_money_to_cents(thresholds.luxury_tax),
        first_apron_cents=_money_to_cents(thresholds.first_apron),
        second_apron_cents=_money_to_cents(thresholds.second_apron),
        roster_limits=template.roster_limits,
        trade_matching=_normalize_trade_matching_rules(template),
        salary_maximums=template.salary_maximums,
        minimum_salary=template.minimum_salary,
        exceptions=template.exceptions,
        sign_and_trade=template.sign_and_trade,
        apron_rules=template.apron_rules,
        raw_rule_payload=template.raw_payload,
    )


@lru_cache(maxsize=4)
def _load_cba_rule_templates(rules_root: str) -> tuple[CbaRuleTemplate, ...]:
    """Load and cache versioned CBA rule templates from disk."""

    templates: list[CbaRuleTemplate] = []
    for yaml_path in sorted(Path(rules_root).glob("rules_*.yaml")):
        raw_payload = yaml.safe_load(yaml_path.read_text(encoding="utf-8"))
        if not isinstance(raw_payload, dict):
            raise ValueError(f"{yaml_path.name} did not contain a mapping payload.")
        template = CbaRuleTemplate(
            **raw_payload,
            raw_payload=dict(raw_payload),
        )
        templates.append(template)
    return tuple(sorted(templates, key=lambda template: template.effective_seasons.start))


def _template_for_season(
    season: str,
    *,
    rules_root: Path,
) -> CbaRuleTemplate:
    """Return the template whose effective-season window contains the season."""

    for template in load_cba_rules(rules_root=rules_root):
        if _season_in_window(season, template.effective_seasons):
            return template
    raise ValueError(f"No CBA ruleset covers season {season}.")


def _season_in_window(season: str, effective_seasons: EffectiveSeasons) -> bool:
    """Return whether one season label falls inside one effective-season window."""

    season_start_year = int(season[:4])
    start_year = int(effective_seasons.start[:4])
    if season_start_year < start_year:
        return False
    if effective_seasons.end is None:
        return True
    return season_start_year <= int(effective_seasons.end[:4])


def _normalize_trade_matching_rules(template: CbaRuleTemplate) -> TradeMatchingRules:
    """Normalize one YAML trade-matching payload into typed rule objects."""

    trade_matching = template.trade_matching
    below_first_apron_payload = trade_matching.get(
        "below_first_apron_rules",
        trade_matching.get("non_taxpaying_team_rules", []),
    )
    first_apron_or_above_payload = trade_matching.get(
        "first_apron_or_above_rule",
        trade_matching.get("taxpaying_team_rule"),
    )

    below_first_apron_brackets = tuple(
        _build_trade_matching_bracket(raw_bracket)
        for raw_bracket in below_first_apron_payload
        if isinstance(raw_bracket, dict)
    )

    first_apron_or_above_rule = None
    if isinstance(first_apron_or_above_payload, dict):
        first_apron_or_above_rule = _build_trade_matching_single_rule(
            first_apron_or_above_payload,
            default_can_take_back_more_salary_than_sent=True,
        )

    second_apron_trade_restrictions = None
    raw_second_apron = trade_matching.get("second_apron_trade_restrictions")
    if isinstance(raw_second_apron, dict):
        second_apron_trade_restrictions = _build_second_apron_trade_restrictions(raw_second_apron)

    return TradeMatchingRules(
        simultaneous_aggregation_allowed=bool(
            trade_matching.get("simultaneous_aggregation_allowed", True)
        ),
        cash_in_trades_allowed=bool(trade_matching.get("cash_in_trades_allowed", True)),
        below_first_apron_brackets=below_first_apron_brackets,
        first_apron_or_above_rule=first_apron_or_above_rule,
        second_apron_trade_restrictions=second_apron_trade_restrictions,
    )


def _parse_trade_formula(description: str) -> dict[str, float | int]:
    """Parse one human-readable incoming-salary formula into numeric parts."""

    if percent_plus_amount_match := PERCENT_PLUS_AMOUNT_PATTERN.fullmatch(description):
        return {
            "incoming_multiplier": int(percent_plus_amount_match.group("percent")) / 100,
            "incoming_addend_cents": _money_to_cents(
                f"${percent_plus_amount_match.group('amount')}"
            )
            or 0,
        }
    if outgoing_plus_amount_match := OUTGOING_PLUS_AMOUNT_PATTERN.fullmatch(description):
        return {
            "incoming_multiplier": 1.0,
            "incoming_addend_cents": _money_to_cents(
                f"${outgoing_plus_amount_match.group('amount')}"
            )
            or 0,
        }
    if percent_only_match := PERCENT_ONLY_PATTERN.fullmatch(description):
        return {
            "incoming_multiplier": int(percent_only_match.group("percent")) / 100,
            "incoming_addend_cents": 0,
        }
    raise ValueError(f"Unsupported trade matching formula: {description}")


def _build_trade_matching_bracket(raw_bracket: dict[str, Any]) -> TradeMatchingBracket:
    """Build one typed salary-matching bracket from YAML."""

    parsed_formula = _parse_trade_formula(str(raw_bracket["incoming_limit"]))
    return TradeMatchingBracket(
        minimum_outgoing_cents=_dollars_to_cents(raw_bracket.get("outgoing_minimum")),
        maximum_outgoing_cents=_dollars_to_cents(raw_bracket.get("outgoing_maximum")),
        description=str(raw_bracket["incoming_limit"]),
        incoming_multiplier=float(parsed_formula["incoming_multiplier"]),
        incoming_addend_cents=int(parsed_formula["incoming_addend_cents"]),
    )


def _build_trade_matching_single_rule(
    raw_rule: dict[str, Any],
    *,
    default_can_take_back_more_salary_than_sent: bool,
) -> TradeMatchingSingleRule:
    """Build one typed single-formula salary-matching rule."""

    parsed_formula = _parse_trade_formula(str(raw_rule["incoming_limit"]))
    return TradeMatchingSingleRule(
        description=str(raw_rule["incoming_limit"]),
        incoming_multiplier=float(parsed_formula["incoming_multiplier"]),
        incoming_addend_cents=int(parsed_formula["incoming_addend_cents"]),
        can_take_back_more_salary_than_sent=bool(
            raw_rule.get(
                "can_take_back_more_salary_than_sent",
                default_can_take_back_more_salary_than_sent,
            )
        ),
    )


def _build_second_apron_trade_restrictions(
    raw_rule: dict[str, Any],
) -> SecondApronTradeRestrictions:
    """Build one typed second-apron rule payload."""

    parsed_formula = _parse_trade_formula(str(raw_rule["incoming_limit"]))
    return SecondApronTradeRestrictions(
        description=str(raw_rule["incoming_limit"]),
        incoming_multiplier=float(parsed_formula["incoming_multiplier"]),
        incoming_addend_cents=int(parsed_formula["incoming_addend_cents"]),
        can_take_back_more_salary_than_sent=bool(
            raw_rule.get("can_take_back_more_salary_than_sent", False)
        ),
        can_aggregate_contracts=bool(raw_rule.get("can_aggregate_contracts", True)),
        can_send_cash_in_trades=bool(raw_rule.get("can_send_cash_in_trades", True)),
        can_use_preexisting_trade_exceptions=bool(
            raw_rule.get("can_use_preexisting_trade_exceptions", True)
        ),
        can_trade_first_round_pick_seven_years_out_if_previous_pick_frozen=bool(
            raw_rule.get(
                "can_trade_first_round_pick_seven_years_out_if_previous_pick_frozen",
                True,
            )
        ),
    )


def _money_to_cents(value: str | int | None) -> int | None:
    """Convert a currency string or integer dollar value into integer cents."""

    if value is None:
        return None
    if isinstance(value, int):
        return value * 100
    money_match = MONEY_FRAGMENT_PATTERN.search(value)
    if money_match is None:
        return None
    return int(money_match.group(1).replace(",", "")) * 100


def _dollars_to_cents(value: object) -> int | None:
    """Convert a whole-dollar YAML threshold into cents."""

    if isinstance(value, int):
        return value * 100
    return None
