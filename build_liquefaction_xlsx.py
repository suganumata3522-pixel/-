# -*- coding: utf-8 -*-
"""液状化判定 問題集（図つき）Excel。出力: docs/liquefaction/液状化判定問題集.xlsx
1 メカニズムとハザードマップ / 2 判定対象の条件（M・amax・地盤係数）
3 FL値の算定 / 4 PL値・沈下量(Dcy)と設計への反映
※ R-N関係・係数・低減係数は規準（建築基礎構造設計指針/道示）で確認要
"""
import os
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib import font_manager as fm
FONT = "/usr/share/fonts/truetype/fonts-japanese-gothic.ttf"
jp = fm.FontProperties(fname=FONT); fm.fontManager.addfont(FONT)
plt.rcParams["font.family"] = jp.get_name(); plt.rcParams["axes.unicode_minus"] = False
OUT = "docs/liquefaction"; FIG = os.path.join(OUT, "figures"); os.makedirs(FIG, exist_ok=True)

FLPROF = {1: 2.0, 2: 2.0, 3: 0.9, 4: 0.8, 5: 0.7, 6: 0.7, 7: 0.75, 8: 0.8, 9: 0.95,
          10: 1.2, 11: 1.5, 12: 2.0, 13: 2.0, 14: 2.0, 15: 2.0, 16: 2.0, 17: 2.0,
          18: 2.0, 19: 2.0, 20: 2.0}


def save(fig, n):
    p = os.path.join(FIG, n); fig.savefig(p, dpi=130, bbox_inches="tight"); plt.close(fig); return p


def sand(ax, cx, cy, n=14, r=0.12, color="#d9b877", spread=1.0, jitter=0.0):
    rng = [(0.15, 0.2), (0.4, 0.15), (0.6, 0.35), (0.25, 0.5), (0.5, 0.55),
           (0.75, 0.2), (0.8, 0.5), (0.35, 0.75), (0.6, 0.78), (0.15, 0.65),
           (0.7, 0.7), (0.45, 0.35), (0.2, 0.4), (0.85, 0.7)]
    for i, (x, y) in enumerate(rng[:n]):
        yy = y + jitter * ((i % 3) - 1) * 0.08
        ax.add_patch(plt.Circle((cx + (x - 0.5) * spread, cy + (yy - 0.5)), r,
                     fc=color, ec="#8a6d3b", lw=0.6, zorder=3))


