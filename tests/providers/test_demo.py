"""Tests for the public demo provider implementations."""

from __future__ import annotations

from providers.demo import DemoLeagueReadProvider


def test_demo_provider_loads_public_team_list_fixture() -> None:
    """The demo provider should load the synthetic league summary fixture."""

    provider = DemoLeagueReadProvider()

    response = provider.load_team_list("demo-2026")

    assert response.season == "demo-2026"
    assert len(response.teams) == 2
    assert response.teams[0].full_name == "Metro Meteors"


def test_demo_provider_loads_team_specific_roster_and_cap_fixtures() -> None:
    """The demo provider should return typed roster and cap payloads for one team."""

    provider = DemoLeagueReadProvider()

    roster = provider.load_team_roster(101, "demo-2026")
    cap = provider.load_team_cap(101, "demo-2026")

    assert roster.team.abbreviation == "MMT"
    assert roster.players[0].player_id == "player:alpha"
    assert cap.current.standard_contract_count == 14
    assert cap.projection[0].season == "demo-2027"
