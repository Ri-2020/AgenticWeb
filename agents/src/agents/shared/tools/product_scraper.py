"""Product page scraper tool — shared across agents that need web scraping."""

from __future__ import annotations

import re
import logging
from typing import Any

import requests
from bs4 import BeautifulSoup
from crewai.tools import BaseTool

logger = logging.getLogger(__name__)

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


class ProductScraperTool(BaseTool):
    name: str = "product_page_scraper"
    description: str = (
        "Scrapes a product page URL and extracts the product title and price. "
        "Input should be a valid product page URL."
    )

    def _run(self, url: str) -> dict[str, Any]:
        try:
            resp = requests.get(url, headers=_HEADERS, timeout=15)
            resp.raise_for_status()
        except requests.RequestException as exc:
            return {"url": url, "error": f"Failed to fetch: {exc}"}

        soup = BeautifulSoup(resp.text, "html.parser")

        title_tag = soup.find("title")
        title = title_tag.get_text(strip=True) if title_tag else "Unknown"

        price = "Not found"
        price_match = re.search(r"[\u20B9$€£]\s?[\d,]+(?:\.\d{2})?", soup.get_text())
        if price_match:
            price = price_match.group(0)

        return {"url": url, "title": title, "price": price}