def fig_mech():
    fig, axes = plt.subplots(1, 3, figsize=(13.5, 4.6))
    titles = ["(a) 通常時", "(b) 地震時（繰返しせん断）", "(c) 液状化後"]
    notes = ["砂粒子が接触し骨格を形成。\n有効応力で荷重を支持。\n間隙は水で満たされる",
             "繰返しせん断で間隙水圧↑。\n粒子接触が外れ水中に浮遊。\n有効応力≒0（支持力喪失）",
             "水と砂が噴出（噴砂）。\n地盤沈下・構造物の傾斜/浮上。\n間隙水圧の消散で沈下"]
    for k, ax in enumerate(axes):
        ax.add_patch(mpatches.Rectangle((0, 0), 4, 2.4, fc="#cfe4f2", ec="k", lw=1))
        if k == 0:
            sand(ax, 2, 1.2, color="#d9b877", spread=3.4)
        elif k == 1:
            sand(ax, 2, 1.2, color="#e0c98f", spread=3.4, jitter=1.0)
            for x in [1.0, 2.0, 3.0]:
                ax.annotate("", xy=(x, 2.2), xytext=(x, 1.4),
                            arrowprops=dict(arrowstyle="-|>", color="#1f77b4", lw=1.6))
            ax.text(2, 2.6, "間隙水圧↑", ha="center", fontproperties=jp, fontsize=8.5, color="#1f77b4")
        else:
            sand(ax, 2, 0.8, color="#d9b877", spread=3.4)
            ax.add_patch(mpatches.Rectangle((0, 1.4), 4, 1.0, fc="#a9d3ec", ec="k", lw=0.5))
            ax.annotate("噴砂", xy=(1.2, 2.4), xytext=(0.4, 3.1), fontproperties=jp, fontsize=8.5,
                        color="#7a3b00", arrowprops=dict(arrowstyle="->", color="#7a3b00"))
            ax.add_patch(mpatches.Rectangle((2.6, 2.4), 1.1, 0.7, fc="#d0d0d0", ec="k"))
            ax.text(3.15, 2.75, "沈下\n傾斜", ha="center", va="center", fontproperties=jp, fontsize=7)
        ax.text(2, -0.75, notes[k], ha="center", va="top", fontproperties=jp, fontsize=8, color="#333")
        ax.set_xlim(-0.3, 4.3); ax.set_ylim(-2.0, 3.4); ax.set_aspect("auto"); ax.axis("off")
        ax.set_title(titles[k], fontproperties=jp, fontsize=10, fontweight="bold")
    fig.suptitle("図 1  液状化のメカニズム（有効応力の消失）",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig1_mech.png")


def fig_cond():
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 4.8),
                             gridspec_kw={"width_ratios": [1.15, 1.0]})
    ax = axes[0]
    steps = ["地下水位以下の飽和土層", "地表からおおむね GL-20m 以内",
             "細粒分含有率 FC <= 35%（ゆるい砂質土）", "N値が小さい（Dr が低い）",
             "→ 液状化判定の対象層"]
    for i, t in enumerate(steps):
        y = 0.82 - i * 0.17
        c = "#fde2c4" if i == len(steps) - 1 else "#cfe0f0"
        ax.add_patch(mpatches.FancyBboxPatch((0.06, y), 0.88, 0.12, boxstyle="round,pad=0.01",
                     transform=ax.transAxes, fc=c, ec="k", lw=1))
        ax.text(0.5, y + 0.06, t, transform=ax.transAxes, ha="center", va="center",
                fontproperties=jp, fontsize=9.5)
        if i < len(steps) - 1:
            ax.annotate("", xy=(0.5, y - 0.05), xytext=(0.5, y), xycoords="axes fraction",
                        arrowprops=dict(arrowstyle="-|>", color="#c00000", lw=1.6))
    ax.axis("off")
    ax.set_title("(a) 判定対象層の条件", fontproperties=jp, fontsize=10, fontweight="bold")
    ax = axes[1]
    ax.text(0.5, 0.93, "地震動の強さ・ハザード", transform=ax.transAxes, ha="center",
            fontproperties=jp, fontsize=11, fontweight="bold", color="#1f4e79")
    ax.text(0.04, 0.8,
            "・マグニチュード M（地震規模）\n"
            "・地表面加速度 amax（レベル1/レベル2）\n"
            "  レベル1（中地震）: 例 amax≒200gal\n"
            "  レベル2（大地震）: より大きい\n"
            "  → 繰返し回数・せん断応力に影響\n\n"
            "・ハザードマップ\n"
            "  自治体の『液状化のしやすさマップ』で\n"
            "  地域の危険度を事前に把握\n"
            "  （旧河道・埋立地・砂丘裾は要注意）",
            transform=ax.transAxes, fontproperties=jp, fontsize=9, va="top")
    ax.axis("off")
    ax.set_title("(b) M・amax・ハザードマップ", fontproperties=jp, fontsize=10, fontweight="bold")
    fig.suptitle("図 2  液状化判定の対象条件と地震動", fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig2_cond.png")


def fig_fl():
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 5.2),
                             gridspec_kw={"width_ratios": [1.5, 1.0]})
    ax = axes[0]
    ax.text(0.5, 0.95, "FL 値（液状化抵抗率）の算定", transform=ax.transAxes, ha="center",
            fontproperties=jp, fontsize=11, fontweight="bold", color="#1f4e79")
    # L側
    ax.add_patch(mpatches.FancyBboxPatch((0.03, 0.5), 0.44, 0.34, boxstyle="round,pad=0.01",
                 transform=ax.transAxes, fc="#fde2c4", ec="k", lw=1))
    ax.text(0.25, 0.78, "L：地震時せん断応力比", transform=ax.transAxes, ha="center",
            fontproperties=jp, fontsize=9.5, fontweight="bold")
    ax.text(0.25, 0.62, "L = rd・(amax/g)・(σv/σv')\nrd = 1 - 0.015z\n（全応力σv・有効応力σv'）",
            transform=ax.transAxes, ha="center", va="center", fontproperties=jp, fontsize=8.8)
    # R側
    ax.add_patch(mpatches.FancyBboxPatch((0.53, 0.5), 0.44, 0.34, boxstyle="round,pad=0.01",
                 transform=ax.transAxes, fc="#cfead4", ec="k", lw=1))
    ax.text(0.75, 0.78, "R：液状化抵抗比", transform=ax.transAxes, ha="center",
            fontproperties=jp, fontsize=9.5, fontweight="bold")
    ax.text(0.75, 0.62, "N値・FC から図表で求める\n（補正N値 Na → R）\n※規準で確認要",
            transform=ax.transAxes, ha="center", va="center", fontproperties=jp, fontsize=8.8, color="#7a3b00")
    ax.annotate("", xy=(0.5, 0.36), xytext=(0.25, 0.5), xycoords="axes fraction",
                arrowprops=dict(arrowstyle="-|>", color="#c00000", lw=1.6))
    ax.annotate("", xy=(0.5, 0.36), xytext=(0.75, 0.5), xycoords="axes fraction",
                arrowprops=dict(arrowstyle="-|>", color="#c00000", lw=1.6))
    ax.add_patch(mpatches.FancyBboxPatch((0.28, 0.18), 0.44, 0.16, boxstyle="round,pad=0.01",
                 transform=ax.transAxes, fc="#f8d0d0", ec="k", lw=1.2))
    ax.text(0.5, 0.26, "FL = R / L\nFL < 1.0 → 液状化する", transform=ax.transAxes,
            ha="center", va="center", fontproperties=jp, fontsize=10, fontweight="bold", color="#c00000")
    ax.axis("off")
    ax.set_title("(a) FL 算定の流れ", fontproperties=jp, fontsize=10, fontweight="bold")
    # (b) 深度方向FLプロファイル
    ax = axes[1]
    z = list(FLPROF.keys()); fl = [min(FLPROF[k], 2.0) for k in z]
    ax.plot(fl, z, color="#c00000", lw=1.8, marker="o", ms=3)
    ax.axvline(1.0, color="k", ls="--", lw=1.2)
    ax.fill_betweenx(z, 0, fl, where=[f < 1.0 for f in fl], color="#f8b0b0", alpha=0.6)
    ax.text(0.35, 6, "FL<1\n液状化", fontproperties=jp, fontsize=8.5, color="#c00000", ha="center")
    ax.text(1.02, 18, "FL=1", fontproperties=jp, fontsize=8, color="k")
    ax.set_xlim(0, 2.1); ax.set_ylim(20, 0)
    ax.set_xlabel("FL 値", fontproperties=jp, fontsize=9)
    ax.set_ylabel("深度 GL-(m)", fontproperties=jp, fontsize=9)
    ax.set_title("(b) 深度方向の FL", fontproperties=jp, fontsize=10, fontweight="bold")
    ax.grid(alpha=0.3)
    fig.suptitle("図 3  FL 値の算定（L：応力比／R：抵抗比）",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig3_fl.png")


def fig_pl():
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 5.0),
                             gridspec_kw={"width_ratios": [1.2, 1.2]})
    # (a) PL
    ax = axes[0]
    z = np.linspace(0, 20, 100); w = 10 - 0.5 * z
    ax.plot(w, z, color="#2a78d6", lw=1.8)
    ax.fill_betweenx(z, 0, w, color="#cfe0f0", alpha=0.5)
    ax.text(5, 3, "重み w(z)=10-0.5z\n（浅いほど大）", fontproperties=jp, fontsize=8.5, color="#1f4e79")
    ax.set_xlim(0, 11); ax.set_ylim(20, 0)
    ax.set_xlabel("重み w(z)", fontproperties=jp, fontsize=9)
    ax.set_ylabel("深度 GL-(m)", fontproperties=jp, fontsize=9)
    ax.set_title("(a) PL の重み関数", fontproperties=jp, fontsize=10, fontweight="bold")
    ax.grid(alpha=0.3)
    ax.text(3.5, 12, "PL = ∫(1-FL)・w(z) dz\n（0〜20m, FL<1のみ）",
            fontproperties=jp, fontsize=8.5, color="#c00000")
    # (b) 危険度ランク + Dcy + DE
    ax = axes[1]
    ax.text(0.5, 0.96, "PL による危険度・沈下(Dcy)・低減", transform=ax.transAxes, ha="center",
            fontproperties=jp, fontsize=10.5, fontweight="bold", color="#1f4e79")
    ax.text(0.03, 0.85,
            "【PL 危険度ランク】\n"
            "  PL=0 : なし\n"
            "  0<PL<=5 : 低い\n"
            "  5<PL<=15 : 高い\n"
            "  PL>15 : 極めて高い\n\n"
            "【Dcy：液状化による地盤沈下量】\n"
            "  Dcy = Σ(εv × 層厚)\n"
            "  εv は FL と Dr から図表（確認要）\n\n"
            "【地盤定数の低減（設計反映）】\n"
            "  液状化層は地盤反力・ばねを低減\n"
            "  係数 DE（FL・深度で 0〜1）で低減\n"
            "  （道示等・規準で確認要）",
            transform=ax.transAxes, fontproperties=jp, fontsize=8.8, va="top")
    ax.axis("off")
    ax.set_title("(b) 危険度・沈下・設計反映", fontproperties=jp, fontsize=10, fontweight="bold")
    fig.suptitle("図 4  PL 値・沈下量(Dcy)と設計への反映",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig4_pl.png")


figs = {"mech": fig_mech(), "cond": fig_cond(), "fl": fig_fl(), "pl": fig_pl()}
print("figs:", list(figs.keys()))

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.drawing.image import Image as XLImage
from openpyxl.utils import get_column_letter
wb = Workbook()
C_TITLE = "1F4E79"; C_HEAD = "2E75B6"; C_ANS = "E2EFDA"; C_WARN = "FCE4D6"
thin = Side(style="thin", color="BFBFBF"); border = Border(left=thin, right=thin, top=thin, bottom=thin)
f_title = Font(name="MS PGothic", size=15, bold=True, color="FFFFFF")
f_head = Font(name="MS PGothic", size=11, bold=True, color="FFFFFF")
f_body = Font(name="MS PGothic", size=10); f_ans = Font(name="MS PGothic", size=10, color="375623")
f_warn = Font(name="MS PGothic", size=9, color="833C00", italic=True)
wrap = Alignment(wrap_text=True, vertical="top")
center = Alignment(horizontal="center", vertical="center", wrap_text=True)


def setup(ws, ws_widths):
    for i, w in enumerate(ws_widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.sheet_view.showGridLines = False


def title_row(ws, row, text, span=8):
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=span)
    c = ws.cell(row, 1, text); c.font = f_title; c.fill = PatternFill("solid", fgColor=C_TITLE)
    c.alignment = Alignment(vertical="center", horizontal="left", indent=1); ws.row_dimensions[row].height = 30


def head(ws, row, text, span=8):
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=span)
    c = ws.cell(row, 1, text); c.font = f_head; c.fill = PatternFill("solid", fgColor=C_HEAD)
    c.alignment = Alignment(vertical="center", horizontal="left", indent=1); ws.row_dimensions[row].height = 22


