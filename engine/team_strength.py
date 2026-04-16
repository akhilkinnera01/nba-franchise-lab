"""Team-strength projection from projected player contributions."""

from __future__ import annotations

from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict, Field, FiniteFloat, model_validator

if TYPE_CHECKING:
    from engine.player_projection import PlayerProjectionResult

DEFAULT_HOME_COURT_ADJUSTMENT = 3.0
MAX_ROTATION_MINUTES_SHARE = 1.0
ROTATION_MINUTES_SHARE_TOLERANCE = 0.05


class TeamStrengthInput(BaseModel):
    """Validated input for one team-strength projection."""

    model_config = ConfigDict(extra="forbid")

    team_id: int
    team_name: str = Field(min_length=1)
    player_projections: tuple[PlayerProjectionResult, ...]
    league_average_net_rating: FiniteFloat = 0.0
    home_court_adjustment: FiniteFloat = DEFAULT_HOME_COURT_ADJUSTMENT

    @model_validator(mode="after")
    def validate_rotation(self) -> TeamStrengthInput:
        """Reject empty or impossible rotation inputs."""

        if not self.player_projections:
            raise ValueError("At least one player projection is required.")
        total_minutes_share = sum(
            projection.projected_minutes_share or 0.0 for projection in self.player_projections
        )
        if total_minutes_share > MAX_ROTATION_MINUTES_SHARE + ROTATION_MINUTES_SHARE_TOLERANCE:
            raise ValueError("Projected minutes shares exceed a full team rotation.")
        return self


class TeamStrengthResult(BaseModel):
    """One team-strength projection ready for game and season simulation."""

    model_config = ConfigDict(extra="forbid")

    team_id: int
    team_name: str
    player_contribution_sum: float
    neutral_court_net_rating: float
    home_court_net_rating: float
    total_minutes_share: float
    players_considered: int


def project_team_strength(team: TeamStrengthInput) -> TeamStrengthResult:
    """Aggregate projected player contributions into team-level strength."""

    player_contribution_sum = sum(
        projection.projected_weighted_box_plus_minus or 0.0
        for projection in team.player_projections
    )
    total_minutes_share = sum(
        projection.projected_minutes_share or 0.0 for projection in team.player_projections
    )
    neutral_court_net_rating = team.league_average_net_rating + player_contribution_sum
    home_court_net_rating = neutral_court_net_rating + team.home_court_adjustment

    return TeamStrengthResult(
        team_id=team.team_id,
        team_name=team.team_name,
        player_contribution_sum=player_contribution_sum,
        neutral_court_net_rating=neutral_court_net_rating,
        home_court_net_rating=home_court_net_rating,
        total_minutes_share=total_minutes_share,
        players_considered=len(team.player_projections),
    )


def _rebuild_team_strength_models() -> None:
    """Resolve forward references for typed Pydantic team-strength models."""

    from engine.player_projection import PlayerProjectionResult

    TeamStrengthInput.model_rebuild(
        _types_namespace={"PlayerProjectionResult": PlayerProjectionResult}
    )


_rebuild_team_strength_models()
