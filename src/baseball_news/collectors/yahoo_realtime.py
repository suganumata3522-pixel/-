"""⑪ Yahoo!リアルタイム検索のスクレイプ。

SPA 化されているためサーバ HTML からの抽出は不安定。
ベストエフォートで動かす — 取れなければ空リストを返す。
"""
from __future__ import annotations

import json
import re
import urllib.parse

import httpx
from bs4 import BeautifulSoup

from .base import USER_AGENT, Collector, TopicItem

_NEXT_DATA_RE = re.compile(
    r'<script\s+id="__NEXT_DATA__"[^>]*>(.+?)</script>', re.DOTALL
)


def _extract_from_next_data(html: str) -> list[dict]:
    """__NEXT_DATA__ JSON からツイート相当のオブジェクトを掘り出す。"""
    m = _NEXT_DATA_RE.search(html)
    if not m:
        return []
    try:
        data = json.loads(m.group(1))
    except json.JSONDecodeError:
        return []

    # 構造が安定しないので再帰的に "tweet" っぽいオブジェクトを収集
    found: list[dict] = []

    def walk(node):
        if isinstance(node, dict):
            # 典型キー: id, text, screenName, userName, createdAt
            if "text" in node and ("id" in node or "tweetId" in node):
                found.append(node)
            for v in node.values():
                walk(v)
        elif isinstance(node, list):
            for v in node:
                walk(v)

    walk(data)
    return found


class YahooRealtimeCollector(Collector):
    name = "yahoo_realtime"
    category = "social"

    def fetch(self, cfg: dict) -> list[TopicItem]:
        queries: list[str] = cfg.get("queries") or []
        items: list[TopicItem] = []
        seen_urls: set[str] = set()

        with httpx.Client(
            headers={
                "User-Agent": USER_AGENT,
                "Accept-Language": "ja-JP,ja;q=0.9",
            },
            timeout=15.0,
            follow_redirects=True,
        ) as client:
            for q in queries:
                if not q:
                    continue
                url = (
                    "https://search.yahoo.co.jp/realtime/search?p="
                    + urllib.parse.quote(q)
                )
                try:
                    r = client.get(url)
                except httpx.HTTPError as e:
                    print(f"[yahoo_realtime] fetch failed for {q!r}: {e}")
                    continue
                if r.status_code != 200:
                    continue

                tweets = _extract_from_next_data(r.text)
                # フォールバック: HTML 上のリンクをかき集める
                if not tweets:
                    soup = BeautifulSoup(r.text, "lxml")
                    for a in soup.select(
                        'a[href*="twitter.com"], a[href*="x.com/"]'
                    ):
                        href = (a.get("href") or "").strip()
                        text = a.get_text(" ", strip=True)
                        if not href or not text:
                            continue
                        if "/status/" not in href:
                            continue
                        if href in seen_urls:
                            continue
                        seen_urls.add(href)
                        items.append(
                            TopicItem(
                                title=text[:140],
                                url=href,
                                source="yahoo_realtime",
                                source_category="social",
                                summary=text[:400],
                                score=1.0,
                                raw={"query": q, "via": "html_fallback"},
                            )
                        )
                    continue

                for t in tweets:
                    tid = str(t.get("id") or t.get("tweetId") or "").strip()
                    text = (t.get("text") or "").strip()
                    if not tid or not text:
                        continue
                    user = (
                        t.get("screenName") or t.get("userName") or "i"
                    )
                    link = f"https://x.com/{user}/status/{tid}"
                    if link in seen_urls:
                        continue
                    seen_urls.add(link)
                    items.append(
                        TopicItem(
                            title=text[:140],
                            url=link,
                            source="yahoo_realtime",
                            source_category="social",
                            summary=text[:400],
                            score=1.5,
                            raw={"query": q},
                        )
                    )
        return items
