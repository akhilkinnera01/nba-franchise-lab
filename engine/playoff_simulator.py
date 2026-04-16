"""NBA-style playoff series and bracket simulation."""

from __future__ import annotations

from collections import Counter, defaultdict
from math import log2
from typing import TYPE_CHECKING

import numpy as np
from pydantic import BaseModel, ConfigDict, Field, model_validator

from engine.game_probability import GameWinProbabilityInput, calculate_game_win_probability
from engine.simulation_limits import MAX_MONTE_CARLO_ITERATIONS

if TYPE_CHECKING:
    from collections.abc import Iterable

    from numpy.random import Generator

    from engine.team_strength import TeamStrengthResult

SERIES_HOME_PATTERN_BY_LENGTH = {
    1: (True,),
    3: (True, False, True),
    5: (True, True, False, False, True),
    7: (True, True, False, False, True, False, True),
}


class PlayoffTeamInput(BaseModel):
    """One seeded playoff team."""

    model_config = ConfigDict(extra="forbid")

    conference: str = Field(min_length=1)
    seed: int = Field(gt=0)
    team_strength: TeamStrengthResult


class PlayoffSeriesInput(BaseModel):
    """Validated input for one playoff series simulation."""

    model_config = ConfigDict(extra="forbid")

    higher_seed: PlayoffTeamInput
    lower_seed: PlayoffTeamInput
    series_length: int = 7
    iterations: int = Field(default=10_000, gt=0, le=MAX_MONTE_CARLO_ITERATIONS)
    random_seed: int | None = None

    @model_validator(mode="after")
    def validate_series(self) -> PlayoffSeriesInput:
        """Reject malformed series inputs."""

        if self.higher_seed.team_strength.team_id == self.lower_seed.team_strength.team_id:
            raise ValueError("A playoff series requires two different teams.")
        if self.series_length not in SERIES_HOME_PATTERN_BY_LENGTH:
            raise ValueError("series_length must be one of 1, 3, 5, or 7.")
        if self.higher_seed.seed < self.lower_seed.seed:
            return self
        raise ValueError("higher_seed.seed must be numerically better than lower_seed.seed.")


class PlayoffSeriesResult(BaseModel):
    """Aggregate result for one playoff series simulation."""

    model_config = ConfigDict(extra="forbid")

    higher_seed_team_id: int
    lower_seed_team_id: int
    higher_seed_series_win_probability: float
    lower_seed_series_win_probability: float
    expected_games: float
    iterations: int


class PlayoffTeamResult(BaseModel):
    """Aggregate postseason outcome probabilities for one playoff team."""

    model_config = ConfigDict(extra="forbid")

    team_id: int
    team_name: str
    conference: str
    seed: int
    finals_probability: float
    championship_probability: float
    round_advancement_probabilities: dict[str, float] = Field(default_factory=dict)


class PlayoffBracketInput(BaseModel):
    """Validated input for one full playoff bracket simulation."""

    model_config = ConfigDict(extra="forbid")

    teams: tuple[PlayoffTeamInput, ...]
    series_length: int = 7
    iterations: int = Field(default=10_000, gt=0, le=MAX_MONTE_CARLO_ITERATIONS)
    random_seed: int | None = None

    @model_validator(mode="after")
    def validate_bracket(self) -> PlayoffBracketInput:
        """Reject malformed playoff brackets."""

        if not self.teams:
            raise ValueError("At least one playoff team is required.")
        if self.series_length not in SERIES_HOME_PATTERN_BY_LENGTH:
            raise ValueError("series_length must be one of 1, 3, 5, or 7.")

        team_ids: set[int] = set()
        seeds_by_conference: dict[str, set[int]] = defaultdict(set)
        counts_by_conference: Counter[str] = Counter()
        for team in self.teams:
            team_id = team.team_strength.team_id
            if team_id in team_ids:
                raise ValueError("Duplicate team IDs are not allowed in the playoff field.")
            team_ids.add(team_id)
            if team.seed in seeds_by_conference[team.conference]:
                raise ValueError("Duplicate conference seeds are not allowed.")
            seeds_by_conference[team.conference].add(team.seed)
            counts_by_conference[team.conference] += 1

        if len(counts_by_conference) != 2:
            raise ValueError("The bracket simulator expects exactly two conferences.")
        if len(set(counts_by_conference.values())) != 1:
            raise ValueError("Both conferences must contain the same number of playoff teams.")
        conference_size = next(iter(counts_by_conference.values()))
        if conference_size < 2 or conference_size & (conference_size - 1):
            raise ValueError("Conference playoff fields must contain a power-of-two team count.")
        return self


