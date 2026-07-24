# -*- coding: utf-8 -*-
"""崩壊形 問題集（図つき）Excel 生成スクリプト。
出力: docs/collapse/崩壊形問題集.xlsx
NO.7 各崩壊形を理解している
1 全体・部分・局部崩壊形 / 2 ラーメン架構の崩壊形 / 3 耐震壁架構の崩壊形
4 崩壊形に応じた目標耐震性能の差 / 5 崩壊形確認時の架構モデル支点状態
RC造マンションの設計担当を想定。
"""
import os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib import font_manager as fm

FONT_PATH = "/usr/share/fonts/truetype/fonts-japanese-gothic.ttf"
jp = fm.FontProperties(fname=FONT_PATH)
fm.fontManager.addfont(FONT_PATH)
plt.rcParams["font.family"] = jp.get_name()
plt.rcParams["axes.unicode_minus"] = False

OUT = "docs/collapse"
FIG = os.path.join(OUT, "figures")
os.makedirs(FIG, exist_ok=True)
C_BLUE = "#2a78d6"; C_PINK = "#d55181"


def save(fig, name):
    p = os.path.join(FIG, name)
    fig.savefig(p, dpi=130, bbox_inches="tight")
    plt.close(fig)
    return p


def frame(ax, x0, spans, stories, h=1.0, hinge_beam=None, hinge_col=None,
          soft_story=None, color_col="#1f4e79", color_beam="#c00000"):
    """簡易ラーメン。hinge_beam/col: ヒンジ位置のリスト。"""
    xs = [x0 + sum(spans[:i]) for i in range(len(spans) + 1)]
    ys = [i * h for i in range(stories + 1)]
    for x in xs:
        ax.plot([x, x], [0, ys[-1]], color=color_col, lw=1.8, zorder=2)
    for y in ys[1:]:
        ax.plot([xs[0], xs[-1]], [y, y], color=color_beam, lw=1.8, zorder=2)
    # 支点
    for x in xs:
        ax.plot(x, 0, "s", color="k", ms=7, zorder=4)
    return xs, ys