def body(ws, row, text, span=8, ans=False, h=None):
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=span)
    c = ws.cell(row, 1, text); c.font = f_ans if ans else f_body; c.alignment = wrap
    if ans:
        c.fill = PatternFill("solid", fgColor=C_ANS)
    if h:
        ws.row_dimensions[row].height = h


def warn(ws, row, text, span=8, h=None):
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=span)
    c = ws.cell(row, 1, text); c.font = f_warn; c.alignment = wrap
    c.fill = PatternFill("solid", fgColor=C_WARN)
    if h:
        ws.row_dimensions[row].height = h


def table(ws, start_row, headers, rows, col1=1):
    r = start_row
    for j, htxt in enumerate(headers):
        c = ws.cell(r, col1 + j, htxt); c.font = Font(name="MS PGothic", size=10, bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor=C_HEAD); c.alignment = center; c.border = border
    for data in rows:
        r += 1
        for j, v in enumerate(data):
            c = ws.cell(r, col1 + j, v); c.font = f_body
            c.alignment = center if j > 0 else wrap; c.border = border
            if r % 2 == 0:
                c.fill = PatternFill("solid", fgColor="F2F7FC")
    return r


def put_img(ws, path, anchor, w=None):
    img = XLImage(path)
    if w:
        ratio = w / img.width; img.width = w; img.height = int(img.height * ratio)
    ws.add_image(img, anchor)


