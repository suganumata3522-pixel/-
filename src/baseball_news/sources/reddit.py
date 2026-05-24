from datetime import datetime, timezone
from typing import Iterable

import httpx

from ..models import NewsItem

USER_AGENT = "baseball-news-bot/0.1 (+https://example.com)"


def fetch_subreddit(name: str, limit: int = 25) -> list[NewsItem]:
    url = f"https://www.reddit.com/r/{name}/hot.json?limit={limit}"
    headers = {"User-Agent": USER_AGENT}
    try:
        resp = httpx.get(url, headers=headers, timeout=15.0)
        resp.raise_for_status()
    except httpx.HTTPError:
        return []

    children = resp.json().get("data", {}).get("children", [])
    items: list[NewsItem] = []
    for c in children:
        d = c.get("data", {})
        if d.get("stickied"):
            continue
        title = (d.get("title") or "").strip()
        link = d.get("url_overridden_by_dest") or d.get("url") or ""
        if not title or not link:
            continue
        created = d.get("created_utc")
        published = (
            datetime.fromtimestamp(created, tz=timezone.utc) if created else None
        )
        items.append(
            NewsItem(
                title=title,
                url=link,
                source=f"Reddit r/{name}",
                published_at=published,
                summary=(d.get("selftext") or "").strip()[:500],
            )
        )
    return items


def fetch_reddit(subreddits: Iterable[str]) -> list[NewsItem]:
    out: list[NewsItem] = []
    for sub in subreddits:
        out.extend(fetch_subreddit(sub))
    return out
