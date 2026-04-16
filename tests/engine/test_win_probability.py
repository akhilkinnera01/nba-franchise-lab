"""Tests for single-game win probability helpers."""

from __future__ import annotations

from engine.game_probability import (
    GameWinProbabilityInput,
    calculate_game_win_probability,
    net_rating_to_win_percentage,
)
from engine.team_strength import TeamStrengthResult
from pytest import approx


def _team(
    team_id: int,
    team_name: str,
    *,
    neutral_net_rating: float,
    home_net_rating: float,
) -> TeamStrengthResult:
    """Build one minimal team-strength result for game-probability tests."""

    return TeamStrengthResult(
        team_id=team_id,
        team_name=team_name,
        player_contribution_sum=neutral_net_rating,
        neutral_court_net_rating=neutral_net_rating,
        home_court_net_rating=home_net_rating,
        total_minutes_share=1.0,
        players_considered=8,
    )


def test_net_rating_to_win_percentage_clamps_extreme_inputs() -> None:
    """Win-percentage conversion should stay within valid probability bounds."""

    assert net_rating_to_win_percentage(-1_000.0) == approx(0.0)
    assert net_rating_to_win_percentage(1_000.0) == approx(1.0)


def test_equal_teams_split_a_neutral_court_game() -> None:
    """Two equal teams should split a neutral-site matchup evenly."""

    result = calculate_game_win_probability(
        GameWinProbabilityInput(
            home_team=_team(
                1,
                "Equal Home",
                neutral_net_rating=3.0,
                home_net_rating=6.0,
            ),
            away_team=_team(
                2,
                "Equal Away",
                neutral_net_rating=3.0,
                home_net_rating=6.0,
            ),
            neutral_site=True,
        )
    )

    assert result.home_team_win_probability == approx(0.5)


def test_neutral_court_log5_is_symmetric() -> None:
    """Swapping the teams on a neutral court should complement the probability."""

    favorite = _team(1, "Favorite", neutral_net_rating=6.5, home_net_rating=9.5)
    underdog = _team(2, "Underdog", neutral_net_rating=-2.0, home_net_rating=1.0)

    favorite_result = calculate_game_win_probability(
        GameWinProbabilityInput(
            home_team=favorite,
            away_team=underdog,
            neutral_site=True,
        )
    )
    underdog_result = calculate_game_win_probability(
        GameWinProbabilityInput(
            home_team=underdog,
            away_team=favorite,
            neutral_site=True,
        )
    )

    assert (
        favorite_result.home_team_win_probability + underdog_result.home_team_win_probability
    ) == approx(1.0)


def test_home_court_advantage_increases_the_home_team_probability() -> None:
    """The home team should gain win probability versus the neutral-site baseline."""

    result_at_home = calculate_game_win_probability(
        GameWinProbabilityInput(
            home_team=_team(
                1,
                "Home Team",
                neutral_net_rating=2.0,
                home_net_rating=5.0,
            ),
            away_team=_team(
                2,
                "Road Team",
                neutral_net_rating=2.0,
                home_net_rating=5.0,
            ),
            neutral_site=False,
        )
    )
    result_on_neutral = calculate_game_win_probability(
        GameWinProbabilityInput(
            home_team=_team(
                1,
                "Home Team",
                neutral_net_rating=2.0,
                home_net_rating=5.0,
            ),
            away_team=_team(
                2,
                "Road Team",
                neutral_net_rating=2.0,
                home_net_rating=5.0,
            ),
            neutral_site=True,
        )
    )

    assert result_at_home.home_team_win_probability > result_on_neutral.home_team_win_probability
