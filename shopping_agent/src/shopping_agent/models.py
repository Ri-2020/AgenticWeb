from pydantic import BaseModel


class ProductRecommendation(BaseModel):
    product_name: str
    price: str
    url: str
    reason: str


class CategoryRecommendation(BaseModel):
    category: str
    best_match: ProductRecommendation
    alternatives: list[ProductRecommendation]


class ShoppingRecommendations(BaseModel):
    recommendations: list[CategoryRecommendation]
