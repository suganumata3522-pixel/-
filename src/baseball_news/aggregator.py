import re
from datetime import datetime, timedelta, timezone

from .models import NewsItem


_NORMALIZE_RE = re.compile(r"[\s　\-\|｜【】\[\]\(\)『』「」、。!?・…]+")


def _normalize_title(title: str) -> str:
    # 末尾の媒体名表記 ( - Yahoo!ニュース など) を落とす
    cleaned = re.sub(r"\s[-|｜]\s.+$", "", title)
    return _NORMALIZE_RE.sub("", cleaned).lower()


def _bigrams(s: str) -> set[str]:
    if len(s) < 2:
        return {s} if s else set()
    return {s[i : i + 2] for i in range(len(s) - 1)}


def _similarity(a: str, b: str) -> float:
    """0-100 の文字 bi-gram Jaccard 類似度。CJK でも安定して効く。"""
    ga, gb = _bigrams(a), _bigrams(b)
    if not ga or not gb:
        return 0.0
    inter = len(ga & gb)
    union = len(ga | gb)
    return 100.0 * inter / union


def filter_recent(items: list[NewsItem], lookback_hours: int) -> list[NewsItem]:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=lookback_hours)
    out = []
    for item in items:
        if item.published_at is None or item.published_at >= cutoff:
            out.append(item)
    return out


def dedupe(items: list[NewsItem], threshold: int) -> list[NewsItem]:
    """類似タイトルをまとめる。残った代表アイテムには duplicates に出典数が入る。"""
    keys = [_normalize_title(i.title) for i in items]
    clusters: list[list[int]] = []

    for idx, key in enumerate(keys):
        matched = False
        for cluster in clusters:
            rep_key = keys[cluster[0]]
            if _similarity(key, rep_key) >= threshold:
                cluster.append(idx)
                matched = True
                break
        if not matched:
            clusters.append([idx])

    reps: list[NewsItem] = []
    for cluster in clusters:
        members = [items[i] for i in cluster]
        # 一番新しいものを代表に
        members.sort(
            key=lambda m: m.published_at or datetime.min.replace(tzinfo=timezone.utc),
            reverse=True,
        )
        rep = members[0]
        rep.duplicates = [m.source for m in members[1:]]
        reps.append(rep)
    return reps


def score(items: list[NewsItem]) -> None:
    """新鮮度 + 出典数で簡易スコアを付ける。in-place."""
    now = datetime.now(timezone.utc)
    for item in items:
        if item.published_at:
            age_hours = (now - item.published_at).total_seconds() / 3600
            recency = max(0.0, 1.0 - age_hours / 48.0)
        else:
            recency = 0.2
        source_count = 1 + len(item.duplicates)
        item.score = recency * 1.0 + min(source_count, 5) * 0.6


def aggregate(
    items: list[NewsItem],
    lookback_hours: int,
    dedupe_threshold: int,
    top_n: int,
) -> list[NewsItem]:
    recent = filter_recent(items, lookback_hours)
    reps = dedupe(recent, dedupe_threshold)
    score(reps)
    reps.sort(key=lambda i: i.score, reverse=True)
    return reps[:top_n]
