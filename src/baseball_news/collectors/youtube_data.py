"""⑧ YouTube Data API v3 で直近 48h の高再生動画を検索。"""
from __future__ import annotations

import math
import os
from datetime import datetime, timedelta, timezone

from dateutil import parser as dt_parser

from .base import Collector, TopicItem


class YouTubeDataCollector(Collector):
    name = "youtube_data"
    category = "video"

    def fetch(self, cfg: dict) -> list[TopicItem]:
        api_key = os.environ.get("YOUTUBE_API_KEY")
        if not api_key:
            print("[youtube_data] YOUTUBE_API_KEY 未設定のため skip")
            return []

        from googleapiclient.discovery import build  # type: ignore
        from googleapiclient.errors import HttpError  # type: ignore

        yt = build("youtube", "v3", developerKey=api_key, cache_discovery=False)

        queries: list[str] = cfg.get("queries") or []
        region = cfg.get("region_code", "JP")
        max_results = int(cfg.get("max_results", 20))
        published_after = (
            datetime.now(timezone.utc) - timedelta(hours=48)
        ).isoformat(timespec="seconds").replace("+00:00", "Z")

        items: list[TopicItem] = []
        # 1) search.list で候補を集める (snippet のみ)
        video_ids: list[str] = []
        id_to_snippet: dict[str, dict] = {}
        for q in queries:
            if not q:
                continue
            try:
                res = (
                    yt.search()
                    .list(
                        q=q,
                        part="snippet",
                        type="video",
                        order="viewCount",
                        publishedAfter=published_after,
                        regionCode=region,
                        relevanceLanguage="ja",
                        maxResults=min(50, max_results),
                    )
                    .execute()
                )
            except HttpError as e:
                print(f"[youtube_data] search.list failed for {q!r}: {e}")
                continue
            for it in res.get("items", []):
                vid = (it.get("id") or {}).get("videoId")
                sn = it.get("snippet") or {}
                if not vid or vid in id_to_snippet:
                    continue
                id_to_snippet[vid] = sn
                video_ids.append(vid)

        if not video_ids:
            return []

        # 2) videos.list で statistics (再生数) を取得
        stats: dict[str, dict] = {}
        for i in range(0, len(video_ids), 50):
            chunk = video_ids[i : i + 50]
            try:
                res = yt.videos().list(part="statistics", id=",".join(chunk)).execute()
            except HttpError as e:
                print(f"[youtube_data] videos.list failed: {e}")
                continue
            for it in res.get("items", []):
                vid = it.get("id")
                if vid:
                    stats[vid] = it.get("statistics", {}) or {}

        # 3) TopicItem 化
        for vid in video_ids:
            sn = id_to_snippet[vid]
            st = stats.get(vid, {})
            views = int(st.get("viewCount", 0) or 0)
            try:
                pub = dt_parser.isoparse(sn.get("publishedAt"))
            except (TypeError, ValueError):
                pub = None
            items.append(
                TopicItem(
                    title=sn.get("title", "")[:200],
                    url=f"https://www.youtube.com/watch?v={vid}",
                    source="youtube_data",
                    source_category="video",
                    published_at=pub,
                    summary=(sn.get("description") or "")[:400],
                    score=2.0 + min(6.0, math.log10(max(views, 10)) - 1.0),
                    raw={"channel": sn.get("channelTitle"), "views": views},
                )
            )
        return items
