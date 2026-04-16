"""Tests for comparable trade search."""

from __future__ import annotations

from engine.comparable_trades import (
    ComparableDraftPick,
    ComparablePlayerAsset,
    ComparableTradeCandidate,
    ProposedTradeInput,
    find_comparable_trades,
)
from pytest import raises


def _player(
    player_id: str,
    player_name: str,
    *,
    salary_cents: int,
    age: int,
    projected_box_plus_minus: float,
) -> ComparablePlayerAsset:
    """Build one comparable-trade player asset."""

    return ComparablePlayerAsset(
        player_id=player_id,
        player_name=player_name,
        salary_cents=salary_cents,
        age=age,
        projected_box_plus_minus=projected_box_plus_minus,
    )


def test_find_comparable_trades_ranks_closer_candidates_first() -> None:
    """More similar salary, BPM, and pick structures should rank ahead of loose matches."""

    proposed_trade = ProposedTradeInput(
        teams_involved_count=2,
        outgoing_players=(
            _player(
                "p1",
                "Star Wing",
                salary_cents=2_500_000_000,
                age=28,
                projected_box_plus_minus=4.8,
            ),
        ),
        incoming_players=(
            _player(
                "p2",
                "Starter Guard",
                salary_cents=2_200_000_000,
                age=27,
                projected_box_plus_minus=3.9,
            ),
        ),
        draft_picks=(
            ComparableDraftPick(season=2027, round=1, pick_range_start=20, pick_range_end=30),
        ),
    )
    close_candidate = ComparableTradeCandidate(
        trade_id="close",
        description="Close match",
        season="2022-23",
        teams_involved_count=2,
        outgoing_players=(
            _player(
                "h1",
                "Close Outgoing",
                salary_cents=2_450_000_000,
                age=29,
                projected_box_plus_minus=4.4,
            ),
        ),
        incoming_players=(
            _player(
                "h2",
                "Close Incoming",
                salary_cents=2_250_000_000,
                age=27,
                projected_box_plus_minus=4.0,
            ),
        ),
        draft_picks=(
            ComparableDraftPick(season=2028, round=1, pick_range_start=18, pick_range_end=28),
        ),
    )
    distant_candidate = ComparableTradeCandidate(
        trade_id="distant",
        description="Distant match",
        season="2018-19",
        teams_involved_count=3,
        outgoing_players=(
            _player(
                "h3",
                "Distant Outgoing",
                salary_cents=800_000_000,
                age=22,
                projected_box_plus_minus=0.5,
            ),
        ),
        incoming_players=(
            _player(
                "h4",
                "Distant Incoming",
                salary_cents=4_500_000_000,
                age=33,
                projected_box_plus_minus=6.0,
            ),
        ),
        draft_picks=(),
    )

    result = find_comparable_trades(
        proposed_trade,
        candidate_trades=(distant_candidate, close_candidate),
        limit=1,
    )

    assert result.matches[0].trade_id == "close"


def test_comparable_trades_reject_empty_trade_payloads() -> None:
    """Empty structured trades should be rejected instead of scoring as perfect matches."""

    with raises(ValueError):
        ProposedTradeInput(teams_involved_count=2)

    with raises(ValueError):
        ComparableTradeCandidate(
            trade_id="empty",
            description="Empty trade",
            season="2024-25",
            teams_involved_count=2,
        )


def test_find_comparable_trades_distinguishes_pick_quality_with_equal_pick_counts() -> None:
    """Lottery and late-first packages should not score equally when pick counts match."""

    proposed_trade = ProposedTradeInput(
        teams_involved_count=2,
        draft_picks=(
            ComparableDraftPick(season=2027, round=1, pick_range_start=22, pick_range_end=30),
        ),
    )
    close_candidate = ComparableTradeCandidate(
        trade_id="late-first",
        description="Late first match",
        season="2021-22",
        teams_involved_count=2,
        draft_picks=(
            ComparableDraftPick(season=2028, round=1, pick_range_start=20, pick_range_end=28),
        ),
    )
    distant_candidate = ComparableTradeCandidate(
        trade_id="lottery-first",
        description="Lottery first mismatch",
        season="2020-21",
        teams_involved_count=2,
        draft_picks=(
            ComparableDraftPick(season=2028, round=1, pick_range_start=1, pick_range_end=10),
        ),
    )

    result = find_comparable_trades(
        proposed_trade,
        candidate_trades=(distant_candidate, close_candidate),
        limit=2,
    )

    assert tuple(match.trade_id for match in result.matches) == ("late-first", "lottery-first")
