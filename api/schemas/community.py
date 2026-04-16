"""Schemas for authenticated user and community-facing scenario workflows."""

from __future__ import annotations

from datetime import datetime  # noqa: TC003
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ProfileResponse(BaseModel):
    """One authenticated user profile summary."""

    model_config = ConfigDict(extra="forbid")

    user_id: str
    email: str
    display_name: str | None = None
    avatar_url: str | None = None
    saved_scenario_count: int = 0


class ProfileUpdateRequest(BaseModel):
    """Partial update payload for the authenticated user's profile."""

    model_config = ConfigDict(extra="forbid")

    display_name: str | None = Field(default=None, min_length=1, max_length=80)
    avatar_url: str | None = Field(default=None, min_length=1, max_length=500)


class SavedScenarioSummary(BaseModel):
    """Summary payload for one saved scenario row."""

    model_config = ConfigDict(extra="forbid")

    scenario_id: str
    scenario_type: str
    title: str | None = None
    notes: str | None = None
    created_at: datetime
    saved_at: datetime
    share_url: str


class SavedScenariosResponse(BaseModel):
    """Authenticated library of saved scenarios."""

    model_config = ConfigDict(extra="forbid")

    items: tuple[SavedScenarioSummary, ...]


class ReactionRequest(BaseModel):
    """One upvote/downvote request against a stored scenario."""

    model_config = ConfigDict(extra="forbid")

    value: Literal[-1, 1]


class ReactionResponse(BaseModel):
    """One user's current reaction for a scenario."""

    model_config = ConfigDict(extra="forbid")

    scenario_id: str
    value: int


class CommentCreateRequest(BaseModel):
    """Create payload for one scenario comment."""

    model_config = ConfigDict(extra="forbid")

    body: str = Field(min_length=1, max_length=2_000)


class CommentResponse(BaseModel):
    """One scenario comment plus author metadata."""

    model_config = ConfigDict(extra="forbid")

    comment_id: int
    scenario_id: str
    author_user_id: str
    author_display_name: str | None = None
    body: str
    created_at: datetime


class ScenarioFeedbackResponse(BaseModel):
    """Aggregated social metadata for one stored scenario."""

    model_config = ConfigDict(extra="forbid")

    scenario_id: str
    upvotes: int
    downvotes: int
    viewer_reaction: int | None = None
    comments: tuple[CommentResponse, ...]