# ===== 目次 =====
ws = wb.active; ws.title = "目次"; setup(ws, [4, 24, 56, 16])
title_row(ws, 1, "液状化判定 問題集（RC マンション設計担当・新人向け）", span=4)
body(ws, 2, "目標：液状化のメカニズムを理解し、判定対象・地震動条件を押さえ、"
            "FL・PL・沈下量(Dcy)を算定して設計（地盤定数の低減）に反映できること。", span=4, h=32)
r = table(ws, 4, ["No.", "シート", "到達目標", "図"],
          [["1", "1 メカニズムとハザード", "液状化の仕組み・ハザードを理解", "3コマ"],
           ["2", "2 判定対象の条件", "対象層・M・amax・地盤係数を理解", "条件フロー"],
           ["3", "3 FL値の算定", "L・R・FL を算定できる", "FL算定"],
           ["4", "4 PL・沈下量と設計", "PL・Dcy・地盤定数低減を理解", "PL・DE"]])
warn(ws, r + 2, "※ R（液状化抵抗比）のN値関係、各種係数、地盤定数の低減係数DEは、"
                "建築基礎構造設計指針（日本建築学会）・道路橋示方書等の最新版で必ず確認すること。"
                "本教材の数値は手順理解のための例示。", span=4, h=44)

