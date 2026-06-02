"""RSS / Atom 共通の取得ヘルパー。"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

import feedparser

from .base import USER_AGENT, TopicItem, strip_html


def _parse_dt(entry) -> Optional[datetime]:
    for key in ("published_parsed", "updated_parsed"):
        t = getattr(entry, key, None) or entry.get(key) if hasattr(entry, "get") else getattr(entry, key, None)
        if t:
            try:
                return datetime(*t[:6], tzinfo=timezone.utc)
            except (TypeError, ValueError):
                pass
    return None


def fetch_rss(
    url: str,
    source: str,
    category: str = "rss",
    base_score: float = 1.0,
    limit: int = 100,
) -> list[TopicItem]:
    """1 つの RSS/Atom feed から TopicItem を生成する。

    エラー時は呼び出し側 (Collector.safe_fetch) で吸収する想定。空リストは返さない。
    """
    feed = feedparser.parse(
        url,
        request_headers={"User-Agent": USER_AGENT, "Accept": "application/rss+xml, */*"},
    )
    items: list[TopicItem] = []
    for entry in (feed.entries or [])[:limit]:
        title = (entry.get("title") or "").strip()
        link = (entry.get("link") or "").strip()
        if not title or not link:
            continue
        summary = strip_html(entry.get("summary") or entry.get("description") or "")
        items.append(
            TopicItem(
                title=title,
                url=link,
                source=source,
                source_category=category,
                published_at=_parse_dt(entry),
                summary=summary[:400],
                score=base_score,
                raw={"feed_url": url},
            )
        )
    return items
