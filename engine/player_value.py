"""BPM-based player value helpers for the simulation engine.

The project plan anchors player value to Box Plus/Minus (BPM), a public per-100
possessions impact estimate. This module keeps the first engine layer
intentionally small: it validates one player's BPM input, converts workload
into a team minutes share, and exposes the weighted BPM term later team-level
projections will sum into projected net rating.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, FiniteFloat, model_validator

REGULAR_SEASON_GAMES = 82
TEAM_MINUTES_PER_GAME = 48 * 5
REGULAR_SEASON_TEAM_MINUTES = float(REGULAR_SEASON_GAMES * TEAM_MINUTES_PER_GAME)


class PlayerValueInput(BaseModel):
    """Validated input for one BPM-based player value estimate.

    Args:
        player_id: Canonical player identifier used throughout the project.
        player_name: Human-readable player name for reports and debugging.
        box_plus_minus: Observed BPM, expressed as points per 100 possessions
            relative to league average.
        minutes_played: Optional season workload used to derive one share of a
            team's available minutes.
        minutes_share: Optional precomputed workload share for callers that
            already normalized the player's minutes into a team share.
        team_minutes_available: Total team minutes used when converting played
            minutes into a share. Defaults to one 82-game regular season.

    Assumptions:
        - BPM is already sourced from a trusted upstream dataset.
        - Callers may provide either `minutes_played` or `minutes_share`, but
          not both, to avoid silent disagreement about workload.
    """

    model_config = ConfigDict(extra="forbid")

    player_id: str = Field(min_length=1)
    player_name: str = Field(min_length=1)
    box_plus_minus: FiniteFloat
    minutes_played: FiniteFloat | None = None
    minutes_share: FiniteFloat | None = None
    team_minutes_available: FiniteFloat = REGULAR_SEASON_TEAM_MINUTES

    @model_validator(mode="after")
    def validate_workload_fields(self) -> PlayerValueInput:
        """Reject conflicting or impossible workload inputs."""

        if self.team_minutes_available <= 0:
            raise ValueError("team_minutes_available must be positive.")
        if self.minutes_played is not None:
            if self.minutes_played < 0:
                raise ValueError("minutes_played cannot be negative.")
            if self.minutes_played > self.team_minutes_available:
                raise ValueError(
                    "minutes_played cannot exceed the available team minutes for the period."
                )
        if self.minutes_share is not None and not 0 <= self.minutes_share <= 1:
            raise ValueError("minutes_share must fall between 0 and 1.")
        if self.minutes_played is not None and self.minutes_share is not None:
            raise ValueError("Provide either minutes_played or minutes_share, not both.")
        return self


class PlayerValueResult(BaseModel):
    """One evaluated BPM-based player value estimate.

    The weighted BPM term implements the Phase 2 team-strength building block:

    `weighted_box_plus_minus = box_plus_minus * minutes_share`
    """

    model_config = ConfigDict(extra="forbid")

    player_id: str
    player_name: str
    box_plus_minus: float
    minutes_share: float | None = None
    weighted_box_plus_minus: float | None = None


def minutes_share_from_minutes_played(
    minutes_played: float,
    *,
    team_minutes_available: float = REGULAR_SEASON_TEAM_MINUTES,
) -> float:
    """Convert played minutes into one share of a team's available minutes.

    Args:
        minutes_played: Player workload in minutes over the modeled period.
        team_minutes_available: Total team minutes available in the same period.

    Returns:
        The fraction of team minutes the player occupied.

    Raises:
        ValueError: If the workload or team-minute denominator is invalid.
    """

    if team_minutes_available <= 0:
        raise ValueError("team_minutes_available must be positive.")
    if minutes_played < 0:
        raise ValueError("minutes_played cannot be negative.")
    if minutes_played > team_minutes_available:
        raise ValueError("minutes_played cannot exceed team_minutes_available.")
    return minutes_played / team_minutes_available


def evaluate_player_value(player: PlayerValueInput) -> PlayerValueResult:
    """Evaluate one player's BPM-based value for downstream simulations.

    This function intentionally does not project age or injury effects. Those
    adjustments land in later tasks and will layer on top of the validated BPM
    baseline returned here.
    """

    minutes_share = player.minutes_share
    if minutes_share is None and player.minutes_played is not None:
        minutes_share = minutes_share_from_minutes_played(
            player.minutes_played,
            team_minutes_available=player.team_minutes_available,
        )

    weighted_box_plus_minus = (
        None if minutes_share is None else player.box_plus_minus * minutes_share
    )
    return PlayerValueResult(
        player_id=player.player_id,
        player_name=player.player_name,
        box_plus_minus=float(player.box_plus_minus),
        minutes_share=minutes_share,
        weighted_box_plus_minus=weighted_box_plus_minus,
    )
