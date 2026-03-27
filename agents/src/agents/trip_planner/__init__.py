"""Trip Planner agent — creates detailed day-by-day travel itineraries with budget estimates."""

METADATA = {
    "name": "Trip Planner",
    "description": "Plan your perfect trip — day-by-day itinerary with activities, stays, food spots, and budget breakdown.",
    "icon": "MapPin",
    "color": "#F59E0B",
    "status": "active",
    "outputType": "trip_itinerary",
    "inputFields": [
        {
            "name": "query",
            "label": "Describe your trip",
            "type": "text",
            "placeholder": "e.g. 5-day trip to Goa for a group of 4 friends, budget ₹40k total",
            "required": True,
        },
        {
            "name": "country",
            "label": "Region",
            "type": "select",
            "options": ["India", "Southeast Asia", "Europe", "United States", "Japan"],
            "default": "India",
            "required": True,
        },
    ],
    "steps": [
        "Understanding trip requirements",
        "Researching destination",
        "Planning daily itinerary",
        "Finding stays & food",
        "Building budget breakdown",
    ],
}
