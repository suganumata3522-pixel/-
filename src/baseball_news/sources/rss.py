from datetime import datetime, timezone
from typing import Iterable
from urllib.parse import quote_plus, urlparse

import feedparser
from dateutil import parser as dateparser

from ..models import NewsItem


def _parse_published(entry) -> datetime | None:
    for key in ("published", "updated", "created"):
        value = entry.get(key)
        if not value:
            continue
        try:
            dt = dateparser.parse(value)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)
        except (ValueError, TypeError):
            continue
    return None


def _source_label(entry, fallback: str) -> str:
    src = entry.get("source")
    if isinstance(src, dict) and src.get("title"):
        return src["title"]
    if entry.get("author"):
        return entry["author"]
    link = entry.get("link") or ""
    host = urlparse(link).netloc
    return host or fallback


def fetch_feed(url: str, fallback_source: str = "") -> list[NewsItem]:
    feed = feedparser.parse(url)
    items: list[NewsItem] = []
    for entry in feed.entries:
        title = (entry.get("title") or "").strip()
        link = (entry.get("link") or "").strip()
        if not title or not link:
            continue
        items.append(
            NewsItem(
                title=title,
                url=link,
                source=_source_label(entry, fallback_source),
                published_at=_parse_published(entry),
                summary=(entry.get("summary") or "").strip(),
            )
        )
    return items


def google_news_query_url(query: str, hl: str, gl: str, ceid: str) -> str:
    return (
        "https://news.google.com/rss/search?"
        f"q={quote_plus(query)}&hl={hl}&gl={gl}&ceid={ceid}"
    )


def fetch_google_news(queries: Iterable[str], hl: str, gl: str, ceid: str) -> list[NewsItem]:
    out: list[NewsItem] = []
    for q in queries:
        url = google_news_query_url(q, hl, gl, ceid)
        out.extend(fetch_feed(url, fallback_source="Google News"))
    return out
