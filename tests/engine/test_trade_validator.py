"""Tests for trade salary-matching validation."""

from __future__ import annotations

from engine.cba_rules import CapThresholdsInput, load_cap_rule_for_season
from engine.trade_validator import (
    TradeContractInput,
    TradeTeamSideInput,
    TradeValidationInput,
    validate_trade,
)
from pytest import raises


def _contract(player_id: str, player_name: str, salary_cents: int) -> TradeContractInput:
    """Build one tradeable contract input for tests."""

    return TradeContractInput(
        player_id=player_id,
        player_name=player_name,
        salary_cents=salary_cents,
    )


def test_validate_trade_accepts_a_below_first_apron_match() -> None:
    """A below-first-apron team should use the bracketed 2023 matching formula."""

    rule = load_cap_rule_for_season(
        "2024-25",
        thresholds=CapThresholdsInput(
            season="2024-25",
            salary_floor="$126,538,000",
            salary_cap="$140,588,000",
            luxury_tax="$170,814,000",
            first_apron="$178,132,000",
            second_apron="$188,931,000",
        ),
    )

    result = validate_trade(
        TradeValidationInput(
            season="2024-25",
            cba_rule=rule,
            teams=(
                TradeTeamSideInput(
                    team_id=1,
                    team_name="Below Apron Team",
                    current_team_salary_cents=17_000_000_000,
                    pre_trade_standard_contract_count=14,
                    outgoing_contracts=(_contract("p1", "Outgoing", 700_000_000),),
                    incoming_contracts=(_contract("p2", "Incoming", 1_350_000_000),),
                ),
                TradeTeamSideInput(
                    team_id=2,
                    team_name="Partner Team",
                    current_team_salary_cents=15_500_000_000,
                    pre_trade_standard_contract_count=14,
                    outgoing_contracts=(_contract("p2", "Incoming", 1_350_000_000),),
                    incoming_contracts=(_contract("p1", "Outgoing", 700_000_000),),
                ),
            ),
        )
    )

    assert result.valid is True


def test_validate_trade_rejects_first_apron_teams_taking_back_extra_salary() -> None:
    """First-apron teams should not be able to take back more salary than they send."""

    rule = load_cap_rule_for_season(
        "2024-25",
        thresholds=CapThresholdsInput(
            season="2024-25",
            salary_floor="$126,538,000",
            salary_cap="$140,588,000",
            luxury_tax="$170,814,000",
            first_apron="$178,132,000",
            second_apron="$188,931,000",
        ),
    )

    result = validate_trade(
        TradeValidationInput(
            season="2024-25",
            cba_rule=rule,
            teams=(
                TradeTeamSideInput(
                    team_id=1,
                    team_name="First Apron Team",
                    current_team_salary_cents=18_000_000_000,
                    pre_trade_standard_contract_count=14,
                    outgoing_contracts=(_contract("p1", "Outgoing", 1_000_000_000),),
                    incoming_contracts=(_contract("p2", "Incoming", 1_100_000_000),),
                ),
                TradeTeamSideInput(
                    team_id=2,
                    team_name="Partner Team",
                    current_team_salary_cents=16_000_000_000,
                    pre_trade_standard_contract_count=14,
                    outgoing_contracts=(_contract("p2", "Incoming", 1_100_000_000),),
                    incoming_contracts=(_contract("p1", "Outgoing", 1_000_000_000),),
                ),
            ),
        )
    )

    assert result.valid is False
    assert "cannot take back more salary" in " ".join(result.violations).lower()


def test_validate_trade_rejects_second_apron_aggregation() -> None:
    """Second-apron teams should not aggregate multiple contracts into one incoming slot."""

    rule = load_cap_rule_for_season(
        "2024-25",
        thresholds=CapThresholdsInput(
            season="2024-25",
            salary_floor="$126,538,000",
            salary_cap="$140,588,000",
            luxury_tax="$170,814,000",
            first_apron="$178,132,000",
            second_apron="$188,931,000",
        ),
    )

    result = validate_trade(
        TradeValidationInput(
            season="2024-25",
            cba_rule=rule,
            teams=(
                TradeTeamSideInput(
                    team_id=1,
                    team_name="Second Apron Team",
                    current_team_salary_cents=19_100_000_000,
                    pre_trade_standard_contract_count=14,
                    outgoing_contracts=(
                        _contract("p1", "Outgoing One", 500_000_000),
                        _contract("p2", "Outgoing Two", 400_000_000),
                    ),
                    incoming_contracts=(_contract("p3", "Incoming", 900_000_000),),
                ),
                TradeTeamSideInput(
                    team_id=2,
                    team_name="Partner Team",
                    current_team_salary_cents=15_000_000_000,
                    pre_trade_standard_contract_count=14,
                    outgoing_contracts=(_contract("p3", "Incoming", 900_000_000),),
                    incoming_contracts=(
                        _contract("p1", "Outgoing One", 500_000_000),
                        _contract("p2", "Outgoing Two", 400_000_000),
                    ),
                ),
            ),
        )
    )

    assert result.valid is False
    assert "aggregate" in " ".join(result.violations).lower()