# 図1: 全体・部分・局部崩壊形
def fig_types():
    fig, axes = plt.subplots(1, 3, figsize=(14.5, 5.0))
    # (a) 全体崩壊形
    ax = axes[0]
    xs, ys = frame(ax, 0, [2, 2], 3)
    # 梁端ヒンジ（全層）＋柱脚
    for y in ys[1:]:
        for i, x in enumerate(xs):
            for dx in ([0.4] if i == 0 else [-0.4] if i == len(xs) - 1
                       else [-0.4, 0.4]):
                ax.plot(x + dx, y, "o", mfc="white", mec="#c00000", ms=7,
                        mew=1.8, zorder=5)
    for x in xs:
        ax.plot(x, 0.12, "o", mfc="white", mec="#c00000", ms=7, mew=1.8,
                zorder=5)
    ax.text(2, -0.9, "全体崩壊形\n（梁端＋柱脚に分散）\n全層で吸収・靭性大◎",
            fontproperties=jp, ha="center", fontsize=9, color="#1f7a1f")
    ax.set_xlim(-0.8, 4.8); ax.set_ylim(-1.7, 3.5)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(a) 全体崩壊形（GOOD）", fontproperties=jp, fontsize=10,
                 fontweight="bold")
    # (b) 部分崩壊形
    ax = axes[1]
    xs, ys = frame(ax, 0, [2, 2], 3)
    # 中間層に集中
    for i, x in enumerate(xs):
        ax.plot(x, ys[1] + 0.12, "o", mfc="#c00000", mec="#c00000", ms=8,
                zorder=5)
        ax.plot(x, ys[2] - 0.12, "o", mfc="#c00000", mec="#c00000", ms=8,
                zorder=5)
    ax.text(2, -0.9, "部分崩壊形\n（一部の層に集中）\n靭性中△",
            fontproperties=jp, ha="center", fontsize=9, color="#7a5a00")
    ax.set_xlim(-0.8, 4.8); ax.set_ylim(-1.7, 3.5)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(b) 部分崩壊形", fontproperties=jp, fontsize=10,
                 fontweight="bold")
    # (c) 局部崩壊形
    ax = axes[2]
    xs, ys = frame(ax, 0, [2, 2], 3)
    # 1本の柱の上下に集中（局部）
    ax.plot(xs[1], ys[0] + 0.12, "o", mfc="#c00000", mec="#c00000", ms=9,
            zorder=5)
    ax.plot(xs[1], ys[1] - 0.12, "o", mfc="#c00000", mec="#c00000", ms=9,
            zorder=5)
    ax.text(2, -0.9, "局部崩壊形\n（1 部材・1 点に集中）\n脆性・危険×",
            fontproperties=jp, ha="center", fontsize=9, color="#c00000")
    ax.set_xlim(-0.8, 4.8); ax.set_ylim(-1.7, 3.5)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(c) 局部崩壊形（NG）", fontproperties=jp, fontsize=10,
                 fontweight="bold")
    fig.suptitle("図 1  全体崩壊形・部分崩壊形・局部崩壊形",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig1_types.png")


# 図2: ラーメン架構の崩壊形（強柱弱梁 vs 弱柱強梁）
def fig_ramen():
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 5.2))
    # (a) 強柱弱梁（梁降伏先行・全体崩壊）
    ax = axes[0]
    xs, ys = frame(ax, 0, [2.5, 2.5], 3)
    for y in ys[1:]:
        for i, x in enumerate(xs):
            for dx in ([0.45] if i == 0 else [-0.45] if i == len(xs) - 1
                       else [-0.45, 0.45]):
                ax.plot(x + dx, y, "o", mfc="white", mec="#c00000", ms=7,
                        mew=1.8, zorder=5)
    for x in xs:
        ax.plot(x, 0.12, "o", mfc="white", mec="#c00000", ms=7, mew=1.8)
    ax.text(2.5, -1.0,
            "強柱弱梁：梁端が先に曲げ降伏\n→ ヒンジが梁に分散（全体崩壊）\n"
            "柱は健全 → 粘り強い◎",
            fontproperties=jp, ha="center", fontsize=8.5, color="#1f7a1f")
    ax.set_xlim(-0.9, 5.9); ax.set_ylim(-1.9, 3.4)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(a) 強柱弱梁（梁降伏先行）", fontproperties=jp, fontsize=10,
                 fontweight="bold")
    # (b) 弱柱強梁（柱降伏・層崩壊）
    ax = axes[1]
    xs, ys = frame(ax, 0, [2.5, 2.5], 3)
    # 1層の柱頭柱脚に集中
    for x in xs:
        ax.plot(x, ys[0] + 0.12, "o", mfc="#c00000", mec="#c00000", ms=8)
        ax.plot(x, ys[1] - 0.12, "o", mfc="#c00000", mec="#c00000", ms=8)
    # 変形（1層だけ大きくずれる）を破線で
    for x in xs:
        ax.plot([x, x + 0.8], [ys[1], ys[1]], color="#999", lw=0.8, ls=":")
    ax.text(2.5, -1.0,
            "弱柱強梁：柱が先に降伏\n→ 1 層に変形集中（層崩壊）\n"
            "脆性的・危険×",
            fontproperties=jp, ha="center", fontsize=8.5, color="#c00000")
    ax.set_xlim(-0.9, 5.9); ax.set_ylim(-1.9, 3.4)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(b) 弱柱強梁（柱降伏＝層崩壊）", fontproperties=jp,
                 fontsize=10, fontweight="bold")
    fig.suptitle("図 2  ラーメン架構の崩壊形",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig2_ramen.png")


# 図3: 耐震壁架構の崩壊形
def fig_wall():
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 5.2))
    # (a) 曲げ降伏型（脚部ヒンジ・良い）
    ax = axes[0]
    ax.add_patch(mpatches.Rectangle((0, 0), 1.2, 5, fc="#e8c9ce", ec="k",
                 lw=1.5, hatch="//", alpha=0.6))
    # 脚部ヒンジ
    ax.add_patch(mpatches.Rectangle((0, 0), 1.2, 0.5, fc="#c00000",
                 alpha=0.4))
    ax.annotate("脚部で曲げ降伏\n（水平ひび割れ）", xy=(0.6, 0.3),
                xytext=(2.0, 1.0), fontproperties=jp, fontsize=8.5,
                color="#1f7a1f",
                arrowprops=dict(arrowstyle="->", color="#1f7a1f"))
    ax.text(0.6, -0.9, "曲げ降伏型\n脚部でじわじわ曲げ降伏◎\n(靭性的)",
            fontproperties=jp, ha="center", fontsize=8.5, color="#1f7a1f")
    ax.set_xlim(-0.5, 4.5); ax.set_ylim(-1.7, 5.5)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(a) 曲げ降伏型（GOOD）", fontproperties=jp, fontsize=10,
                 fontweight="bold")
    # (b) せん断破壊型（斜めひび割れ・悪い）
    ax = axes[1]
    ax.add_patch(mpatches.Rectangle((0, 0), 1.2, 5, fc="#e8c9ce", ec="k",
                 lw=1.5, hatch="//", alpha=0.6))
    # 斜めひび割れ
    for off in [-0.3, 0.1, 0.5]:
        ax.plot([0, 1.2], [1.5 + off, 3.5 + off], color="#c00000", lw=2)
    ax.annotate("斜めひび割れ\n（せん断破壊）", xy=(0.6, 2.5),
                xytext=(2.0, 3.5), fontproperties=jp, fontsize=8.5,
                color="#c00000",
                arrowprops=dict(arrowstyle="->", color="#c00000"))
    ax.text(0.6, -0.9, "せん断破壊型\n急激に耐力喪失（脆性）×\n"
                       "→ 保証設計で防ぐ",
            fontproperties=jp, ha="center", fontsize=8.5, color="#c00000")
    ax.set_xlim(-0.5, 4.5); ax.set_ylim(-1.7, 5.5)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(b) せん断破壊型（NG）", fontproperties=jp, fontsize=10,
                 fontweight="bold")
    fig.suptitle("図 3  耐震壁架構の崩壊形",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig3_wall.png")


# 図4: 支点状態（増分解析のモデル）
def fig_support():
    fig, ax = plt.subplots(figsize=(10, 5.0))
    xs, ys = frame(ax, 0, [3, 3], 3, h=1.5)
    # 水平力（Ai分布）
    for i, y in enumerate(ys[1:]):
        ln = 0.8 + i * 0.5
        ax.annotate("", xy=(xs[0] - 0.2, y), xytext=(xs[0] - 0.2 - ln, y),
                    arrowprops=dict(arrowstyle="-|>", color="#c00000", lw=2))
        ax.text(xs[0] - 0.4 - ln, y, f"P{i+1}", fontproperties=jp, fontsize=8,
                color="#c00000", ha="right", va="center")
    # 柱脚固定を強調
    for x in xs:
        ax.add_patch(mpatches.Rectangle((x - 0.35, -0.4), 0.7, 0.4,
                     fc="#c9c9c9", ec="k"))
        ax.plot([x - 0.4, x + 0.4], [-0.4, -0.4], color="k", lw=2)
    ax.text(3, -1.3,
            "崩壊形確認（増分解析）では、柱脚を『固定支点』とし\n"
            "Ai 分布の水平力を漸増させる。基礎の回転・浮き上がりを\n"
            "考慮する場合は支点条件（ピン／ばね）を適切に設定",
            fontproperties=jp, ha="center", fontsize=9, color="#444")
    ax.set_xlim(-3, 7); ax.set_ylim(-2.4, 5.2)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("図 5  崩壊形確認時の架構モデルと支点状態",
                 fontproperties=jp, fontsize=12, fontweight="bold")
    return save(fig, "fig5_support.png")


figs = {"types": fig_types(), "ramen": fig_ramen(), "wall": fig_wall(),
        "support": fig_support()}
print("figures:", list(figs.keys()))

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.drawing.image import Image as XLImage
from openpyxl.utils import get_column_letter

wb = Workbook()
C_TITLE = "1F4E79"; C_HEAD = "2E75B6"; C_ANS = "E2EFDA"
thin = Side(style="thin", color="BFBFBF")
border = Border(left=thin, right=thin, top=thin, bottom=thin)
f_title = Font(name="MS PGothic", size=15, bold=True, color="FFFFFF")
f_head = Font(name="MS PGothic", size=11, bold=True, color="FFFFFF")
f_body = Font(name="MS PGothic", size=10)
f_ans = Font(name="MS PGothic", size=10, color="375623")
wrap = Alignment(wrap_text=True, vertical="top")
center = Alignment(horizontal="center", vertical="center", wrap_text=True)


def setup(ws, widths):
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.sheet_view.showGridLines = False


def title_row(ws, row, text, span=8):
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=span)
    c = ws.cell(row, 1, text)
    c.font = f_title; c.fill = PatternFill("solid", fgColor=C_TITLE)
    c.alignment = Alignment(vertical="center", horizontal="left", indent=1)
    ws.row_dimensions[row].height = 30


