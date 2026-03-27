"""Deep Research agent — multi-perspective research briefs on any topic."""

METADATA = {
    "name": "Deep Research",
    "description": "Get a comprehensive research brief on any topic — key findings, sources, contrasting viewpoints, and a synthesis.",
    "icon": "BookOpen",
    "color": "#8B5CF6",
    "status": "active",
    "outputType": "research_brief",
    "inputFields": [
        {
            "name": "query",
            "label": "What do you want researched?",
            "type": "text",
            "placeholder": "e.g. Impact of AI on software engineering jobs in 2025",
            "required": True,
        },
        {
            "name": "country",
            "label": "Focus region",
            "type": "select",
            "options": ["Global", "India", "United States", "Europe", "Asia"],
            "default": "Global",
            "required": True,
        },
    ],
    "steps": [
        "Scoping the research",
        "Gathering sources",
        "Analyzing perspectives",
        "Cross-referencing claims",
        "Synthesizing brief",
    ],
}
