"""Synthetic fixture-backed provider implementations for local demos and tests."""

from __future__ import annotations

from pathlib import Path

from api.schemas.team import TeamCapResponse, TeamListResponse, TeamRosterResponse

DEFAULT_DEMO_FIXTURE_ROOT = Path(__file__).resolve().parent.parent / "demo" / "fixtures"


class DemoLeagueReadProvider:
    """Load public, redistributable demo fixtures from the repository."""

    def __init__(self, fixture_root: Path = DEFAULT_DEMO_FIXTURE_ROOT) -> None:
        self._fixture_root = fixture_root

    def load_team_list(self, season: str) -> TeamListResponse:
        """Return the demo team summary collection for the requested season."""

        payload = self._read_fixture("team-list.json")
        response = TeamListResponse.model_validate_json(payload)
        if response.season != season:
            raise ValueError(
                f"Demo team-list fixture is for {response.season}, not requested season {season}."
            )
        return response

    def load_team_roster(self, team_id: int, season: str) -> TeamRosterResponse:
        """Return one demo roster payload by team identifier."""

        payload = self._read_fixture(f"team-{team_id}-roster.json")
        response = TeamRosterResponse.model_validate_json(payload)
        if response.season != season:
            raise ValueError(
                f"Demo roster fixture is for {response.season}, not requested season {season}."
            )
        return response

    def load_team_cap(self, team_id: int, season: str) -> TeamCapResponse:
        """Return one demo cap-sheet payload by team identifier."""

        payload = self._read_fixture(f"team-{team_id}-cap.json")
        response = TeamCapResponse.model_validate_json(payload)
        if response.season != season:
            raise ValueError(
                f"Demo cap fixture is for {response.season}, not requested season {season}."
            )
        return response

    def _read_fixture(self, relative_path: str) -> str:
        """Read one UTF-8 demo fixture from disk."""

        fixture_path = self._fixture_root / relative_path
        if not fixture_path.exists():
            raise FileNotFoundError(f"Demo fixture does not exist: {fixture_path}")
        return fixture_path.read_text(encoding="utf-8")
