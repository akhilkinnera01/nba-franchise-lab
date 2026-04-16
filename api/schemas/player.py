"""Player-facing API transport schemas."""

from __future__ import annotations

from datetime import date  # noqa: TC003
from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict

if TYPE_CHECKING:
    from api.schemas.contract import PlayerContractSummary


class TeamRosterPlayer(BaseModel):
    """One roster player joined with current stats and contract data."""

    model_config = ConfigDict(extra="forbid")

    player_id: str
    display_name: str
    position: str | None = None
    jersey_number: str | None = None
    roster_status: str | None = None
    birth_date: date | None = None
    minutes_per_game: float | None = None
    points_per_game: float | None = None
    rebounds_per_game: float | None = None
    assists_per_game: float | None = None
    steals_per_game: float | None = None
    blocks_per_game: float | None = None
    turnovers_per_game: float | None = None
    contract: PlayerContractSummary | None = None


def _rebuild_player_schema_models() -> None:
    """Resolve forward references for player-facing transport models."""

    from api.schemas.contract import PlayerContractSummary

    TeamRosterPlayer.model_rebuild(
        _types_namespace={"PlayerContractSummary": PlayerContractSummary}
    )


_rebuild_player_schema_models()
