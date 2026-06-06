"""② Google News RSS。クエリごとに検索 RSS を組み立てて取得。"""
from __future__ import annotations

import urllib.parse

from .base import Collector, TopicItem
from ._rss_helper import fetch_rss


def _build_url(query: str, hl: str, gl: str, ceid: str) -> str:
    q = urllib.parse.quote(query)
    return f"https://news.google.com/rss/search?q={q}&hl={hl}&gl={gl}&ceid={ceid}"


class GoogleNewsCollector(Collector):
    name = "rss_google_news"
    category = "rss"

    def fetch(self, cfg: dict) -> list[TopicItem]:
        queries = cfg.get("queries") or []
        hl = cfg.get("hl", "ja")
        gl = cfg.get("gl", "JP")
        ceid = cfg.get("ceid", "JP:ja")
        items: list[TopicItem] = []
        for q in queries:
            if not q:
                continue
            url = _build_url(q, hl, gl, ceid)
            items += fetch_rss(url, source="google_news", category="rss", base_score=1.5)
        return items