def head(ws, row, text, span=8):
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=span)
    c = ws.cell(row, 1, text)
    c.font = f_head; c.fill = PatternFill("solid", fgColor=C_HEAD)
    c.alignment = Alignment(vertical="center", horizontal="left", indent=1)
    ws.row_dimensions[row].height = 22


def body(ws, row, text, span=8, ans=False, h=None):
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=span)
    c = ws.cell(row, 1, text)
    c.font = f_ans if ans else f_body
    c.alignment = wrap
    if ans:
        c.fill = PatternFill("solid", fgColor=C_ANS)
    if h:
        ws.row_dimensions[row].height = h


def table(ws, start_row, headers, rows, col1=1):
    r = start_row
    for j, htxt in enumerate(headers):
        c = ws.cell(r, col1 + j, htxt)
        c.font = Font(name="MS PGothic", size=10, bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor=C_HEAD)
        c.alignment = center; c.border = border
    for data in rows:
        r += 1
        for j, v in enumerate(data):
            c = ws.cell(r, col1 + j, v)
            c.font = f_body
            c.alignment = center if j > 0 else wrap
            c.border = border
            if r % 2 == 0:
                c.fill = PatternFill("solid", fgColor="F2F7FC")
    return r


def put_img(ws, path, anchor, w=None):
    img = XLImage(path)
    if w:
        ratio = w / img.width
        img.width = w; img.height = int(img.height * ratio)
    ws.add_image(img, anchor)


