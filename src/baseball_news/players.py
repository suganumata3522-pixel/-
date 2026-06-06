"""選手プロフィール取得。NPB 公式を優先し、見つからなければ Wikipedia 日本語版にフォールバック。

通算成績などの構造化データは取れた範囲だけ career_stats に詰める。
本文 (bio_text) は Claude にそのままコンテキストとして渡すための要約テキスト。
"""
from __future__ import annotations

import re
import urllib.parse
from dataclasses import asdict, dataclass, field
from typing import Any
from urllib.parse import urljoin

import httpx
import trafilatura
from bs4 import BeautifulSoup

from .collectors.base import USER_AGENT

# teams.py のキー → npb.jp の球団ショートコード
NPB_TEAM_CODE = {
    "giants": "g",
    "hanshin": "t",
    "carp": "c",
    "dragons": "d",
    "swallows": "s",
    "baystars": "db",
    "hawks": "h",
    "marines": "m",
    "fighters": "f",
    "lions": "l",
    "eagles": "e",
    "buffaloes": "bs",
}


@dataclass
class PlayerProfile:
    name: str
    found: bool = True
    team_key: str = ""
    bio_text: str = ""
    career_stats: dict[str, Any] = field(default_factory=dict)
    source_urls: list[str] = field(default_factory=list)
    source: str = ""  # "npb_official" or "wikipedia"

    def to_dict(self) -> dict:
        return asdict(self)


def _norm(name: str) -> str:
    return re.sub(r"\s+", "", (name or "").strip())


class PlayerLookup:
    """選手名 → PlayerProfile。NPB 公式 → Wikipedia の順でフォールバック。"""

    def __init__(self, cfg: dict | None = None):
        self.cfg = cfg or {}
        self._client = httpx.Client(
            headers={
                "User-Agent": USER_AGENT,
                "Accept-Language": "ja-JP,ja;q=0.9",
            },
            timeout=20.0,
            follow_redirects=True,
        )
        # name(空白除去) -> (team_key, url)
        self._npb_index: dict[str, tuple[str, str]] | None = None
        self._cache: dict[str, PlayerProfile] = {}

    # --- lifecycle ----------------------------------------------------------

    def close(self) -> None:
        self._client.close()

    def __enter__(self) -> "PlayerLookup":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self.close()

    # --- public API ---------------------------------------------------------

    def find(self, name: str) -> PlayerProfile:
        name = (name or "").strip()
        if not name:
            return PlayerProfile(name="", found=False)
        if name in self._cache:
            return self._cache[name]

        sources = (self.cfg.get("stats_sources") or ["npb_official", "wikipedia"])
        prof: PlayerProfile | None = None
        for src in sources:
            if src == "npb_official":
                prof = self._npb_lookup(name)
            elif src == "wikipedia":
                prof = self._wikipedia_lookup(name)
            if prof and prof.found:
                break

        if prof is None:
            prof = PlayerProfile(name=name, found=False)
        self._cache[name] = prof
        return prof

    # --- NPB 公式 ----------------------------------------------------------

    def _ensure_npb_index(self) -> dict[str, tuple[str, str]]:
        if self._npb_index is not None:
            return self._npb_index
        index: dict[str, tuple[str, str]] = {}
        for team_key, code in NPB_TEAM_CODE.items():
            url = f"https://npb.jp/bis/teams/rst_{code}.html"
            try:
                r = self._client.get(url)
            except httpx.HTTPError as e:
                print(f"[players] NPB index fetch failed {url}: {e}")
                continue
            if r.status_code != 200:
                continue
            soup = BeautifulSoup(r.text, "lxml")
            for a in soup.select("a[href*='/bis/players/']"):
                href = (a.get("href") or "").strip()
                nm = a.get_text(" ", strip=True)
                if not nm or not href:
                    continue
                key = _norm(nm)
                if key and key not in index:
                    index[key] = (team_key, urljoin(url, href))
        self._npb_index = index
        return index

    def _npb_lookup(self, name: str) -> PlayerProfile | None:
        try:
            idx = self._ensure_npb_index()
        except Exception as e:  # noqa: BLE001
            print(f"[players] NPB index build failed: {e}")
            return None
        entry = idx.get(_norm(name))
        if entry is None:
            return None
        team_key, url = entry
        try:
            r = self._client.get(url)
            if r.status_code != 200:
                return None
        except httpx.HTTPError as e:
            print(f"[players] NPB profile fetch failed {url}: {e}")
            return None

        soup = BeautifulSoup(r.text, "lxml")
        bio_text = trafilatura.extract(r.text) or soup.get_text(" ", strip=True)

        # 通算成績らしき行を探す: 「通算」が含まれる tr とその直前のヘッダ tr をマージ
        stats: dict[str, Any] = {}
        for table in soup.find_all("table"):
            for tr in table.find_all("tr"):
                cells = [c.get_text(" ", strip=True) for c in tr.find_all(["th", "td"])]
                if cells and "通算" in cells[0]:
                    header_row = tr.find_previous_sibling("tr")
                    headers: list[str] = []
                    if header_row:
                        headers = [
                            c.get_text(" ", strip=True)
                            for c in header_row.find_all(["th", "td"])
                        ]
                    for h, v in zip(headers[1:], cells[1:]):
                        if h:
                            stats[h] = v
                    break
            if stats:
                break

        return PlayerProfile(
            name=name,
            found=True,
            team_key=team_key,
            bio_text=(bio_text or "")[:2000],
            career_stats=stats,
            source_urls=[url],
            source="npb_official",
        )

    # --- Wikipedia フォールバック ------------------------------------------

    def _wikipedia_lookup(self, name: str) -> PlayerProfile:
        title = urllib.parse.quote(name, safe="")
        api_url = f"https://ja.wikipedia.org/api/rest_v1/page/summary/{title}"
        try:
            r = self._client.get(api_url)
        except httpx.HTTPError as e:
            print(f"[players] Wikipedia lookup failed for {name}: {e}")
            return PlayerProfile(name=name, found=False, source="wikipedia")
        if r.status_code != 200:
            return PlayerProfile(name=name, found=False, source="wikipedia")
        try:
            data = r.json()
        except ValueError:
            return PlayerProfile(name=name, found=False, source="wikipedia")

        extract = (data.get("extract") or "").strip()
        if not extract:
            return PlayerProfile(name=name, found=False, source="wikipedia")
        content_url = (
            (data.get("content_urls") or {})
            .get("desktop", {})
            .get("page")
            or f"https://ja.wikipedia.org/wiki/{title}"
        )
        return PlayerProfile(
            name=name,
            found=True,
            bio_text=extract[:2000],
            source_urls=[content_url],
            source="wikipedia",
        )
