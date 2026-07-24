# -*- coding: utf-8 -*-
"""保証設計 問題集（図つき）Excel 生成スクリプト。
出力: docs/shear_margin/保証設計問題集.xlsx
保証設計を理解している
1 保証設計の目的 / 2 各部材のせん断余裕率n / 3 崩壊状況に応じたnの差
RC造マンションの設計担当を想定。数値は build 時に検算済み。
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

OUT = "docs/shear_margin"
FIG = os.path.join(OUT, "figures")
os.makedirs(FIG, exist_ok=True)
C_BLUE = "#2a78d6"; C_PINK = "#d55181"


def save(fig, name):
    p = os.path.join(FIG, name)
    fig.savefig(p, dpi=130, bbox_inches="tight")
    plt.close(fig)
    return p


# 図1: 保証設計の目的（曲げ降伏をせん断破壊に先行させる）
def fig_purpose():
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 5.0))
    # (a) 曲げ降伏 vs せん断破壊の耐力比較
    ax = axes[0]
    d = np.linspace(0, 10, 100)
    # 曲げ：降伏後粘る
    Qm = np.where(d < 2, 200 * d / 2, 200)
    # せん断耐力（余裕をもって上に設定）
    ax.plot(d, Qm, color=C_BLUE, lw=2.5, label="曲げ耐力（降伏後粘る）")
    ax.axhline(250, color="#1f7a1f", lw=2, ls="--",
               label="せん断耐力（曲げより上に確保）")
    ax.axhline(180, color="#c00000", lw=1.5, ls=":",
               label="せん断耐力（不足＝危険）")
    ax.fill_between(d, 200, 250, color="#1f7a1f", alpha=0.1)
    ax.text(5, 230, "せん断余裕", fontproperties=jp, fontsize=8.5,
            color="#1f7a1f", ha="center")
    ax.annotate("せん断耐力が曲げより低いと\nせん断破壊が先行（脆性）×",
                xy=(6, 180), xytext=(3.5, 60), fontproperties=jp,
                fontsize=8, color="#c00000",
                arrowprops=dict(arrowstyle="->", color="#c00000"))
    ax.set_xlabel("変形 δ", fontproperties=jp)
    ax.set_ylabel("力 Q (kN)", fontproperties=jp)
    ax.set_xlim(0, 10); ax.set_ylim(0, 300)
    ax.legend(prop=jp, fontsize=8, loc="lower right")
    ax.set_title("(a) 曲げ降伏をせん断破壊に先行させる",
                 fontproperties=jp, fontsize=10, fontweight="bold")
    # (b) 目的の説明
    ax = axes[1]
    ax.text(0.5, 0.92, "保証設計の目的", transform=ax.transAxes,
            ha="center", fontproperties=jp, fontsize=12, fontweight="bold",
            color="#1f4e79")
    ax.text(0.5, 0.7,
            "『曲げ降伏（靭性的）を、せん断破壊（脆性的）\n"
            "より確実に先行させる』設計",
            transform=ax.transAxes, ha="center", fontproperties=jp,
            fontsize=10.5, color="#c00000")
    ax.text(0.5, 0.44,
            "せん断破壊は予兆なく急激に耐力を失う（脆性）。\n"
            "曲げ降伏は粘り強く変形する（靭性）。\n\n"
            "→ せん断耐力を曲げ降伏時のせん断力より\n"
            "  余裕をもって大きく設計（せん断余裕率 n）\n"
            "  することで、脆性的な破壊を防ぐ",
            transform=ax.transAxes, ha="center", fontproperties=jp,
            fontsize=9.5, color="#333")
    ax.text(0.5, 0.08,
            "設計せん断力 Qd = n × (曲げ終局時のせん断力 Qmu)",
            transform=ax.transAxes, ha="center", fontproperties=jp,
            fontsize=10, color="#1f7a1f", fontweight="bold")
    ax.axis("off")
    ax.set_title("(b) 目的", fontproperties=jp, fontsize=10,
                 fontweight="bold")
    fig.suptitle("図 1  保証設計の目的（せん断破壊を防ぐ）",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig1_purpose.png")


# 図2: せん断余裕率n（部材別）
def fig_n():
    fig, ax = plt.subplots(figsize=(11.5, 5.0))
    ax.text(0.5, 0.93, "設計せん断力  Qd = n × Qmu（曲げ終局時せん断力）",
            transform=ax.transAxes, ha="center", fontproperties=jp,
            fontsize=13, fontweight="bold", color="#c00000")
    members = [("梁", "1.1〜1.2", "#cfe0f0",
                "曲げ降伏を先行させる基本の割増し"),
               ("柱", "1.1〜1.25", "#cfead4",
                "軸力があり重要。軸力大でnを割増す"),
               ("耐震壁", "1.0〜1.25", "#fde2c4",
                "せん断破壊を確実に防ぐ")]
    y = 0.66
    for name, n, color, desc in members:
        ax.add_patch(mpatches.Rectangle((0.05, y), 0.14, 0.14,
                     transform=ax.transAxes, fc=color, ec="k", lw=1))
        ax.text(0.12, y + 0.07, name, transform=ax.transAxes, ha="center",
                va="center", fontproperties=jp, fontsize=12,
                fontweight="bold")
        ax.text(0.28, y + 0.07, f"n = {n}", transform=ax.transAxes,
                va="center", fontproperties=jp, fontsize=13, color="#c00000",
                fontweight="bold")
        ax.text(0.52, y + 0.07, desc, transform=ax.transAxes, va="center",
                fontproperties=jp, fontsize=9, color="#333")
        y -= 0.2
    ax.text(0.5, 0.08,
            "例）曲げ終局時せん断力 Qmu=200kN、柱 n=1.25 → Qd=250kN でせん断設計\n"
            "※具体の n は靭性指針・RC 規準・技術基準解説書で確認すること",
            transform=ax.transAxes, ha="center", fontproperties=jp,
            fontsize=9, color="#7a3b3b")
    ax.axis("off")
    ax.set_title("図 2  各部材のせん断余裕率 n",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig2_n.png")


# 図3: 崩壊状況に応じたnの差
def fig_diff():
    fig, ax = plt.subplots(figsize=(11.5, 5.0))
    ax.text(0.5, 0.93, "崩壊状況に応じたせん断余裕率 n の差",
            transform=ax.transAxes, ha="center", fontproperties=jp,
            fontsize=13, fontweight="bold", color="#1f4e79")
    ax.text(0.5, 0.74,
            "変形が集中する（＝大きな塑性変形を受ける）部材ほど、\n"
            "せん断破壊を防ぐために大きな n（余裕）が必要",
            transform=ax.transAxes, ha="center", fontproperties=jp,
            fontsize=10, color="#333")
    rows = [
        ("全体崩壊形（ヒンジ分散・変形小）", "n 小さめで可", "#cfead4"),
        ("部分・局部崩壊形（変形集中）", "n 大きく（安全側）", "#fde2c4"),
        ("ヒンジができる部材（塑性化）", "n を大きく（靭性域で\nせん断させない）", "#f8d0d0"),
    ]
    y = 0.5
    for label, n, color in rows:
        ax.add_patch(mpatches.FancyBboxPatch((0.05, y), 0.55, 0.13,
                     boxstyle="round,pad=0.01", transform=ax.transAxes,
                     fc="#eef3f8", ec="#bbb", lw=0.6))
        ax.text(0.08, y + 0.065, label, transform=ax.transAxes, va="center",
                fontproperties=jp, fontsize=9.5)
        ax.add_patch(mpatches.FancyBboxPatch((0.63, y), 0.32, 0.13,
                     boxstyle="round,pad=0.01", transform=ax.transAxes,
                     fc=color, ec="#bbb", lw=0.6))
        ax.text(0.79, y + 0.065, n, transform=ax.transAxes, ha="center",
                va="center", fontproperties=jp, fontsize=9,
                color="#c00000", fontweight="bold")
        y -= 0.16
    ax.text(0.5, 0.05,
            "ヒンジで大きく塑性変形する部材は、変形とともにせん断耐力が\n"
            "低下する（劣化）ため、より大きな n でせん断破壊を確実に防ぐ",
            transform=ax.transAxes, ha="center", fontproperties=jp,
            fontsize=9, color="#7a3b3b")
    ax.axis("off")
    ax.set_title("図 3  崩壊状況とせん断余裕率",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig3_diff.png")


figs = {"purpose": fig_purpose(), "n": fig_n(), "diff": fig_diff()}
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
title_row(ws, 1, "保証設計 問題集（RC マンション設計担当・新人向け）", span=4)
body(ws, 2,
     "目標：保証設計を理解すること。曲げ降伏（靭性的）をせん断破壊（脆性的）より"
     "確実に先行させる設計。せん断余裕率 n を用いてせん断破壊を防ぐ。"
     "崩壊形・部材種別・保有水平耐力教材と一体で、二次設計の靭性確保の要。",
     span=4, h=44)
r = table(ws, 4, ["No.", "シート", "到達目標", "図"],
          [["1", "1 保証設計の目的", "保証設計の目的を理解する",
            "曲げvsせん断"],
           ["2", "2 せん断余裕率 n", "各部材のせん断余裕率 n を暗記する",
            "部材別 n"],
           ["3", "3 崩壊状況とn", "崩壊状況に応じた n の差を理解する", "変形集中"]])
body(ws, r + 2,
     "せん断余裕率 n の目安：梁 1.1〜1.2、柱 1.1〜1.25、耐震壁 1.0〜1.25。"
     "設計せん断力 Qd=n×Qmu（曲げ終局時せん断力）。"
     "※具体値は靭性指針・RC 規準・技術基準解説書で確認すること。",
     span=4, h=44)

# 1
ws = wb.create_sheet("1 保証設計の目的")
setup(ws, [8, 18, 18, 16, 12, 12])
title_row(ws, 1, "1  保証設計の目的")
head(ws, 3, "■ 図 1  せん断破壊を防ぐ")
put_img(ws, figs["purpose"], "A4", w=820)
head(ws, 30, "■ 問題 1  目的（穴埋め）")
body(ws, 31, "保証設計とは、【 ① 】降伏（靭性的）を【 ② 】破壊（脆性的）より"
             "確実に先行させる設計。せん断破壊は予兆なく急激に耐力を失う"
             "【 ③ 】破壊なので、これを防ぐ。設計せん断力 Qd＝【 ④ 】×Qmu"
             "（曲げ終局時せん断力）とする。", h=44)
head(ws, 33, "■ 問題 2  なぜせん断破壊を防ぐか")
body(ws, 34, "せん断破壊（脆性）と曲げ降伏（靭性）の違いを述べ、"
             "なぜ曲げ降伏を先行させたいのか（靭性を確保して倒壊を防ぐ・"
             "Ds を小さくできる）を説明せよ。", h=44)
head(ws, 36, "■ 問題 3  保証設計の考え方")
body(ws, 37, "『壊れてよい壊れ方（曲げ降伏）を先に、壊れてはいけない壊れ方"
             "（せん断破壊）を後に』という設計思想を、キャパシティデザイン"
             "（保有性能設計）の観点から述べよ。", h=40)
head(ws, 39, "■ 問題 4  他教材との関係")
body(ws, 40, "保証設計が、崩壊形（No.7 全体崩壊）・部材種別（No.8 FA/FB）・"
             "Ds（保有水平耐力）とどうつながるか整理せよ"
             "（せん断破壊を防ぐ→靭性確保→良い崩壊形・良い部材種別→Ds 小）。",
     h=40)

# 2
ws = wb.create_sheet("2 せん断余裕率n")
setup(ws, [8, 18, 18, 16, 12, 12])
title_row(ws, 1, "2  各部材のせん断余裕率 n")
head(ws, 3, "■ 図 2  部材別の n")
put_img(ws, figs["n"], "A4", w=800)
head(ws, 28, "■ 問題 1  n の暗記")
r = table(ws, 29, ["部材", "せん断余裕率 n（記入）", "備考（記入）"],
          [["梁", "", ""],
           ["柱", "", ""],
           ["耐震壁", "", ""]])
body(ws, r + 2, "覚え方：n はおおむね 1.1〜1.25。梁 1.1〜1.2、柱 1.1〜1.25（軸力大で割増）、"
                "壁 1.0〜1.25。※具体値は規準で確認。", h=32)
head(ws, r + 4, "■ 問題 2  設計せん断力の計算")
body(ws, r + 5, "曲げ終局時のせん断力 Qmu=200kN の部材について、"
                "設計せん断力 Qd=n·Qmu を各部材で求めよ。", h=22)
r = table(ws, r + 7, ["部材", "n", "Qd=n·Qmu（記入）"],
          [["梁", "1.1", ""],
           ["柱", "1.25", ""],
           ["耐震壁", "1.25", ""]])
head(ws, r + 2, "■ 問題 3  なぜ柱の n が大きめか")
body(ws, r + 3, "柱のせん断余裕率が梁より大きめに設定される理由を述べよ"
                "（柱は軸力を支え、せん断破壊すると軸力支持能力を失い層崩壊"
                "＝建物全体の崩壊につながるため、より確実に守る）。", h=44)
head(ws, r + 5, "■ 問題 4  設計せん断力の意味")
body(ws, r + 6, "Qd=n·Qmu の Qmu（曲げ終局時のせん断力）は、部材が曲げ降伏したときに"
                "生じる最大のせん断力。これに n を乗じることで『曲げ降伏後も"
                "せん断破壊しない』ことを保証することを説明せよ。", h=44)

# 3
ws = wb.create_sheet("3 崩壊状況とn")
setup(ws, [8, 18, 18, 16, 12, 12])
title_row(ws, 1, "3  崩壊状況に応じたせん断余裕率の差")
head(ws, 3, "■ 図 3  変形集中とせん断余裕率")
put_img(ws, figs["diff"], "A4", w=800)
head(ws, 28, "■ 問題 1  崩壊状況と n")
body(ws, 29, "崩壊状況（変形の集中度）に応じて必要な n が変わる。"
             "変形が集中する（大きな塑性変形を受ける）部材ほど、"
             "なぜ大きな n が必要か述べよ（塑性変形でせん断耐力が劣化するため"
             "余裕を大きく）。", h=44)
head(ws, 31, "■ 問題 2  全体崩壊 vs 部分・局部崩壊")
r = table(ws, 32, ["崩壊状況", "変形（記入）", "必要な n（記入）"],
          [["全体崩壊形（ヒンジ分散）", "", ""],
           ["部分・局部崩壊形（集中）", "", ""],
           ["塑性ヒンジができる部材", "", ""]])
head(ws, r + 2, "■ 問題 3  ヒンジ部材の扱い")
body(ws, r + 3, "塑性ヒンジができる部材（大きく塑性変形する）は、変形とともに"
                "せん断耐力が低下（劣化）する。そのため、ヒンジ域では特に"
                "大きな n でせん断破壊を確実に防ぐ必要があることを述べよ。", h=44)
head(ws, r + 5, "■ 問題 4  実務まとめ")
body(ws, r + 6, "保証設計（せん断設計）で確認する項目を 3 つ挙げよ"
                "（①各部材の設計せん断力 Qd=n·Qmu ②せん断耐力 Qsu ≧ Qd "
                "③ヒンジ域・変形集中部で n を大きく）。"
                "これが二次設計の靭性確保（Ds 低減）の前提であることも述べよ。",
     h=44)

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


ah("1  保証設計の目的")
an("問1：①曲げ ②せん断 ③脆性 ④n（せん断余裕率）。"
   "曲げ降伏を先、せん断破壊を後にする設計。", h=32)
an("問2：せん断破壊は予兆なく急激に耐力を失う脆性破壊、曲げ降伏は粘り強く変形する"
   "靭性的破壊。曲げ降伏を先行させれば建物が粘って倒壊を防げ、靭性が高いので"
   "Ds を小さく（必要保有水平耐力を小さく）できる。", h=44)
an("問3：キャパシティデザイン＝壊れてよい場所（曲げヒンジ）を意図的に先に降伏させ、"
   "壊れてはいけない破壊（せん断・接合部）を確実に後にする。"
   "壊れ方をコントロールして安全な崩壊形に導く思想。", h=44)
an("問4：せん断破壊を防ぐ（保証設計）→部材が曲げ降伏で粘る（靭性確保）→"
   "良い部材種別（FA・FB）・良い崩壊形（全体崩壊）→Ds を小さくできる。"
   "保証設計は靭性確保の土台で全てにつながる。", h=44)

ah("2  せん断余裕率n")
an("問1：梁 n=1.1〜1.2、柱 n=1.1〜1.25（軸力大で割増）、耐震壁 n=1.0〜1.25。"
   "いずれもせん断破壊を確実に防ぐための割増し。※具体値は規準で確認。", h=40)
an("問2：Qd=n·Qmu。梁 1.1×200=220kN、柱 1.25×200=250kN、"
   "耐震壁 1.25×200=250kN でせん断設計する。", h=32)
an("問3：柱は建物の鉛直荷重（軸力）を支える。柱がせん断破壊すると軸力支持能力を"
   "失い、その層が崩壊（層崩壊）して建物全体の崩壊につながる。"
   "梁より重要度が高いので n を大きめにして確実に守る。", h=44)
an("問4：Qmu は部材が曲げ降伏したとき（曲げ耐力に達したとき）に生じる最大のせん断力。"
   "これに n(>1) を乗じた Qd をせん断耐力が上回るようにすれば、"
   "曲げ降伏後もせん断破壊しない＝靭性的に壊れることを保証できる。", h=44)

ah("3  崩壊状況とn")
an("問1：変形が集中する部材は大きな塑性変形を繰り返し受け、変形とともに"
   "せん断耐力が劣化（低下）する。劣化しても曲げ降伏を保てるよう、"
   "より大きな n（余裕）でせん断破壊を防ぐ必要がある。", h=44)
an("問2：全体崩壊形＝変形が分散し各部材の変形は小さい→n 小さめで可。"
   "部分・局部崩壊形＝変形が集中→n 大きく（安全側）。"
   "塑性ヒンジができる部材＝大きく塑性化→n を大きく（靭性域でせん断させない）。",
   h=44)
an("問3：塑性ヒンジ部材は繰返し大変形でせん断耐力が劣化するため、ヒンジ域では"
   "特に大きな n でせん断破壊を確実に防ぐ。ヒンジができる位置（梁端・柱脚・壁脚）を"
   "把握してそこを重点的にせん断設計する。", h=44)
an("問4：①各部材の設計せん断力 Qd=n·Qmu を算定 ②せん断耐力 Qsu ≧ Qd を確認 "
   "③ヒンジ域・変形集中部は n を大きくする。"
   "保証設計でせん断破壊を防いで靭性を確保することが、Ds を小さくできる"
   "（＝経済的で安全な二次設計）前提になる。", h=44)

XLSX = os.path.join(OUT, "保証設計問題集.xlsx")
wb.save(XLSX)
print("saved:", XLSX)