ws = wb.active
ws.title = "目次"
setup(ws, [4, 22, 60, 14])
title_row(ws, 1, "崩壊形 問題集（RC マンション設計担当・新人向け）", span=4)
body(ws, 2,
     "目標：各崩壊形を理解すること。保有水平耐力計算で建物がどう壊れるか"
     "（崩壊メカニズム）を把握する。全体・部分・局部の 3 形式、ラーメン／耐震壁の"
     "破壊状況、目標性能の差、支点状態を通す。保有水平耐力計算教材の続き。",
     span=4, h=44)
r = table(ws, 4, ["No.", "シート", "到達目標", "図"],
          [["1", "1 3つの崩壊形", "全体・部分・局部崩壊形を理解する",
            "3形式"],
           ["2", "2 ラーメンの崩壊形", "ラーメン架構の破壊状況を説明できる",
            "強柱弱梁/弱柱強梁"],
           ["3", "3 耐震壁の崩壊形", "耐震壁架構の破壊状況を説明できる",
            "曲げ/せん断"],
           ["4", "4 目標耐震性能の差", "崩壊形に応じた目標性能の差を理解する",
            "—"],
           ["5", "5 支点状態", "崩壊形確認時の支点状態を理解する",
            "増分解析"]])
body(ws, r + 2,
     "崩壊形が良い（全体崩壊・靭性型）ほど Ds を小さくでき（No.保有水平耐力教材）、"
     "経済的で安全な設計になる。崩壊形は二次設計の要。", span=4, h=32)

# 1
ws = wb.create_sheet("1 3つの崩壊形")
setup(ws, [8, 18, 18, 16, 12, 12])
title_row(ws, 1, "1  全体崩壊形・部分崩壊形・局部崩壊形")
head(ws, 3, "■ 図 1  3 つの崩壊形")
put_img(ws, figs["types"], "A4", w=820)
head(ws, 30, "■ 問題 1  3 形式の対比")
r = table(ws, 31, ["崩壊形", "ヒンジの分布（記入）", "靭性（記入）", "評価（記入）"],
          [["全体崩壊形", "", "", ""],
           ["部分崩壊形", "", "", ""],
           ["局部崩壊形", "", "", ""]])
