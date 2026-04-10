"""Pydantic output models for the Career Driver agent."""

from pydantic import BaseModel


class CareerStep(BaseModel):
    order: int
    action: str
    duration: str


class CareerPath(BaseModel):
    title: str
    summary: str
    fit_score: int  # 1-10
    salary_range: str
    time_to_transition: str
    required_skills: list[str]
    steps: list[CareerStep]
    pros: list[str]
    cons: list[str]


class CareerPaths(BaseModel):
    current_profile: str
    target_market: str
    paths: list[CareerPath]
    top_recommendation: str
