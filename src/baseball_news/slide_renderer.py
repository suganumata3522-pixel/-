"""Pillow で本編チャプターの情報スライドを 1 枚描く。

レイアウト (1920x1080):
  上部   : タイトルバー (球団 primary 色の丸角ボックス + on_primary 文字)
  右上   : サブ情報バッジ (任意, primary 色)
  左 2/3 : 半透明白の箇条書きパネル (青/赤の inline 強調マークアップ対応)
  右 1/3 : ミニ統計テーブル (任意)
  中央下 : 黄色↓矢印 + 強調コールアウトボックス (任意)
  最下段 : 黒バー + primary 色のフッターテロップ (任意, "NEXT➡…")

マークアップ: [テキスト|青] / [テキスト|赤] / [テキスト|黄] / [テキスト|黒] / [テキスト|白]
"""

from __future__ import annotations

import re
import sys
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

from .teams import RGB, TeamPalette, palette_color


_FONT_CANDIDATES = [
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJKjp-Bold.otf",
    "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/truetype/fonts-japanese-gothic.ttf",
    "/Library/Fonts/ヒラギノ角ゴシック W7.ttc",
    "/System/Library/Fonts/ヒラギノ角ゴ ProN W6.otf",
    "C:/Windows/Fonts/YuGothB.ttc",
    "C:/Windows/Fonts/meiryob.ttc",
    "C:/Windows/Fonts/msgothic.ttc",
]


def find_font(configured: str | None = None) -> str:
    if configured and Path(configured).is_file():
        return configured
    if configured:
        print(f"  [slide] 指定フォント {configured} が見つかりません", file=sys.stderr)
    for c in _FONT_CANDIDATES:
        if Path(c).is_file():
            return c
    raise RuntimeError(
        "日本語フォントが見つかりません。"
        "config.thumbnail.font_file (= slide でも使用) に絶対パスを指定してください。"
    )


@dataclass
class Fonts:
    title: ImageFont.FreeTypeFont
    subtitle: ImageFont.FreeTypeFont
    body: ImageFont.FreeTypeFont
    body_bold: ImageFont.FreeTypeFont
    table_head: ImageFont.FreeTypeFont
    table_cell: ImageFont.FreeTypeFont
    callout: ImageFont.FreeTypeFont
    footer: ImageFont.FreeTypeFont
    arrow: ImageFont.FreeTypeFont
    # サムネ用
    thumb_headline: ImageFont.FreeTypeFont
    thumb_main: ImageFont.FreeTypeFont
    thumb_sub: ImageFont.FreeTypeFont


def load_fonts(font_path: str) -> Fonts:
    return Fonts(
        title=ImageFont.truetype(font_path, 72),
        subtitle=ImageFont.truetype(font_path, 40),
        body=ImageFont.truetype(font_path, 40),
        body_bold=ImageFont.truetype(font_path, 42),
        table_head=ImageFont.truetype(font_path, 40),
        table_cell=ImageFont.truetype(font_path, 36),
        callout=ImageFont.truetype(font_path, 40),
        footer=ImageFont.truetype(font_path, 60),
        arrow=ImageFont.truetype(font_path, 90),
        thumb_headline=ImageFont.truetype(font_path, 86),
        thumb_main=ImageFont.truetype(font_path, 140),
        thumb_sub=ImageFont.truetype(font_path, 100),
    )


# --- マークアップ -------------------------------------------------------

_TOKEN_RE = re.compile(r"\[([^\[\]|]+)\|([^\[\]]+)\]")


# 一部の絵文字/装飾文字は標準 CJK フォントに無いので、よく出るものは ASCII 代替に置換する。
_GLYPH_SUBS = {
    "➡": "→",
    "⇒": "→",
    "⇨": "→",
    "▶": "▶",
}


def safe_glyphs(s: str) -> str:
    for k, v in _GLYPH_SUBS.items():
        s = s.replace(k, v)
    return s


def parse_markup(text: str) -> list[tuple[str, str]]:
    """`[文字列|色]` を [(部分文字列, 色キー), ...] に。"""
    out: list[tuple[str, str]] = []
    pos = 0
    for m in _TOKEN_RE.finditer(text):
        if m.start() > pos:
            out.append((text[pos : m.start()], "default"))
        out.append((m.group(1), m.group(2).strip()))
        pos = m.end()
    if pos < len(text):
        out.append((text[pos:], "default"))
    if not out:
        out.append(("", "default"))
    return out


