"""Pydantic output models for the trip planner agent."""

from pydantic import BaseModel


class Activity(BaseModel):
    time: str
    activity: str
    location: str
    estimated_cost: str
    tip: str


class DayPlan(BaseModel):
    day: int
    title: str
    activities: list[Activity]


class Accommodation(BaseModel):
    name: str
    type: str
    price_per_night: str
    location: str
    url: str
    reason: str


class FoodSpot(BaseModel):
    name: str
    cuisine: str
    price_range: str
    meal_type: str
    must_try: str


class BudgetItem(BaseModel):
    category: str
    estimated_cost: str
    notes: str


class TripItinerary(BaseModel):
    destination: str
    duration: str
    travel_style: str
    summary: str
    daily_plans: list[DayPlan]
    accommodations: list[Accommodation]
    food_spots: list[FoodSpot]
    budget: list[BudgetItem]
    total_estimated_cost: str
    pro_tips: list[str]
