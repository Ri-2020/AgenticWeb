"""Deep Research crew — 5 sequential agents that scope, gather, analyze, verify and synthesize."""

import os
from dotenv import load_dotenv

from crewai import Agent, Crew, Process, Task, LLM
from crewai.project import CrewBase, agent, crew, task, output_json
from crewai.agents.agent_builder.base_agent import BaseAgent
from crewai_tools import SerperDevTool

from agents.research.models import ResearchBrief

load_dotenv()

search_tool = SerperDevTool(max_usage_count=30)


def default_llm() -> LLM:
    api_key = os.environ.get("GEMINI_API_KEY")
    if api_key:
        model = os.environ.get("MODEL", "gemini/gemini-2.0-flash")
        return LLM(model=model, api_key=api_key)

    model = os.environ.get("MODEL", "ollama/qwen3:8b")
    api_base = os.environ.get("API_BASE", "http://127.0.0.1:11434")
    return LLM(model=model, api_base=api_base)


@CrewBase
class ResearchCrew:
    """Deep Research Agent Crew"""

    agents: list[BaseAgent]
    tasks: list[Task]
    _task_callback = None

    @output_json
    class BriefOutput(ResearchBrief):
        pass

    # === Agents ===

    @agent
    def research_scoper(self) -> Agent:
        return Agent(config=self.agents_config["research_scoper"], llm=default_llm(), verbose=True)

    @agent
    def source_gatherer(self) -> Agent:
        return Agent(config=self.agents_config["source_gatherer"], llm=default_llm(), tools=[search_tool], verbose=True)

    @agent
    def perspective_analyst(self) -> Agent:
        return Agent(config=self.agents_config["perspective_analyst"], llm=default_llm(), verbose=True)

    @agent
    def claim_verifier(self) -> Agent:
        return Agent(config=self.agents_config["claim_verifier"], llm=default_llm(), verbose=True)

    @agent
    def brief_synthesizer(self) -> Agent:
        return Agent(config=self.agents_config["brief_synthesizer"], llm=default_llm(), verbose=True)

    # === Tasks ===

    @task
    def scope_research(self) -> Task:
        return Task(config=self.tasks_config["scope_research"])

    @task
    def gather_sources(self) -> Task:
        return Task(config=self.tasks_config["gather_sources"])

    @task
    def analyze_perspectives(self) -> Task:
        return Task(config=self.tasks_config["analyze_perspectives"])

    @task
    def cross_reference_claims(self) -> Task:
        return Task(config=self.tasks_config["cross_reference_claims"])

    @task
    def synthesize_brief(self) -> Task:
        task_config = dict(self.tasks_config["synthesize_brief"])
        task_config.pop("output_json", None)
        return Task(config=task_config, output_json=ResearchBrief)

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
