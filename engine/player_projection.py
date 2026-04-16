"""Player projection helpers that compose value, aging, and injury signals."""

from __future__ import annotations

from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict, Field, FiniteFloat, model_validator

if TYPE_CHECKING:
    from engine.age_curves import AgeCurvePoint
    from engine.injury_risk import InjuryRiskResult
    from engine.player_value import PlayerValueResult


class PlayerProjectionInput(BaseModel):
    """Validated input for one player projection.

    Args:
        player_value: The current BPM baseline for the player.
        age_curve: Optional age-based BPM delta for the player's current bucket.
        injury_risk: Optional availability-driven risk estimate.
        injury_penalty_scale: Multiplier applied to the injury risk score when
            translating availability risk into a BPM penalty.
    """

    model_config = ConfigDict(extra="forbid")

    player_value: PlayerValueResult
    age_curve: AgeCurvePoint | None = None
    injury_risk: InjuryRiskResult | None = None
    injury_penalty_scale: FiniteFloat = Field(default=1.0, ge=0)

    @model_validator(mode="after")
    def validate_player_alignment(self) -> PlayerProjectionInput:
        """Reject mismatched player-level inputs."""

        if (
            self.injury_risk is not None
            and self.injury_risk.player_id != self.player_value.player_id
        ):
            raise ValueError("injury_risk.player_id must match player_value.player_id.")
        return self


class PlayerProjectionResult(BaseModel):
    """One projected player outcome ready for downstream team simulation."""

    model_config = ConfigDict(extra="forbid")

    player_id: str
    player_name: str
    baseline_box_plus_minus: float
    age_adjustment: float
    injury_adjustment: float
    projected_box_plus_minus: float
    projected_minutes_share: float | None = None
    projected_weighted_box_plus_minus: float | None = None
    projected_games_played: float | None = None


def project_player(player: PlayerProjectionInput) -> PlayerProjectionResult:
    """Project one player's BPM after age and injury adjustments.

    Formula:
    - `projected_bpm = current_bpm + age_curve_delta - injury_penalty_scale * injury_risk_score`
    - If a minutes share exists, projected minutes share is scaled by weighted
      availability from the injury-risk model.
    - Weighted projected BPM is the product of projected BPM and projected
      minutes share when both values are available.
    """

    age_adjustment = 0.0 if player.age_curve is None else player.age_curve.expected_bpm_delta
    injury_adjustment = (
        0.0
        if player.injury_risk is None
        else -player.injury_penalty_scale * player.injury_risk.injury_risk_score
    )
    projected_box_plus_minus = (
        player.player_value.box_plus_minus + age_adjustment + injury_adjustment
    )

    projected_minutes_share = player.player_value.minutes_share
    projected_games_played = None
    if player.injury_risk is not None:
        projected_games_played = player.injury_risk.projected_games_played
        if projected_minutes_share is not None:
            projected_minutes_share *= player.injury_risk.weighted_availability

    projected_weighted_box_plus_minus = (
        None
        if projected_minutes_share is None
        else projected_box_plus_minus * projected_minutes_share
    )

    return PlayerProjectionResult(
        player_id=player.player_value.player_id,
        player_name=player.player_value.player_name,
        baseline_box_plus_minus=player.player_value.box_plus_minus,
        age_adjustment=age_adjustment,
        injury_adjustment=injury_adjustment,
        projected_box_plus_minus=projected_box_plus_minus,
        projected_minutes_share=projected_minutes_share,
        projected_weighted_box_plus_minus=projected_weighted_box_plus_minus,
        projected_games_played=projected_games_played,
    )


def _rebuild_projection_models() -> None:
    """Resolve forward references for typed Pydantic projection models."""

    from engine.age_curves import AgeCurvePoint
    from engine.injury_risk import InjuryRiskResult
    from engine.player_value import PlayerValueResult

    PlayerProjectionInput.model_rebuild(
        _types_namespace={
            "AgeCurvePoint": AgeCurvePoint,
            "InjuryRiskResult": InjuryRiskResult,
            "PlayerValueResult": PlayerValueResult,
        }
    )


_rebuild_projection_models()