# ===== 1 メカニズム =====
ws = wb.create_sheet("1 メカニズム"); setup(ws, [8, 16, 18, 16, 12, 12])
title_row(ws, 1, "1  液状化のメカニズムとハザードマップ")
head(ws, 3, "■ 図 1  液状化のメカニズム"); put_img(ws, figs["mech"], "A4", w=880)
head(ws, 27, "■ 問題 1  メカニズムの説明")
body(ws, 28, "飽和したゆるい砂質土が地震で液状化する仕組みを、有効応力・間隙水圧の言葉で説明せよ"
             "（通常時→地震時→液状化後の3段階）。", h=40)
head(ws, 30, "■ 問題 2  被害の形態")
body(ws, 31, "液状化により生じる被害を挙げよ（噴砂、地盤沈下・不同沈下、構造物の傾斜・浮上、"
             "側方流動、地中構造物（マンホール等）の浮上）。", h=40)
head(ws, 33, "■ 問題 3  ハザードマップの活用")
body(ws, 34, "設計初期にハザードマップ（液状化のしやすさマップ）を確認する意義を述べよ。"
             "液状化しやすい地形（旧河道・埋立地・砂丘裾・自然堤防）にも触れよ。", h=40)

# ===== 2 判定対象の条件 =====
ws = wb.create_sheet("2 判定対象の条件"); setup(ws, [8, 16, 18, 16, 12, 12])
title_row(ws, 1, "2  判定対象の条件（M・amax・地盤係数）")
head(ws, 3, "■ 図 2  対象条件と地震動"); put_img(ws, figs["cond"], "A4", w=860)
head(ws, 27, "■ 問題 1  判定対象層の条件")
body(ws, 28, "液状化判定の対象とする土層の条件を挙げよ（地下水位以下の飽和土／地表からGL-20m程度以内／"
             "細粒分含有率 FC<=35%程度のゆるい砂質土／N値が小さい）。", h=44)
head(ws, 30, "■ 問題 2  地震動の指標")
body(ws, 31, "液状化判定で用いる地震動の指標（マグニチュードM・地表面加速度amax）の意味と、"
             "レベル1（中地震）・レベル2（大地震）の考え方を述べよ。", h=40)
