"""① Yahoo!ニュース 野球カテゴリ RSS。"""
from __future__ import annotations

from .base import Collector, TopicItem
from ._rss_helper import fetch_rss


class YahooNewsCollector(Collector):
    name = "rss_yahoo"
    category = "rss"

    def fetch(self, cfg: dict) -> list[TopicItem]:
        feeds = cfg.get("feeds") or []
        items: list[TopicItem] = []
        for url in feeds:
            if not url:
                continue
            items += fetch_rss(url, source="yahoo_news", category="rss", base_score=2.0)
        return items