head(ws, r + 2, "■ 問題 2  なぜ全体崩壊形が良いか")
body(ws, r + 3, "全体崩壊形（ヒンジが全層の梁端に分散）が最も望ましい理由を、"
                "エネルギー吸収と変形集中の観点から述べよ。"
                "局部崩壊形がなぜ危険かも対比せよ。", h=44)
head(ws, r + 5, "■ 問題 3  設計での誘導")
body(ws, r + 6, "設計で全体崩壊形に『誘導』する方法を述べよ"
                "（強柱弱梁で梁を先に降伏させる／柱・壁のせん断破壊を防ぐ"
                "＝保証設計）。", h=40)

# 2
ws = wb.create_sheet("2 ラーメンの崩壊形")
setup(ws, [8, 18, 18, 16, 12, 12])
title_row(ws, 1, "2  ラーメン架構の崩壊形")
head(ws, 3, "■ 図 2  強柱弱梁 vs 弱柱強梁")
put_img(ws, figs["ramen"], "A4", w=820)
head(ws, 30, "■ 問題 1  破壊状況の説明")
r = table(ws, 31, ["型", "先に降伏する部材（記入）", "崩壊形（記入）",
                   "破壊状況（記入）"],
          [["強柱弱梁", "", "", ""],
           ["弱柱強梁", "", "", ""]])
head(ws, r + 2, "■ 問題 2  柱梁耐力比")
body(ws, r + 3, "強柱弱梁を実現するには、接合部で『柱の曲げ耐力の和 ＞ 梁の曲げ耐力の和』"
                "（柱梁耐力比 > 1）とする。なぜ梁を先に降伏させたいのか"
                "（梁ヒンジは全体崩壊、柱ヒンジは層崩壊）を述べよ。", h=44)
head(ws, r + 5, "■ 問題 3  層崩壊の危険")
body(ws, r + 6, "弱柱強梁で 1 層の柱頭・柱脚が降伏すると、その層だけが大きく変形"
                "（層崩壊）する。ピロティ層（1 階）で起こりやすい理由と、"
                "阪神大震災での被害例に触れよ。", h=44)

# 3
ws = wb.create_sheet("3 耐震壁の崩壊形")
setup(ws, [8, 18, 18, 16, 12, 12])
title_row(ws, 1, "3  耐震壁架構の崩壊形")
head(ws, 3, "■ 図 3  曲げ降伏型 vs せん断破壊型")
put_img(ws, figs["wall"], "A4", w=820)
head(ws, 30, "■ 問題 1  破壊状況の説明")
r = table(ws, 31, ["型", "ひび割れの向き（記入）", "靭性（記入）",
                   "評価（記入）"],
          [["曲げ降伏型", "", "", ""],
           ["せん断破壊型", "", "", ""]])
head(ws, r + 2, "■ 問題 2  曲げ降伏型に誘導")
body(ws, r + 3, "耐震壁を曲げ降伏型（脚部で曲げ降伏）に誘導するには、"
                "せん断破壊を先に起こさないことが必要。"
                "そのための設計（せん断補強・保証設計）を述べよ。", h=40)
head(ws, r + 5, "■ 問題 3  連層耐震壁の基礎")
body(ws, r + 6, "連層耐震壁は脚部で大きな曲げ・転倒モーメントを受ける。"
                "脚部の曲げ降伏を確実にするには基礎（杭の引抜き等）も"
                "耐えられる必要があることを述べよ（No.耐震壁架構教材参照）。",
     h=40)

# 4
ws = wb.create_sheet("4 目標耐震性能の差")
setup(ws, [8, 18, 18, 16, 12, 12])
title_row(ws, 1, "4  崩壊形に応じた目標耐震性能の差")
head(ws, 3, "■ 崩壊形と Ds（構造特性係数）")
body(ws, 4, "崩壊形（＝靭性）に応じて Ds が変わり、必要保有水平耐力が変わる。",
     span=6, h=22)
