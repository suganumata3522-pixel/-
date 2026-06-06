"""⑫ Bluesky (AT Protocol) で投稿を検索。

要 BLUESKY_HANDLE / BLUESKY_APP_PASSWORD (https://bsky.app/settings/app-passwords)。
無料。未設定なら自動 skip。
"""
from __future__ import annotations

import math
import os

from dateutil import parser as dt_parser

from .base import Collector, TopicItem


class BlueskyCollector(Collector):
    name = "bluesky"
    category = "social"

    def fetch(self, cfg: dict) -> list[TopicItem]:
        handle = os.environ.get("BLUESKY_HANDLE")
        app_pw = os.environ.get("BLUESKY_APP_PASSWORD")
        if not handle or not app_pw:
            print("[bluesky] BLUESKY_HANDLE / BLUESKY_APP_PASSWORD 未設定のため skip")
            return []

        from atproto import Client  # type: ignore

        client = Client()
        client.login(handle, app_pw)

        queries: list[str] = cfg.get("queries") or []
        limit = max(10, min(100, int(cfg.get("max_results", 30))))

        items: list[TopicItem] = []
        for q in queries:
            if not q:
                continue
            try:
                res = client.app.bsky.feed.search_posts(
                    {"q": q, "limit": limit, "lang": "ja"}
                )
            except Exception as e:  # noqa: BLE001
                print(f"[bluesky] search_posts failed for {q!r}: {type(e).__name__}: {e}")
                continue

            for post in getattr(res, "posts", []) or []:
                record = getattr(post, "record", None)
                text = getattr(record, "text", "") if record else ""
                if not text:
                    continue
                created_at = getattr(record, "created_at", None) if record else None
                pub = None
                if created_at:
                    try:
                        pub = dt_parser.isoparse(created_at)
                    except (TypeError, ValueError):
                        pub = None

                likes = int(getattr(post, "like_count", 0) or 0)
                reposts = int(getattr(post, "repost_count", 0) or 0)
                replies = int(getattr(post, "reply_count", 0) or 0)
                engagement = likes + reposts * 2 + replies

                uri = getattr(post, "uri", "") or ""
                # at://did:plc:.../app.bsky.feed.post/<rkey>
                rkey = uri.rsplit("/", 1)[-1] if uri else ""
                author_handle = getattr(getattr(post, "author", None), "handle", "") or ""
                link = (
                    f"https://bsky.app/profile/{author_handle}/post/{rkey}"
                    if author_handle and rkey
                    else uri or f"bsky://post/{rkey}"
                )

                items.append(
                    TopicItem(
                        title=text[:140],
                        url=link,
                        source="bluesky",
                        source_category="social",
                        published_at=pub,
                        summary=text[:400],
                        score=1.5 + math.log2(engagement + 1),
                        raw={"query": q, "uri": uri, "engagement": engagement},
                    )
                )
        return items
