"""Pydantic output models for the deep research agent."""

from pydantic import BaseModel


class Source(BaseModel):
    title: str
    url: str
    snippet: str


class Viewpoint(BaseModel):
    position: str
    supporting_evidence: str
    sources: list[str]


class KeyFinding(BaseModel):
    finding: str
    confidence: str
    detail: str


class ResearchBrief(BaseModel):
    topic: str
    summary: str
    key_findings: list[KeyFinding]
    viewpoints: list[Viewpoint]
    sources: list[Source]
    conclusion: str