r = table(ws, 6, ["崩壊形・性状", "靭性", "Ds の目安", "必要保有水平耐力"],
          [["全体崩壊・曲げ降伏（靭性型）", "大", "0.30〜", "小さくてよい"],
           ["部分崩壊", "中", "0.35〜0.45", "中"],
           ["せん断破壊・局部（強度型/脆性）", "小", "0.45〜0.55", "大きく必要"]])
head(ws, r + 2, "■ 問題 1  Ds との関係")
body(ws, r + 3, "崩壊形が良い（全体崩壊・靭性型）ほど Ds が小さくなり、"
                "必要保有水平耐力 Qun が小さくて済む理由を述べよ"
                "（靭性でエネルギー吸収）。", h=40)
head(ws, r + 5, "■ 問題 2  目標性能の設定")
body(ws, r + 6, "同じ大地震でも、靭性型は『損傷するが粘って倒壊しない』、"
                "脆性型は『粘れないので大きな耐力で受ける』。"
                "どちらを目指すのが合理的か、経済性も含めて述べよ。", h=44)
head(ws, r + 8, "■ 問題 3  設計の一貫性")
body(ws, r + 9, "崩壊形（No.7）→ 部材種別（No.8）→ Ds（保有水平耐力）→ 保証設計 が"
                "一連でつながることを整理せよ。良い崩壊形にするために各段階で"
                "何をするか。", h=44)

# 5
ws = wb.create_sheet("5 支点状態")
setup(ws, [8, 18, 18, 16, 12, 12])
title_row(ws, 1, "5  崩壊形確認時の架構モデル支点状態")
head(ws, 3, "■ 図 5  増分解析のモデル")
put_img(ws, figs["support"], "A4", w=720)
head(ws, 28, "■ 問題 1  増分解析（穴埋め）")
body(ws, 29, "崩壊形は、Ai 分布の水平力を【 ① 】に増やす（荷重増分法／増分解析）ことで"
             "確認する。部材が順に【 ② 】し、崩壊メカニズムが形成された時の水平力が"
             "【 ③ 】。柱脚は通常【 ④ 】支点とする。", h=44)
head(ws, 31, "■ 問題 2  支点条件の設定")
body(ws, 32, "柱脚を『固定』とするか『ピン』『回転ばね』とするかで崩壊形・保有耐力が"
             "変わる。(1) 基礎が堅固（べた基礎・堅固な基礎梁）なら固定。"
             "(2) 杭基礎で回転・浮き上がりがある場合は回転ばね等で考慮する理由を述べよ。",
     h=44)
head(ws, 34, "■ 問題 3  基礎の影響")
body(ws, 35, "連層耐震壁の脚部が曲げ降伏する前に、基礎（杭）が引抜けて浮き上がると、"
             "壁の曲げ降伏メカニズムが成立しない。支点条件と基礎の耐力を"
             "整合させる必要があることを述べよ。", h=44)
head(ws, 37, "■ 問題 4  モデル化の注意")
body(ws, 38, "崩壊形確認のモデル化で注意する点を 3 つ挙げよ"
             "（支点条件／剛域・剛性の設定（No.架構モデル教材）／"
             "部材の復元力特性（曲げ・せん断））。", h=40)

ws = wb.create_sheet("解答")
setup(ws, [4, 22, 60, 14])
title_row(ws, 1, "解答・解説", span=4)
row = 2


def ah(t):
    global row
    head(ws, row, t, span=4); row += 1


def an(t, h=None):
    global row
    body(ws, row, t, span=4, ans=True, h=h); row += 1


ah("1  3つの崩壊形")
an("問1：全体崩壊形＝ヒンジが全層の梁端＋柱脚に分散／靭性大／◎。"
   "部分崩壊形＝一部の層に集中／靭性中／△。"
   "局部崩壊形＝1 部材・1 点に集中／脆性／×（危険）。", h=44)
an("問2：全体崩壊形はヒンジが多数分散し、建物全体で地震エネルギーを吸収するので"
   "変形能力が大きく倒壊しにくい。局部崩壊形は 1 か所に変形が集中して"
   "早期に破断・崩壊するため危険。", h=44)