# --- 描画ヘルパー -------------------------------------------------------

def fit_cover(img: Image.Image, W: int, H: int) -> Image.Image:
    """中心クロップで W×H にカバーフィット。"""
    iw, ih = img.size
    scale = max(W / iw, H / ih)
    nw, nh = int(iw * scale + 0.5), int(ih * scale + 0.5)
    img = img.resize((nw, nh), Image.LANCZOS)
    left = (nw - W) // 2
    top = (nh - H) // 2
    return img.crop((left, top, left + W, top + H))


def darken(img: Image.Image, alpha: int = 60) -> Image.Image:
    overlay = Image.new("RGBA", img.size, (0, 0, 0, alpha))
    return Image.alpha_composite(img.convert("RGBA"), overlay).convert("RGB")


def draw_rounded_box(
    canvas: Image.Image,
    xy: tuple[int, int, int, int],
    *,
    fill: RGB | tuple[int, int, int, int],
    outline: RGB | None = None,
    outline_w: int = 0,
    radius: int = 24,
) -> None:
    """半透明にも対応する丸角ボックス。fill が 4要素なら RGBA。"""
    x0, y0, x1, y1 = xy
    w, h = x1 - x0, y1 - y0
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    d.rounded_rectangle(
        (0, 0, w - 1, h - 1),
        radius=radius,
        fill=fill,
        outline=outline,
        width=outline_w,
    )
    canvas.paste(layer, (x0, y0), layer)


def _text_w(font: ImageFont.FreeTypeFont, s: str) -> int:
    bbox = font.getbbox(s)
    return bbox[2] - bbox[0]


def _line_h(font: ImageFont.FreeTypeFont) -> int:
    asc, desc = font.getmetrics()
    return asc + desc


def draw_markup_line(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    text: str,
    *,
    font: ImageFont.FreeTypeFont,
    palette: TeamPalette,
    stroke_w: int = 0,
    stroke_fill: RGB | None = None,
) -> int:
    """マークアップ1行を描画。戻り値は右端の x。"""
    x, y = xy
    for tok, color in parse_markup(text):
        if not tok:
            continue
        fill = palette_color(palette, color)
        draw.text(
            (x, y), tok, font=font, fill=fill,
            stroke_width=stroke_w, stroke_fill=stroke_fill,
        )
        x += _text_w(font, tok)
    return x


def draw_centered_markup(
    draw: ImageDraw.ImageDraw,
    cx: int,
    y: int,
    text: str,
    *,
    font: ImageFont.FreeTypeFont,
    palette: TeamPalette,
    stroke_w: int = 0,
    stroke_fill: RGB | None = None,
) -> None:
    """マークアップ1行を中央寄せで描画。"""
    total = 0
    runs = parse_markup(text)
    for tok, _ in runs:
        total += _text_w(font, tok)
    x = cx - total // 2
    for tok, color in runs:
        if not tok:
            continue
        fill = palette_color(palette, color)
        draw.text(
            (x, y), tok, font=font, fill=fill,
            stroke_width=stroke_w, stroke_fill=stroke_fill,
        )
        x += _text_w(font, tok)


# --- パネル ------------------------------------------------------------

