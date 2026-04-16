"""Tests for cap exception availability logic."""

from __future__ import annotations

from engine.cap_exceptions import CapExceptionInput, determine_cap_exceptions
from engine.cap_projection import TeamCapProjectionInput, project_team_cap
from engine.cba_rules import CapThresholdsInput, CbaRuleSet, load_cap_rule_for_season


def _rule(
    season: str,
    *,
    salary_cap: str,
    luxury_tax: str,
    first_apron: str | None = None,
    second_apron: str | None = None,
) -> CbaRuleSet:
    """Build one loaded cap rule for tests."""

    return load_cap_rule_for_season(
        season,
        thresholds=CapThresholdsInput(
            season=season,
            salary_floor="$100,000,000",
            salary_cap=salary_cap,
            luxury_tax=luxury_tax,
            first_apron=first_apron,
            second_apron=second_apron,
        ),
    )


def test_below_cap_teams_get_room_exception_logic() -> None:
    """Teams with positive cap room should surface the room exception path."""

    rule = _rule(
        "2024-25",
        salary_cap="$140,588,000",
        luxury_tax="$170,814,000",
        first_apron="$178,132,000",
        second_apron="$188,931,000",
    )
    cap_projection = project_team_cap(
        TeamCapProjectionInput(
            team_id=1,
            team_name="Room Team",
            projection_seasons=("2024-25",),
            cap_rules=(rule,),
            contracts=(),
        )
    )

    result = determine_cap_exceptions(
        CapExceptionInput(
            projected_season=cap_projection.season_results[0],
            cba_rule=rule,
            exception_amount_overrides={"room_mid_level": 7_983_000_000},
        )
    )
    exceptions_by_code = {exception.code: exception for exception in result.exceptions}

    assert exceptions_by_code["room_mid_level"].available is True
    assert exceptions_by_code["room_mid_level"].amount_cents == 7_983_000_000
    assert exceptions_by_code["non_taxpayer_mid_level"].available is False


def test_below_first_apron_teams_get_non_taxpayer_mid_level_and_bae() -> None:
    """Over-cap teams below the first apron should keep the larger standard exceptions."""

    rule = _rule(
        "2024-25",
        salary_cap="$140,588,000",
        luxury_tax="$170,814,000",
        first_apron="$178,132,000",
        second_apron="$188,931,000",
    )
    cap_projection = project_team_cap(
        TeamCapProjectionInput(
            team_id=2,
            team_name="Standard Exception Team",
            projection_seasons=("2024-25",),
            cap_rules=(rule,),
            contracts=(),
            team_salary_overrides={"2024-25": 17_500_000_000},
        )
    )

    result = determine_cap_exceptions(
        CapExceptionInput(
            projected_season=cap_projection.season_results[0],
            cba_rule=rule,
            exception_amount_overrides={
                "non_taxpayer_mid_level": 12_822_000_000,
                "bi_annual_exception": 4_681_000_000,
            },
        )
    )
    exceptions_by_code = {exception.code: exception for exception in result.exceptions}

    assert exceptions_by_code["non_taxpayer_mid_level"].available is True
    assert exceptions_by_code["bi_annual_exception"].available is True
    assert exceptions_by_code["taxpayer_mid_level"].available is False


def test_second_apron_teams_lose_their_taxpayer_exception_path() -> None:
    """Second-apron teams should lose the taxpayer MLE and bi-annual exception."""

    rule = _rule(
        "2024-25",
        salary_cap="$140,588,000",
        luxury_tax="$170,814,000",
        first_apron="$178,132,000",
        second_apron="$188,931,000",
    )
    cap_projection = project_team_cap(
        TeamCapProjectionInput(
            team_id=3,
            team_name="Second Apron Team",
            projection_seasons=("2024-25",),
            cap_rules=(rule,),
            contracts=(),
            team_salary_overrides={"2024-25": 19_000_000_000},
        )
    )

    result = determine_cap_exceptions(
        CapExceptionInput(
            projected_season=cap_projection.season_results[0],
            cba_rule=rule,
            exception_amount_overrides={"taxpayer_mid_level": 5_168_000_000},
        )
    )
    exceptions_by_code = {exception.code: exception for exception in result.exceptions}

    assert exceptions_by_code["taxpayer_mid_level"].available is False
    assert exceptions_by_code["bi_annual_exception"].available is False
    assert exceptions_by_code["veteran_minimum"].available is True
