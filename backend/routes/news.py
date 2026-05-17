from fastapi import APIRouter
import httpx
from bs4 import BeautifulSoup
import asyncio
from datetime import datetime
import logging

router = APIRouter()
logger = logging.getLogger("news_scraper")

# Cache to store news so we don't spam the website
_news_cache = []
_last_fetch_time = 0
CACHE_TTL = 120  # 2 minutes

def fetch_sharesansar_news():
    try:
        url = "https://www.sharesansar.com/category/latest"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        
        # We use a synchronous request here because it's easier to parse immediately, 
        # but for FastAPI it's better to use httpx asynchronously
        with httpx.Client(headers=headers, timeout=10.0) as client:
            response = client.get(url)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'lxml')
            
            news_items = []
            
            # Find the news blocks. Sharesansar usually has news in <div class="featured-news-list">
            news_blocks = soup.find_all('div', class_='featured-news-list')
            
            for i, block in enumerate(news_blocks[:20]): # get top 20
                headline_elem = block.find('h4', class_='featured-news-title')
                date_elem = block.find('span', class_='text-org')
                
                if headline_elem and headline_elem.parent.name == 'a':
                    headline = headline_elem.text.strip()
                    link = headline_elem.parent.get('href', '')
                    date_str = date_elem.text.strip() if date_elem else datetime.now().strftime("%Y-%m-%d")
                    
                    # Sentiment heuristic (basic)
                    headline_lower = headline.lower()
                    sentiment = "neutral"
                    if any(word in headline_lower for word in ['profit', 'growth', 'surge', 'dividend', 'bonus', 'rise', 'up']):
                        sentiment = "positive"
                    elif any(word in headline_lower for word in ['loss', 'decline', 'plunge', 'fall', 'down', 'penalty']):
                        sentiment = "negative"
                        
                    # Category heuristic
                    category = "Market"
                    if "ipo" in headline_lower or "fpo" in headline_lower or "right share" in headline_lower:
                        category = "IPO"
                    elif "nrb" in headline_lower or "policy" in headline_lower or "sebon" in headline_lower:
                        category = "Policy"
                    elif "profit" in headline_lower or "report" in headline_lower or "q1" in headline_lower or "q2" in headline_lower or "q3" in headline_lower or "q4" in headline_lower:
                        category = "Financial"

                    news_items.append({
                        "id": i + 1,
                        "headline": headline,
                        "source": "ShareSansar",
                        "date": date_str,
                        "category": category,
                        "sentiment": sentiment,
                        "url": link
                    })
                    
            return news_items
    except Exception as e:
        logger.error(f"Error fetching news: {e}")
        return []

@router.get("/")
async def get_latest_news():
    global _news_cache, _last_fetch_time
    
    current_time = datetime.now().timestamp()
    
    if not _news_cache or (current_time - _last_fetch_time) > CACHE_TTL:
        # Run synchronous fetching in a thread pool to avoid blocking async loop
        new_data = await asyncio.to_thread(fetch_sharesansar_news)
        if new_data:
            _news_cache = new_data
            _last_fetch_time = current_time
            
    # If fetch failed and cache is empty, return fallback
    if not _news_cache:
        return {
            "data": [
                { "id": 1, "headline": "Could not fetch live news at this time.", "source": "System", "date": datetime.now().strftime("%Y-%m-%d"), "category": "System", "sentiment": "neutral" }
            ]
        }
        
    return {"data": _news_cache}
