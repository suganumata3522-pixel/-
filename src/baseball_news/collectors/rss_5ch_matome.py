"""⑥ なんJ系 5ch まとめサイト RSS。"""
from __future__ import annotations

import re

from .base import Collector, TopicItem
from ._rss_helper import fetch_rss


def _slug(name: str) -> str:
    s = re.sub(r"\s+", "_", name.strip().lower())
    return re.sub(r"[^a-z0-9_]", "", s) or "5ch_matome"


class FiveChMatomeCollector(Collector):
    name = "rss_5ch_matome"
    category = "social"

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
                source=f"5ch_matome/{_slug(name)}" if name else "5ch_matome",
                category="social",
                base_score=1.0,  # ノイズ多いので低め
            )
        return items
