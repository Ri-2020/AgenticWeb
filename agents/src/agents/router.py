"""Agent router — maps agent type strings to crew classes and metadata."""

from __future__ import annotations

from typing import Any

# -- Register agents here. Each agent module exposes METADATA and a Crew class. --

from agents.shopping import METADATA as shopping_metadata
from agents.shopping.crew import ShoppingCrew

from agents.research import METADATA as research_metadata
from agents.research.crew import ResearchCrew

from agents.trip_planner import METADATA as trip_planner_metadata
from agents.trip_planner.crew import TripPlannerCrew

AGENTS: dict[str, dict[str, Any]] = {
    "shopping": {
        "crew_class": ShoppingCrew,
        "metadata": shopping_metadata,
    },
    "research": {
        "crew_class": ResearchCrew,
        "metadata": research_metadata,
    },
    "trip_planner": {
        "crew_class": TripPlannerCrew,
        "metadata": trip_planner_metadata,
    },
}


def get_agent_info(agent_type: str) -> dict[str, Any] | None:
    return AGENTS.get(agent_type)


def get_all_agents() -> dict[str, dict[str, Any]]:
    """Return {agent_id: metadata} for all registered agents."""
    return {k: v["metadata"] for k, v in AGENTS.items()}


def list_agent_ids() -> list[str]:
    return list(AGENTS.keys())
