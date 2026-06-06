"""⑩ X (旧 Twitter) API v2 — recent search エンドポイント。

要 X_BEARER_TOKEN (Basic プラン課金、月 $200)。未設定なら自動 skip。
"""
from __future__ import annotations

import math
import os

import httpx
from dateutil import parser as dt_parser

from .base import USER_AGENT, Collector, TopicItem


class XTwitterCollector(Collector):
    name = "x_twitter"
    category = "social"

    def fetch(self, cfg: dict) -> list[TopicItem]:
        token = os.environ.get("X_BEARER_TOKEN")
        if not token:
            print("[x_twitter] X_BEARER_TOKEN 未設定のため skip")
            return []

        queries: list[str] = cfg.get("queries") or []
        max_results = max(10, min(100, int(cfg.get("max_results", 30))))

        items: list[TopicItem] = []
        with httpx.Client(
            headers={
                "Authorization": f"Bearer {token}",
                "User-Agent": USER_AGENT,
            },
            timeout=15.0,
        ) as client:
            for q in queries:
                if not q:
                    continue
                params = {
                    "query": q,
                    "max_results": max_results,
                    "tweet.fields": "public_metrics,created_at,lang,author_id",
                    "sort_order": "relevancy",
                }
                try:
                    r = client.get(
                        "https://api.x.com/2/tweets/search/recent",
                        params=params,
                    )
                except httpx.HTTPError as e:
                    print(f"[x_twitter] request failed for {q!r}: {e}")
                    continue
                if r.status_code == 429:
                    print("[x_twitter] rate limited; stopping")
                    break
                if r.status_code != 200:
                    print(f"[x_twitter] HTTP {r.status_code} for {q!r}: {r.text[:200]}")
                    continue

                data = r.json()
                for t in data.get("data", []):
                    tid = t.get("id")
                    text = (t.get("text") or "").strip()
                    if not tid or not text:
                        continue
                    metrics = t.get("public_metrics") or {}
                    likes = int(metrics.get("like_count", 0) or 0)
                    rts = int(metrics.get("retweet_count", 0) or 0)
                    replies = int(metrics.get("reply_count", 0) or 0)
                    engagement = likes + rts * 2 + replies
                    try:
                        pub = dt_parser.isoparse(t["created_at"]) if t.get("created_at") else None
                    except (TypeError, ValueError):
                        pub = None
                    items.append(
                        TopicItem(
                            title=text[:140],
                            url=f"https://x.com/i/status/{tid}",
                            source="x_twitter",
                            source_category="social",
                            published_at=pub,
                            summary=text[:400],
                            score=1.5 + math.log2(engagement + 1),
                            raw={"id": tid, "metrics": metrics, "query": q},
                        )
                    )
        return items
