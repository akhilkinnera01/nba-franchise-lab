"""Monte Carlo regular-season simulation from projected team strengths."""

from __future__ import annotations

from collections import defaultdict
from typing import TYPE_CHECKING

import numpy as np
from pydantic import BaseModel, ConfigDict, Field, model_validator

from engine.game_probability import GameWinProbabilityInput, calculate_game_win_probability
from engine.simulation_limits import MAX_MONTE_CARLO_ITERATIONS

if TYPE_CHECKING:
    from engine.team_strength import TeamStrengthResult


class ScheduledGameInput(BaseModel):
    """One scheduled regular-season matchup."""

    model_config = ConfigDict(extra="forbid")

    home_team_id: int
    away_team_id: int
    home_team_win_probability_override: float | None = Field(default=None, ge=0, le=1)

    @model_validator(mode="after")
    def validate_matchup(self) -> ScheduledGameInput:
        """Reject self-play and other invalid matchups."""

        if self.home_team_id == self.away_team_id:
            raise ValueError("Scheduled games require two different teams.")
        return self


class SeasonTeamInput(BaseModel):
    """One team entering a season simulation."""

    model_config = ConfigDict(extra="forbid")

    conference: str = Field(min_length=1)
    team_strength: TeamStrengthResult


class SeasonSimulationInput(BaseModel):
    """Validated input for one regular-season Monte Carlo run."""

    model_config = ConfigDict(extra="forbid")

    teams: tuple[SeasonTeamInput, ...]
    schedule: tuple[ScheduledGameInput, ...]
    iterations: int = Field(default=10_000, gt=0, le=MAX_MONTE_CARLO_ITERATIONS)
    playoff_spots_per_conference: int = Field(default=8, gt=0)
    random_seed: int | None = None

    @model_validator(mode="after")
    def validate_simulation_inputs(self) -> SeasonSimulationInput:
        """Reject empty, inconsistent, or unresolvable season inputs."""

        if not self.teams:
            raise ValueError("At least one simulated team is required.")
        if not self.schedule:
            raise ValueError("At least one scheduled game is required.")

        seen_team_ids: set[int] = set()
        for team in self.teams:
            team_id = team.team_strength.team_id
            if team_id in seen_team_ids:
                raise ValueError("Duplicate team IDs are not allowed in season inputs.")
            seen_team_ids.add(team_id)

        for scheduled_game in self.schedule:
            if scheduled_game.home_team_id not in seen_team_ids:
                raise ValueError("Every scheduled home team must exist in the team list.")
            if scheduled_game.away_team_id not in seen_team_ids:
                raise ValueError("Every scheduled away team must exist in the team list.")
        return self


class TeamSeasonSimulationResult(BaseModel):
    """One team's aggregate regular-season simulation output."""

    model_config = ConfigDict(extra="forbid")

    team_id: int
    team_name: str
    conference: str
    expected_wins: float
    win_standard_deviation: float
    playoff_probability: float
    average_seed: float
    seed_probabilities: dict[int, float] = Field(default_factory=dict)


class SeasonSimulationResult(BaseModel):
    """Aggregate regular-season simulation output across all teams."""

    model_config = ConfigDict(extra="forbid")

    iterations: int
    total_games_per_iteration: int
    team_results: tuple[TeamSeasonSimulationResult, ...]


