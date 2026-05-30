"""script.json の thumbnail セクションから thumbnail.jpg を作る。

球団テーマカラー対応 + (任意で) assets/manual/logos/<team>.png をロゴとして重ねる。
レンダリング本体は slide_renderer.render_thumbnail。
"""

from __future__ import annotations

import sys
from pathlib import Path

from .image_sources import ImageDispatcher, ImageRequest
from .slide_renderer import Fonts, render_thumbnail
from .teams import TeamPalette


def generate_thumbnail(
    *,
    script: dict,
    out_path: Path,
    work_dir: Path,
    dispatcher: ImageDispatcher,
    resolution: str,
    palette: TeamPalette,
    fonts: Fonts,
    assets_dir: Path,
) -> Path | None:
    thumb = script.get("thumbnail") or {}
    headline = (thumb.get("headline") or "").strip()
    main = (thumb.get("main") or "").strip()
    sub = (thumb.get("sub") or "").strip()
    if not main:
        titles = script.get("titles") or []
        main = (titles[0] if titles else "プロ野球ニュース").strip()
    keywords = thumb.get("keywords") or ["ナイター 球場 客席", "野球 バット"]

    work_dir.mkdir(parents=True, exist_ok=True)
    bg_dir = work_dir / "thumbnail_bg"
    bg_dir.mkdir(exist_ok=True)

    saved_min, saved_max = dispatcher.min_per_chapter, dispatcher.max_per_chapter
    dispatcher.min_per_chapter = 1
    dispatcher.max_per_chapter = 1
    try:
        fetched = dispatcher.collect(
            ImageRequest(
                chapter_idx=-1,
                chapter_title="thumbnail",
                keywords=keywords,
                need_count=1,
            ),
            out_dir=bg_dir,
        )
    finally:
        dispatcher.min_per_chapter = saved_min
        dispatcher.max_per_chapter = saved_max

    if not fetched:
        print("  [thumbnail] 背景画像が取れませんでした", file=sys.stderr)
        return None
    bg = fetched[0].path

    logo_path = assets_dir / "manual" / "logos" / palette.logo_filename
    if not logo_path.is_file():
        logo_path = None
        print(
            f"  [thumbnail] ロゴ assets/manual/logos/{palette.logo_filename} 無し → 球団名テキストで代替",
            file=sys.stderr,
        )

    width, height = (int(x) for x in resolution.split("x"))
    return render_thumbnail(
        bg, out_path,
        headline=headline,
        main=main,
        sub=sub,
        palette=palette,
        logo_path=logo_path,
        fonts=fonts,
        resolution=(width, height),
    )


def generate_chapter_slide(
    *,
    chapter_idx: int,
    chapter_title: str,
    slide: dict,
    image_keywords: list[str],
    out_path: Path,
    bg_dir: Path,
    dispatcher: ImageDispatcher,
    resolution: str,
    palette: TeamPalette,
    fonts: Fonts,
) -> Path | None:
    from .slide_renderer import render_slide

    saved_min, saved_max = dispatcher.min_per_chapter, dispatcher.max_per_chapter
    dispatcher.min_per_chapter = 1
    dispatcher.max_per_chapter = 1
    try:
        fetched = dispatcher.collect(
            ImageRequest(
                chapter_idx=chapter_idx,
                chapter_title=chapter_title,
                keywords=image_keywords or [chapter_title, "野球 球場"],
                need_count=1,
            ),
            out_dir=bg_dir,
        )
    finally:
        dispatcher.min_per_chapter = saved_min
        dispatcher.max_per_chapter = saved_max

    if not fetched:
        print(
            f"  [slide] チャプター {chapter_idx} ({chapter_title}) の背景画像が取れませんでした",
            file=sys.stderr,
        )
        return None
    bg = fetched[0].path

    width, height = (int(x) for x in resolution.split("x"))
    return render_slide(
        bg, out_path,
        title=chapter_title,
        subtitle=(slide.get("subtitle") or "").strip() or None,
        bullets=list(slide.get("bullets") or []),
        right_box=slide.get("right_box"),
        highlight=slide.get("highlight"),
        footer=(slide.get("footer") or "").strip() or None,
        palette=palette,
        fonts=fonts,
        resolution=(width, height),
        ranking=slide.get("ranking"),
    )
