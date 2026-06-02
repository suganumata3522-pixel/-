"""④ 野球専門メディア RSS (フルカウント / ベースボールキング / Number Web)。"""
from __future__ import annotations

import re

from .base import Collector, TopicItem
from ._rss_helper import fetch_rss


def _slug(name: str) -> str:
    s = re.sub(r"\s+", "_", name.strip().lower())
    return re.sub(r"[^a-z0-9_]", "", s) or "specialty"


class SpecialtyMediaCollector(Collector):
    name = "rss_specialty"
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
                source=f"specialty/{_slug(name)}" if name else "specialty",
                category="rss",
                base_score=2.5,  # 専門誌は深い記事なのでやや高め
            )
        return items