class PlayoffBracketResult(BaseModel):
    """Aggregate output for one full playoff bracket simulation."""

    model_config = ConfigDict(extra="forbid")

    iterations: int
    champion_probabilities: dict[int, float] = Field(default_factory=dict)
    team_results: tuple[PlayoffTeamResult, ...]


def simulate_playoff_series(series: PlayoffSeriesInput) -> PlayoffSeriesResult:
    """Simulate one playoff series repeatedly and summarize the outcomes."""

    rng = np.random.default_rng(series.random_seed)
    higher_seed_wins = 0
    games_played_total = 0
    for _ in range(series.iterations):
        winner, games_played = _simulate_series_once(
            higher_seed=series.higher_seed,
            lower_seed=series.lower_seed,
            series_length=series.series_length,
            rng=rng,
        )
        if winner.team_strength.team_id == series.higher_seed.team_strength.team_id:
            higher_seed_wins += 1
        games_played_total += games_played

    higher_seed_series_win_probability = higher_seed_wins / series.iterations
    return PlayoffSeriesResult(
        higher_seed_team_id=series.higher_seed.team_strength.team_id,
        lower_seed_team_id=series.lower_seed.team_strength.team_id,
        higher_seed_series_win_probability=higher_seed_series_win_probability,
        lower_seed_series_win_probability=1.0 - higher_seed_series_win_probability,
        expected_games=games_played_total / series.iterations,
        iterations=series.iterations,
    )


def simulate_playoff_bracket(bracket: PlayoffBracketInput) -> PlayoffBracketResult:
    """Simulate a two-conference playoff bracket repeatedly."""

    rng = np.random.default_rng(bracket.random_seed)
    teams_by_conference = _teams_by_conference(bracket.teams)
    conference_size = len(next(iter(teams_by_conference.values())))
    conference_round_names = _conference_round_names(conference_size)
    finals_counts: Counter[int] = Counter()
    champion_counts: Counter[int] = Counter()
    round_advancement_counts: dict[int, Counter[str]] = defaultdict(Counter)

    for _ in range(bracket.iterations):
        conference_champions: dict[str, PlayoffTeamInput] = {}
        for conference, teams in teams_by_conference.items():
            current_round = _initial_bracket_order(teams)
            for round_name in conference_round_names:
                next_round: list[PlayoffTeamInput] = []
                for higher_seed, lower_seed in _paired(current_round):
                    winner, _games_played = _simulate_series_once(
                        higher_seed=higher_seed,
                        lower_seed=lower_seed,
                        series_length=bracket.series_length,
                        rng=rng,
                    )
                    round_advancement_counts[winner.team_strength.team_id][round_name] += 1
                    next_round.append(winner)
                current_round = next_round
            conference_champion = current_round[0]
            finals_counts[conference_champion.team_strength.team_id] += 1
            conference_champions[conference] = conference_champion

        finals_pair = tuple(conference_champions.values())
        if len(finals_pair) != 2:
            raise ValueError("Exactly two conference champions are required for the Finals.")
        finals_home_court, finals_road = _finals_home_court_order((finals_pair[0], finals_pair[1]))
        finals_winner, _games_played = _simulate_series_once(
            higher_seed=finals_home_court,
            lower_seed=finals_road,
            series_length=bracket.series_length,
            rng=rng,
        )
        champion_counts[finals_winner.team_strength.team_id] += 1

    team_results = tuple(
        sorted(
            (
                PlayoffTeamResult(
                    team_id=team.team_strength.team_id,
                    team_name=team.team_strength.team_name,
                    conference=team.conference,
                    seed=team.seed,
                    finals_probability=(
                        finals_counts[team.team_strength.team_id] / bracket.iterations
                    ),
                    championship_probability=champion_counts[team.team_strength.team_id]
                    / bracket.iterations,
                    round_advancement_probabilities={
                        round_name: count / bracket.iterations
                        for round_name, count in round_advancement_counts[
                            team.team_strength.team_id
                        ].items()
                    },
                )
                for team in bracket.teams
            ),
            key=lambda result: (result.conference, result.seed),
        )
    )
    champion_probabilities = {
        team_id: count / bracket.iterations for team_id, count in champion_counts.items()
    }
    return PlayoffBracketResult(
        iterations=bracket.iterations,
        champion_probabilities=champion_probabilities,
        team_results=team_results,
    )