head(ws, 33, "■ 問題 3  地盤係数（地震動の強さ）")
body(ws, 34, "地震時せん断応力比 L に効く係数（amax/g、深度による低減 rd=1-0.015z、"
             "全応力σvと有効応力σv'の比）の役割を説明せよ。深いほど・有効応力が大きいほどLはどうなるか。", h=44)
warn(ws, 36, "※ FC の上限値、対象深度、amax の設定は規準・地域により異なる。最新版で確認。", h=24)

# ===== 3 FL値の算定 =====
ws = wb.create_sheet("3 FL値の算定"); setup(ws, [8, 16, 18, 16, 12, 12])
title_row(ws, 1, "3  FL 値（液状化抵抗率）の算定")
head(ws, 3, "■ 図 3  FL 算定の流れ"); put_img(ws, figs["fl"], "A4", w=860)
head(ws, 28, "■ 問題 1  L（地震時せん断応力比）")
body(ws, 29, "地下水位GL-2.0m、γt=18・γsat=19kN/m3、amax=200gal のとき、深度6mの"
             "全応力σv・有効応力σv'・rd・L を求めよ（L=rd・(amax/g)・(σv/σv')）。", h=40)
head(ws, 31, "■ 問題 2  FL の計算と判定")
body(ws, 32, "問1でR=0.20（N値・FCから図表で得た値と仮定）のとき、FL=R/L を求め、"
             "液状化するか判定せよ。", h=32)
head(ws, 34, "■ 問題 3  FL の意味")
body(ws, 35, "FL<1・FL=1・FL>1 の意味を述べよ。またFL が深さ方向に分布する（図3(b)）ことの"
             "設計上の意味（どの深さの層が液状化するか）を説明せよ。", h=40)
warn(ws, 37, "※ R の算定（補正N値 Na、FC 補正、R-Na 関係曲線）は規準で確認要。ここでは R を与件とした。", h=24)

# ===== 4 PL・沈下・設計 =====
ws = wb.create_sheet("4 PL沈下設計"); setup(ws, [8, 16, 18, 16, 12, 12])
title_row(ws, 1, "4  PL 値・沈下量(Dcy)と設計への反映")
head(ws, 3, "■ 図 4  PL・沈下・地盤定数低減"); put_img(ws, figs["pl"], "A4", w=860)
head(ws, 28, "■ 問題 1  PL 値の算定")
body(ws, 29, "PL = ∫(1-FL)・w(z)dz（w(z)=10-0.5z、0〜20m、FL<1の層のみ）。"
             "図3(b)のFL分布からPLを概算し、危険度ランク（0/低い/高い/極めて高い）を判定せよ。", h=44)
head(ws, 31, "■ 問題 2  沈下量 Dcy")
body(ws, 32, "液状化層厚6m、平均体積ひずみεv=3%（FL・Drから図表で得たと仮定）のとき、"
             "液状化による地盤沈下量 Dcy を求めよ（Dcy=Σεv×層厚）。", h=32)
head(ws, 34, "■ 問題 3  設計への反映（地盤定数の低減）")
body(ws, 35, "液状化すると判定された層について、基礎・杭の設計でどう扱うか述べよ"
             "（地盤反力・水平ばねを低減係数DEで低減、杭の水平抵抗の見直し、"
             "支持層への到達、浮上・沈下対策）。", h=44)
head(ws, 37, "■ 問題 4  対策工法")
body(ws, 38, "液状化対策工法を挙げよ（締固め＝密度増加、地下水位低下、固化・格子状改良、"
             "間隙水圧消散＝ドレーン、杭で支持層に伝達）。", h=40)
warn(ws, 40, "※ 低減係数DE、εv-FL関係は規準（道示・建築基礎指針）で確認要。", h=24)

# ===== 解答 =====
ws = wb.create_sheet("解答"); setup(ws, [4, 22, 60, 14])
title_row(ws, 1, "解答・解説", span=4); row = 2


def ah(t):
    global row; head(ws, row, t, span=4); row += 1


def an(t, h=None):
    global row; body(ws, row, t, span=4, ans=True, h=h); row += 1


def aw(t, h=None):
    global row; warn(ws, row, t, span=4, h=h); row += 1


