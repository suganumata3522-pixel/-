"""⑨ NPB 公式から試合速報リンクをスクレイプ。

公式 RSS は無いので、直近月のスケジュールページから試合詳細リンクを拾う。
HTML 構造が変わると壊れるため、見つからなければ空リストを返す。
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

from .base import USER_AGENT, Collector, TopicItem

JST = timezone(timedelta(hours=9))


class NpbOfficialCollector(Collector):
    name = "npb_official"
    category = "official"

    def fetch(self, cfg: dict) -> list[TopicItem]:
        base = (cfg.get("base_url") or "https://npb.jp").rstrip("/")
        now = datetime.now(JST)
        # 今月と (1 日台なら) 先月のスケジュールを見る
        targets = [(now.year, now.month)]
        if now.day <= 3:
            prev = now.replace(day=1) - timedelta(days=1)
            targets.append((prev.year, prev.month))

        items: list[TopicItem] = []
        seen_urls: set[str] = set()

        with httpx.Client(
            headers={"User-Agent": USER_AGENT, "Accept-Language": "ja-JP,ja;q=0.9"},
            timeout=15.0,
            follow_redirects=True,
        ) as client:
            for year, month in targets:
                url = f"{base}/games/{year}/schedule_{month:02d}_detail.html"
                try:
                    r = client.get(url)
                except httpx.HTTPError as e:
                    print(f"[npb_official] fetch failed {url}: {e}")
                    continue
                if r.status_code != 200:
                    continue
                soup = BeautifulSoup(r.text, "lxml")
                # 試合詳細 (boxscore) リンク。npb.jp は /scores/<...>/ を使う
                for a in soup.select('a[href*="/scores/"]'):
                    href = a.get("href", "").strip()
                    if not href:
                        continue
                    link = urljoin(url, href)
                    if link in seen_urls:
                        continue
                    seen_urls.add(link)
                    text = a.get_text(" ", strip=True) or "NPB 試合"
                    items.append(
                        TopicItem(
                            title=f"NPB 試合: {text}",
                            url=link,
                            source="npb_official",
                            source_category="official",
                            published_at=now,
                            summary="NPB 公式の試合詳細ページ",
                            score=1.0,
                            raw={"schedule_url": url},
                        )
                    )
        return items
