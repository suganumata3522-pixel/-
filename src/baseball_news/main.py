"""CLI エントリポイント。

サブコマンド:
  collect  — 12 ソースから話題を集めて out/topics_<date>.json
  script   — 指定 topic_id から台本を作って out/script_<id>.json
"""
from __future__ import annotations

import argparse
import html
import json
import sys
import textwrap
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlparse

import yaml
from dateutil import parser as dt_parser

from .collectors import ALL_COLLECTORS
from .collectors.base import TopicItem
from .players import PlayerLookup
from .script_generator import generate_script
from .topics import aggregate, summarize_by_source

JST = timezone(timedelta(hours=9))


def load_config(path: Path) -> dict:
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f)


# --- collect ----------------------------------------------------------------


def cmd_collect(cfg: dict, out_dir: Path) -> int:
    collectors_cfg = cfg.get("collectors") or {}
    raw_items: list[TopicItem] = []
    print(f"[collect] {len(ALL_COLLECTORS)} collectors を実行")
    for c in ALL_COLLECTORS:
        sub = collectors_cfg.get(c.name) or {}
        if sub.get("enabled") is False:
            print(f"  - {c.name}: disabled")
            continue
        items = c.safe_fetch(sub)
        print(f"  - {c.name}: {len(items)} items")
        raw_items += items

    agg_cfg = cfg.get("aggregation") or {}
    topics = aggregate(
        raw_items,
        lookback_hours=int(agg_cfg.get("lookback_hours", 36)),
        dedupe_threshold=int(agg_cfg.get("dedupe_threshold", 55)),
        top_n=int(agg_cfg.get("top_n", 30)),
    )
    print(f"[collect] 統合後の話題数: {len(topics)}")
    by_src = summarize_by_source(raw_items)
    if by_src:
        print(f"[collect] 収集ソース別件数: {by_src}")

    out_dir.mkdir(parents=True, exist_ok=True)
    now = datetime.now(JST)
    ts = now.strftime("%Y%m%d_%H%M%S")
    path = out_dir / f"topics_{ts}.json"
    serialized = json.dumps(
        [t.to_dict() for t in topics], ensure_ascii=False, indent=2
    )
    path.write_text(serialized, encoding="utf-8")
    (out_dir / "topics_latest.json").write_text(serialized, encoding="utf-8")

    readable = _format_topics_readable(topics, now)
    txt_path = out_dir / f"topics_{ts}.txt"
    txt_path.write_text(readable, encoding="utf-8")
    (out_dir / "topics_latest.txt").write_text(readable, encoding="utf-8")

    print(f"[collect] 保存: {path}")
    print(f"[collect] 読みやすい版: {txt_path}")
    print(f"[collect] 最新へのリンク: {out_dir / 'topics_latest.json'} / {out_dir / 'topics_latest.txt'}")

    if topics:
        print("\n[collect] 上位 10 件:")
        for t in topics[:10]:
            print(f"  {t.id}  score={t.score:>6.2f}  [{t.source}] {t.title[:60]}")
    return 0


def _display_source(item: TopicItem) -> str:
    host = ""
    try:
        host = urlparse(item.url).netloc
    except Exception:
        host = ""
    if host.startswith("www."):
        host = host[4:]
    return host or item.source


def _format_topics_readable(topics: list[TopicItem], generated_at: datetime) -> str:
    bar = "=" * 70
    sep = "-" * 70
    lines: list[str] = [
        bar,
        "野球ニュース 話題一覧",
        f"収集日時 : {generated_at.strftime('%Y-%m-%d %H:%M:%S')} JST",
        f"件数     : {len(topics)} 件",
        "  ※ スコアが高いほど注目度・拡散度が高い話題です",
        bar,
        "",
    ]
    for i, t in enumerate(topics, 1):
        source = _display_source(t)
        published = ""
        if t.published_at:
            try:
                published = t.published_at.astimezone(JST).strftime("%Y-%m-%d %H:%M")
            except Exception:
                published = str(t.published_at)

        lines.append(f"【{i:>2}】 score {t.score:>6.2f}   出典: {source}")
        lines.append(f"  タイトル: {html.unescape(t.title)}")
        if t.summary:
            cleaned = html.unescape(t.summary).replace("[…]", "…").strip()
            wrapped = textwrap.wrap(cleaned, width=58)
            if wrapped:
                lines.append(f"  要約    : {wrapped[0]}")
                for cont in wrapped[1:]:
                    lines.append(f"            {cont}")
        if published:
            lines.append(f"  公開    : {published}")
        lines.append(f"  URL     : {t.url}")
        lines.append(f"  ID      : {t.id}  ← 台本生成で使う ID")
        lines.append(sep)
        lines.append("")
    return "\n".join(lines)


# --- script -----------------------------------------------------------------


def _load_topics(path: Path) -> list[TopicItem]:
    data = json.loads(path.read_text(encoding="utf-8"))
    items: list[TopicItem] = []
    for d in data:
        pa = d.get("published_at")
        kwargs = {k: v for k, v in d.items() if k != "published_at"}
        kwargs["published_at"] = dt_parser.isoparse(pa) if pa else None
        items.append(TopicItem(**kwargs))
    return items


def cmd_script(
    cfg: dict, out_dir: Path, topic_id: str, topics_path: Path | None
) -> int:
    if topics_path is None:
        topics_path = out_dir / "topics_latest.json"
    if not topics_path.exists():
        print(f"[script] topics ファイルが見つからない: {topics_path}", file=sys.stderr)
        return 2

    topics = _load_topics(topics_path)
    target: TopicItem | None = None
    related: list[TopicItem] = []
    for t in topics:
        if t.id == topic_id or t.id.startswith(topic_id):
            if target is None:
                target = t
                continue
        related.append(t)

    if target is None:
        print(f"[script] topic_id {topic_id!r} が topics に存在しない", file=sys.stderr)
        print("  候補:", file=sys.stderr)
        for t in topics[:10]:
            print(f"    {t.id}  {t.title[:60]}", file=sys.stderr)
        return 2

    print(f"[script] 台本生成: {target.title}")
    with PlayerLookup(cfg.get("players") or {}) as lookup:
        result = generate_script(target, related[:10], cfg, lookup=lookup)

    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"script_{target.id}.json"
    out_path.write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"[script] 保存: {out_path}")
    if "_parse_error" in result:
        print(f"[script] ⚠ JSON パース失敗: {result.get('_parse_error')}", file=sys.stderr)
        return 1
    return 0


# --- entry ------------------------------------------------------------------


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="baseball-news", description=__doc__)
    parser.add_argument("--config", default="config.yaml", type=Path)
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_collect = sub.add_parser("collect", help="12 ソースから話題を収集")
    p_collect.add_argument("--out", type=Path, default=None, help="出力先 (省略時は config.output.dir)")

    p_script = sub.add_parser("script", help="trending topic から台本を生成")
    p_script.add_argument("topic_id", help="topics_*.json 内の id (先頭一致も可)")
    p_script.add_argument("--topics", type=Path, default=None, help="topics JSON の明示指定")
    p_script.add_argument("--out", type=Path, default=None)

    args = parser.parse_args(argv)
    cfg = load_config(args.config)
    default_out = Path((cfg.get("output") or {}).get("dir") or "out")
    out_dir = args.out or default_out

    if args.cmd == "collect":
        return cmd_collect(cfg, out_dir)
    if args.cmd == "script":
        return cmd_script(cfg, out_dir, args.topic_id, args.topics)
    parser.error(f"unknown command: {args.cmd}")
    return 2  # unreachable


if __name__ == "__main__":
    sys.exit(main())
