"""Common transport schemas for API responses and error envelopes."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class ErrorDetail(BaseModel):
    """One normalized validation or domain error detail."""

    model_config = ConfigDict(extra="forbid")

    type: str
    location: tuple[str, ...]
    message: str


class ProblemDetailResponse(BaseModel):
    """RFC7807-style error envelope used across the API."""

    model_config = ConfigDict(extra="forbid")

    type: str
    title: str
    status: int
    detail: str
    instance: str
    request_id: str
    errors: tuple[ErrorDetail, ...] = ()


class HealthResponse(BaseModel):
    """Liveness payload enriched with app metadata."""

    model_config = ConfigDict(extra="forbid")

    status: str
    service: str
    environment: str
    version: str
