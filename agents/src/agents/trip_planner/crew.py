"""Trip Planner crew — 5 sequential agents that scope, research, plan, find stays, and budget."""

import os
from dotenv import load_dotenv

from crewai import Agent, Crew, Process, Task, LLM
from crewai.project import CrewBase, agent, crew, task, output_json
from crewai.agents.agent_builder.base_agent import BaseAgent
from crewai_tools import SerperDevTool

from agents.trip_planner.models import TripItinerary

load_dotenv()

search_tool = SerperDevTool(max_usage_count=25)


def default_llm() -> LLM:
    api_key = os.environ.get("GEMINI_API_KEY")
    if api_key:
        model = os.environ.get("MODEL", "gemini/gemini-2.0-flash")
        return LLM(model=model, api_key=api_key)

    model = os.environ.get("MODEL", "ollama/qwen3:8b")
    api_base = os.environ.get("API_BASE", "http://127.0.0.1:11434")
    return LLM(model=model, api_base=api_base)


@CrewBase
class TripPlannerCrew:
    """Trip Planner Agent Crew"""

    agents: list[BaseAgent]
    tasks: list[Task]
    _task_callback = None

    @output_json
    class ItineraryOutput(TripItinerary):
        pass

    # === Agents ===

    @agent
    def trip_scoper(self) -> Agent:
        return Agent(config=self.agents_config["trip_scoper"], llm=default_llm(), verbose=True)

    @agent
    def destination_researcher(self) -> Agent:
        return Agent(config=self.agents_config["destination_researcher"], llm=default_llm(), tools=[search_tool], verbose=True)

    @agent
    def itinerary_architect(self) -> Agent:
        return Agent(config=self.agents_config["itinerary_architect"], llm=default_llm(), verbose=True)

    @agent
    def stays_and_food_scout(self) -> Agent:
        return Agent(config=self.agents_config["stays_and_food_scout"], llm=default_llm(), tools=[search_tool], verbose=True)

    @agent
    def budget_compiler(self) -> Agent:
        return Agent(config=self.agents_config["budget_compiler"], llm=default_llm(), verbose=True)

    # === Tasks ===

    @task
    def scope_trip(self) -> Task:
        return Task(config=self.tasks_config["scope_trip"])

    @task
    def research_destination(self) -> Task:
        return Task(config=self.tasks_config["research_destination"])

    @task
    def plan_itinerary(self) -> Task:
        return Task(config=self.tasks_config["plan_itinerary"])

    @task
    def find_stays_and_food(self) -> Task:
        return Task(config=self.tasks_config["find_stays_and_food"])

    @task
    def compile_budget(self) -> Task:
        task_config = dict(self.tasks_config["compile_budget"])
        task_config.pop("output_json", None)
        return Task(config=task_config, output_json=TripItinerary)

    # === Crew ===

    @crew
    def crew(self) -> Crew:
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,
            verbose=True,
            task_callback=self._task_callback,
        )