def _draw_title_band(
    canvas: Image.Image,
    title: str,
    subtitle: str,
    palette: TeamPalette,
    fonts: Fonts,
    *,
    W: int,
) -> None:
    draw = ImageDraw.Draw(canvas)
    # 右上サブバッジを先に決定 (幅を取りたい)
    sub_w = 0
    sub_box_w = 0
    if subtitle:
        sub_w = _text_w(fonts.subtitle, subtitle)
        sub_box_w = sub_w + 60
    sub_box_x1 = W - 40
    sub_box_x0 = sub_box_x1 - sub_box_w if subtitle else W - 40

    # タイトル幅は残りスペースに収める
    max_title_w = (sub_box_x0 - 40 - 80) if subtitle else (W - 80)
    title_font = fonts.title
    # 1行に収まるよう必要なら縮小
    while _text_w(title_font, title) > max_title_w and title_font.size > 36:
        title_font = ImageFont.truetype(title_font.path, title_font.size - 4)
    title_w = _text_w(title_font, title)
    band_h = 130
    band_y0 = 24
    band_y1 = band_y0 + band_h
    band_x_pad = 60
    title_box_w = title_w + band_x_pad * 2
    title_box_x0 = (W - title_box_w) // 2
    title_box_x1 = title_box_x0 + title_box_w

    draw_rounded_box(
        canvas,
        (title_box_x0, band_y0, title_box_x1, band_y1),
        fill=palette.primary + (255,),
        outline=(0, 0, 0),
        outline_w=4,
        radius=24,
    )
    # 再取得 (paste 後)
    draw = ImageDraw.Draw(canvas)
    title_y = band_y0 + (band_h - _line_h(title_font)) // 2
    draw.text(
        (title_box_x0 + band_x_pad, title_y),
        title,
        font=title_font,
        fill=palette.on_primary,
    )

    if subtitle:
        # 右上サブバッジは白背景固定 (球団色によらず視認性を保つ)
        draw_rounded_box(
            canvas,
            (sub_box_x0, band_y0, sub_box_x1, band_y1),
            fill=(255, 255, 255, 245),
            outline=(0, 0, 0),
            outline_w=4,
            radius=20,
        )
        draw = ImageDraw.Draw(canvas)
        sy = band_y0 + (band_h - _line_h(fonts.subtitle)) // 2
        draw.text(
            (sub_box_x0 + 30, sy),
            subtitle,
            font=fonts.subtitle,
            fill=(0, 0, 0),
        )


def _draw_bullets_panel(
    canvas: Image.Image,
    bullets: list[str],
    palette: TeamPalette,
    fonts: Fonts,
    *,
    x0: int, y0: int, x1: int, y1: int,
) -> None:
    if not bullets:
        return
    draw_rounded_box(
        canvas, (x0, y0, x1, y1),
        fill=(255, 255, 255, 225),
        outline=palette.primary, outline_w=5, radius=20,
    )
    draw = ImageDraw.Draw(canvas)
    pad = 30
    bx = x0 + pad
    by = y0 + pad
    line_h = _line_h(fonts.body) + 14
    bullet_color = palette.text
    for b in bullets:
        # 黒丸 + 本文
        draw.ellipse((bx, by + 18, bx + 16, by + 34), fill=bullet_color)
        draw_markup_line(
            draw, (bx + 32, by), b,
            font=fonts.body, palette=palette,
        )
        by += line_h
        if by + line_h > y1 - pad:
            break  # 溢れたら打ち切り