an("問3：①強柱弱梁（柱梁耐力比>1）で梁を先に降伏させ全体崩壊へ誘導。"
   "②柱・壁・接合部のせん断破壊を保証設計で防ぐ（せん断余裕率 n）。", h=40)

ah("2  ラーメンの崩壊形")
an("問1：強柱弱梁＝梁が先に降伏／全体崩壊形／ヒンジが梁端に分散し柱は健全。"
   "弱柱強梁＝柱が先に降伏／層崩壊（部分・局部）／1 層の柱頭柱脚に変形集中。",
   h=44)
an("問2：柱梁耐力比>1（柱の曲げ耐力和＞梁の曲げ耐力和）で梁を先に降伏させる。"
   "梁ヒンジは全層に分散して全体崩壊（靭性大）になるが、柱ヒンジは 1 層に集中して"
   "層崩壊（脆性）になるため、梁を先に降伏させたい。", h=44)
an("問3：弱柱強梁で 1 層（特にピロティ 1 階）の柱頭柱脚が降伏すると、その層だけ"
   "大変形して層崩壊。ピロティは壁がなく柱だけで水平力を受けるため起こりやすい。"
   "阪神大震災で 1 階ピロティの層崩壊被害が多発した。", h=44)

ah("3  耐震壁の崩壊形")
an("問1：曲げ降伏型＝水平ひび割れ（脚部で曲げ降伏）／靭性大／◎。"
   "せん断破壊型＝斜めひび割れ／靭性小（急激な耐力喪失）／×。", h=40)
an("問2：壁のせん断耐力を曲げ降伏時のせん断力より大きく確保し"
   "（せん断補強筋・保証設計）、曲げ降伏がせん断破壊に先行するようにする。", h=40)
an("問3：連層耐震壁は脚部で大きな曲げ・転倒モーメントを受け、基礎に引抜き力が"
   "生じる。脚部の曲げ降伏を確実にするには、杭の引抜き耐力・基礎の浮き上がりも"
   "耐えられる必要がある（基礎が先に壊れると曲げ降伏メカニズムが成立しない）。",
   h=44)

ah("4  目標耐震性能の差")
an("問1：全体崩壊・曲げ降伏型は靭性が大きく、変形で地震エネルギーを吸収できるので"
   "Ds が小さく（0.3）、必要保有水平耐力 Qun が小さくて済む。"
   "脆性型は粘れないので Ds が大きく（0.55）、大きな耐力が必要。", h=44)
an("問2：靭性型（損傷するが倒壊しない）を目指すのが合理的。"
   "脆性型で大耐力を確保するより、靭性を持たせて Ds を下げる方が経済的で、"
   "かつ大地震時の安全余裕（変形能力）も大きい。", h=44)
an("問3：良い崩壊形（全体崩壊）を目標→そのため部材を良い種別（FA/FB）にし"
   "（No.8）→柱梁耐力比・せん断余裕を確保（保証設計）→靭性が高いので Ds を"
   "小さくできる（保有水平耐力）。全段階が『粘り強い全体崩壊』のためにつながる。",
   h=44)

ah("5  支点状態")
an("問1：①漸増（徐々） ②塑性ヒンジ化（降伏） ③保有水平耐力 Qu ④固定。", h=32)
an("問2：(1)べた基礎・堅固な基礎梁なら柱脚固定でよい。"
   "(2)杭基礎で基礎の回転・浮き上がりが生じる場合、固定と仮定すると実際より"
   "剛性・耐力を過大評価するので、回転ばね等で基礎の変形を考慮する。", h=44)
an("問3：連層壁の脚部が曲げ降伏する前に杭が引抜けて浮き上がると、想定した"
   "曲げ降伏メカニズムが成立せず崩壊形が変わる。支点条件（基礎の耐力・変形）と"
   "壁の耐力を整合させてモデル化する必要がある。", h=44)
an("問4：①支点条件（固定/ピン/ばね）②剛域・剛性の設定（No.架構モデル教材）"
   "③部材の復元力特性（曲げ・せん断の耐力と変形能力）。"
   "これらが崩壊形・保有水平耐力の結果を左右する。", h=44)

XLSX = os.path.join(OUT, "崩壊形問題集.xlsx")
wb.save(XLSX)
print("saved:", XLSX)
