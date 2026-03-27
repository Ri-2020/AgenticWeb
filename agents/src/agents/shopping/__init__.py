"""Shopping agent — finds and compares products across online marketplaces."""

METADATA = {
    "name": "Shopping Assistant",
    "description": "Find and compare the best products across Amazon, Flipkart, and more.",
    "icon": "ShoppingCart",
    "color": "#3B82F6",
    "status": "active",
    "outputType": "product_grid",
    "inputFields": [
        {
            "name": "query",
            "label": "What are you looking for?",
            "type": "text",
            "placeholder": "e.g. wireless earbuds under ₹2000 with good bass",
            "required": True,
        },
        {
            "name": "country",
            "label": "Country",
            "type": "select",
            "options": ["India", "United States", "United Kingdom"],
            "default": "India",
            "required": True,
        },
    ],
    "steps": [
        "Analyzing requirements",
        "Building search queries",
        "Searching marketplaces",
        "Analyzing products",
        "Generating recommendations",
    ],
}