def _draw_right_box(
    canvas: Image.Image,
    title: str,
    rows: list[list[str]],
    palette: TeamPalette,
    fonts: Fonts,
    *,
    x0: int, y0: int, x1: int, y1: int,
) -> None:
    draw_rounded_box(
        canvas, (x0, y0, x1, y1),
        fill=(255, 255, 255, 235),
        outline=palette.primary, outline_w=5, radius=18,
    )
    draw = ImageDraw.Draw(canvas)
    # ヘッダ帯
    hdr_h = 70
    draw_rounded_box(
        canvas, (x0 + 8, y0 + 8, x1 - 8, y0 + 8 + hdr_h),
        fill=palette.primary + (255,),
        radius=12,
    )
    draw = ImageDraw.Draw(canvas)
    th_w = _text_w(fonts.table_head, title)
    draw.text(
        (x0 + (x1 - x0 - th_w) // 2, y0 + 8 + (hdr_h - _line_h(fonts.table_head)) // 2),
        title,
        font=fonts.table_head,
        fill=palette.on_primary,
    )
    # 行
    ry = y0 + 8 + hdr_h + 16
    row_h = _line_h(fonts.table_cell) + 14
    col_a_x = x0 + 24
    col_b_x = x0 + (x1 - x0) // 2 + 10
    for row in rows:
        if ry + row_h > y1 - 8:
            break
        if not row:
            continue
        a = row[0] if len(row) > 0 else ""
        b = row[1] if len(row) > 1 else ""
        draw.text((col_a_x, ry), a, font=fonts.table_cell, fill=palette.text)
        if b:
            draw.text((col_b_x, ry), b, font=fonts.table_cell, fill=palette.text)
        ry += row_h


def _draw_ranking_panel(
    canvas: Image.Image,
    rows: list[dict],
    palette: TeamPalette,
    fonts: Fonts,
    *,
    W: int, y0: int, y1: int,
) -> None:
    """球団非依存ランキング (各行: 選手名(球団略称) ➡ stat1 stat2 ...) を中央パネルに描画。"""
    if not rows:
        return
    panel_x0 = 80
    panel_x1 = W - 80
    draw_rounded_box(
        canvas, (panel_x0, y0, panel_x1, y1),
        fill=(255, 255, 255, 235),
        outline=palette.primary, outline_w=6, radius=22,
    )
    draw = ImageDraw.Draw(canvas)

    n = min(len(rows), 6)
    rows = rows[:n]
    inner_pad = 50
    avail_h = (y1 - y0) - inner_pad * 2
    # 行は詰めて中央に寄せる
    row_h = min(110, max(70, avail_h // max(n, 1)))
    cur_y = y0 + inner_pad + max(0, (avail_h - row_h * n) // 2)

    name_font = fonts.body_bold
    stat_font = fonts.table_cell

    # 行の左カラム最大幅 (選手名+球団) を計算して縦位置揃え
    name_strs = []
    for r in rows:
        nm = (r.get("name") or "").strip()
        tm = (r.get("team") or "").strip()
        name_strs.append(f"{nm}({tm})" if tm else nm)
    name_col_w = max((_text_w(name_font, s) for s in name_strs), default=0)

    arrow_text = "→"  # ➡ は CJK フォントに無いことが多い
    arrow_w = _text_w(name_font, arrow_text)
    stats_x = panel_x0 + inner_pad + name_col_w + 30 + arrow_w + 30

    for s, r in zip(name_strs, rows):
        # 選手名(球団)
        draw.text(
            (panel_x0 + inner_pad, cur_y + (row_h - _line_h(name_font)) // 2),
            s,
            font=name_font,
            fill=palette.text,
        )
        # 矢印
        draw.text(
            (panel_x0 + inner_pad + name_col_w + 20,
             cur_y + (row_h - _line_h(name_font)) // 2),
            arrow_text,
            font=name_font,
            fill=palette.accent,
        )
        # 統計値 (stats) を等間隔に並べる
        stats = [str(x) for x in (r.get("stats") or [])]
        if stats:
            slots = panel_x1 - inner_pad - stats_x
            step = slots // max(1, len(stats))
            for i, val in enumerate(stats):
                draw.text(
                    (stats_x + step * i, cur_y + (row_h - _line_h(stat_font)) // 2),
                    val,
                    font=stat_font,
                    fill=palette.text,
                )
        cur_y += row_h


def _draw_arrow_and_callout(
    canvas: Image.Image,
    callout_text: str,
    with_arrow: bool,
    palette: TeamPalette,
    fonts: Fonts,
    *,
    W: int, y_anchor: int, y_max: int,
) -> int:
    """y_anchor から下に矢印+コールアウトを描画。y_max を超えない範囲で。"""
    draw = ImageDraw.Draw(canvas)
    cur_y = y_anchor
    lines = callout_text.split("\n") if callout_text else []
    lines = [ln for ln in lines if ln.strip()]
    if not lines:
        return cur_y

    # 必要な高さを逆算してフィットさせる
    arrow_h = _line_h(fonts.arrow) - 10 if with_arrow else 0
    callout_font = fonts.callout
    line_h = _line_h(callout_font) + 10
    box_pad = 30
    needed = arrow_h + line_h * len(lines) + box_pad
    available = y_max - y_anchor
    if needed > available and len(lines) > 0:
        # フォント縮小して入れる
        size = max(28, int(callout_font.size * available / needed))
        callout_font = ImageFont.truetype(callout_font.path, size)
        line_h = _line_h(callout_font) + 8

    if with_arrow:
        arrow_w = _text_w(fonts.arrow, "▼")
        draw.text(
            ((W - arrow_w) // 2, cur_y),
            "▼",
            font=fonts.arrow,
            fill=palette.accent,
            stroke_width=4,
            stroke_fill=(0, 0, 0),
        )
        cur_y += arrow_h

    box_h = line_h * len(lines) + box_pad
    box_w = 1500
    box_x0 = (W - box_w) // 2
    box_x1 = box_x0 + box_w
    box_y0 = cur_y
    box_y1 = min(box_y0 + box_h, y_max)
    draw_rounded_box(
        canvas, (box_x0, box_y0, box_x1, box_y1),
        fill=(255, 255, 255, 235),
        outline=palette.primary, outline_w=5, radius=18,
    )
    draw = ImageDraw.Draw(canvas)
    ly = box_y0 + 14
    for ln in lines:
        if ly + line_h > box_y1 - 6:
            break
        draw_centered_markup(
            draw, W // 2, ly, ln,
            font=callout_font, palette=palette,
        )
        ly += line_h
    return box_y1


def _draw_footer(
    canvas: Image.Image,
    text: str,
    palette: TeamPalette,
    fonts: Fonts,
    *,
    W: int, H: int,
) -> None:
    bar_h = 100
    bar_y0 = H - bar_h
    # 球団 primary 色のバー
    bar = Image.new("RGBA", (W, bar_h), palette.primary + (245,))
    canvas.paste(bar, (0, bar_y0), bar)
    # バーの上下にうっすら影をつけて締める
    edge = Image.new("RGBA", (W, 4), (0, 0, 0, 180))
    canvas.paste(edge, (0, bar_y0 - 2), edge)
    draw = ImageDraw.Draw(canvas)
    # フォントが大きすぎてはみ出る場合は縮小
    ff = fonts.footer
    while _text_w(ff, text) > W - 60 and ff.size > 32:
        ff = ImageFont.truetype(ff.path, ff.size - 4)
    tw = _text_w(ff, text)
    fy = bar_y0 + (bar_h - _line_h(ff)) // 2
    # マークアップ無しのときは on_primary 単色で確実に派手に
    if "[" not in text:
        draw.text(
            ((W - tw) // 2, fy), text, font=ff, fill=palette.on_primary,
            stroke_width=3, stroke_fill=(0, 0, 0),
        )
    else:
        draw_centered_markup(
            draw, W // 2, fy, text,
            font=ff, palette=palette,
            stroke_w=3, stroke_fill=(0, 0, 0),
        )


# --- メイン ------------------------------------------------------------

def render_slide(
    bg_path: Path,
    out_path: Path,
    *,
    title: str,
    subtitle: str | None,
    bullets: list[str] | None,
    right_box: dict | None,
    highlight: dict | None,
    footer: str | None,
    palette: TeamPalette,
    fonts: Fonts,
    resolution: tuple[int, int] = (1920, 1080),
    ranking: dict | None = None,
) -> Path:
    W, H = resolution
    bg = Image.open(bg_path).convert("RGB")
    bg = fit_cover(bg, W, H)
    canvas = darken(bg, alpha=70).convert("RGBA")

    # 全テキスト入力をフォント安全なグリフに正規化
    title = safe_glyphs(title or "")
    if subtitle:
        subtitle = safe_glyphs(subtitle)
    if bullets:
        bullets = [safe_glyphs(b) for b in bullets]
    if right_box:
        right_box = {
            "title": safe_glyphs(right_box.get("title") or ""),
            "rows": [[safe_glyphs(c) for c in (r or [])] for r in (right_box.get("rows") or [])],
        }
    if highlight:
        highlight = {
            **highlight,
            "text": safe_glyphs(highlight.get("text") or ""),
        }
    if footer:
        footer = safe_glyphs(footer)
    if ranking:
        ranking = {
            "rows": [
                {
                    "name": safe_glyphs(r.get("name") or ""),
                    "team": safe_glyphs(r.get("team") or ""),
                    "stats": [safe_glyphs(s) for s in (r.get("stats") or [])],
                }
                for r in (ranking.get("rows") or [])
            ],
        }

    _draw_title_band(canvas, title, subtitle or "", palette, fonts, W=W)

    has_footer = bool(footer)
    footer_top = (H - 100) if has_footer else H
    has_highlight = bool(highlight and (highlight.get("text") or "").strip())

    # ranking スライド (球団非依存ニュースの「○○の比較」型) は中央パネルだけ
    if ranking and ranking.get("rows"):
        _draw_ranking_panel(
            canvas, list(ranking["rows"]), palette, fonts,
            W=W, y0=180, y1=footer_top - 20,
        )
        if has_footer:
            _draw_footer(canvas, footer, palette, fonts, W=W, H=H)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        canvas.convert("RGB").save(out_path, "PNG")
        return out_path

    # メイン箇条書きパネル + 右側ボックス
    panel_y0 = 170
    if has_highlight:
        # コールアウト用の余白を残す
        panel_y1 = 640
    else:
        panel_y1 = footer_top - 20

    if right_box and (right_box.get("rows") or right_box.get("title")):
        bullets_x1 = 1180
        rb_x0 = 1220
        rb_x1 = W - 40
        rb_y0 = panel_y0
        rb_y1 = panel_y0 + min(panel_y1 - panel_y0, 500)
        _draw_bullets_panel(
            canvas, bullets or [], palette, fonts,
            x0=40, y0=panel_y0, x1=bullets_x1, y1=panel_y1,
        )
        _draw_right_box(
            canvas,
            right_box.get("title", ""),
            list(right_box.get("rows") or []),
            palette, fonts,
            x0=rb_x0, y0=rb_y0, x1=rb_x1, y1=rb_y1,
        )
    elif bullets:
        _draw_bullets_panel(
            canvas, bullets, palette, fonts,
            x0=40, y0=panel_y0, x1=W - 40, y1=panel_y1,
        )

    # 矢印 + 強調コールアウト
    if has_highlight:
        _draw_arrow_and_callout(
            canvas,
            (highlight.get("text") or "").strip(),
            bool(highlight.get("with_arrow", True)),
            palette, fonts,
            W=W, y_anchor=panel_y1 + 5, y_max=footer_top - 10,
        )

    # フッター
    if has_footer:
        _draw_footer(canvas, footer, palette, fonts, W=W, H=H)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(out_path, "PNG")
    return out_path


# サムネ ヘッドラインの黄色ボックスは球団に依存しない YouTube 派手定番
_THUMB_HEADLINE_BG: RGB = (255, 225, 0)
_THUMB_HEADLINE_TEXT: RGB = (0, 0, 0)


def _draw_thumb_caption(
    draw: ImageDraw.ImageDraw,
    cx: int,
    y: int,
    text: str,
    *,
    font: ImageFont.FreeTypeFont,
    palette: TeamPalette,
    stroke_w: int,
) -> None:
    """サムネのメイン/サブキャッチを palette.thumb_caption_base 色で描画。

    マークアップ [テキスト|赤] / [テキスト|白] などで部分強調可能。
    強調無し部分は thumb_caption_base、stroke は thumb_caption_outline。
    """
    base = palette.thumb_caption_base
    outline = palette.thumb_caption_outline
    if "[" not in text:
        tw = _text_w(font, text)
        draw.text(
            (cx - tw // 2, y), text, font=font, fill=base,
            stroke_width=stroke_w, stroke_fill=outline,
        )
        return
    runs = parse_markup(text)
    total = sum(_text_w(font, t) for t, _ in runs if t)
    x = cx - total // 2
    for tok, color in runs:
        if not tok:
            continue
        c = (color or "").strip().lower()
        if c in ("default", ""):
            fill = base
        elif c in ("赤", "red"):
            fill = palette.accent
        elif c in ("白", "white"):
            fill = (255, 255, 255)
        elif c in ("黒", "black"):
            fill = (0, 0, 0)
        else:
            fill = palette_color(palette, color)
        draw.text(
            (x, y), tok, font=font, fill=fill,
            stroke_width=stroke_w, stroke_fill=outline,
        )
        x += _text_w(font, tok)


def render_thumbnail(
    bg_path: Path,
    out_path: Path,
    *,
    headline: str,
    main: str,
    sub: str,
    palette: TeamPalette,
    logo_path: Path | None,
    fonts: Fonts,
    resolution: tuple[int, int] = (1920, 1080),
) -> Path:
    """サムネ画像。上部にロゴ → 黄色ヘッドライン → 下半分にキャッチ。

    パレットによってモード分岐:
      - 通常球団: 背景写真 + キャッチは赤+黒縁 (palette.thumb_caption_base=赤)
      - Eagles:   背景写真 + キャッチは白+黒縁、強調語のみ赤
      - default:  背景写真の下半分を黄色帯で塗る (thumb_full_band=True) + 黒+白縁キャッチ
    """
    W, H = resolution
    bg = Image.open(bg_path).convert("RGB")
    bg = fit_cover(bg, W, H)
    canvas = darken(bg, alpha=70).convert("RGBA")

    headline = safe_glyphs(headline or "")
    main = safe_glyphs(main or "")
    sub = safe_glyphs(sub or "")

    # 1) 球団非依存ニュースは下半分を黄色帯で塗る
    if palette.thumb_full_band:
        band_y0 = int(H * 0.50)
        band = Image.new("RGBA", (W, H - band_y0), palette.primary + (245,))
        canvas.paste(band, (0, band_y0), band)
        # 上下に黒い縁
        edge = Image.new("RGBA", (W, 6), (0, 0, 0, 220))
        canvas.paste(edge, (0, band_y0 - 3), edge)

    # 2) ロゴ / 球団名 (上部 1/4 ゾーン中央)。default パレットはロゴ無し前提でスキップ
    logo_center_y = int(H * 0.16)
    logo_bottom_y = logo_center_y
    if not palette.thumb_full_band:
        if logo_path and logo_path.is_file():
            try:
                logo = Image.open(logo_path).convert("RGBA")
                tgt_h = 280
                r = tgt_h / logo.height
                tgt_w = int(logo.width * r)
                if tgt_w > int(W * 0.6):
                    r = (W * 0.6) / logo.width
                    tgt_w = int(logo.width * r)
                    tgt_h = int(logo.height * r)
                logo = logo.resize((tgt_w, tgt_h), Image.LANCZOS)
                canvas.paste(logo, ((W - tgt_w) // 2, logo_center_y - tgt_h // 2), logo)
                logo_bottom_y = logo_center_y + tgt_h // 2
            except Exception as e:
                print(f"  [thumbnail] ロゴ読み込み失敗 {logo_path}: {e}", file=sys.stderr)
        elif palette.name and palette.key != "default":
            f = fonts.title
            tw = _text_w(f, palette.name)
            pad = 50
            box_w = tw + pad * 2
            box_h = _line_h(f) + 30
            x0 = (W - box_w) // 2
            y0 = logo_center_y - box_h // 2
            draw_rounded_box(
                canvas, (x0, y0, x0 + box_w, y0 + box_h),
                fill=palette.primary + (255,),
                outline=(0, 0, 0), outline_w=5, radius=22,
            )
            d2 = ImageDraw.Draw(canvas)
            d2.text(
                (x0 + pad, y0 + (box_h - _line_h(f)) // 2),
                palette.name,
                font=f,
                fill=palette.on_primary,
            )
            logo_bottom_y = y0 + box_h

    # 3) ヘッドライン (固定黄色 + 黒文字)。default パレットは省略 (下半分黄色帯と重複)
    if headline and not palette.thumb_full_band:
        hf = fonts.thumb_headline
        max_w = W - 240
        while _text_w(hf, headline) > max_w and hf.size > 40:
            hf = ImageFont.truetype(hf.path, hf.size - 4)
        hw = _text_w(hf, headline)
        pad = 50
        box_w = hw + pad * 2
        box_h = _line_h(hf) + 36
        x0 = (W - box_w) // 2
        y0 = max(logo_bottom_y + 20, int(H * 0.30))
        draw_rounded_box(
            canvas, (x0, y0, x0 + box_w, y0 + box_h),
            fill=_THUMB_HEADLINE_BG + (255,),
            outline=(0, 0, 0), outline_w=5, radius=26,
        )
        d2 = ImageDraw.Draw(canvas)
        d2.text(
            (x0 + pad, y0 + (box_h - _line_h(hf)) // 2),
            headline,
            font=hf,
            fill=_THUMB_HEADLINE_TEXT,
        )

    # 4) 下半分のメインキャッチ + サブキャッチ
    draw = ImageDraw.Draw(canvas)
    if main:
        mf = fonts.thumb_main
        while _text_w(mf, main) > W - 80 and mf.size > 60:
            mf = ImageFont.truetype(mf.path, mf.size - 6)
        my = int(H * 0.62) if not palette.thumb_full_band else int(H * 0.56)
        _draw_thumb_caption(draw, W // 2, my, main, font=mf, palette=palette, stroke_w=10)
    if sub:
        sf = fonts.thumb_sub
        while _text_w(sf, sub) > W - 80 and sf.size > 50:
            sf = ImageFont.truetype(sf.path, sf.size - 4)
        sy = int(H * 0.83) if not palette.thumb_full_band else int(H * 0.80)
        _draw_thumb_caption(draw, W // 2, sy, sub, font=sf, palette=palette, stroke_w=8)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(out_path, "JPEG", quality=92)
    return out_path
