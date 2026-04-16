"""Tests for calibration recommendations derived from backtests."""

from __future__ import annotations

from engine.backtesting import SeasonBacktestInput, TeamBacktestPoint, backtest_completed_season
from engine.calibration import CalibrationInput, calibrate_from_backtests
from pytest import approx


def test_calibrate_from_backtests_recommends_bias_and_probability_scaling() -> None:
    """Calibration should turn backtest residuals into simple tuning recommendations."""

    backtests = (
        backtest_completed_season(
            SeasonBacktestInput(
                season="2023-24",
                team_points=(
                    TeamBacktestPoint(
                        team_id=1,
                        team_name="Team A",
                        projected_wins=45.0,
                        actual_wins=48,
                        projected_playoff_probability=0.75,
                        actual_playoff_appearance=True,
                        projected_championship_probability=0.12,
                        actual_champion=False,
                    ),
                    TeamBacktestPoint(
                        team_id=2,
                        team_name="Team B",
                        projected_wins=37.0,
                        actual_wins=34,
                        projected_playoff_probability=0.35,
                        actual_playoff_appearance=False,
                        projected_championship_probability=0.03,
                        actual_champion=False,
                    ),
                ),
            )
        ),
    )

    result = calibrate_from_backtests(CalibrationInput(backtests=backtests))

    assert result.wins_bias_correction == approx(0.0)
    assert result.playoff_probability_scale == approx(1 / 1.1)
    assert result.championship_probability_scale == 0.0
