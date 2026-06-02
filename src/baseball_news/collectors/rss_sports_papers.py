"""③ スポーツ紙 5 紙の RSS。"""
from __future__ import annotations

import re

from .base import Collector, TopicItem
from ._rss_helper import fetch_rss


def _slug(name: str) -> str:
    s = re.sub(r"\s+", "_", name.strip().lower())
    return re.sub(r"[^a-z0-9_]", "", s) or "sports_paper"


class SportsPapersCollector(Collector):
    name = "rss_sports_papers"
    category = "rss"

    def fetch(self, cfg: dict) -> list[TopicItem]:
        feeds = cfg.get("feeds") or []
        items: list[TopicItem] = []
        for f in feeds:
            url = (f or {}).get("url")
            name = (f or {}).get("name", "")
            if not url:
                continue
            items += fetch_rss(
                url,
                source=f"sports_papers/{_slug(name)}" if name else "sports_papers",
                category="rss",
                base_score=2.0,
            )
        return items
