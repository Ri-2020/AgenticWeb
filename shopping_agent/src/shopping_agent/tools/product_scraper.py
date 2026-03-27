import requests
from bs4 import BeautifulSoup
from crewai.tools import BaseTool


class ProductScraperTool(BaseTool):
    name: str = "product_page_scraper"
    description: str = (
        "Scrapes a product page URL and extracts title, price, rating and description."
    )

    def _run(self, url: str) -> dict:
        try:
            headers = {
                "User-Agent": "Mozilla/5.0"
            }

            response = requests.get(url, headers=headers, timeout=10)
            soup = BeautifulSoup(response.text, "html.parser")

            title = soup.title.string if soup.title else "Unknown"

            # simple price detection
            price = None
            for p in soup.find_all(text=True):
                if "₹" in p:
                    price = p.strip()
                    break

            return {
                "url": url,
                "title": title,
                "price": price
            }

        except Exception as e:
            return {
                "url": url,
                "error": str(e)
            }