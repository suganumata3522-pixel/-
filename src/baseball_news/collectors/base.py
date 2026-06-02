"""話題収集 collector の共通スキーマと基底クラス。"""
from __future__ import annotations

import hashlib
import re
from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Optional

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0 Safari/537.36 baseball-news/0.1"
)


@dataclass
class TopicItem:
    """1 件の話題 (記事 / ポスト / 動画 / トレンド)。

    複数の collector が同じ話題を拾うので、topics.aggregate() で重複統合される。
    """

    title: str
    url: str
    source: str           # 例: "yahoo_news", "nikkansports", "5ch_nanjpride"
    source_category: str  # 例: "rss", "trends", "social", "video", "official"
    published_at: Optional[datetime] = None
    summary: str = ""
    score: float = 0.0
    raw: dict = field(default_factory=dict)
    # aggregate() 後に詰まる
    id: str = ""
    duplicates: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        if not self.id:
            self.id = hashlib.sha1(self.url.encode("utf-8")).hexdigest()[:12]

    def to_dict(self) -> dict:
        d = asdict(self)
        d["published_at"] = self.published_at.isoformat() if self.published_at else None
        return d


_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")


def strip_html(s: str) -> str:
    if not s:
        return ""
    s = _TAG_RE.sub(" ", s)
    s = _WS_RE.sub(" ", s).strip()
    return s


class Collector(ABC):
    """各ソースの収集クラスの基底。"""

    name: str = ""             # 例: "rss_yahoo"
    category: str = ""         # 例: "rss"

    @abstractmethod
    def fetch(self, cfg: dict) -> list[TopicItem]:
        """cfg は config.yaml の collectors[<name>] 部分。"""
        ...

    def safe_fetch(self, cfg: dict) -> list[TopicItem]:
        """例外を握りつぶして空リストを返す。collector 1 つが落ちても全体が止まらないように。"""
        try:
            return self.fetch(cfg)
        except Exception as e:  # noqa: BLE001
            print(f"[{self.name}] fetch failed: {type(e).__name__}: {e}")
            return []