def _simulate_series_once(
    *,
    higher_seed: PlayoffTeamInput,
    lower_seed: PlayoffTeamInput,
    series_length: int,
    rng: Generator,
) -> tuple[PlayoffTeamInput, int]:
    """Simulate one playoff series and return the winner plus games played."""

    higher_seed_wins = 0
    lower_seed_wins = 0
    wins_needed = series_length // 2 + 1
    game_count = 0

    for higher_seed_is_home in SERIES_HOME_PATTERN_BY_LENGTH[series_length]:
        higher_seed_win_probability = _higher_seed_game_probability(
            higher_seed=higher_seed,
            lower_seed=lower_seed,
            higher_seed_is_home=higher_seed_is_home,
        )
        if rng.random() < higher_seed_win_probability:
            higher_seed_wins += 1
        else:
            lower_seed_wins += 1
        game_count += 1

        if higher_seed_wins == wins_needed:
            return higher_seed, game_count
        if lower_seed_wins == wins_needed:
            return lower_seed, game_count

    return (
        higher_seed if higher_seed_wins > lower_seed_wins else lower_seed,
        game_count,
    )


def _higher_seed_game_probability(
    *,
    higher_seed: PlayoffTeamInput,
    lower_seed: PlayoffTeamInput,
    higher_seed_is_home: bool,
) -> float:
    """Return the higher seed's win probability for one scheduled series game."""

    if higher_seed_is_home:
        result = calculate_game_win_probability(
            GameWinProbabilityInput(
                home_team=higher_seed.team_strength,
                away_team=lower_seed.team_strength,
            )
        )
        return result.home_team_win_probability

    result = calculate_game_win_probability(
        GameWinProbabilityInput(
            home_team=lower_seed.team_strength,
            away_team=higher_seed.team_strength,
        )
    )
    return result.away_team_win_probability


def _teams_by_conference(
    teams: tuple[PlayoffTeamInput, ...],
) -> dict[str, tuple[PlayoffTeamInput, ...]]:
    """Group playoff teams by conference."""

    grouped_teams: dict[str, list[PlayoffTeamInput]] = defaultdict(list)
    for team in teams:
        grouped_teams[team.conference].append(team)
    return {
        conference: tuple(sorted(conference_teams, key=lambda team: team.seed))
        for conference, conference_teams in grouped_teams.items()
    }


def _conference_round_names(conference_size: int) -> tuple[str, ...]:
    """Return stage labels for one conference playoff field size."""

    round_count = int(log2(conference_size))
    if round_count == 1:
        return ("conference_finals",)
    if round_count == 2:
        return ("conference_semifinals", "conference_finals")
    if round_count == 3:
        return ("conference_first_round", "conference_semifinals", "conference_finals")
    return tuple(f"conference_round_{index}" for index in range(1, round_count + 1))


def _initial_bracket_order(
    teams: tuple[PlayoffTeamInput, ...],
) -> list[PlayoffTeamInput]:
    """Return one fixed-order bracket list for the first conference round."""

    seed_to_team = {team.seed: team for team in teams}
    seeding_orders = {
        2: (1, 2),
        4: (1, 4, 2, 3),
        8: (1, 8, 4, 5, 3, 6, 2, 7),
    }
    seed_order = seeding_orders.get(
        len(teams),
        tuple(
            seed
            for pair in zip(
                range(1, len(teams) // 2 + 1),
                range(len(teams), len(teams) // 2, -1),
                strict=True,
            )
            for seed in pair
        ),
    )
    return [seed_to_team[seed] for seed in seed_order]


def _paired(
    teams: Iterable[PlayoffTeamInput],
) -> tuple[tuple[PlayoffTeamInput, PlayoffTeamInput], ...]:
    """Pair one ordered list of teams into adjacent series matchups."""

    team_list = list(teams)
    return tuple((team_list[index], team_list[index + 1]) for index in range(0, len(team_list), 2))


def _finals_home_court_order(
    conference_champions: tuple[PlayoffTeamInput, PlayoffTeamInput],
) -> tuple[PlayoffTeamInput, PlayoffTeamInput]:
    """Return the finals team with home-court advantage first.

    The project does not yet carry full regular-season record context into the
    bracket input, so finals home court is approximated by stronger projected
    neutral-court net rating and then by better seed as a deterministic tiebreak.
    """

    ordered_champions = sorted(
        conference_champions,
        key=lambda team: (
            -team.team_strength.neutral_court_net_rating,
            team.seed,
            team.team_strength.team_id,
        ),
    )
    return ordered_champions[0], ordered_champions[1]


def _rebuild_playoff_simulator_models() -> None:
    """Resolve forward references for typed playoff-simulation models."""

    from engine.team_strength import TeamStrengthResult

    PlayoffTeamInput.model_rebuild(_types_namespace={"TeamStrengthResult": TeamStrengthResult})


_rebuild_playoff_simulator_models()
