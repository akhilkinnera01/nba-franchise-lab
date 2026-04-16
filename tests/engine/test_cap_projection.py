"""Tests for multi-season cap projection."""

from __future__ import annotations

from engine.cap_projection import (
    CapHoldInput,
    ContractProjectionInput,
    TeamCapProjectionInput,
    project_team_cap,
)
from engine.cba_rules import CapThresholdsInput, CbaRuleSet, load_cap_rule_for_season
from pytest import approx, raises


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


def test_project_team_cap_sums_committed_salary_and_cap_holds_across_years() -> None:
    """Cap projection should combine contract salary with explicit cap holds by season."""

    projection = project_team_cap(
        TeamCapProjectionInput(
            team_id=1610612738,
            team_name="Boston Celtics",
            projection_seasons=("2024-25", "2025-26"),
            cap_rules=(
                _rule(
                    "2024-25",
                    salary_cap="$140,588,000",
                    luxury_tax="$170,814,000",
                    first_apron="$178,132,000",
                    second_apron="$188,931,000",
                ),
                _rule(
                    "2025-26",
                    salary_cap="$154,647,000",
                    luxury_tax="$187,895,000",
                    first_apron="$195,945,000",
                    second_apron="$207,824,000",
                ),
            ),
            contracts=(
                ContractProjectionInput(
                    player_id="p1",
                    player_name="Core Player",
                    annual_salary_cents={
                        "2024-25": 3_500_000_000,
                        "2025-26": 3_700_000_000,
                    },
                ),
                ContractProjectionInput(
                    player_id="p2",
                    player_name="Expiring Player",
                    annual_salary_cents={"2024-25": 1_200_000_000},
                ),
            ),
            cap_holds=(
                CapHoldInput(
                    player_id="p2",
                    player_name="Expiring Player",
                    season="2025-26",
                    cap_hold_cents=1_500_000_000,
                ),
            ),
        )
    )

    first_year, second_year = projection.season_results

    assert first_year.committed_salary_cents == 4_700_000_000
    assert first_year.cap_hold_cents == 0
    assert second_year.committed_salary_cents == 3_700_000_000
    assert second_year.cap_hold_cents == 1_500_000_000
    assert second_year.total_team_salary_cents == 5_200_000_000


def test_project_team_cap_reports_room_and_expiring_contracts() -> None:
    """Each season result should expose cap room and expiring salary context."""

    projection = project_team_cap(
        TeamCapProjectionInput(
            team_id=1610612748,
            team_name="Miami Heat",
            projection_seasons=("2024-25",),
            cap_rules=(
                _rule(
                    "2024-25",
                    salary_cap="$140,588,000",
                    luxury_tax="$170,814,000",
                    first_apron="$178,132,000",
                    second_apron="$188,931,000",
                ),
            ),
            contracts=(
                ContractProjectionInput(
                    player_id="p1",
                    player_name="Veteran Wing",
                    annual_salary_cents={"2024-25": 2_500_000_000},
                ),
                ContractProjectionInput(
                    player_id="p2",
                    player_name="Long-Term Guard",
                    annual_salary_cents={
                        "2024-25": 3_000_000_000,
                        "2025-26": 3_200_000_000,
                    },
                ),
            ),
        )
    )

    season_result = projection.season_results[0]

    assert season_result.cap_room_cents == 8_558_800_000
    assert season_result.tax_room_cents == 11_581_400_000
    assert season_result.standard_contract_count == 2
    assert season_result.expiring_player_ids == ("p1",)
    assert season_result.expiring_salary_cents == approx(2_500_000_000)


def test_project_team_cap_rejects_overrides_that_conflict_with_contract_detail() -> None:
    """Aggregate salary overrides should not coexist with per-contract season detail."""

    with raises(ValueError):
        TeamCapProjectionInput(
            team_id=1610612748,
            team_name="Miami Heat",
            projection_seasons=("2024-25",),
            cap_rules=(
                _rule(
                    "2024-25",
                    salary_cap="$140,588,000",
                    luxury_tax="$170,814,000",
                    first_apron="$178,132,000",
                    second_apron="$188,931,000",
                ),
            ),
            contracts=(
                ContractProjectionInput(
                    player_id="p1",
                    player_name="Veteran Wing",
                    annual_salary_cents={"2024-25": 2_500_000_000},
                ),
            ),
            team_salary_overrides={"2024-25": 17_500_000_000},
        )
