# -*- coding: utf-8 -*-
"""RC柱梁接合部 問題集（図つき）Excel 生成スクリプト。
出力: docs/rc_joint/柱梁接合部問題集.xlsx
No.9-1 応力伝達機構 / 9-2 接合部形状係数・有効幅 / 9-3 水平投影定着長さ
9-4 設計せん断力の算出 / 9-5 接合部せん断終局強度の算出
RC造マンションの設計担当を想定。
式は靭性保証型耐震設計指針(1999)・技術基準解説書ベース（web照合済み）。
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

OUT = "docs/rc_joint"
FIG = os.path.join(OUT, "figures")
os.makedirs(FIG, exist_ok=True)


def save(fig, name):
    p = os.path.join(FIG, name)
    fig.savefig(p, dpi=130, bbox_inches="tight")
    plt.close(fig)
    return p


# ===========================================================================
# 図 9-1: 接合部の応力伝達機構（力の流れとストラット）
# ===========================================================================
def fig_9_1():
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 5.8))

    # --- (a) 接合部に作用する力 ---
    ax = axes[0]
    Dc = 3.0
    hj = 2.4
    yj = 2.0
    # 柱（上下）・梁（左右）・仕口
    ax.add_patch(mpatches.Rectangle((0, yj - 2.0), Dc, 2.0, fc="#d9d9d9",
                                     ec="k", lw=1.0))
    ax.add_patch(mpatches.Rectangle((0, yj + hj), Dc, 2.0, fc="#d9d9d9",
                                     ec="k", lw=1.0))
    for x0, x1 in [(-2.6, 0), (Dc, Dc + 2.6)]:
        ax.add_patch(mpatches.Rectangle((x0, yj), x1 - x0, hj, fc="#bcd2ea",
                                         ec="k", lw=1.0))
    ax.add_patch(mpatches.Rectangle((0, yj), Dc, hj, fc="#c9d9c0",
                                     ec="k", lw=1.2, hatch="..", zorder=2))
    # 左梁：上端引張 T1（左向き）・下端圧縮
    ax.annotate("", xy=(-2.4, yj + hj - 0.35), xytext=(-0.4, yj + hj - 0.35),
                arrowprops=dict(arrowstyle="-|>", color="#c00000", lw=2.5))
    ax.text(-2.5, yj + hj + 0.12, "T1（上端筋引張）", fontproperties=jp,
            fontsize=8.5, color="#c00000")
    ax.annotate("", xy=(-0.4, yj + 0.35), xytext=(-2.4, yj + 0.35),
                arrowprops=dict(arrowstyle="-|>", color="#2a78d6", lw=2.5))
    ax.text(-2.5, yj - 0.42, "C1（圧縮）", fontproperties=jp,
            fontsize=8.5, color="#2a78d6")
    # 右梁：下端引張 T2（右向き）・上端圧縮
    ax.annotate("", xy=(Dc + 2.4, yj + 0.35), xytext=(Dc + 0.4, yj + 0.35),
                arrowprops=dict(arrowstyle="-|>", color="#c00000", lw=2.5))
    ax.text(Dc + 0.5, yj - 0.42, "T2（下端筋引張）", fontproperties=jp,
            fontsize=8.5, color="#c00000")
    ax.annotate("", xy=(Dc + 0.4, yj + hj - 0.35),
                xytext=(Dc + 2.4, yj + hj - 0.35),
                arrowprops=dict(arrowstyle="-|>", color="#2a78d6", lw=2.5))
    ax.text(Dc + 0.5, yj + hj + 0.12, "C2（圧縮）", fontproperties=jp,
            fontsize=8.5, color="#2a78d6")
    # 柱せん断 Vc（上下柱、地震時は左右逆向き）
    ax.annotate("", xy=(Dc / 2 - 0.9, yj + hj + 1.4),
                xytext=(Dc / 2 + 0.9, yj + hj + 1.4),
                arrowprops=dict(arrowstyle="-|>", color="#1f7a1f", lw=2.5))
    ax.text(Dc / 2, yj + hj + 1.65, "Vc（柱せん断力）", fontproperties=jp,
            ha="center", fontsize=8.5, color="#1f7a1f")
    ax.annotate("", xy=(Dc / 2 + 0.9, yj - 1.4),
                xytext=(Dc / 2 - 0.9, yj - 1.4),
                arrowprops=dict(arrowstyle="-|>", color="#1f7a1f", lw=2.5))
    ax.text(Dc / 2, yj - 1.85, "Vc", fontproperties=jp, ha="center",
            fontsize=8.5, color="#1f7a1f")
    ax.text(Dc / 2, yj - 2.6,
            "地震時：左右の梁で曲げの向きが逆 → 接合部に大きな水平せん断が入る",
            fontproperties=jp, ha="center", fontsize=9, color="#444")
    ax.set_xlim(-3.4, Dc + 3.4)
    ax.set_ylim(yj - 3.1, yj + hj + 2.3)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.set_title("(a) 接合部に作用する力（十字形・地震時）",
                 fontproperties=jp, fontsize=11, fontweight="bold")

    # --- (b) 斜め圧縮ストラット ---
    ax = axes[1]
    ax.add_patch(mpatches.Rectangle((0, yj - 2.0), Dc, 2.0, fc="#d9d9d9",
                                     ec="k", lw=1.0))
    ax.add_patch(mpatches.Rectangle((0, yj + hj), Dc, 2.0, fc="#d9d9d9",
                                     ec="k", lw=1.0))
    for x0, x1 in [(-2.6, 0), (Dc, Dc + 2.6)]:
        ax.add_patch(mpatches.Rectangle((x0, yj), x1 - x0, hj, fc="#bcd2ea",
                                         ec="k", lw=1.0))
    ax.add_patch(mpatches.Rectangle((0, yj), Dc, hj, fc="#f5f5f5",
                                     ec="k", lw=1.2, zorder=2))
    # 斜めストラット（太い帯）
    ax.add_patch(mpatches.Polygon(
        [(0.15, yj + 0.15), (0.7, yj), (Dc, yj + hj - 0.35),
         (Dc - 0.7, yj + hj)],
        closed=True, fc="#f4a261", ec="#7a3b3b", lw=1.2, alpha=0.85,
        zorder=3))
    ax.annotate("", xy=(0.55, yj + 0.4), xytext=(Dc - 0.55, yj + hj - 0.4),
                arrowprops=dict(arrowstyle="-|>", color="#7a3b3b", lw=3))
    ax.text(Dc / 2, yj + hj + 0.55, "斜め圧縮ストラット\n（コンクリートの圧縮束）",
            fontproperties=jp, ha="center", fontsize=9, color="#7a3b3b",
            zorder=4)
    # 帯筋
    for yy in [yj + 0.55, yj + 1.2, yj + 1.85]:
        ax.plot([0.12, Dc - 0.12], [yy, yy], color="#c00000", lw=1.3,
                ls="--", zorder=4)
    ax.text(Dc + 0.2, yj + 1.2, "接合部内帯筋\n（コア拘束・\nトラス機構）",
            fontproperties=jp, fontsize=8, color="#c00000", va="center")
    ax.text(Dc / 2, yj - 2.6,
            "接合部の破壊＝ストラットの圧壊（せん断破壊）\n"
            "→ 強度はコンクリート強度と断面（bj×Dj）で決まる",
            fontproperties=jp, ha="center", fontsize=9, color="#444")
    ax.set_xlim(-3.4, Dc + 3.4)
    ax.set_ylim(yj - 3.1, yj + hj + 2.3)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.set_title("(b) 応力伝達機構 ── 斜め圧縮ストラット",
                 fontproperties=jp, fontsize=11, fontweight="bold")
    fig.suptitle("図 9-1  RC 柱梁接合部の応力伝達機構",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig9-1_mechanism.png")


# ===========================================================================
# 図 9-2: 接合部形状（κ）と有効幅 bj
# ===========================================================================
def fig_9_2():
    fig = plt.figure(figsize=(13.5, 6.2))
    gs = fig.add_gridspec(2, 4, height_ratios=[1, 1.15])

    # --- 上段：形状 3 種と κ ---
    shapes = [
        ("十字形（内柱）\nκ = 1.0", True, True, True),
        ("ト形（外柱）\nκ = 0.7", True, False, True),
        ("T形（最上階内柱）\nκ = 0.7", True, True, False),
        ("L形（最上階外柱）\nκ = 0.4", True, False, False),
    ]
    for i, (label, left, right, top) in enumerate(shapes):
        ax = fig.add_subplot(gs[0, i])
        Dc, hj = 1.6, 1.3
        ax.add_patch(mpatches.Rectangle((0, -1.4), Dc, 1.4, fc="#d9d9d9",
                                         ec="k", lw=0.8))
        if top:
            ax.add_patch(mpatches.Rectangle((0, hj), Dc, 1.4, fc="#d9d9d9",
                                             ec="k", lw=0.8))
        if left:
            ax.add_patch(mpatches.Rectangle((-1.5, 0), 1.5, hj, fc="#bcd2ea",
                                             ec="k", lw=0.8))
        if right:
            ax.add_patch(mpatches.Rectangle((Dc, 0), 1.5, hj, fc="#bcd2ea",
                                             ec="k", lw=0.8))
        ax.add_patch(mpatches.Rectangle((0, 0), Dc, hj, fc="#c9d9c0",
                                         ec="k", lw=1.0, hatch="..",
                                         zorder=2))
        ax.text(Dc / 2, -2.15, label, fontproperties=jp, ha="center",
                fontsize=9, fontweight="bold",
                color="#1f4e79" if i == 0 else "#7a3b3b")
        ax.set_xlim(-1.8, Dc + 1.8)
        ax.set_ylim(-2.6, hj + 1.7)
        ax.set_aspect("equal")
        ax.axis("off")

    # --- 下段左：有効幅 bj の平面図 ---
    ax = fig.add_subplot(gs[1, 0:2])
    bc = 3.2   # 柱幅
    bb = 2.0   # 梁幅
    Dc = 3.2   # 柱せい
    x0 = (bc - bb) / 2   # bi = 0.6
    # 柱（平面）
    ax.add_patch(mpatches.Rectangle((0, 0), bc, Dc, fc="#d9d9d9",
                                     ec="k", lw=1.2))
    # 梁（平面、上下方向に通る）
    ax.add_patch(mpatches.Rectangle((x0, -1.3), bb, Dc + 2.6, fc="#bcd2ea",
                                     ec="k", lw=1.0, alpha=0.85))
    # 有効幅 bj（梁幅 + 両側 bai）
    bai = 0.3  # min(bi/2, Dj/4) の描画値
    ax.add_patch(mpatches.Rectangle((x0 - bai, 0), bb + 2 * bai, Dc,
                                     fc="none", ec="#c00000", lw=2.2,
                                     ls="--", zorder=5))
    ax.annotate("", xy=(x0, Dc + 0.55), xytext=(x0 + bb, Dc + 0.55),
                arrowprops=dict(arrowstyle="<|-|>", color="#1f4e79", lw=1.2))
    ax.text(bc / 2, Dc + 0.8, "梁幅 bb", fontproperties=jp, ha="center",
            fontsize=9, color="#1f4e79")
    ax.annotate("", xy=(x0 - bai, -0.5), xytext=(x0 + bb + bai, -0.5),
                arrowprops=dict(arrowstyle="<|-|>", color="#c00000", lw=1.2))
    ax.text(bc / 2, -0.95, "有効幅 bj = bb + ba1 + ba2",
            fontproperties=jp, ha="center", fontsize=9.5, color="#c00000",
            fontweight="bold")
    ax.annotate("bai = min(bi/2, Dj/4)\nbi：梁側面〜柱側面の距離",
                xy=(x0 - bai / 2, Dc * 0.72), xytext=(-2.9, Dc * 0.6),
                fontproperties=jp, fontsize=8.5, color="#c00000",
                arrowprops=dict(arrowstyle="->", color="#c00000"))
    ax.set_xlim(-3.1, bc + 1.2)
    ax.set_ylim(-1.6, Dc + 1.3)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.set_title("接合部有効幅 bj（平面）", fontproperties=jp,
                 fontsize=10, fontweight="bold")

    # --- 下段右：式のまとめ ---
    ax = fig.add_subplot(gs[1, 2:4])
    ax.text(0.5, 0.88, "接合部せん断終局強度（靭性指針）",
            transform=ax.transAxes, ha="center", fontproperties=jp,
            fontsize=11, fontweight="bold", color="#1f4e79")
    ax.text(0.5, 0.68, "Vju = κ・φ・Fj・bj・Dj",
            transform=ax.transAxes, ha="center", fontproperties=jp,
            fontsize=15, fontweight="bold", color="#c00000")
    ax.text(0.5, 0.34,
            "κ ：接合部形状係数（十字 1.0／ト形・T形 0.7／L形 0.4）\n"
            "φ ：直交梁補正（両側直交梁付き 1.0／その他 0.85）\n"
            "Fj：接合部せん断強度の基準値 = 0.8・σB^0.7 (N/mm²)\n"
            "bj：接合部有効幅、Dj：接合部有効せい",
            transform=ax.transAxes, ha="center", fontproperties=jp,
            fontsize=9.5, color="#333")
    ax.text(0.5, 0.06,
            "Dj は 内柱（十字・T形）＝柱せい D、外柱（ト形・L形）＝水平投影定着長さ ldh",
            transform=ax.transAxes, ha="center", fontproperties=jp,
            fontsize=9, color="#1f7a1f")
    ax.axis("off")
    fig.suptitle("図 9-2  接合部形状係数 κ と 有効幅 bj",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig9-2_shape_bj.png")


# ===========================================================================
# 図 9-3: 水平投影定着長さ ldh（外柱）
# ===========================================================================
def fig_9_3():
    fig, ax = plt.subplots(figsize=(8.5, 5.6))
    Dc = 3.2
    ax.add_patch(mpatches.Rectangle((0, 0), Dc, 6.4, fc="#d9d9d9",
                                     ec="k", lw=1.2))
    ax.add_patch(mpatches.Rectangle((Dc, 2.4), 3.6, 1.6, fc="#bcd2ea",
                                     ec="k", lw=1.0))
    ax.text(Dc + 1.8, 3.2, "梁", fontproperties=jp, ha="center", fontsize=10)
    # 梁上端筋 折り曲げ定着
    ax.plot([Dc + 3.4, 0.55], [3.7, 3.7], color="#c00000", lw=3)
    ax.plot([0.55, 0.55], [3.7, 1.3], color="#c00000", lw=3)
    # 梁下端筋
    ax.plot([Dc + 3.4, 0.95], [2.7, 2.7], color="#2a78d6", lw=3)
    ax.plot([0.95, 0.95], [2.7, 4.9], color="#2a78d6", lw=3)
    # ldh 寸法（柱フェイスから折り曲げ筋外面まで）
    ax.annotate("", xy=(0.55, 4.6), xytext=(Dc, 4.6),
                arrowprops=dict(arrowstyle="<|-|>", color="#1f7a1f", lw=1.5))
    ax.text((0.55 + Dc) / 2, 4.85, "水平投影定着長さ ldh",
            fontproperties=jp, ha="center", fontsize=10, color="#1f7a1f",
            fontweight="bold")
    # 柱せい
    ax.annotate("", xy=(0, -0.5), xytext=(Dc, -0.5),
                arrowprops=dict(arrowstyle="<|-|>", color="k", lw=1.2))
    ax.text(Dc / 2, -0.95, "柱せい D", fontproperties=jp, ha="center",
            fontsize=10)
    ax.text(Dc + 2.0, 0.9,
            "ldh は 0.75D 以上 を基本に確保\n（配筋の納まりで決まる）",
            fontproperties=jp, ha="center", fontsize=9.5, color="#c00000")
    ax.text((Dc + 4.2 - 0.8) / 2, 7.0,
            "外柱（ト形・L形）では、接合部有効せい Dj = ldh として Vju を計算\n"
            "── 定着をのみ込ませるほど接合部は強い",
            fontproperties=jp, ha="center", fontsize=9, color="#1f4e79")
    ax.set_xlim(-0.8, Dc + 4.2)
    ax.set_ylim(-1.5, 7.6)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.set_title("図 9-3  水平投影定着長さ ldh（外柱の折り曲げ定着）",
                 fontproperties=jp, fontsize=12, fontweight="bold")
    return save(fig, "fig9-3_ldh.png")


# ===========================================================================
# 図 9-4: 設計せん断力 Vj の釣合い
# ===========================================================================
def fig_9_4():
    fig, ax = plt.subplots(figsize=(9.5, 5.2))
    Dc, hj, yj = 3.0, 2.4, 2.0
    ax.add_patch(mpatches.Rectangle((0, yj - 1.6), Dc, 1.6, fc="#d9d9d9",
                                     ec="k", lw=1.0))
    ax.add_patch(mpatches.Rectangle((0, yj + hj), Dc, 1.6, fc="#d9d9d9",
                                     ec="k", lw=1.0))
    for x0, x1 in [(-2.4, 0), (Dc, Dc + 2.4)]:
        ax.add_patch(mpatches.Rectangle((x0, yj), x1 - x0, hj, fc="#bcd2ea",
                                         ec="k", lw=1.0))
    ax.add_patch(mpatches.Rectangle((0, yj), Dc, hj, fc="#c9d9c0",
                                     ec="k", lw=1.2, hatch="..", zorder=2))
    # 上半分の水平力の釣合い（切断面）
    ax.plot([-2.8, Dc + 2.8], [yj + hj / 2, yj + hj / 2], color="#777",
            lw=1.2, ls="-.")
    ax.text(Dc + 2.9, yj + hj / 2, "切断面", fontproperties=jp, fontsize=8,
            color="#777", va="center")
    # T1（左梁上端筋・左向き）
    ax.annotate("", xy=(-2.2, yj + hj - 0.3), xytext=(-0.3, yj + hj - 0.3),
                arrowprops=dict(arrowstyle="-|>", color="#c00000", lw=2.5))
    ax.text(-2.3, yj + hj + 0.0, "T1 = at1・σy", fontproperties=jp,
            fontsize=9, color="#c00000")
    # C2（右梁上端の圧縮＝左向きに押す）
    ax.annotate("", xy=(Dc + 0.3, yj + hj - 0.3),
                xytext=(Dc + 2.2, yj + hj - 0.3),
                arrowprops=dict(arrowstyle="-|>", color="#2a78d6", lw=2.5))
    ax.text(Dc + 0.4, yj + hj + 0.0, "C2 = T2 = at2・σy",
            fontproperties=jp, fontsize=9, color="#2a78d6")
    # Vc（上柱せん断・右向き）
    ax.annotate("", xy=(Dc / 2 + 1.0, yj + hj + 1.1),
                xytext=(Dc / 2 - 1.0, yj + hj + 1.1),
                arrowprops=dict(arrowstyle="-|>", color="#1f7a1f", lw=2.5))
    ax.text(Dc / 2, yj + hj + 1.35, "Vc", fontproperties=jp, ha="center",
            fontsize=9, color="#1f7a1f")
    # Vj（接合部内せん断・切断面上）
    ax.annotate("", xy=(Dc - 0.2, yj + hj / 2 - 0.22),
                xytext=(0.2, yj + hj / 2 - 0.22),
                arrowprops=dict(arrowstyle="-|>", color="#7a3b3b", lw=3))
    ax.text(Dc / 2, yj + hj / 2 - 0.62, "Vj（接合部せん断力）",
            fontproperties=jp, ha="center", fontsize=9, color="#7a3b3b")
    ax.text(Dc / 2, yj - 2.3,
            "切断面より上の水平力の釣合い：\n"
            "Vj = T1 + C2 − Vc = (at1 + at2)・σy − Vc",
            fontproperties=jp, ha="center", fontsize=11, color="#1f4e79",
            fontweight="bold")
    ax.text(Dc / 2, yj - 3.3,
            "梁が曲げ降伏する時を想定 → 主筋の引張力は降伏強度で評価\n"
            "（余裕度検討では材料強度の割増しを考慮することもある）",
            fontproperties=jp, ha="center", fontsize=8.5, color="#444")
    ax.set_xlim(-3.2, Dc + 3.8)
    ax.set_ylim(yj - 3.8, yj + hj + 2.0)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.set_title("図 9-4  接合部の設計せん断力 Vj（十字形）",
                 fontproperties=jp, fontsize=12, fontweight="bold")
    return save(fig, "fig9-4_vj.png")


figs = {
    "f1": fig_9_1(),
    "f2": fig_9_2(),
    "f3": fig_9_3(),
    "f4": fig_9_4(),
}
print("figures:", list(figs.keys()))

# ===========================================================================
# Excel 構築
# ===========================================================================
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


# ---- 目次 ----
ws = wb.active
ws.title = "目次"
setup(ws, [4, 22, 60, 14])
title_row(ws, 1, "RC 柱梁接合部 問題集（RC マンション設計担当・新人向け）", span=4)
body(ws, 2,
     "テーマ No.9：柱梁接合部（仕口）の設計。応力伝達機構、形状係数 κ・有効幅 bj、"
     "水平投影定着長さ ldh、設計せん断力 Vj、せん断終局強度 Vju の算出までを、"
     "実建物想定の数値で通す。式は靭性保証型耐震設計指針（1999）・技術基準解説書に基づく。",
     span=4, h=44)
r = table(ws, 4,
          ["No.", "シート", "到達目標", "図"],
          [["9-1", "9-1 応力伝達機構",
            "接合部の応力伝達機構を説明できる", "力の流れ・ストラット"],
           ["9-2", "9-2 形状係数・有効幅",
            "接合部形状係数 κ・有効幅 bj を理解している", "形状4種・bj"],
           ["9-3", "9-3 水平投影定着長さ",
            "水平投影定着長さ ldh を理解している", "外柱の折曲げ定着"],
           ["9-4", "9-4 設計せん断力",
            "接合部の設計せん断力 Vj を算出できる", "釣合い図"],
           ["9-5", "9-5 せん断終局強度",
            "接合部せん断終局強度 Vju を算出できる", "—"]])
body(ws, r + 2,
     "凡例：κ＝接合部形状係数、φ＝直交梁補正係数、Fj＝接合部せん断強度の基準値、"
     "bj＝接合部有効幅、Dj＝接合部有効せい、ldh＝水平投影定着長さ、at＝梁主筋断面積。"
     "式・係数は公開資料と照合済みだが、設計では靭性指針・技術基準解説書の原文で"
     "最終確認すること。",
     span=4, h=58)

# ---- 9-1 ----
ws = wb.create_sheet("9-1 応力伝達機構")
setup(ws, [8, 16, 18, 16, 14, 12, 12, 12])
title_row(ws, 1, "9-1  柱梁接合部の応力伝達機構")
head(ws, 3, "■ 図 9-1  接合部に作用する力とストラット機構")
put_img(ws, figs["f1"], "A4", w=820)
head(ws, 32, "■ 問題 1  力の流れ（穴埋め）")
body(ws, 33, "地震時、左右の梁は曲げの向きが【 ① 】になり、左梁の上端筋引張 T1 と"
             "右梁の上端側圧縮 C2 が同じ向きに接合部を押すため、接合部には大きな"
             "【 ② 】力が生じる。この力は接合部内の【 ③ 】圧縮ストラット"
             "（コンクリートの圧縮束）が主に伝達する。", h=44)
head(ws, 35, "■ 問題 2  なぜ接合部が弱点になり得るか")
body(ws, 36, "(1) 柱・梁が健全でも接合部がせん断破壊すると建物全体はどうなるか"
             "（層崩壊・修復困難性）。", h=32)
body(ws, 37, "(2) 接合部の設計は『梁が曲げ降伏しても接合部は壊れない』ことを確認する。"
             "この考え方を何と呼ぶか（ヒント：強〇〇弱〇〇と同じ発想）。", h=32)
head(ws, 39, "■ 問題 3  接合部内帯筋の役割")
body(ws, 40, "接合部内の帯筋の役割を 2 つ挙げよ（コアコンクリートの拘束・"
             "トラス機構によるせん断伝達への寄与・柱主筋の座屈拘束）。"
             "ただし接合部のせん断強度は帯筋量より【 ① 】強度に支配される点も述べよ。",
     h=44)
head(ws, 42, "■ 問題 4  マンション実務")
body(ws, 43, "外柱・最上階の接合部で設計が厳しくなりやすい理由を、"
             "図 9-2 の形状係数（κ が小さい）と定着の納まりから 2 行で述べよ。", h=40)

# ---- 9-2 ----
ws = wb.create_sheet("9-2 形状係数・有効幅")
setup(ws, [8, 16, 18, 16, 14, 12, 12, 12])
title_row(ws, 1, "9-2  接合部形状係数 κ と 接合部有効幅 bj")
head(ws, 3, "■ 図 9-2  形状 4 種と κ、有効幅 bj、Vju の式")
put_img(ws, figs["f2"], "A4", w=820)
head(ws, 34, "■ 問題 1  形状係数 κ の対応")
r = table(ws, 35,
          ["接合部の位置", "形状", "κ（記入）"],
          [["中間階・中柱", "十字形", ""],
           ["中間階・外柱", "ト形", ""],
           ["最上階・中柱", "T形", ""],
           ["最上階・外柱（隅）", "L形", ""]])
body(ws, r + 2, "κ が小さいほど接合部強度は低い。なぜ外柱・最上階ほど弱いのか、"
                "接合部を囲む部材（拘束）の数から説明せよ。", h=40)
head(ws, r + 4, "■ 問題 2  直交梁補正 φ")
body(ws, r + 5, "φ = 1.0 となる条件（【 ① 】側に直交梁が取り付く）と、"
                "その他の場合の φ =【 ② 】を答えよ。直交梁があると強度が上がる理由"
                "（接合部の拘束）も 1 行で。", h=44)
head(ws, r + 7, "■ 問題 3  有効幅 bj の計算")
body(ws, r + 8, "柱 800×800、梁幅 bb = 500（梁は柱芯に配置）、十字形接合部。"
                "bi =（柱幅 − 梁幅）/2、bai = min(bi/2, Dj/4)、Dj = 柱せい 800。",
     h=32)
r = table(ws, r + 10,
          ["項目", "式", "値（記入）"],
          [["bi", "(800−500)/2", ""],
           ["bi/2", "—", ""],
           ["Dj/4", "800/4", ""],
           ["bai", "min(bi/2, Dj/4)", ""],
           ["bj", "bb + 2×bai", ""]])
head(ws, r + 2, "■ 問題 4  Fj の計算")
body(ws, r + 3, "接合部せん断強度の基準値 Fj = 0.8・σB^0.7（σB にコンクリート強度 Fc を用いる）。"
                "Fc = 24・30・36 N/mm² の Fj を求めよ（電卓の x^y キー使用、小数 2 桁）。",
     h=40)
r = table(ws, r + 5,
          ["Fc", "Fj = 0.8・Fc^0.7（記入）"],
          [["24", ""],
           ["30", ""],
           ["36", ""]])
body(ws, r + 2, "※ Fj は Fc に比例しない（0.7 乗）。強度を上げても接合部強度は"
                "比例しては増えないことを確認せよ。", h=32)

# ---- 9-3 ----
ws = wb.create_sheet("9-3 水平投影定着長さ")
setup(ws, [8, 16, 18, 16, 14, 12, 12, 12])
title_row(ws, 1, "9-3  水平投影定着長さ ldh")
head(ws, 3, "■ 図 9-3  外柱の折り曲げ定着と ldh")
put_img(ws, figs["f3"], "A4", w=620)
head(ws, 30, "■ 問題 1  定義の穴埋め")
body(ws, 31, "水平投影定着長さ ldh は、梁危険断面（＝柱【 ① 】）から折り曲げ鉄筋の"
             "【 ② 】までの水平投影距離。基本として柱せい D の【 ③ 】倍以上を確保する。"
             "外柱（ト形・L形）の接合部有効せい Dj には【 ④ 】を用いる。", h=44)
head(ws, 33, "■ 問題 2  数値確認")
body(ws, 34, "柱せい D = 800mm の外柱。(1) ldh の基本下限は何 mm か。"
             "(2) かぶり・柱主筋との納まりから ldh = 620mm しか取れない場合、"
             "0.75D と比較して OK か NG か。対策を 1 つ挙げよ"
             "（柱せい拡大・梁主筋径の変更・機械式定着 等）。", h=44)
head(ws, 36, "■ 問題 3  ldh と接合部強度の関係")
body(ws, 37, "外柱で ldh を大きく取る（のみ込みを深くする）と Vju はどうなるか。"
             "Dj = ldh の関係から 1 行で述べよ。", h=32)
head(ws, 39, "■ 問題 4  No.6（定着）との接続")
body(ws, 40, "定着教材（No.6）の La（投影定着長さ）と本シートの ldh は同じものを指す。"
             "『定着の検討（鉄筋が抜けないか）』と『接合部の検討（コンクリートが"
             "せん断で壊れないか）』で、同じ ldh がそれぞれどう使われるか整理せよ。",
     h=44)

# ---- 9-4 ----
ws = wb.create_sheet("9-4 設計せん断力")
setup(ws, [8, 16, 18, 16, 14, 12, 12, 12])
title_row(ws, 1, "9-4  接合部の設計せん断力 Vj の算出")
head(ws, 3, "■ 図 9-4  切断面の釣合いと Vj")
put_img(ws, figs["f4"], "A4", w=640)
head(ws, 30, "■ 問題 1  式の理解（穴埋め）")
body(ws, 31, "十字形接合部の設計せん断力は、切断面より上の水平力の釣合いから "
             "Vj = T1 + C2 − Vc。ここで T1 は左梁【 ① 】筋の引張力、"
             "C2 は右梁上端側の圧縮力で、大きさは右梁【 ② 】筋の引張力 T2 に等しい。"
             "Vc は【 ③ 】のせん断力で、Vj を【 ④ 】側に働く（差し引く）。", h=44)
head(ws, 33, "■ 問題 2  Vj の計算（マンション大梁）")
body(ws, 34, "梁：上端筋 5-D25（at1 = 5×507 = 2,535mm²）、下端筋 4-D25（at2 = 2,028mm²）、"
             "SD345（σy = 345 N/mm²）。柱せん断力 Vc = 300kN。"
             "梁曲げ降伏時を想定して Vj を求めよ。", h=32)
r = table(ws, 37,
          ["項目", "式", "値（記入）"],
          [["T1", "at1・σy", ""],
           ["T2（= C2）", "at2・σy", ""],
           ["Vj", "T1 + T2 − Vc", ""]])
head(ws, r + 2, "■ 問題 3  なぜ降伏強度で計算するか")
body(ws, r + 3, "Vj の算定で梁主筋の応力を σy（降伏強度）とするのはなぜか。"
                "『梁が曲げ降伏するまで接合部は壊れてはいけない』という設計思想から"
                "説明せよ。さらに余裕を見る場合、材料強度の割増し（上限強度）を"
                "用いることがある点にも触れよ。", h=58)
head(ws, r + 5, "■ 問題 4  ト形（外柱）の場合")
body(ws, r + 6, "外柱（ト形）では梁が片側しか取り付かない。Vj の式は "
                "Vj = T1 − Vc となる（C2 の項が無い）。同じ梁配筋なら十字形と"
                "ト形のどちらの Vj が大きいか。一方で Vju（強度側）は κ が 0.7 に"
                "下がる ── 設計はどちらが厳しくなりやすいか考察せよ。", h=58)

# ---- 9-5 ----
ws = wb.create_sheet("9-5 せん断終局強度")
setup(ws, [8, 16, 18, 16, 14, 12, 12, 12])
title_row(ws, 1, "9-5  接合部せん断終局強度 Vju の算出と判定")
head(ws, 3, "■ 総合計算問題（9-2〜9-4 の集大成）")
body(ws, 4, "10 階建 RC マンション基準階の内柱接合部（十字形）を検定する。", h=22)
body(ws, 5, "条件：柱 800×800（Fc = 24）、梁幅 500・梁は柱芯配置、"
            "直交梁は両側に取り付く（φ = 1.0）。"
            "梁主筋：上端 5-D25、下端 4-D25、SD345。柱せん断力 Vc = 300kN。", h=32)
head(ws, 7, "■ 手順 1  設計せん断力 Vj（9-4 の復習）")
r = table(ws, 9,
          ["項目", "式", "値（記入）"],
          [["T1", "2,535 × 345", ""],
           ["T2", "2,028 × 345", ""],
           ["Vj", "T1 + T2 − Vc", ""]])
head(ws, r + 2, "■ 手順 2  強度の諸元")
r = table(ws, r + 4,
          ["項目", "式・根拠", "値（記入）"],
          [["κ", "十字形", ""],
           ["φ", "両側直交梁付き", ""],
           ["Fj", "0.8 × 24^0.7", ""],
           ["bai", "min(75, 200)", ""],
           ["bj", "500 + 2×75", ""],
           ["Dj", "内柱 → 柱せい", ""]])
head(ws, r + 2, "■ 手順 3  Vju の算出と判定")
r = table(ws, r + 4,
          ["項目", "式", "値（記入）"],
          [["Vju", "κ・φ・Fj・bj・Dj", ""],
           ["判定", "Vju ≧ Vj か", ""],
           ["余裕度", "Vju / Vj", ""]])
head(ws, r + 2, "■ 問題 2  NG になった場合の対策")
body(ws, r + 3, "もし Vju < Vj となったら、どのパラメータをどう変えるのが有効か。"
                "効果の大きい順に 3 つ挙げよ（柱せい D（＝Dj・bj にも効く）／"
                "コンクリート強度 Fc（0.7 乗でしか効かない）／"
                "梁主筋量の見直し（Vj を減らす）／梁幅の拡大）。", h=58)
head(ws, r + 5, "■ 問題 3  外柱（ト形）の検定")
body(ws, r + 6, "同じ建物の外柱（ト形、直交梁両側 φ=1.0、ldh = 600mm）について："
                "Vj = T1 − Vc = 874.6 − 300 = 574.6kN。"
                "Vju = 0.7 × 1.0 × Fj × bj × ldh を計算し判定せよ"
                "（Fj・bj は手順 2 と同じ値を使用）。", h=44)
head(ws, r + 8, "■ 問題 4  実務チェックリスト")
body(ws, r + 9, "マンションの接合部検定で確認する項目を 4 つ挙げよ："
                "①形状（κ）と直交梁（φ）の判定 ②bj・Dj の取り方（外柱は ldh） "
                "③Vj の算定（左右の梁主筋・柱せん断） ④Vju ≧ Vj と余裕度。", h=44)

# ---- 解答 ----
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


ah("9-1  応力伝達機構")
an("問1：①逆（左右反対称） ②（水平）せん断 ③斜め。"
   "左右の梁の曲げが逆向きになる地震時が接合部の最も厳しい状態。", h=44)
an("問2：(1)接合部の破壊は柱の軸力支持能力の喪失につながり層崩壊の危険。"
   "接合部は柱・梁が交差する要で、損傷すると補修もほぼ不可能。"
   "(2)『梁降伏先行・接合部非破壊』── 強柱弱梁と同じく、壊れてよい場所（梁端ヒンジ）と"
   "壊れてはいけない場所（接合部・柱）を明確に分ける設計思想。", h=72)
an("問3：帯筋の役割＝①コアコンクリートの拘束（ストラットの圧壊を遅らせる） "
   "②柱主筋の座屈拘束（＋トラス機構への寄与）。"
   "ただし接合部のせん断強度は主として①コンクリート強度に支配され"
   "（Vju の式に帯筋量は入らない）、帯筋を増やしても強度は頭打ち。", h=58)
an("問4：外柱・最上階は κ = 0.7・0.4 と強度が低い上に、梁主筋の折り曲げ定着"
   "（ldh の確保）・直交梁筋との干渉など納まりも厳しい。"
   "柱せい・配筋計画を早期に決めないと後戻りが大きい部位。", h=44)

ah("9-2  形状係数・有効幅")
an("問1：十字形 1.0／ト形 0.7／T形 0.7／L形 0.4。"
   "接合部を囲む梁・柱の数が多いほど拘束が強く、ストラットが有効に働くため強い。"
   "外柱・最上階は囲む部材が少なく拘束が弱い → κ が小さい。", h=58)
an("問2：①両 ②0.85。直交梁が接合部の側面を塞いで拘束し、"
   "コンクリートの膨張・剥落を抑えるため強度を高く評価できる。", h=44)
an("問3：bi = (800−500)/2 = 150mm。bi/2 = 75mm。Dj/4 = 200mm。"
   "bai = min(75, 200) = 75mm。bj = 500 + 2×75 = 650mm。", h=44)
an("問4：Fj = 0.8×24^0.7 = 0.8×9.25 = 7.40。"
   "Fc30：0.8×30^0.7 = 0.8×10.81 = 8.65。"
   "Fc36：0.8×36^0.7 = 0.8×12.29 = 9.83（N/mm²）。"
   "Fc を 1.5 倍（24→36）にしても Fj は約 1.33 倍にしかならない（0.7 乗）。", h=58)

ah("9-3  水平投影定着長さ")
an("問1：①フェイス（柱面＝梁危険断面） ②末端（折り曲げ筋の外面） "
   "③3/4（0.75） ④ldh。", h=32)
an("問2：(1)0.75×800 = 600mm。(2)620 ≧ 600 → OK（ぎりぎり）。"
   "余裕がない場合の対策：柱せい拡大／梁主筋を細径多本数化して曲げ内法を確保／"
   "機械式定着（定着板）の採用 等。", h=44)
an("問3：Dj = ldh なので、ldh を深く取るほど Vju = κφFj・bj・Dj は比例して増える。"
   "『定着ののみ込み深さがそのまま接合部の強さ』── 納まり検討が構造性能に直結する。",
   h=44)
an("問4：同じ ldh を、定着の検討では『折り曲げ定着の投影定着長さ La として"
   "必要定着長さ以上か（鉄筋が抜けないか）』を照査し、"
   "接合部の検討では『Dj として Vju の算定（コンクリートがせん断で壊れないか）』に使う。"
   "1 つの寸法が 2 つの検定に効く。", h=58)

ah("9-4  設計せん断力")
an("問1：①上端 ②下端 ③柱 ④減らす（差し引く）。"
   "C2 は右梁の圧縮合力で、力の釣合い上 T2（右梁下端筋の引張力）と等しい。", h=44)
an("問2：T1 = 2,535×345 = 874,575N ≒ 874.6kN。"
   "T2 = 2,028×345 = 699,660N ≒ 699.7kN。"
   "Vj = 874.6 + 699.7 − 300 = 1,274.3 ≒ 1,274kN。", h=44)
an("問3：接合部は『梁が曲げ降伏しても壊れない』ことを保証する部位なので、"
   "梁主筋が降伏した状態（＝接合部に入り得る最大の力）を想定して σy で算定する。"
   "実際の鉄筋は規格降伏点より強いことがあるため、余裕度検討では"
   "材料強度の割増し（上限強度、規格値の 1.25〜1.3 倍程度）を用いることもある。",
   h=58)
an("問4：Vj はト形（T1 − Vc = 574.6kN）の方が十字形（1,274kN）より小さい。"
   "しかし Vju 側も κ = 0.7、さらに Dj = ldh（< 柱せい）と二重に下がるため、"
   "外柱の方が検定比は厳しくなることが多い。『力が小さいから安心』ではない。",
   h=58)

ah("9-5  せん断終局強度")
an("手順1：T1 = 874.6kN、T2 = 699.7kN、Vj = 874.6+699.7−300 = 1,274kN。", h=22)
an("手順2：κ = 1.0、φ = 1.0、Fj = 0.8×24^0.7 = 7.40 N/mm²、"
   "bai = 75mm、bj = 650mm、Dj = 800mm。", h=32)
an("手順3：Vju = 1.0×1.0×7.40×650×800 = 3,848,000N ≒ 3,848kN。"
   "3,848 ≧ 1,274 → OK。余裕度 = 3,848/1,274 = 3.02。"
   "内柱の十字形は一般に余裕が大きい。", h=44)
an("問2：効果の大きい順（一例）：①柱せい D の拡大（Dj と bj の両方に効き、"
   "ldh の納まりも改善） ②梁主筋量の削減・細径化（Vj そのものを減らす。"
   "ただし梁曲げ耐力とのバランス要確認） ③Fc アップ（0.7 乗でしか効かず効率が悪い）。"
   "梁幅拡大は bj にわずかに効くのみ。", h=58)
an("問3：Vju = 0.7×1.0×7.40×650×600 = 2,020,000N ≒ 2,020kN。"
   "Vj = 574.6kN ≦ 2,020kN → OK（余裕度 3.5）。"
   "※ ldh が短い・L形（κ=0.4）・直交梁なし（φ=0.85）が重なると"
   "余裕は急速に減る。最上階隅柱（L形）が最も厳しい。", h=58)
an("問4：①形状の判定（十字/ト/T/L → κ）と直交梁の有無（φ） "
   "②bj（梁幅＋bai）と Dj（内柱=柱せい、外柱=ldh）の正しい設定 "
   "③Vj の算定（左右の梁主筋 at・σy、柱せん断 Vc の控除） "
   "④Vju ≧ Vj の判定と余裕度の確認（外柱・最上階は特に注意）。", h=58)

XLSX = os.path.join(OUT, "柱梁接合部問題集.xlsx")
wb.save(XLSX)
print("saved:", XLSX)
