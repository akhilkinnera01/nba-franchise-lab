"""Tests for completed-season backtesting metrics."""

from __future__ import annotations

from engine.backtesting import (
    SeasonBacktestInput,
    TeamBacktestPoint,
    backtest_completed_season,
    summarize_backtests,
)
from pytest import approx


def test_backtest_completed_season_computes_win_and_probability_metrics() -> None:
    """Season backtesting should produce standard error metrics from projected outcomes."""

    result = backtest_completed_season(
        SeasonBacktestInput(
            season="2024-25",
            team_points=(
                TeamBacktestPoint(
                    team_id=1,
                    team_name="Team A",
                    projected_wins=48.0,
                    actual_wins=50,
                    projected_playoff_probability=0.82,
                    actual_playoff_appearance=True,
                    projected_championship_probability=0.15,
                    actual_champion=False,
                ),
                TeamBacktestPoint(
                    team_id=2,
                    team_name="Team B",
                    projected_wins=36.0,
                    actual_wins=33,
                    projected_playoff_probability=0.28,
                    actual_playoff_appearance=False,
                    projected_championship_probability=0.02,
                    actual_champion=False,
                ),
            ),
        )
    )

    assert result.mean_absolute_win_error == approx(2.5)
    assert result.root_mean_square_win_error == approx((6.5) ** 0.5)
    assert result.playoff_brier_score == approx(((1 - 0.82) ** 2 + (0 - 0.28) ** 2) / 2)


def test_summarize_backtests_aggregates_multiple_seasons() -> None:
    """Backtest summaries should average metrics across completed-season reports."""

    summary = summarize_backtests(
        (
            backtest_completed_season(
                SeasonBacktestInput(
                    season="2023-24",
                    team_points=(
                        TeamBacktestPoint(
                            team_id=1,
                            team_name="Team A",
                            projected_wins=45.0,
                            actual_wins=47,
                            projected_playoff_probability=0.7,
                            actual_playoff_appearance=True,
                            projected_championship_probability=0.1,
                            actual_champion=False,
                        ),
                    ),
                )
            ),
            backtest_completed_season(
                SeasonBacktestInput(
                    season="2024-25",
                    team_points=(
                        TeamBacktestPoint(
                            team_id=2,
                            team_name="Team B",
                            projected_wins=39.0,
                            actual_wins=35,
                            projected_playoff_probability=0.4,
                            actual_playoff_appearance=False,
                            projected_championship_probability=0.03,
                            actual_champion=False,
                        ),
                    ),
                )
            ),
        )
    )

    assert summary.seasons_evaluated == 2
    assert summary.mean_absolute_win_error == approx(3.0)
