"""⑦ Google Trends 急上昇クエリ (pytrends 経由)。"""
from __future__ import annotations

import math
import urllib.parse

from .base import Collector, TopicItem


class GoogleTrendsCollector(Collector):
    name = "google_trends"
    category = "trends"

    def fetch(self, cfg: dict) -> list[TopicItem]:
        # pytrends は遅延 import (重いので skip 時にロードしない)
        from pytrends.request import TrendReq  # type: ignore

        keywords = cfg.get("keywords") or []
        geo = cfg.get("geo", "JP")
        timeframe = cfg.get("timeframe", "now 1-d")
        if not keywords:
            return []

        pytrends = TrendReq(hl="ja-JP", tz=540)
        # pytrends は一度に 5 キーワードまで
        items: list[TopicItem] = []
        for i in range(0, len(keywords), 5):
            batch = keywords[i : i + 5]
            pytrends.build_payload(batch, geo=geo, timeframe=timeframe)
            related = pytrends.related_queries()  # {kw: {"top": df, "rising": df}}
            for kw, d in (related or {}).items():
                if not d:
                    continue
                rising = d.get("rising")
                if rising is None or getattr(rising, "empty", True):
                    continue
                for _, row in rising.iterrows():
                    q = str(row.get("query", "")).strip()
                    if not q:
                        continue
                    v = float(row.get("value", 0) or 0)
                    items.append(
                        TopicItem(
                            title=q,
                            url=f"https://www.google.com/search?q={urllib.parse.quote(q)}",
                            source="google_trends",
                            source_category="trends",
                            summary=f"Google Trends rising query (parent: {kw}, value: {v:g})",
                            # 上昇率 v は数百〜数千になるので log で圧縮
                            score=2.0 + min(5.0, math.log10(max(v, 10.0))),
                            raw={"parent_keyword": kw, "value": v},
                        )
                    )
        return items
