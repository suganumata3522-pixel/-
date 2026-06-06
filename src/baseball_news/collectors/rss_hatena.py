"""⑤ はてなブックマーク (野球関連クエリの人気エントリ)。"""
from __future__ import annotations

from .base import Collector, TopicItem
from ._rss_helper import fetch_rss


class HatenaBookmarkCollector(Collector):
    name = "rss_hatena"
    category = "social"

    def fetch(self, cfg: dict) -> list[TopicItem]:
        feeds = cfg.get("feeds") or []
        items: list[TopicItem] = []
        for url in feeds:
            if not url:
                continue
            # はてブの人気エントリ = 既に世間で話題になっている指標なので高めスコア
            items += fetch_rss(url, source="hatena_bookmark", category="social", base_score=3.0)
        return items
