import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

import yaml

from .aggregator import aggregate
from .extractor import fetch_article_body
from .script_generator import generate_script
from .sources.reddit import fetch_reddit
from .sources.rss import fetch_feed, fetch_google_news


def load_config(path: Path) -> dict:
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f)


def collect_news(cfg: dict) -> list:
    sources = cfg["sources"]
    items = []

    gn = sources.get("google_news") or {}
    if gn.get("queries"):
        items += fetch_google_news(
            queries=gn["queries"],
            hl=gn.get("hl", "ja"),
            gl=gn.get("gl", "JP"),
            ceid=gn.get("ceid", "JP:ja"),
        )

    for feed in sources.get("rss_feeds") or []:
        if feed.get("url"):
            items += fetch_feed(feed["url"], fallback_source=feed.get("name", ""))

    reddit_cfg = sources.get("reddit") or {}
    if reddit_cfg.get("enabled") and reddit_cfg.get("subreddits"):
        items += fetch_reddit(reddit_cfg["subreddits"])

    return items


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="プロ野球ニュース台本ジェネレーター")
    parser.add_argument("--config", default="config.yaml", type=Path)
    parser.add_argument(
        "--skip-script",
        action="store_true",
        help="台本生成をスキップしてニュース一覧だけ出す (Claude API不要)",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=None,
        help="出力先 (省略時は config.output.dir/<日時>)",
    )
    args = parser.parse_args(argv)

    cfg = load_config(args.config)
    out_root = args.output_dir or Path(cfg["output"]["dir"]) / datetime.now().strftime("%Y%m%d_%H%M%S")
    out_root.mkdir(parents=True, exist_ok=True)

    print(f"[1/4] ニュース収集中…", file=sys.stderr)
    raw = collect_news(cfg)
    print(f"  -> 生件数: {len(raw)}", file=sys.stderr)

    print(f"[2/4] 重複除去・ランキング…", file=sys.stderr)
    agg = cfg["aggregation"]
    top = aggregate(
        raw,
        lookback_hours=agg["lookback_hours"],
        dedupe_threshold=agg["dedupe_threshold"],
        top_n=agg["top_n"],
    )
    print(f"  -> 上位: {len(top)} 件", file=sys.stderr)

    print(f"[3/4] 記事本文の抽出…", file=sys.stderr)
    for item in top:
        item.body = fetch_article_body(item.url)
        ok = "OK" if item.body else "FAIL"
        print(f"  [{ok}] {item.title[:60]}", file=sys.stderr)

    news_path = out_root / "news.json"
    news_path.write_text(
        json.dumps([i.to_dict() for i in top], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"  -> 保存: {news_path}", file=sys.stderr)

    if args.skip_script:
        print("台本生成はスキップしました。", file=sys.stderr)
        return 0

    print(f"[4/4] 台本生成 (Claude)…", file=sys.stderr)
    s = cfg["script"]
    script = generate_script(
        top,
        model=s["model"],
        target_minutes=s["target_minutes"],
        audience=s["audience"],
        tone=s["tone"],
        final_n=agg.get("final_n", 5),
    )
    script_path = out_root / "script.json"
    script_path.write_text(
        json.dumps(script, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"  -> 保存: {script_path}", file=sys.stderr)

    transcript_path = out_root / "script.txt"
    transcript_path.write_text(script.get("script", ""), encoding="utf-8")
    print(f"  -> ナレーション本文: {transcript_path}", file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main())
