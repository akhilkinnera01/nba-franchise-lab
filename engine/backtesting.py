"""Completed-season backtesting metrics for the Phase 2 engine."""

from __future__ import annotations

from math import sqrt

from pydantic import BaseModel, ConfigDict, Field, model_validator


class TeamBacktestPoint(BaseModel):
    """One projected-versus-actual team outcome used for backtesting."""

    model_config = ConfigDict(extra="forbid")

    team_id: int
    team_name: str = Field(min_length=1)
    projected_wins: float
    actual_wins: int = Field(ge=0)
    projected_playoff_probability: float = Field(ge=0, le=1)
    actual_playoff_appearance: bool
    projected_championship_probability: float = Field(ge=0, le=1)
    actual_champion: bool


class TeamBacktestResult(BaseModel):
    """Per-team residuals emitted by completed-season backtesting."""

    model_config = ConfigDict(extra="forbid")

    team_id: int
    team_name: str
    projected_wins: float
    actual_wins: int
    win_error: float
    absolute_win_error: float
    projected_playoff_probability: float
    actual_playoff_appearance: bool
    playoff_brier_component: float
    projected_championship_probability: float
    actual_champion: bool
    championship_brier_component: float


class SeasonBacktestInput(BaseModel):
    """Validated input for one completed-season backtest."""

    model_config = ConfigDict(extra="forbid")

    season: str
    team_points: tuple[TeamBacktestPoint, ...]

    @model_validator(mode="after")
    def validate_points(self) -> SeasonBacktestInput:
        """Require at least one projected team point."""

        if not self.team_points:
            raise ValueError("At least one team backtest point is required.")
        return self


class SeasonBacktestResult(BaseModel):
    """Season-level summary of backtest error metrics."""

    model_config = ConfigDict(extra="forbid")

    season: str
    mean_absolute_win_error: float
    root_mean_square_win_error: float
    playoff_brier_score: float
    championship_brier_score: float
    team_results: tuple[TeamBacktestResult, ...]


class BacktestSummary(BaseModel):
    """Aggregate summary across multiple completed-season backtests."""

    model_config = ConfigDict(extra="forbid")

    seasons_evaluated: int
    mean_absolute_win_error: float
    root_mean_square_win_error: float
    playoff_brier_score: float
    championship_brier_score: float


def backtest_completed_season(season: SeasonBacktestInput) -> SeasonBacktestResult:
    """Compute standard backtesting metrics for one completed season."""

    team_results = tuple(
        TeamBacktestResult(
            team_id=team_point.team_id,
            team_name=team_point.team_name,
            projected_wins=team_point.projected_wins,
            actual_wins=team_point.actual_wins,
            win_error=team_point.actual_wins - team_point.projected_wins,
            absolute_win_error=abs(team_point.actual_wins - team_point.projected_wins),
            projected_playoff_probability=team_point.projected_playoff_probability,
            actual_playoff_appearance=team_point.actual_playoff_appearance,
            playoff_brier_component=(
                (
                    float(team_point.actual_playoff_appearance)
                    - team_point.projected_playoff_probability
                )
                ** 2
            ),
            projected_championship_probability=team_point.projected_championship_probability,
            actual_champion=team_point.actual_champion,
            championship_brier_component=(
                (float(team_point.actual_champion) - team_point.projected_championship_probability)
                ** 2
            ),
        )
        for team_point in season.team_points
    )
    mean_absolute_win_error = sum(
        team_result.absolute_win_error for team_result in team_results
    ) / len(team_results)
    root_mean_square_win_error = sqrt(
        sum(team_result.win_error**2 for team_result in team_results) / len(team_results)
    )
    playoff_brier_score = sum(
        team_result.playoff_brier_component for team_result in team_results
    ) / len(team_results)
    championship_brier_score = sum(
        team_result.championship_brier_component for team_result in team_results
    ) / len(team_results)

    return SeasonBacktestResult(
        season=season.season,
        mean_absolute_win_error=mean_absolute_win_error,
        root_mean_square_win_error=root_mean_square_win_error,
        playoff_brier_score=playoff_brier_score,
        championship_brier_score=championship_brier_score,
        team_results=team_results,
    )


def summarize_backtests(
    backtests: tuple[SeasonBacktestResult, ...] | list[SeasonBacktestResult],
) -> BacktestSummary:
    """Aggregate season-level backtest metrics into one cross-season summary."""

    if not backtests:
        raise ValueError("At least one season backtest is required for summary metrics.")

    return BacktestSummary(
        seasons_evaluated=len(backtests),
        mean_absolute_win_error=sum(backtest.mean_absolute_win_error for backtest in backtests)
        / len(backtests),
        root_mean_square_win_error=sum(
            backtest.root_mean_square_win_error for backtest in backtests
        )
        / len(backtests),
        playoff_brier_score=sum(backtest.playoff_brier_score for backtest in backtests)
        / len(backtests),
        championship_brier_score=sum(backtest.championship_brier_score for backtest in backtests)
        / len(backtests),
    )
