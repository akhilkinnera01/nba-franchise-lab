"""Schemas for Phase 5 featured content and daily challenge workflows."""

from __future__ import annotations

from datetime import date, datetime  # noqa: TC003

from pydantic import BaseModel, ConfigDict, Field


class DailyChallengeSubmissionRequest(BaseModel):
    """Authenticated submission payload for the current daily challenge."""

    model_config = ConfigDict(extra="forbid")

    challenge_key: str = Field(min_length=1, max_length=80)
    scenario_id: str = Field(min_length=1, max_length=32)
    note: str | None = Field(default=None, max_length=500)


class DailyChallengeSubmissionSummary(BaseModel):
    """One stored challenge response plus public voting totals."""

    model_config = ConfigDict(extra="forbid")

    submission_id: int
    challenge_key: str
    scenario_id: str
    scenario_type: str
    title: str | None = None
    author_user_id: str
    author_display_name: str | None = None
    note: str | None = None
    created_at: datetime
    upvotes: int = 0
    downvotes: int = 0
    share_url: str


class DailyChallengeResponse(BaseModel):
    """The current deterministic daily challenge plus recent submissions."""

    model_config = ConfigDict(extra="forbid")

    challenge_key: str
    challenge_date: date
    template_id: str
    title: str
    summary: str
    prompt: str
    scenario_type: str
    launch_url: str
    tags: tuple[str, ...] = ()
    submissions: tuple[DailyChallengeSubmissionSummary, ...] = ()


class FeaturedScenarioResponse(BaseModel):
    """Editorially featured scenario card for the home surface."""

    model_config = ConfigDict(extra="forbid")

    feature_key: str
    title: str
    eyebrow: str
    summary: str
    launch_url: str
    tags: tuple[str, ...] = ()
