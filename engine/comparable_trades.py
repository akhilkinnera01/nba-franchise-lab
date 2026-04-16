"""Similarity search over structured historical trade candidates."""

from __future__ import annotations

from statistics import mean

from pydantic import BaseModel, ConfigDict, Field, model_validator

NBA_DRAFT_ROUND_SIZE = 30


class ComparablePlayerAsset(BaseModel):
    """One player asset used in trade similarity scoring."""

    model_config = ConfigDict(extra="forbid")

    player_id: str = Field(min_length=1)
    player_name: str = Field(min_length=1)
    salary_cents: int = Field(ge=0)
    age: int = Field(ge=0)
    projected_box_plus_minus: float


class ComparableDraftPick(BaseModel):
    """One draft-pick asset included in a proposed or historical trade."""

    model_config = ConfigDict(extra="forbid")

    season: int
    round: int = Field(ge=1)
    pick_range_start: int = Field(ge=1)
    pick_range_end: int = Field(ge=1)


class ProposedTradeInput(BaseModel):
    """Structured proposed trade used as the search query."""

    model_config = ConfigDict(extra="forbid")

    teams_involved_count: int = Field(ge=2)
    outgoing_players: tuple[ComparablePlayerAsset, ...] = Field(default_factory=tuple)
    incoming_players: tuple[ComparablePlayerAsset, ...] = Field(default_factory=tuple)
    draft_picks: tuple[ComparableDraftPick, ...] = Field(default_factory=tuple)

    @model_validator(mode="after")
    def validate_assets(self) -> ProposedTradeInput:
        """Reject empty trade payloads that cannot produce meaningful similarity."""

        if not self.outgoing_players and not self.incoming_players and not self.draft_picks:
            raise ValueError("Comparable trades require at least one player or pick asset.")
        return self


class ComparableTradeCandidate(ProposedTradeInput):
    """One historical trade candidate scored against a proposed trade."""

    trade_id: str = Field(min_length=1)
    description: str = Field(min_length=1)
    season: str = Field(min_length=1)


class ComparableTradeMatch(BaseModel):
    """One scored historical trade match."""

    model_config = ConfigDict(extra="forbid")

    trade_id: str
    description: str
    season: str
    similarity_score: float


class ComparableTradeSearchResult(BaseModel):
    """Top comparable trades for one proposed deal."""

    model_config = ConfigDict(extra="forbid")

    matches: tuple[ComparableTradeMatch, ...]


def find_comparable_trades(
    proposed_trade: ProposedTradeInput,
    *,
    candidate_trades: tuple[ComparableTradeCandidate, ...] | list[ComparableTradeCandidate],
    limit: int = 5,
) -> ComparableTradeSearchResult:
    """Return the highest-similarity historical trades for a proposed deal."""

    scored_matches = [
        ComparableTradeMatch(
            trade_id=candidate.trade_id,
            description=candidate.description,
            season=candidate.season,
            similarity_score=_similarity_score(proposed_trade, candidate),
        )
        for candidate in candidate_trades
    ]
    sorted_matches = tuple(
        sorted(
            scored_matches,
            key=lambda match: (-match.similarity_score, match.trade_id),
        )[:limit]
    )
    return ComparableTradeSearchResult(matches=sorted_matches)


def _similarity_score(
    proposed_trade: ProposedTradeInput,
    candidate: ComparableTradeCandidate,
) -> float:
    """Return a bounded similarity score between zero and one."""

    outgoing_salary_delta = _normalized_delta(
        _total_salary(proposed_trade.outgoing_players),
        _total_salary(candidate.outgoing_players),
        scale=1_000_000_000,
    )
    incoming_salary_delta = _normalized_delta(
        _total_salary(proposed_trade.incoming_players),
        _total_salary(candidate.incoming_players),
        scale=1_000_000_000,
    )
    age_delta = _normalized_delta(
        _average_age(proposed_trade.outgoing_players + proposed_trade.incoming_players),
        _average_age(candidate.outgoing_players + candidate.incoming_players),
        scale=10,
    )
    bpm_delta = _normalized_delta(
        _average_bpm(proposed_trade.outgoing_players + proposed_trade.incoming_players),
        _average_bpm(candidate.outgoing_players + candidate.incoming_players),
        scale=5,
    )
    pick_delta = _normalized_delta(
        len(proposed_trade.draft_picks),
        len(candidate.draft_picks),
        scale=3,
    )
    pick_quality_delta = _normalized_delta(
        _draft_pick_quality_score(proposed_trade.draft_picks),
        _draft_pick_quality_score(candidate.draft_picks),
        scale=30,
    )
    team_count_delta = _normalized_delta(
        proposed_trade.teams_involved_count,
        candidate.teams_involved_count,
        scale=2,
    )
    total_penalty = (
        outgoing_salary_delta
        + incoming_salary_delta
        + age_delta
        + bpm_delta
        + pick_delta
        + pick_quality_delta
        + team_count_delta
    )
    return max(0.0, 1.0 - total_penalty / 7)


def _total_salary(players: tuple[ComparablePlayerAsset, ...]) -> int:
    """Return the total salary of a set of trade assets."""

    return sum(player.salary_cents for player in players)


def _average_age(players: tuple[ComparablePlayerAsset, ...]) -> float:
    """Return the mean age of a player asset group."""

    if not players:
        return 0.0
    return float(mean(player.age for player in players))


def _average_bpm(players: tuple[ComparablePlayerAsset, ...]) -> float:
    """Return the mean BPM of a player asset group."""

    if not players:
        return 0.0
    return float(mean(player.projected_box_plus_minus for player in players))


def _draft_pick_quality_score(draft_picks: tuple[ComparableDraftPick, ...]) -> float:
    """Return one aggregate pick-quality score using round and expected slot."""

    return float(sum(_expected_pick_slot(draft_pick) for draft_pick in draft_picks))


def _expected_pick_slot(draft_pick: ComparableDraftPick) -> float:
    """Return the approximate overall draft slot represented by one pick range."""

    round_offset = (draft_pick.round - 1) * NBA_DRAFT_ROUND_SIZE
    return round_offset + (draft_pick.pick_range_start + draft_pick.pick_range_end) / 2


def _normalized_delta(left: float | int, right: float | int, *, scale: float) -> float:
    """Return one bounded normalized difference."""

    return min(abs(float(left) - float(right)) / scale, 1.0)
