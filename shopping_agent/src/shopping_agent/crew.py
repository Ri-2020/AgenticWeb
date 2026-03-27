
import os
from dotenv import load_dotenv

from crewai import Agent, Crew, Process, Task, LLM
from crewai.project import CrewBase, agent, crew, task, output_json
from crewai.agents.agent_builder.base_agent import BaseAgent
from crewai_tools import SerperDevTool
from src.shopping_agent.tools.product_scraper import ProductScraperTool
from shopping_agent.models import ShoppingRecommendations

load_dotenv()

search_tool = SerperDevTool(
    max_usage_count=20
)
scraper_tool = ProductScraperTool()

def default_llm() -> LLM:
    """Create LLM from environment variables"""

    # GEMINI MODEL SETUP
    api_key = os.environ.get("GEMINI_API_KEY")
    if api_key:
        model = os.environ.get("MODEL", "gemini/gemini-2.0-flash")
        return LLM(model=model, api_key=api_key)

    model = os.environ.get("MODEL", "ollama/qwen3:8b")
    api_base = os.environ.get("API_BASE", "http://127.0.0.1:11434")
    return LLM(model=model, api_base=api_base)


@CrewBase
class ShoppingAgent():
    """Shopping Agent Crew"""

    agents: list[BaseAgent]
    tasks: list[Task]

    @output_json
    class RecommendationsOutput(ShoppingRecommendations):
        pass

    # =========================
    # AGENTS
    # =========================

    @agent
    def requirement_extractor(self) -> Agent:
        return Agent(
            config=self.agents_config["requirement_extractor"],
            llm=default_llm(),
            verbose=True
        )

    @agent
    def query_builder(self) -> Agent:
        return Agent(
            config=self.agents_config["query_builder"],
            llm=default_llm(),
            verbose=True
        )

    @agent
    def marketplace_searcher(self) -> Agent:
        return Agent(
            config=self.agents_config["marketplace_searcher"],
            llm=default_llm(),
            tools=[search_tool],   # ⭐ IMPORTANT
            verbose=True
        )
    
    @agent
    def product_analyst(self) -> Agent:
        return Agent(
            config=self.agents_config["product_analyst"],
            llm=default_llm(),
            tools=[scraper_tool],
            verbose=True
        )

    @agent
    def recommendation_generator(self) -> Agent:
        return Agent(
            config=self.agents_config["recommendation_generator"],
            llm=default_llm(),
            verbose=True
        )

    # =========================
    # TASKS
    # =========================

    @task
    def extract_requirements(self) -> Task:
        return Task(
            config=self.tasks_config["extract_requirements"],
        )

    @task
    def build_search_queries(self) -> Task:
        return Task(
            config=self.tasks_config["build_search_queries"],
        )

    @task
    def search_marketplace(self) -> Task:
        return Task(
            config=self.tasks_config["search_marketplace"],
        )

    @task
    def analyze_products(self) -> Task:
        return Task(
            config=self.tasks_config["analyze_products"],
        )

    @task
    def generate_recommendations(self) -> Task:
        # CrewAI maps YAML `output_json` to an OutputJsonClass wrapper.
        # Task expects a real BaseModel subclass, so pass the model class directly.
        task_config = dict(self.tasks_config["generate_recommendations"])
        task_config.pop("output_json", None)
        return Task(
            config=task_config,
            output_json=ShoppingRecommendations,
        )

    # =========================
    # CREW
    # =========================

    @crew
    def crew(self) -> Crew:
        """Creates the Shopping Agent Crew"""

        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            process=Process.sequential,
            verbose=True
        )
