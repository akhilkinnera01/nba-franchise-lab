"""Tests for loading season-level CBA rule sets."""

from __future__ import annotations

from engine.cba_rules import CapThresholdsInput, load_cap_rule_for_season, load_cba_rules
from pytest import approx, raises


def test_load_cap_rule_for_pre_2023_season_selects_the_2017_cba() -> None:
    """The loader should map pre-2023 seasons to the 2017 CBA ruleset."""

    rule = load_cap_rule_for_season(
        "2019-20",
        thresholds=CapThresholdsInput(
            season="2019-20",
            salary_floor="$98,226,000",
            salary_cap="$109,140,000",
            luxury_tax="$132,627,000",
        ),
    )

    assert rule.cba_version == "2017"
    assert rule.salary_cap_cents == 10_914_000_000
    assert rule.first_apron_cents is None
    assert rule.trade_matching.simultaneous_aggregation_allowed is True


def test_load_cap_rule_for_post_2023_season_merges_thresholds_and_trade_brackets() -> None:
    """The loader should merge thresholds and parse the 2023 trade-matching rules."""

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

    assert rule.cba_version == "2023"
    assert rule.first_apron_cents == 17_813_200_000
    assert rule.second_apron_cents == 18_893_100_000
    assert rule.trade_matching.below_first_apron_brackets[0].incoming_multiplier == approx(2.0)
    assert rule.trade_matching.below_first_apron_brackets[0].incoming_addend_cents == 25_000_000
    assert rule.trade_matching.first_apron_or_above_rule is not None
    assert (
        rule.trade_matching.first_apron_or_above_rule.can_take_back_more_salary_than_sent is False
    )


def test_load_cap_rule_rejects_seasons_outside_the_supported_cba_window() -> None:
    """The loader should reject seasons that neither YAML ruleset claims."""

    with raises(ValueError):
        load_cap_rule_for_season(
            "2016-17",
            thresholds=CapThresholdsInput(
                season="2016-17",
                salary_floor="$84,729,000",
                salary_cap="$94,143,000",
                luxury_tax="$113,287,000",
            ),
        )


def test_cba_rule_loaders_do_not_serialize_raw_payloads() -> None:
    """Raw YAML payloads should stay internal to avoid accidental public exposure."""

    templates = load_cba_rules()
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

    assert "raw_payload" not in templates[0].model_dump()
    assert "raw_rule_payload" not in rule.model_dump()