def simulate_season(season: SeasonSimulationInput) -> SeasonSimulationResult:
    """Run one Monte Carlo regular-season simulation over an explicit schedule."""

    team_index_by_id = {
        team.team_strength.team_id: index for index, team in enumerate(season.teams)
    }
    home_probability_by_game = np.array(
        [
            scheduled_game.home_team_win_probability_override
            if scheduled_game.home_team_win_probability_override is not None
            else calculate_game_win_probability(
                GameWinProbabilityInput(
                    home_team=season.teams[
                        team_index_by_id[scheduled_game.home_team_id]
                    ].team_strength,
                    away_team=season.teams[
                        team_index_by_id[scheduled_game.away_team_id]
                    ].team_strength,
                )
            ).home_team_win_probability
            for scheduled_game in season.schedule
        ],
        dtype=float,
    )
    rng = np.random.default_rng(season.random_seed)
    home_wins = rng.random((season.iterations, len(season.schedule))) < home_probability_by_game

    home_assignment = np.zeros((len(season.schedule), len(season.teams)), dtype=int)
    away_assignment = np.zeros((len(season.schedule), len(season.teams)), dtype=int)
    for game_index, scheduled_game in enumerate(season.schedule):
        home_assignment[game_index, team_index_by_id[scheduled_game.home_team_id]] = 1
        away_assignment[game_index, team_index_by_id[scheduled_game.away_team_id]] = 1

    home_win_counts = home_wins.astype(int) @ home_assignment
    away_win_counts = (~home_wins).astype(int) @ away_assignment
    win_matrix = home_win_counts + away_win_counts

    seed_counts_by_team_index = np.zeros((len(season.teams), len(season.teams)), dtype=int)
    playoff_counts_by_team_index = np.zeros(len(season.teams), dtype=int)
    conference_team_indices = _conference_team_indices(season.teams)

    for iteration_index in range(season.iterations):
        for team_indices in conference_team_indices.values():
            ordered_team_indices = sorted(
                team_indices,
                key=lambda team_index: (
                    -win_matrix[iteration_index, team_index],
                    season.teams[team_index].team_strength.team_id,
                ),
            )
            for seed_index, team_index in enumerate(ordered_team_indices, start=1):
                seed_counts_by_team_index[team_index, seed_index - 1] += 1
                max_playoff_spots = min(
                    season.playoff_spots_per_conference,
                    len(ordered_team_indices),
                )
                if seed_index <= max_playoff_spots:
                    playoff_counts_by_team_index[team_index] += 1

    team_results = tuple(
        sorted(
            (
                TeamSeasonSimulationResult(
                    team_id=team.team_strength.team_id,
                    team_name=team.team_strength.team_name,
                    conference=team.conference,
                    expected_wins=float(win_matrix[:, team_index].mean()),
                    win_standard_deviation=float(win_matrix[:, team_index].std()),
                    playoff_probability=playoff_counts_by_team_index[team_index]
                    / season.iterations,
                    average_seed=_average_seed(seed_counts_by_team_index[team_index]),
                    seed_probabilities={
                        seed: count / season.iterations
                        for seed, count in enumerate(
                            seed_counts_by_team_index[team_index],
                            start=1,
                        )
                        if count
                    },
                )
                for team_index, team in enumerate(season.teams)
            ),
            key=lambda result: (result.conference, -result.expected_wins, result.team_name),
        )
    )
    return SeasonSimulationResult(
        iterations=season.iterations,
        total_games_per_iteration=len(season.schedule),
        team_results=team_results,
    )


def _conference_team_indices(
    teams: tuple[SeasonTeamInput, ...],
) -> dict[str, list[int]]:
    """Group season-team indices by conference."""

    grouped_indices: dict[str, list[int]] = defaultdict(list)
    for index, team in enumerate(teams):
        grouped_indices[team.conference].append(index)
    return grouped_indices


def _average_seed(seed_counts: np.ndarray) -> float:
    """Return the weighted mean seed from one seed-count vector."""

    total_simulations = int(seed_counts.sum())
    if total_simulations == 0:
        return 0.0
    return float(
        sum(seed * count for seed, count in enumerate(seed_counts, start=1)) / total_simulations
    )


def _rebuild_season_simulator_models() -> None:
    """Resolve forward references for typed season-simulation models."""

    from engine.team_strength import TeamStrengthResult

    SeasonTeamInput.model_rebuild(_types_namespace={"TeamStrengthResult": TeamStrengthResult})


_rebuild_season_simulator_models()
