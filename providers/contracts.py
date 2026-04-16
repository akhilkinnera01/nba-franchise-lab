"""Provider interfaces for rights-cleared or user-supplied adapters."""

from __future__ import annotations

from typing import TYPE_CHECKING, Protocol

if TYPE_CHECKING:
    from api.schemas.scenario import ScenarioDetailResponse
    from api.schemas.team import TeamCapResponse, TeamListResponse, TeamRosterResponse


class LeagueReadProvider(Protocol):
    """Contract for loading franchise summary, roster, and cap views."""

    def load_team_list(self, season: str) -> TeamListResponse:
        """Return one league-wide team summary collection for the requested season."""

    def load_team_roster(self, team_id: int, season: str) -> TeamRosterResponse:
        """Return one team roster payload for the requested season."""

    def load_team_cap(self, team_id: int, season: str) -> TeamCapResponse:
        """Return one team cap-sheet payload for the requested season."""


class ScenarioReadProvider(Protocol):
    """Contract for loading one stored scenario envelope by identifier."""

    def load_scenario(self, scenario_id: str) -> ScenarioDetailResponse:
        """Return one scenario envelope using the public API schema shape."""
