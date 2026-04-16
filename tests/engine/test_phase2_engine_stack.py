"""End-to-end Phase 2 engine coverage."""

from __future__ import annotations

from engine.age_curves import AgeCurvePoint
from engine.cap_exceptions import CapExceptionInput, determine_cap_exceptions
from engine.cap_projection import TeamCapProjectionInput, project_team_cap
from engine.cba_rules import CapThresholdsInput, load_cap_rule_for_season
from engine.game_probability import GameWinProbabilityInput, calculate_game_win_probability
from engine.injury_risk import (
    HistoricalAvailabilitySeason,
    InjuryRiskInput,
    evaluate_injury_risk,
)
from engine.player_projection import PlayerProjectionInput, project_player
from engine.player_value import PlayerValueInput, evaluate_player_value
from engine.season_simulator import (
    ScheduledGameInput,
    SeasonSimulationInput,
    SeasonTeamInput,
    simulate_season,
)
from engine.team_strength import TeamStrengthResult


def _season_team(
    team_id: int,
    team_name: str,
    conference: str,
    projected_weighted_box_plus_minus: float,
    projected_minutes_share: float,
) -> SeasonTeamInput:
    """Build one season-simulation input from projected player output."""

    return SeasonTeamInput(
        conference=conference,
        team_strength=TeamStrengthResult(
            team_id=team_id,
            team_name=team_name,
            player_contribution_sum=projected_weighted_box_plus_minus,
            neutral_court_net_rating=projected_weighted_box_plus_minus,
            home_court_net_rating=projected_weighted_box_plus_minus + 3.0,
            total_minutes_share=projected_minutes_share,
            players_considered=1,
        ),
    )


def test_phase2_projection_stack_flows_into_game_and_season_simulation() -> None:
    """The main Phase 2 primitives should compose into one coherent simulation path."""

    player_a = project_player(
        PlayerProjectionInput(
            player_value=evaluate_player_value(
                PlayerValueInput(
                    player_id="a",
                    player_name="Player A",
                    box_plus_minus=5.0,
                    minutes_share=0.3,
                )
            ),
            age_curve=AgeCurvePoint(
                position_group="wing",
                archetype="star",
                age=27,
                expected_bpm_delta=0.2,
                std_dev=0.4,
                sample_size=30,
            ),
            injury_risk=evaluate_injury_risk(
                InjuryRiskInput(
                    player_id="a",
                    player_name="Player A",
                    seasons=(
                        HistoricalAvailabilitySeason(season="2021-22", age=25, games_played=76),
                        HistoricalAvailabilitySeason(season="2022-23", age=26, games_played=72),
                        HistoricalAvailabilitySeason(season="2023-24", age=27, games_played=80),
                    ),
                )
            ),
        )
    )
    player_b = project_player(
        PlayerProjectionInput(
            player_value=evaluate_player_value(
                PlayerValueInput(
                    player_id="b",
                    player_name="Player B",
                    box_plus_minus=1.0,
                    minutes_share=0.3,
                )
            ),
        )
    )

    team_a = _season_team(
        team_id=1,
        team_name="Team A",
        conference="East",
        projected_weighted_box_plus_minus=player_a.projected_weighted_box_plus_minus or 0.0,
        projected_minutes_share=player_a.projected_minutes_share or 0.0,
    )
    team_b = _season_team(
        team_id=2,
        team_name="Team B",
        conference="East",
        projected_weighted_box_plus_minus=player_b.projected_weighted_box_plus_minus or 0.0,
        projected_minutes_share=player_b.projected_minutes_share or 0.0,
    )

    game_probability = calculate_game_win_probability(
        GameWinProbabilityInput(
            home_team=team_a.team_strength,
            away_team=team_b.team_strength,
        )
    )
    season_result = simulate_season(
        SeasonSimulationInput(
            teams=(team_a, team_b),
            schedule=(
                ScheduledGameInput(home_team_id=1, away_team_id=2),
                ScheduledGameInput(home_team_id=2, away_team_id=1),
            ),
            iterations=500,
            playoff_spots_per_conference=1,
            random_seed=19,
        )
    )

    assert game_probability.home_team_win_probability > 0.5
    assert (
        season_result.team_results[0].expected_wins != season_result.team_results[1].expected_wins
    )


def test_phase2_cap_stack_flows_from_cba_loading_to_exception_logic() -> None:
    """Loaded CBA rules should feed cap projection and exception availability."""

    rule = load_cap_rule_for_season(
        "2024-25",
        thresholds=CapThresholdsInput(
            season="2024-25",
            salary_floor="$126,538,000",
            salary_cap="$140,588,000",
            luxury_tax="$170,814,000",
            first_apron="$178,132,000",
            second_apron="$188,931,000",
        ),
    )
    cap_projection = project_team_cap(
        TeamCapProjectionInput(
            team_id=1,
            team_name="Cap Team",
            projection_seasons=("2024-25",),
            cap_rules=(rule,),
            contracts=(),
        )
    )
    cap_exceptions = determine_cap_exceptions(
        CapExceptionInput(
            projected_season=cap_projection.season_results[0],
            cba_rule=rule,
            exception_amount_overrides={"room_mid_level": 7_983_000_000},
        )
    )

    assert cap_exceptions.exceptions[0].code == "room_mid_level"
    assert cap_exceptions.exceptions[0].available is True
