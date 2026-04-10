"""Career Driver crew — 5 sequential agents that profile, research, design, evaluate, and plan."""

import os
from dotenv import load_dotenv

from crewai import Agent, Crew, Process, Task, LLM
from crewai.project import CrewBase, agent, crew, task
from crewai.agents.agent_builder.base_agent import BaseAgent

from agents.career_driver.models import CareerPaths

load_dotenv()


def default_llm() -> LLM:
    api_key = os.environ.get("GEMINI_API_KEY")
    if api_key:
        model = os.environ.get("MODEL", "gemini/gemini-2.5-flash-lite")
        return LLM(model=model, api_key=api_key)

    model = os.environ.get("MODEL", "ollama/qwen3:8b")
    api_base = os.environ.get("API_BASE", "http://127.0.0.1:11434")
    return LLM(model=model, api_base=api_base)


@CrewBase
class CareerDriverCrew:
    """Career Driver Agent Crew"""

    agents: list[BaseAgent]
    tasks: list[Task]
    _task_callback = None

    # === Agents ===

    @agent
    def profile_analyst(self) -> Agent:
        return Agent(config=self.agents_config["profile_analyst"], llm=default_llm(), verbose=True)

    @agent
    def market_scout(self) -> Agent:
        return Agent(config=self.agents_config["market_scout"], llm=default_llm(), verbose=True)

    @agent
    def path_architect(self) -> Agent:
        return Agent(config=self.agents_config["path_architect"], llm=default_llm(), verbose=True)

    @agent
    def feasibility_analyst(self) -> Agent:
        return Agent(config=self.agents_config["feasibility_analyst"], llm=default_llm(), verbose=True)

    @agent
    def action_planner(self) -> Agent:
        return Agent(config=self.agents_config["action_planner"], llm=default_llm(), verbose=True)

    # === Tasks ===

    @task
    def analyze_profile(self) -> Task:
        return Task(config=self.tasks_config["analyze_profile"])

    @task
    def research_market(self) -> Task:
        return Task(config=self.tasks_config["research_market"])

    @task
    def design_paths(self) -> Task:
        return Task(config=self.tasks_config["design_paths"])

    @task
    def evaluate_feasibility(self) -> Task:
        return Task(config=self.tasks_config["evaluate_feasibility"])

    @task
    def build_action_plan(self) -> Task:
        task_config = dict(self.tasks_config["build_action_plan"])
        task_config.pop("output_json", None)
        return Task(config=task_config, output_json=CareerPaths)

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
