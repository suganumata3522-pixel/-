"""複数の collector から集めた TopicItem を正規化・重複統合・スコアリングする。"""
from __future__ import annotations

import math
import re
import unicodedata
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Iterable

from .collectors.base import TopicItem

JST = timezone(timedelta(hours=9))

# タイトル正規化で削るゴミ
_NOISE_PATTERNS = [
    re.compile(r"\[[^\]]{1,20}\]"),     # [速報] みたいな先頭タグ
    re.compile(r"【[^】]{1,20}】"),     # 【画像あり】
    re.compile(r"\([^)]{1,30}\)$"),     # 末尾の (動画あり) など
    re.compile(r"\s*-\s*[^-]{1,30}$"),  # " - 日刊スポーツ" みたいな媒体名
    re.compile(r"\s*\|\s*[^|]{1,30}$"), # " | スポニチ"
]


def normalize_title(s: str) -> str:
    """重複検出用にタイトルを正規化。"""
    if not s:
        return ""
    s = unicodedata.normalize("NFKC", s)
    s = s.lower()
    for p in _NOISE_PATTERNS:
        s = p.sub("", s)
    s = re.sub(r"[\s　]+", "", s)  # 空白は全部つぶす
    s = re.sub(r"[!?！?。、,.~〜「」『』\"'()（）\[\]【】]+", "", s)
    return s


def bigrams(s: str) -> set[str]:
    if len(s) < 2:
        return {s} if s else set()
    return {s[i : i + 2] for i in range(len(s) - 1)}


def jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    inter = len(a & b)
    union = len(a | b)
    return inter / union if union else 0.0


def _to_aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=JST)
    return dt


def aggregate(
    items: Iterable[TopicItem],
    lookback_hours: int = 36,
    dedupe_threshold: int = 55,
    top_n: int = 30,
) -> list[TopicItem]:
    """話題を集約してスコア順に返す。

    1. lookback_hours より古いものを捨てる (published_at が None のものは残す)
    2. タイトルの bi-gram Jaccard で似たものを統合
    3. スコア = 元 score + ソース数ボーナス + 新鮮度ボーナス
    """
    now = datetime.now(JST)
    cutoff = now - timedelta(hours=lookback_hours)

    # 1. lookback フィルタ
    filtered: list[TopicItem] = []
    for it in items:
        pub = _to_aware(it.published_at)
        if pub is not None and pub < cutoff:
            continue
        filtered.append(it)

    # 2. 重複統合
    threshold = dedupe_threshold / 100.0
    clusters: list[TopicItem] = []
    cluster_grams: list[set[str]] = []
    cluster_sources: list[set[str]] = []
    cluster_dups: list[list[str]] = []

    for it in filtered:
        norm = normalize_title(it.title)
        g = bigrams(norm)
        merged_into = -1
        for i, cg in enumerate(cluster_grams):
            if jaccard(g, cg) >= threshold:
                merged_into = i
                break
        if merged_into >= 0:
            cluster_sources[merged_into].add(it.source)
            cluster_dups[merged_into].append(it.url)
            # 代表より新しい・スコア高ければ昇格
            rep = clusters[merged_into]
            if (it.score > rep.score) or (
                _to_aware(it.published_at)
                and _to_aware(rep.published_at)
                and _to_aware(it.published_at) > _to_aware(rep.published_at)  # type: ignore[operator]
            ):
                # 元代表を duplicates に追加してから入れ替え
                cluster_dups[merged_into].append(rep.url)
                cluster_dups[merged_into].remove(it.url)
                clusters[merged_into] = it
        else:
            clusters.append(it)
            cluster_grams.append(g)
            cluster_sources.append({it.source})
            cluster_dups.append([])

    # 3. スコアリング
    scored: list[tuple[float, TopicItem]] = []
    for rep, srcs, dups in zip(clusters, cluster_sources, cluster_dups):
        base = rep.score
        # ソース数ボーナス: 別ソースに出てる話題は強い
        src_bonus = math.log2(len(srcs) + 1) * 5.0
        # 新鮮度ボーナス: 直近ほど強い (lookback 内で 0-3 点)
        pub = _to_aware(rep.published_at)
        if pub:
            hours_old = max(0.0, (now - pub).total_seconds() / 3600.0)
            fresh_bonus = max(0.0, 3.0 * (1.0 - hours_old / max(lookback_hours, 1)))
        else:
            fresh_bonus = 0.0
        final = base + src_bonus + fresh_bonus
        rep.score = round(final, 3)
        rep.duplicates = dups
        scored.append((final, rep))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [it for _, it in scored[:top_n]]


def summarize_by_source(items: Iterable[TopicItem]) -> dict[str, int]:
    """デバッグ用: source 別件数。"""
    cnt: dict[str, int] = defaultdict(int)
    for it in items:
        cnt[it.source] += 1
    return dict(cnt)
