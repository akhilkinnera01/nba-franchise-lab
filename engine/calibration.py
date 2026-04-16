"""Simple model-calibration recommendations derived from backtests."""

from __future__ import annotations

from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict, Field, model_validator

if TYPE_CHECKING:
    from engine.backtesting import SeasonBacktestResult


class CalibrationInput(BaseModel):
    """Validated input for backtest-driven calibration recommendations."""

    model_config = ConfigDict(extra="forbid")

    backtests: tuple[SeasonBacktestResult, ...]

    @model_validator(mode="after")
    def validate_backtests(self) -> CalibrationInput:
        """Require at least one backtest report."""

        if not self.backtests:
            raise ValueError("At least one backtest report is required.")
        return self


class CalibrationResult(BaseModel):
    """Recommended bias and probability adjustments from backtesting."""

    model_config = ConfigDict(extra="forbid")

    wins_bias_correction: float
    playoff_probability_scale: float
    championship_probability_scale: float
    note: str = Field(min_length=1)


def calibrate_from_backtests(calibration: CalibrationInput) -> CalibrationResult:
    """Turn completed-season backtests into simple tuning recommendations."""

    team_results = tuple(
        team_result for backtest in calibration.backtests for team_result in backtest.team_results
    )
    wins_bias_correction = sum(team_result.win_error for team_result in team_results) / len(
        team_results
    )
    playoff_probability_scale = _probability_scale(
        actual_total=sum(
            1.0 if team_result.actual_playoff_appearance else 0.0 for team_result in team_results
        ),
        projected_total=sum(
            team_result.projected_playoff_probability for team_result in team_results
        ),
    )
    championship_probability_scale = _probability_scale(
        actual_total=sum(
            1.0 if team_result.actual_champion else 0.0 for team_result in team_results
        ),
        projected_total=sum(
            team_result.projected_championship_probability for team_result in team_results
        ),
    )

    return CalibrationResult(
        wins_bias_correction=wins_bias_correction,
        playoff_probability_scale=playoff_probability_scale,
        championship_probability_scale=championship_probability_scale,
        note=(
            "Positive wins_bias_correction means the model systematically "
            "under-projected wins; probability scales above 1.0 mean the model "
            "was too conservative."
        ),
    )


def _probability_scale(*, actual_total: float, projected_total: float) -> float:
    """Return a stable probability scale factor from realized and projected totals."""

    if projected_total <= 0:
        return 0.0 if actual_total == 0 else 1.0
    return actual_total / projected_total


def _rebuild_calibration_models() -> None:
    """Resolve forward references for typed calibration models."""

    from engine.backtesting import SeasonBacktestResult

    CalibrationInput.model_rebuild(_types_namespace={"SeasonBacktestResult": SeasonBacktestResult})


_rebuild_calibration_models()