ah("1  メカニズム")
an("問1：通常時は砂粒子が接触して骨格を作り有効応力で荷重を支持。地震の繰返しせん断で"
   "間隙水圧が上昇し、有効応力（σ'=σ-u）が低下。u が全応力に達すると有効応力≒0となり"
   "粒子が水中に浮遊、せん断抵抗を失う（液状化）。その後、間隙水圧の消散で沈下する。", h=48)
an("問2：噴砂、地盤沈下・不同沈下、構造物の傾斜・転倒・浮上、側方流動（緩傾斜・護岸際）、"
   "地中構造物（マンホール・タンク・埋設管）の浮上、ライフライン被害。", h=40)
an("問3：ハザードマップで地域の液状化危険度を初期に把握し、調査・対策の要否や範囲を判断できる。"
   "旧河道・埋立地・砂丘裾・自然堤防・三角州など、ゆるい飽和砂が浅く分布する地形は要注意。", h=44)

ah("2  判定対象の条件")
an("問1：①地下水位以下の飽和土層 ②地表からおおむねGL-20m以内 ③細粒分含有率FC<=35%程度の"
   "ゆるい砂質土 ④N値が小さい（相対密度Drが低い）。これらを満たす層を判定対象とする。", h=44)
an("問2：M＝地震規模（繰返し回数・継続時間に関係）。amax＝地表面最大加速度（せん断応力の大きさ）。"
   "レベル1（中地震・供用期間中に数回）とレベル2（大地震・極めてまれ）で照査する。", h=44)
an("問3：L = rd・(amax/g)・(σv/σv')。amaxが大きいほどL大。rd=1-0.015zで深いほど地震動が減りL低下方向。"
   "有効応力σv'が大きい（深い・地下水位が深い）ほどσv/σv'が小さくなりL低下＝液状化しにくい。", h=48)
aw("※ FC上限・対象深度・amaxの設定は規準/地域で異なる。最新版で確認。", h=24)

ah("3  FL値の算定")
an("問1：σv=18×2+19×4=112kPa。σv'=18×2+(19-9.8)×4=36+36.8=72.8kPa。"
   "rd=1-0.015×6=0.91。amax/g=200/980=0.204。L=0.91×0.204×(112/72.8)=0.286。", h=44)
an("問2：FL=R/L=0.20/0.286=0.70<1.0 → この層は液状化すると判定される。", h=28)
an("問3：FL<1で液状化する、FL=1で限界、FL>1で液状化しない。FLは深さごとに変わるため、"
   "どの深さの層が液状化するかを把握し、PL・沈下量の算定や地盤定数の低減範囲に反映する。", h=40)
aw("※ R（補正N値NaとFCからの液状化抵抗比）は規準の図表で確認。ここではRを与件とした。", h=24)

ah("4  PL・沈下・設計")
an("問1：PL=∫(1-FL)w(z)dz。図3(b)のFL分布（GL-3〜9m付近でFL<1）で概算するとPL≒10。"
   "5<PL<=15 なので危険度は『高い』。（PLは地点の液状化危険度を1つの指標に集約したもの）", h=44)
an("問2：Dcy=Σεv×層厚=0.03×6.0m=0.18m=180mm。液状化層の体積ひずみ累計が地表沈下となる。"
   "（εvはFLと相対密度Drから図表で求める：確認要）", h=36)
an("問3：液状化層は水平地盤反力・ばね定数を低減係数DEで低減（FL・深度でDE=0〜1）。"
   "杭は水平抵抗の低下を見込み断面・本数を見直し、先端を非液状化の支持層に確実に到達させる。"
   "浮上・沈下・側方流動への対策も検討する。", h=48)
an("問4：締固め（サンドコンパクション等で密度増加）、地下水位低下（飽和度低減）、"
   "固化・格子状地中壁（せん断変形拘束）、ドレーン（間隙水圧消散）、"
   "杭で荷重を非液状化層/支持層へ伝達。", h=44)
aw("※ 低減係数DE・εv-FL関係は規準（道示/建築基礎指針）で確認要。", h=24)

XLSX = os.path.join(OUT, "液状化判定問題集.xlsx"); wb.save(XLSX); print("saved:", XLSX)