def test_validate_trade_rejects_rosters_that_grow_past_the_regular_season_limit() -> None:
    """Post-trade standard rosters should stay within the loaded regular-season limit."""

    rule = load_cap_rule_for_season(
        "2019-20",
        thresholds=CapThresholdsInput(
            season="2019-20",
            salary_floor="$98,226,000",
            salary_cap="$109,140,000",
            luxury_tax="$132,627,000",
        ),
    )

    result = validate_trade(
        TradeValidationInput(
            season="2019-20",
            cba_rule=rule,
            teams=(
                TradeTeamSideInput(
                    team_id=1,
                    team_name="Too Many Players Team",
                    current_team_salary_cents=11_000_000_000,
                    pre_trade_standard_contract_count=15,
                    outgoing_contracts=(_contract("p1", "Outgoing", 500_000_000),),
                    incoming_contracts=(
                        _contract("p2", "Incoming One", 250_000_000),
                        _contract("p3", "Incoming Two", 250_000_000),
                    ),
                ),
                TradeTeamSideInput(
                    team_id=2,
                    team_name="Partner Team",
                    current_team_salary_cents=9_000_000_000,
                    pre_trade_standard_contract_count=14,
                    outgoing_contracts=(
                        _contract("p2", "Incoming One", 250_000_000),
                        _contract("p3", "Incoming Two", 250_000_000),
                    ),
                    incoming_contracts=(_contract("p1", "Outgoing", 500_000_000),),
                ),
            ),
        )
    )

    assert result.valid is False
    assert "roster" in " ".join(result.violations).lower()


def test_trade_input_rejects_mismatched_contract_graphs() -> None:
    """Malformed trade graphs should not validate as if both sides matched."""

    rule = load_cap_rule_for_season(
        "2024-25",
        thresholds=CapThresholdsInput(
            season="2024-25",
            salary_floor="$126,538,000",
            salary_cap="$140,588,000",
            luxury_tax="$170,814,000",
            first_apron="$178,132,000",
            second_apron="$188,931,000",
        ),
    )

    with raises(ValueError):
        TradeValidationInput(
            season="2024-25",
            cba_rule=rule,
            teams=(
                TradeTeamSideInput(
                    team_id=1,
                    team_name="Malformed Team One",
                    current_team_salary_cents=16_000_000_000,
                    pre_trade_standard_contract_count=14,
                    outgoing_contracts=(_contract("p1", "Outgoing", 900_000_000),),
                    incoming_contracts=(_contract("p2", "Incoming", 900_000_000),),
                ),
                TradeTeamSideInput(
                    team_id=2,
                    team_name="Malformed Team Two",
                    current_team_salary_cents=15_000_000_000,
                    pre_trade_standard_contract_count=14,
                    outgoing_contracts=(_contract("p3", "Different", 900_000_000),),
                    incoming_contracts=(_contract("p1", "Outgoing", 900_000_000),),
                ),
            ),
        )


def test_validate_trade_rejects_negative_post_trade_roster_counts() -> None:
    """Trades cannot remove more standard contracts than a team currently carries."""

    rule = load_cap_rule_for_season(
        "2019-20",
        thresholds=CapThresholdsInput(
            season="2019-20",
            salary_floor="$98,226,000",
            salary_cap="$109,140,000",
            luxury_tax="$132,627,000",
        ),
    )

    result = validate_trade(
        TradeValidationInput(
            season="2019-20",
            cba_rule=rule,
            teams=(
                TradeTeamSideInput(
                    team_id=1,
                    team_name="Short-Handed Team",
                    current_team_salary_cents=11_000_000_000,
                    pre_trade_standard_contract_count=1,
                    outgoing_contracts=(
                        _contract("p1", "Outgoing One", 250_000_000),
                        _contract("p2", "Outgoing Two", 250_000_000),
                    ),
                    incoming_contracts=(),
                ),
                TradeTeamSideInput(
                    team_id=2,
                    team_name="Partner Team",
                    current_team_salary_cents=9_000_000_000,
                    pre_trade_standard_contract_count=15,
                    outgoing_contracts=(),
                    incoming_contracts=(
                        _contract("p1", "Outgoing One", 250_000_000),
                        _contract("p2", "Outgoing Two", 250_000_000),
                    ),
                ),
            ),
        )
    )

    assert result.valid is False
    assert "cannot trade away more standard contracts" in " ".join(result.violations).lower()
