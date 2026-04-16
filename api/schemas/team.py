"""Team read-response schemas."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import TYPE_CHECKING, Literal

from pydantic import BaseModel, ConfigDict, field_serializer

if TYPE_CHECKING:
    from api.schemas.cap import TeamCapProjectionSeason
    from api.schemas.player import TeamRosterPlayer


class TeamIdentity(BaseModel):
    """Canonical team metadata shared across responses."""

    model_config = ConfigDict(extra="forbid")

    team_id: int
    abbreviation: str
    full_name: str
    conference: str | None = None
    division: str | None = None


class TeamHealthSummary(BaseModel):
    """One team row returned by the `/teams` collection."""

    model_config = ConfigDict(extra="forbid")

    team_id: int
    abbreviation: str
    full_name: str
    conference: str | None = None
    division: str | None = None
    season: str
    wins: int | None = None
    losses: int | None = None
    net_rating: float | None = None
    offensive_rating: float | None = None
    defensive_rating: float | None = None
    pace: float | None = None
    roster_count: int
    standard_contract_count: int
    committed_salary_cents: int
    cap_room_cents: int | None = None
    tax_room_cents: int | None = None
    first_apron_room_cents: int | None = None
    second_apron_room_cents: int | None = None


class TeamListMeta(BaseModel):
    """Collection-level freshness and completeness metadata for franchise context."""

    model_config = ConfigDict(extra="forbid")

    as_of: datetime | None = None
    source_status: Literal["complete", "partial", "degraded"]
    missing_fields: tuple[str, ...] = ()

    @field_serializer("as_of")
    def serialize_as_of(self, value: datetime | None) -> str | None:
        """Normalize freshness timestamps to one explicit UTC wire format."""

        if value is None:
            return None
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value.astimezone(UTC).isoformat().replace("+00:00", "Z")


class TeamListResponse(BaseModel):
    """Collection response for team health summaries."""

    model_config = ConfigDict(extra="forbid")

    season: str
    meta: TeamListMeta
    teams: tuple[TeamHealthSummary, ...]


class TeamRosterResponse(BaseModel):
    """Detailed roster response for one team."""

    model_config = ConfigDict(extra="forbid")

    team: TeamIdentity
    season: str
    roster_count: int
    players: tuple[TeamRosterPlayer, ...]


class TeamCapResponse(BaseModel):
    """Cap response for one team across a short projection window."""

    model_config = ConfigDict(extra="forbid")

    team: TeamIdentity
    season: str
    current: TeamCapProjectionSeason
    projection: tuple[TeamCapProjectionSeason, ...]


def _rebuild_team_schema_models() -> None:
    """Resolve forward references for team-facing transport models."""

    from api.schemas.cap import TeamCapProjectionSeason
    from api.schemas.player import TeamRosterPlayer

    TeamRosterResponse.model_rebuild(_types_namespace={"TeamRosterPlayer": TeamRosterPlayer})
    TeamCapResponse.model_rebuild(
        _types_namespace={"TeamCapProjectionSeason": TeamCapProjectionSeason}
    )


_rebuild_team_schema_models()
