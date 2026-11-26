# -*- coding: utf-8 -*-
"""支持条件に応じたスラブから梁への荷重伝達 問題集。
出力: docs/slab_to_beam/スラブから梁への荷重伝達問題集.xlsx
数値は scratchpad/v_slab2.py で検算済み（等価等分布荷重は数値積分と一致を確認）。
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
OUT = "docs/slab_to_beam"; FIG = os.path.join(OUT, "figures"); os.makedirs(FIG, exist_ok=True)

RED, BLU, GRN, ORG, PUR = "#c00000", "#2a78d6", "#548235", "#c55a11", "#7030a0"
SLAB, BEAM = "#e8eef7", "#2e5b8a"
W, LX, LY = 10.0, 4.0, 6.0
LAM = LY / LX
P = W * LX / 2                        # 20.0
WT = W * LX**2 / 4                    # 40.0 三角形(短辺梁)
WZ = W * LX * (2 * LY - LX) / 4       # 80.0 台形(長辺梁)
WE_T = W * LX / 3                     # 13.333
WE_Z = (W * LX / 2) * (1 - 1 / (3 * LAM**2))   # 17.037
LC = 1.5


def save(fig, n):
    p = os.path.join(FIG, n); fig.savefig(p, dpi=130, bbox_inches="tight"); plt.close(fig)
    print("fig:", p); return p


def beam(ax, x1, y1, x2, y2, lw=6):
    ax.plot([x1, x2], [y1, y2], color=BEAM, lw=lw, solid_capstyle="butt", zorder=3)


# ============ 図1 支持条件の種類 ============
def fig_types():
    fig, axes = plt.subplots(1, 4, figsize=(15.0, 4.6))
    specs = [
        ("(a) 四辺支持", [1, 1, 1, 1], "4辺すべてが梁・壁で支持\n二方向に荷重が流れる", "#dbe5f1"),
        ("(b) 三辺支持", [1, 1, 1, 0], "1辺が自由（吹抜け・開口）\n残り3辺へ荷重が回り込む", "#dce9d4"),
        ("(c) 二辺支持", [1, 0, 1, 0], "対辺のみ支持（一方向スラブ）\n短辺方向だけに流れる", "#fde7d4"),
        ("(d) 片持ち", [1, 0, 0, 0], "1辺のみ固定\n支持梁にねじりも与える", "#f6dcdc"),
    ]
    for ax, (title, sup, note, col) in zip(axes, specs):
        ax.add_patch(mpatches.Rectangle((0, 0), 4, 3, fc=col, ec="none"))
        # 4辺: 下,右,上,左
        edges = [((0, 0), (4, 0)), ((4, 0), (4, 3)), ((0, 3), (4, 3)), ((0, 0), (0, 3))]
        for s, ((ax1, ay1), (ax2, ay2)) in zip(sup, edges):
            if s:
                beam(ax, ax1, ay1, ax2, ay2)
            else:
                ax.plot([ax1, ax2], [ay1, ay2], color="#b0b0b0", lw=1.6, ls=(0, (5, 4)), zorder=3)
        # 荷重の流れ矢印
        if title.startswith("(a)"):
            for xx in [1.0, 2.0, 3.0]:
                ax.annotate("", xy=(xx, 0.25), xytext=(xx, 1.5),
                            arrowprops=dict(arrowstyle="-|>", color=ORG, lw=1.5))
                ax.annotate("", xy=(xx, 2.75), xytext=(xx, 1.5),
                            arrowprops=dict(arrowstyle="-|>", color=ORG, lw=1.5))
            for yy in [0.9, 2.1]:
                ax.annotate("", xy=(0.25, yy), xytext=(2.0, yy),
                            arrowprops=dict(arrowstyle="-|>", color=ORG, lw=1.5))
                ax.annotate("", xy=(3.75, yy), xytext=(2.0, yy),
                            arrowprops=dict(arrowstyle="-|>", color=ORG, lw=1.5))
        elif title.startswith("(b)"):
            for xx in [1.0, 2.0, 3.0]:
                ax.annotate("", xy=(xx, 0.25), xytext=(xx, 2.3),
                            arrowprops=dict(arrowstyle="-|>", color=ORG, lw=1.5))
            for yy in [1.0, 2.0]:
                ax.annotate("", xy=(0.25, yy), xytext=(1.8, yy),
                            arrowprops=dict(arrowstyle="-|>", color=ORG, lw=1.4))
                ax.annotate("", xy=(3.75, yy), xytext=(2.2, yy),
                            arrowprops=dict(arrowstyle="-|>", color=ORG, lw=1.4))
            ax.text(2.0, 3.28, "自由辺", ha="center", fontproperties=jp, fontsize=8.5, color="#777")
        elif title.startswith("(c)"):
            for xx in [0.7, 1.6, 2.4, 3.3]:
                ax.annotate("", xy=(xx, 0.25), xytext=(xx, 2.75),
                            arrowprops=dict(arrowstyle="-|>", color=ORG, lw=1.6))
            ax.text(2.0, 3.28, "自由辺", ha="center", fontproperties=jp, fontsize=8.5, color="#777")
        else:
            for xx in [0.7, 1.6, 2.4, 3.3]:
                ax.annotate("", xy=(xx, 0.25), xytext=(xx, 2.4),
                            arrowprops=dict(arrowstyle="-|>", color=ORG, lw=1.6))
            ax.annotate("", xy=(0.45, 0.62), xytext=(0.45, 0.1), xycoords="data",
                        arrowprops=dict(arrowstyle="-|>", color=RED, lw=2,
                                        connectionstyle="arc3,rad=0.9"))
            ax.text(1.15, 0.62, "ねじり", fontproperties=jp, fontsize=8.5, color=RED)
        ax.text(2.0, -0.75, note, ha="center", va="top", fontproperties=jp, fontsize=8.3, color="#333")
        ax.set_xlim(-0.6, 4.6); ax.set_ylim(-2.1, 3.7); ax.set_aspect("equal"); ax.axis("off")
        ax.set_title(title, fontproperties=jp, fontsize=10.5, fontweight="bold")
    fig.suptitle("図 1  スラブの支持条件と荷重の流れ（太線＝支持辺、破線＝自由辺）",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig1_types.png")


# ============ 図2 45°分割法 ============
def fig_45():
    fig, axes = plt.subplots(1, 2, figsize=(14.2, 5.4), gridspec_kw={"width_ratios": [1.15, 1.0]})
    ax = axes[0]
    # スラブ平面: 幅 ly(横) × 高さ lx(縦)
    ax.add_patch(mpatches.Rectangle((0, 0), LY, LX, fc=SLAB, ec="none"))
    # 45°線の交点
    a = LX / 2
    tri_b = [(0, 0), (LY, 0), (LY - a, a), (a, a)]       # 下の台形(長辺梁)
    tri_t = [(0, LX), (LY, LX), (LY - a, a), (a, a)]     # 上の台形
    tri_l = [(0, 0), (0, LX), (a, a)]                    # 左の三角形(短辺梁)
    tri_r = [(LY, 0), (LY, LX), (LY - a, a)]             # 右の三角形
    for poly, c, lab in [(tri_b, "#f3dcc4", None), (tri_t, "#f3dcc4", None),
                         (tri_l, "#cfe0f0", None), (tri_r, "#cfe0f0", None)]:
        ax.add_patch(mpatches.Polygon(poly, fc=c, ec="#999", lw=1.0))
    ax.text(LY / 2, a / 2, "台形 → 長辺梁", ha="center", va="center",
            fontproperties=jp, fontsize=9.5, color=ORG, fontweight="bold")
    ax.text(LY / 2, LX - a / 2, "台形 → 長辺梁", ha="center", va="center",
            fontproperties=jp, fontsize=9.5, color=ORG, fontweight="bold")
    ax.text(a / 2.6, LX / 2, "三角形\n→短辺梁", ha="center", va="center",
            fontproperties=jp, fontsize=9, color=BLU, fontweight="bold")
    ax.text(LY - a / 2.6, LX / 2, "三角形\n→短辺梁", ha="center", va="center",
            fontproperties=jp, fontsize=9, color=BLU, fontweight="bold")
    # 45°線
    for s, e in [((0, 0), (a, a)), ((0, LX), (a, a)), ((LY, 0), (LY - a, a)), ((LY, LX), (LY - a, a))]:
        ax.plot([s[0], e[0]], [s[1], e[1]], color=RED, lw=1.8, ls="--")
    ax.plot([a, LY - a], [a, a], color=RED, lw=1.8, ls="--")
    ax.text(a + 0.42, a + 0.30, "45°", fontproperties=jp, fontsize=9, color=RED)
    # 梁
    beam(ax, 0, 0, LY, 0); beam(ax, 0, LX, LY, LX)
    beam(ax, 0, 0, 0, LX); beam(ax, LY, 0, LY, LX)
    # 寸法
    ax.annotate("", xy=(0, -0.62), xytext=(LY, -0.62), arrowprops=dict(arrowstyle="<->", color="#333"))
    ax.text(LY / 2, -0.95, f"長辺 ly = {LY:.1f} m", ha="center", va="top", fontproperties=jp, fontsize=10)
    ax.annotate("", xy=(-0.62, 0), xytext=(-0.62, LX), arrowprops=dict(arrowstyle="<->", color="#333"))
    ax.text(-0.85, LX / 2, f"短辺\nlx = {LX:.1f} m", ha="right", va="center",
            fontproperties=jp, fontsize=10)
    ax.set_xlim(-2.5, LY + 0.5); ax.set_ylim(-1.9, LX + 0.6)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(a) 45°分割法による荷重分担", fontproperties=jp, fontsize=10.5, fontweight="bold")

    # (b) 各梁の荷重分布
    ax = axes[1]
    # 短辺梁（三角形）
    x = np.linspace(0, LX, 200); q = P * (1 - np.abs(2 * x / LX - 1))
    ax.plot(x, q + 26, color=BLU, lw=2)
    ax.fill_between(x, 26, q + 26, color=BLU, alpha=0.18)
    ax.plot([0, LX], [26, 26], color=BEAM, lw=5)
    ax.text(LX / 2, 26 + P + 2.6, f"短辺梁（スパン lx={LX:.0f}m）：三角形分布",
            ha="center", fontproperties=jp, fontsize=9.5, color=BLU, fontweight="bold")
    ax.text(LX / 2, 26 + P / 2, f"p = w・lx/2 = {P:.0f} kN/m", ha="center",
            fontproperties=jp, fontsize=9)
    ax.text(LX + 0.25, 26 + 2, f"総荷重\n{WT:.0f} kN", fontproperties=jp, fontsize=8.5, color=BLU)
    # 長辺梁（台形）
    x2 = np.linspace(0, LY, 300)
    q2 = P * np.clip(np.minimum(x2, LY - x2) / (LX / 2), 0, 1)
    ax.plot(x2, q2, color=ORG, lw=2)
    ax.fill_between(x2, 0, q2, color=ORG, alpha=0.18)
    ax.plot([0, LY], [0, 0], color=BEAM, lw=5)
    ax.text(LY / 2, P + 2.6, f"長辺梁（スパン ly={LY:.0f}m）：台形分布",
            ha="center", fontproperties=jp, fontsize=9.5, color=ORG, fontweight="bold")
    ax.text(LY / 2, P / 2, f"p = w・lx/2 = {P:.0f} kN/m", ha="center",
            fontproperties=jp, fontsize=9)
    ax.annotate("", xy=(0, -2.3), xytext=(LX / 2, -2.3), arrowprops=dict(arrowstyle="<->", color="#666"))
    ax.text(LX / 4, -3.1, "lx/2", ha="center", va="top", fontproperties=jp, fontsize=8, color="#666")
    ax.text(LY + 0.25, 2, f"総荷重\n{WZ:.0f} kN", fontproperties=jp, fontsize=8.5, color=ORG)
    ax.set_xlim(-0.5, LY + 1.5); ax.set_ylim(-4.5, 52); ax.axis("off")
    ax.set_title("(b) 各梁が受ける荷重分布", fontproperties=jp, fontsize=10.5, fontweight="bold")
    fig.suptitle("図 2  四辺支持スラブ：45°分割法（三角形・台形分布）",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig2_45deg.png")


# ============ 図3 等価等分布荷重 ============
def fig_equiv():
    fig, axes = plt.subplots(1, 2, figsize=(14.0, 5.0))
    ax = axes[0]
    ax.text(0.5, 0.965, "等価等分布荷重への換算（最大曲げを一致させる）",
            transform=ax.transAxes, ha="center", fontproperties=jp,
            fontsize=10.8, fontweight="bold", color="#1f4e79")
    # 三角形
    xs = np.linspace(0.08, 0.46, 100)
    tri = 0.12 * (1 - np.abs((xs - 0.27) / 0.19))
    ax.fill_between(xs, 0.62, 0.62 + tri, color=BLU, alpha=0.25, transform=ax.transAxes)
    ax.plot(xs, 0.62 + tri, color=BLU, lw=1.8, transform=ax.transAxes)
    ax.plot([0.08, 0.46], [0.62, 0.62], color=BEAM, lw=4, transform=ax.transAxes)
    ax.text(0.27, 0.785, "三角形分布", ha="center", transform=ax.transAxes,
            fontproperties=jp, fontsize=9.5, color=BLU, fontweight="bold")
    ax.annotate("", xy=(0.545, 0.665), xytext=(0.485, 0.665), xycoords="axes fraction",
                arrowprops=dict(arrowstyle="-|>", color="#666", lw=2))
    ax.add_patch(mpatches.Rectangle((0.58, 0.62), 0.34, 0.082, transform=ax.transAxes,
                 fc=GRN, alpha=0.25, ec=GRN, lw=1.8))
    ax.plot([0.58, 0.92], [0.62, 0.62], color=BEAM, lw=4, transform=ax.transAxes)
    ax.text(0.75, 0.785, "等価等分布 we", ha="center", transform=ax.transAxes,
            fontproperties=jp, fontsize=9.5, color=GRN, fontweight="bold")
    ax.text(0.5, 0.515,
            "Mmax = p・L²/12 ＝ we・L²/8　→　we = (2/3)p = w・lx/3",
            transform=ax.transAxes, ha="center", fontproperties=jp, fontsize=10, color="#222")
    ax.plot([0.04, 0.96], [0.465, 0.465], color="#ccc", lw=1, transform=ax.transAxes)
    ax.text(0.04, 0.40,
            f"【短辺梁：三角形】\n"
            f"　we = w・lx/3 = {W:.0f}×{LX:.0f}/3 = {WE_T:.2f} kN/m\n\n"
            f"【長辺梁：台形】λ = ly/lx = {LAM:.1f}\n"
            f"　we = (w・lx/2)・(1 − 1/(3λ²))\n"
            f"　　 = {P:.0f}×(1 − 1/(3×{LAM**2:.2f})) = {WE_Z:.2f} kN/m\n\n"
            f"λ = 1（正方形）では台形→三角形となり両式は一致する",
            transform=ax.transAxes, fontproperties=jp, fontsize=9.3, va="top")
    ax.axis("off")
    ax.set_title("(a) 換算の考え方と計算", fontproperties=jp, fontsize=10.5, fontweight="bold")

    ax = axes[1]
    lam = np.linspace(1.0, 3.0, 200)
    short = 1 / (4 * lam) * 100
    long_ = (2 * lam - 1) / (4 * lam) * 100
    ax.plot(lam, short, color=BLU, lw=2.4, label="短辺梁 1本 = 1/(4λ)")
    ax.plot(lam, long_, color=ORG, lw=2.4, label="長辺梁 1本 = (2λ−1)/(4λ)")
    ax.axhline(50, color="#888", ls=":", lw=1.2)
    ax.text(2.55, 51.0, "50%（一方向の極限）", fontproperties=jp, fontsize=8.5, color="#666")
    ax.axvline(LAM, color=RED, ls="--", lw=1.4)
    ax.plot([LAM], [1 / (4 * LAM) * 100], "o", color=BLU, ms=7)
    ax.plot([LAM], [(2 * LAM - 1) / (4 * LAM) * 100], "o", color=ORG, ms=7)
    ax.text(LAM + 0.05, 16.7 - 4.5, "16.7%", fontproperties=jp, fontsize=9, color=BLU)
    ax.text(LAM + 0.05, 33.3 + 2.0, "33.3%", fontproperties=jp, fontsize=9, color=ORG)
    ax.text(LAM + 0.04, 6, f"本問 λ={LAM:.1f}", fontproperties=jp, fontsize=9, color=RED)
    ax.set_xlabel("辺長比 λ = ly / lx", fontproperties=jp, fontsize=9.5)
    ax.set_ylabel("スラブ全荷重に対する分担率 (%)", fontproperties=jp, fontsize=9.5)
    ax.set_xlim(1.0, 3.0); ax.set_ylim(0, 58); ax.grid(alpha=0.3)
    ax.legend(prop=jp, fontsize=9, loc="center right")
    ax.set_title("(b) 辺長比と荷重分担率", fontproperties=jp, fontsize=10.5, fontweight="bold")
    fig.suptitle("図 3  等価等分布荷重への換算と辺長比の影響",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig3_equiv.png")


# ============ 図4 支持条件別の梁への伝達 ============
def fig_cases():
    fig, axes = plt.subplots(1, 2, figsize=(14.0, 5.2))
    ax = axes[0]
    ax.add_patch(mpatches.Rectangle((0, 0), LY, LX, fc=SLAB, ec="none"))
    beam(ax, 0, 0, LY, 0); beam(ax, 0, LX, LY, LX)
    ax.plot([0, 0], [0, LX], color="#b0b0b0", lw=1.6, ls=(0, (5, 4)))
    ax.plot([LY, LY], [0, LX], color="#b0b0b0", lw=1.6, ls=(0, (5, 4)))
    for xx in np.linspace(0.5, LY - 0.5, 8):
        ax.annotate("", xy=(xx, 0.22), xytext=(xx, LX / 2),
                    arrowprops=dict(arrowstyle="-|>", color=ORG, lw=1.5))
        ax.annotate("", xy=(xx, LX - 0.22), xytext=(xx, LX / 2),
                    arrowprops=dict(arrowstyle="-|>", color=ORG, lw=1.5))
    ax.text(LY / 2, LX / 2, "一方向に流れる", ha="center", va="center",
            fontproperties=jp, fontsize=10, color=ORG, fontweight="bold",
            bbox=dict(boxstyle="round", fc="white", ec=ORG, alpha=0.9))
    ax.text(LY / 2, -1.0, f"長辺梁 1本あたり  w・lx/2 = {W:.0f}×{LX:.0f}/2 = {W*LX/2:.0f} kN/m（等分布）\n"
            f"四辺支持の等価等分布 {WE_Z:.1f} kN/m に対し {W*LX/2/WE_Z:.2f} 倍 → 安全側",
            ha="center", va="top", fontproperties=jp, fontsize=9.2, color="#1f4e79")
    ax.set_xlim(-0.6, LY + 0.6); ax.set_ylim(-2.6, LX + 0.6)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(a) 二辺支持（一方向スラブ）", fontproperties=jp, fontsize=10.5, fontweight="bold")

    ax = axes[1]
    # 片持ちスラブ断面
    ax.add_patch(mpatches.Rectangle((0, 2.0), 1.1, 1.3, fc="#c8c8c8", ec="k", lw=1.4))
    ax.text(0.55, 2.65, "梁", ha="center", va="center", fontproperties=jp, fontsize=10)
    ax.add_patch(mpatches.Rectangle((1.1, 2.95), 3.2, 0.35, fc=SLAB, ec="k", lw=1.3))
    ax.text(4.45, 3.12, "片持ちスラブ", ha="left", va="center",
            fontproperties=jp, fontsize=9.5, color="#333")
    for xx in np.linspace(1.3, 4.1, 7):
        ax.annotate("", xy=(xx, 3.35), xytext=(xx, 4.05),
                    arrowprops=dict(arrowstyle="-|>", color=ORG, lw=1.6))
    ax.text(2.7, 4.25, f"w = {W:.0f} kN/m²", ha="center", fontproperties=jp, fontsize=9.5, color=ORG)
    ax.annotate("", xy=(1.1, 2.62), xytext=(4.3, 2.62), arrowprops=dict(arrowstyle="<->", color="#666"))
    ax.text(2.7, 2.40, f"Lc = {LC} m", ha="center", va="top",
            fontproperties=jp, fontsize=9.5, color="#333")
    # ねじり
    th = np.linspace(-2.2, 2.2, 60)
    ax.plot(0.55 + 0.52 * np.cos(th), 1.25 + 0.42 * np.sin(th), color=RED, lw=2.2)
    ax.annotate("", xy=(0.55 + 0.52 * np.cos(2.2), 1.25 + 0.42 * np.sin(2.2)),
                xytext=(0.55 + 0.52 * np.cos(2.0), 1.25 + 0.42 * np.sin(2.0)),
                arrowprops=dict(arrowstyle="-|>", color=RED, lw=2.2))
    ax.text(1.35, 1.25, "ねじりモーメント", va="center", fontproperties=jp, fontsize=9.5, color=RED)
    ax.text(2.2, 0.35,
            f"支持梁への鉛直荷重　w・Lc = {W:.0f}×{LC} = {W*LC:.1f} kN/m\n"
            f"支持梁へのねじり　　mt = w・Lc²/2 = {W*LC**2/2:.2f} kN・m/m",
            ha="center", va="top", fontproperties=jp, fontsize=9.5, color="#1f4e79")
    ax.set_xlim(-0.5, 6.4); ax.set_ylim(-0.9, 4.8); ax.axis("off")
    ax.set_title("(b) 片持ちスラブ（鉛直荷重＋ねじり）",
                 fontproperties=jp, fontsize=10.5, fontweight="bold")
    fig.suptitle("図 4  支持条件が変わると梁への伝わり方が変わる",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig4_cases.png")


F = {"types": fig_types(), "deg45": fig_45(), "equiv": fig_equiv(), "cases": fig_cases()}

# ===================== Excel =====================
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.drawing.image import Image as XLImage
from openpyxl.utils import get_column_letter

wb = Workbook()
C_T, C_H, C_A, C_W = "1F4E79", "2E75B6", "E2EFDA", "FCE4D6"
thin = Side(style="thin", color="BFBFBF")
bd = Border(left=thin, right=thin, top=thin, bottom=thin)
f_t = Font(name="MS PGothic", size=15, bold=True, color="FFFFFF")
f_h = Font(name="MS PGothic", size=11, bold=True, color="FFFFFF")
f_b = Font(name="MS PGothic", size=10)
f_a = Font(name="MS PGothic", size=10, color="375623")
f_w = Font(name="MS PGothic", size=9, color="833C00", italic=True)
wrap = Alignment(wrap_text=True, vertical="top")
ctr = Alignment(horizontal="center", vertical="center", wrap_text=True)


def setup(ws, widths):
    for i, w_ in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w_
    ws.sheet_view.showGridLines = False


def title_row(ws, row, text, span=8):
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=span)
    c = ws.cell(row, 1, text); c.font = f_t
    c.fill = PatternFill("solid", fgColor=C_T)
    c.alignment = Alignment(vertical="center", horizontal="left", indent=1)
    ws.row_dimensions[row].height = 30


def head(ws, row, text, span=8):
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=span)
    c = ws.cell(row, 1, text); c.font = f_h
    c.fill = PatternFill("solid", fgColor=C_H)
    c.alignment = Alignment(vertical="center", horizontal="left", indent=1)
    ws.row_dimensions[row].height = 22


def body(ws, row, text, span=8, ans=False, h=None):
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=span)
    c = ws.cell(row, 1, text); c.font = f_a if ans else f_b; c.alignment = wrap
    if ans:
        c.fill = PatternFill("solid", fgColor=C_A)
    if h:
        ws.row_dimensions[row].height = h


def warn(ws, row, text, span=8, h=None):
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=span)
    c = ws.cell(row, 1, text); c.font = f_w; c.alignment = wrap
    c.fill = PatternFill("solid", fgColor=C_W)
    if h:
        ws.row_dimensions[row].height = h


def tbl(ws, start_row, headers, rows, col1=1):
    r = start_row
    for j, h_ in enumerate(headers):
        c = ws.cell(r, col1 + j, h_)
        c.font = Font(name="MS PGothic", size=10, bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor=C_H); c.alignment = ctr; c.border = bd
    for data in rows:
        r += 1
        for j, v in enumerate(data):
            c = ws.cell(r, col1 + j, v); c.font = f_b
            c.alignment = wrap if j == 0 else ctr; c.border = bd
            if r % 2 == 0:
                c.fill = PatternFill("solid", fgColor="F2F7FC")
    return r


def put_img(ws, path, anchor, w=None):
    img = XLImage(path)
    if w:
        ratio = w / img.width; img.width = w; img.height = int(img.height * ratio)
    ws.add_image(img, anchor)


GIVEN = (f"【共通の設計例】四辺支持スラブ　短辺 lx = {LX:.1f} m／長辺 ly = {LY:.1f} m"
         f"（辺長比 λ = ly/lx = {LAM:.1f}）\n"
         f"　スラブに作用する等分布荷重 w = {W:.1f} kN/m²（固定＋積載）\n"
         f"　片持ちスラブの検討では 出寸法 Lc = {LC} m とする")

# ---------- 目次 ----------
ws = wb.active; ws.title = "目次"; setup(ws, [5, 26, 52, 16])
title_row(ws, 1, "支持条件に応じたスラブから梁への荷重伝達 問題集", span=4)
body(ws, 2, "目標：スラブの支持条件（四辺・三辺・二辺・片持ち）によって荷重の流れ方が変わることを理解し、"
            "45°分割法による荷重分担と、梁設計に用いる等価等分布荷重を算出できること。", span=4, h=34)
r = tbl(ws, 4, ["No.", "シート", "到達目標", "図"],
        [["1", "1 支持条件の種類", "支持条件ごとの荷重の流れを説明できる", "4タイプの平面"],
         ["2", "2 45°分割法", "三角形・台形の荷重分担を算出できる", "45°分割・荷重図"],
         ["3", "3 等価等分布荷重", "梁設計用の we に換算できる", "換算・分担率"],
         ["4", "4 支持条件別の伝達", "一方向・片持ちの違いを理解する", "一方向・ねじり"]])
body(ws, r + 2, GIVEN, span=4, h=58)
body(ws, r + 4, "スラブの荷重は「どの辺が支持されているか」で流れ方が決まります。"
                "支持条件を取り違えると、梁に載る荷重そのものを間違えることになります。", span=4, h=32)
warn(ws, r + 6, "※ 45°分割法・等価等分布荷重は略算法です。辺長比が大きい場合や支持条件が特殊な場合は、"
                "一貫計算（有限要素・床板解析）や規準の規定を確認すること。", span=4, h=36)

# ---------- 1 支持条件の種類 ----------
ws = wb.create_sheet("1 支持条件の種類"); setup(ws, [8, 16, 18, 16, 14, 14])
title_row(ws, 1, "1  スラブの支持条件と荷重の流れ")
head(ws, 3, "■ 図 1  支持条件の4タイプ"); put_img(ws, F["types"], "A4", w=950)
head(ws, 27, "■ 問題 1  支持条件の整理")
body(ws, 28, "次の表を完成させよ。「荷重の流れ」は「二方向」「主に一方向」「一方向のみ」から選ぶ。", h=26)
r = tbl(ws, 29, ["支持条件", "支持されている辺", "荷重の流れ（記入）", "梁への影響（記入）"],
        [["四辺支持", "4辺すべて", "", ""],
         ["三辺支持", "3辺（1辺が自由）", "", ""],
         ["二辺支持", "対辺の2辺のみ", "", ""],
         ["片持ち", "1辺のみ（固定）", "", ""]])
head(ws, r + 2, "■ 問題 2  一方向か二方向か")
body(ws, r + 3, "四辺支持スラブでも、辺長比 λ = ly/lx が大きくなると実質的に一方向スラブに近づく。"
                "その理由を、荷重が短辺方向へ流れやすいこと（短辺方向のほうが剛性が高いこと）と"
                "関連づけて説明せよ。一方向とみなす λ の目安にも触れよ。", h=52)
head(ws, r + 5, "■ 問題 3  支持条件は何で決まるか")
body(ws, r + 6, "実際の建物で、スラブのある辺が「支持されている／いない」はどのように決まるか挙げよ"
                "（大梁・小梁・耐力壁の有無、吹抜け・階段・大開口に面していないか、"
                "スラブが隣接スラブと連続しているか）。", h=46)
head(ws, r + 8, "■ 問題 4  取り違えるとどうなるか")
body(ws, r + 9, "本来は三辺支持（1辺が吹抜けに面する）のスラブを、四辺支持として計算してしまった。"
                "スラブ自身の応力と、梁に伝わる荷重はそれぞれ危険側・安全側のどちらに評価されるか、"
                "理由とともに述べよ。", h=46)

# ---------- 2 45°分割法 ----------
ws = wb.create_sheet("2 45度分割法"); setup(ws, [8, 16, 18, 16, 14, 14])
title_row(ws, 1, "2  四辺支持スラブの荷重分担（45°分割法）")
head(ws, 3, "■ 設計例"); body(ws, 4, GIVEN, h=58)
head(ws, 8, "■ 図 2  45°分割法と各梁の荷重分布"); put_img(ws, F["deg45"], "A4", w=950)
head(ws, 32, "■ 問題 1  分割の作図と分布形")
body(ws, 33, "スラブの四隅から45°の線を引いて領域を4つに分けたとき、"
             "(1) 短辺梁（スパン lx）が受ける荷重分布の形　"
             "(2) 長辺梁（スパン ly）が受ける荷重分布の形　をそれぞれ答えよ。", h=46)
head(ws, 35, "■ 問題 2  最大荷重強度")
body(ws, 36, f"45°分割では、どちらの梁も最大荷重強度は p = w・lx/2 となる。"
             f"w = {W:.0f} kN/m²、lx = {LX:.0f} m のとき p を求めよ。"
             f"なぜ長辺 ly ではなく短辺 lx で決まるのかも説明せよ。", h=46)
head(ws, 38, "■ 問題 3  各梁の総荷重")
r = tbl(ws, 39, ["梁", "分布形", "総荷重の式", "総荷重（記入）"],
        [["短辺梁（1本）", "三角形", "w・lx²/4", ""],
         ["長辺梁（1本）", "台形", "w・lx(2ly−lx)/4", ""],
         ["合計（4本）", "―", "2×(三角形)+2×(台形)", ""]])
head(ws, r + 2, "■ 問題 4  検算")
body(ws, r + 3, f"問3で求めた4本の梁の総荷重の合計が、スラブ全体の荷重 w・lx・ly "
                f"（= {W:.0f}×{LX:.0f}×{LY:.0f}）と一致することを確認せよ。"
                f"一致することは何を意味するか述べよ。", h=42)
head(ws, r + 5, "■ 問題 5  分担率")
body(ws, r + 6, "スラブ全荷重に対する分担率は、短辺梁1本が 1/(4λ)、長辺梁1本が (2λ−1)/(4λ) で表せる。"
                f"λ = {LAM:.1f} のときの各分担率（%）を求め、合計が100%になることを確認せよ。", h=42)

# ---------- 3 等価等分布荷重 ----------
ws = wb.create_sheet("3 等価等分布荷重"); setup(ws, [8, 16, 18, 16, 14, 14])
title_row(ws, 1, "3  梁設計に用いる等価等分布荷重への換算")
head(ws, 3, "■ 図 3  換算の考え方と辺長比の影響"); put_img(ws, F["equiv"], "A4", w=950)
head(ws, 28, "■ 問題 1  なぜ換算するのか")
body(ws, 29, "三角形・台形のままでも梁の応力は計算できるが、実務では等分布荷重 we に換算することが多い。"
             "その理由を述べよ。また「等価」とは何を一致させているのかを答えよ。", h=42)
head(ws, 31, "■ 問題 2  三角形 → we の誘導")
body(ws, 32, "単純梁（スパン L）に、中央で最大 p となる三角形分布が載るとき、最大曲げは Mmax = p・L²/12 である。"
             "等分布荷重 we による Mmax = we・L²/8 と等置して、we を p で表せ。"
             "さらに p = w・lx/2 を代入して we を w・lx で表せ。", h=52)
head(ws, 34, "■ 問題 3  台形 → we")
body(ws, 35, "台形分布の場合は we = (w・lx/2)・(1 − 1/(3λ²)) となる。"
             f"λ = {LAM:.1f} のときの we を求めよ。", h=36)
head(ws, 37, "■ 問題 4  数値のまとめ")
r = tbl(ws, 38, ["梁", "分布形", "式", "we（記入）"],
        [["短辺梁", "三角形", "w・lx/3", ""],
         ["長辺梁", "台形", "(w・lx/2)(1 − 1/(3λ²))", ""]])
head(ws, r + 2, "■ 問題 5  λ=1 のとき")
body(ws, r + 3, "正方形スラブ（λ = 1）では、台形分布は三角形分布に一致する。"
                "台形の式に λ = 1 を代入して、三角形の式 w・lx/3 と一致することを確かめよ。", h=42)

# ---------- 4 支持条件別の伝達 ----------
ws = wb.create_sheet("4 支持条件別の伝達"); setup(ws, [8, 16, 18, 16, 14, 14])
title_row(ws, 1, "4  支持条件別の荷重伝達")
head(ws, 3, "■ 図 4  一方向スラブと片持ちスラブ"); put_img(ws, F["cases"], "A4", w=950)
head(ws, 28, "■ 問題 1  二辺支持（一方向スラブ）")
body(ws, 29, f"同じスラブ（lx = {LX:.0f} m、w = {W:.0f} kN/m²）を二辺支持（短辺方向に一方向）"
             f"とした場合、長辺梁1本が受ける荷重（kN/m）を求めよ。"
             f"四辺支持として求めた等価等分布荷重 we と比較し、何倍になるか答えよ。", h=52)
head(ws, 31, "■ 問題 2  四辺支持を一方向として扱ってよいか")
body(ws, 32, "梁の設計で、四辺支持スラブをあえて一方向スラブとみなして荷重を拾うことがある。"
             "これは安全側か危険側か、問1の比較結果をもとに答えよ。"
             "また短辺梁の荷重を拾い忘れる危険についても述べよ。", h=46)
head(ws, 34, "■ 問題 3  三辺支持の扱い")
body(ws, 35, "1辺が吹抜けに面する三辺支持スラブでは、自由辺は荷重を負担しない。"
             "その分の荷重はどこへ行くか述べよ。また略算として「自由辺に直交する方向の一方向スラブ」"
             "とみなす扱いが安全側になる理由を説明せよ。", h=46)
head(ws, 37, "■ 問題 4  片持ちスラブと支持梁のねじり")
body(ws, 38, f"出寸法 Lc = {LC} m の片持ちスラブ（w = {W:.0f} kN/m²）について、"
             f"(1) 支持梁に伝わる鉛直荷重（kN/m）　"
             f"(2) 支持梁に生じるねじりモーメント mt = w・Lc²/2（kN・m/m）　を求めよ。"
             f"(3) 四辺支持や一方向スラブでは通常ねじりを考えないのに、"
             f"片持ちスラブでは支持梁のねじりを検討しなければならない理由を述べよ。", h=64)
head(ws, 40, "■ 問題 5  実務上の留意点")
body(ws, 41, "スラブから梁への荷重伝達で間違えやすい点を挙げよ"
             "（支持条件の判断、小梁の有無で分割が変わる、開口・吹抜けの扱い、"
             "片持ち部のねじり、荷重の二重計上・拾い忘れ）。", h=46)
warn(ws, 43, "※ 45°分割法・等価等分布荷重は略算法。一貫計算ソフトの床荷重の扱いとの整合も確認すること。", h=26)

# ---------- 解答 ----------
ws = wb.create_sheet("解答"); setup(ws, [5, 22, 58, 16])
title_row(ws, 1, "解答・解説", span=4); row = 2


def ah(t_):
    global row; head(ws, row, t_, span=4); row += 1


def an(t_, h=None):
    global row; body(ws, row, t_, span=4, ans=True, h=h); row += 1


def aw(t_, h=None):
    global row; warn(ws, row, t_, span=4, h=h); row += 1


ah("1  支持条件の種類")
an("問1：四辺支持＝4辺すべて／二方向／4本の梁に分担（短辺梁は三角形、長辺梁は台形）。"
   "三辺支持＝3辺／主に自由辺と直交する一方向／残り3本の梁に荷重が回り込む。"
   "二辺支持＝対辺2辺／一方向のみ／支持する2本の梁が全荷重を等分。"
   "片持ち＝1辺のみ／一方向のみ／支持梁1本に全荷重＋ねじりが作用する。", h=68)
an("問2：短辺方向のほうがスパンが短く曲げ剛性が高いため、荷重は短辺方向へ流れやすい。"
   "λが大きくなるほど長辺方向の負担は相対的に小さくなり、短辺梁の分担率 1/(4λ) は 0 に近づく。"
   "一般に λ が 2 を超えるあたりから一方向スラブとみなす扱いが用いられる（規準で確認）。", h=60)
an("問3：その辺に大梁・小梁・耐力壁があるか。吹抜け・階段室・大開口に面していないか。"
   "隣接スラブと連続しているか（連続なら実質的に支持されている）。"
   "設計図で梁伏図・スラブ符号・開口位置を確認して判断する。", h=52)
an("問4：三辺支持を四辺支持として計算すると、実際には存在しない支持辺を見込むことになる。"
   "スラブ自身の応力は実際より小さく評価され危険側。"
   "一方、梁へ伝わる荷重は本来3辺に集中するところを4辺に分散させるため、"
   "荷重を受け持つべき梁の荷重を小さく見積もることになり、これも危険側。"
   "つまりスラブ・梁の両方で危険側となるので注意が必要。", h=68)

ah("2  45°分割法")
an("問1：(1) 短辺梁（スパン lx）＝三角形分布。(2) 長辺梁（スパン ly）＝台形分布。"
   "正方形（λ=1）では台形が三角形に退化し、4本とも三角形になる。", h=44)
an(f"問2：p = w・lx/2 = {W:.0f}×{LX:.0f}/2 = {P:.0f} kN/m。"
   "45°線は四隅から引くため、分割領域の高さ（梁から45°線の頂点までの距離）は"
   "短辺の半分 lx/2 で頭打ちになる。長辺側はその高さのまま水平に伸びて台形になるので、"
   "最大強度は短辺 lx だけで決まる。", h=60)
an(f"問3：短辺梁 W = w・lx²/4 = {W:.0f}×{LX:.0f}²/4 = {WT:.0f} kN。"
   f"長辺梁 W = w・lx(2ly−lx)/4 = {W:.0f}×{LX:.0f}×(2×{LY:.0f}−{LX:.0f})/4 = {WZ:.0f} kN。"
   f"合計 = 2×{WT:.0f} + 2×{WZ:.0f} = {2*WT+2*WZ:.0f} kN。", h=52)
an(f"問4：スラブ全荷重 = w・lx・ly = {W:.0f}×{LX:.0f}×{LY:.0f} = {W*LX*LY:.0f} kN。"
   f"問3の合計 {2*WT+2*WZ:.0f} kN と一致する。"
   "これは45°分割がスラブの荷重を過不足なく4本の梁に配分していることを意味し、"
   "荷重の拾い忘れ・二重計上がないことの検算になる。", h=56)
an(f"問5：λ={LAM:.1f} のとき、短辺梁1本 = 1/(4×{LAM:.1f}) = {1/(4*LAM)*100:.1f}%、"
   f"長辺梁1本 = (2×{LAM:.1f}−1)/(4×{LAM:.1f}) = {(2*LAM-1)/(4*LAM)*100:.1f}%。"
   f"合計 = 2×{1/(4*LAM)*100:.1f} + 2×{(2*LAM-1)/(4*LAM)*100:.1f} = 100%。"
   "短辺梁2本で約33%、長辺梁2本で約67%を負担する。", h=56)

ah("3  等価等分布荷重")
an("問1：等分布荷重であれば Mmax = we・L²/8、Q = we・L/2 と単純な式で扱え、"
   "連続梁の計算や一貫計算への入力も容易になるため。"
   "「等価」とは、元の分布荷重と同じ最大曲げモーメントを生じる等分布荷重という意味"
   "（せん断力は厳密には一致しない点に注意）。", h=56)
an("問2：p・L²/12 = we・L²/8 より we = 8p/12 = (2/3)p。"
   f"p = w・lx/2 を代入して we = (2/3)×(w・lx/2) = w・lx/3。"
   f"数値では we = {W:.0f}×{LX:.0f}/3 = {WE_T:.2f} kN/m。", h=48)
an(f"問3：we = (w・lx/2)(1 − 1/(3λ²)) = {P:.0f}×(1 − 1/(3×{LAM**2:.2f}))"
   f" = {P:.0f}×(1 − {1/(3*LAM**2):.4f}) = {WE_Z:.2f} kN/m。", h=40)
an(f"問4：短辺梁 we = {WE_T:.2f} kN/m（三角形）。長辺梁 we = {WE_Z:.2f} kN/m（台形）。"
   "長辺梁のほうが大きいのは、台形のほうが三角形より載荷面積が大きいため。", h=44)
an("問5：λ=1 を代入すると we = (w・lx/2)(1 − 1/3) = (w・lx/2)×(2/3) = w・lx/3 となり、"
   "三角形の式と一致する。正方形では台形の上辺の長さが 0 になり三角形に退化するので、"
   "式の上でも整合している。", h=48)

ah("4  支持条件別の伝達")
an(f"問1：二辺支持ではスラブ荷重を支持する2本の梁が等分するので、"
   f"1本あたり w・lx/2 = {W:.0f}×{LX:.0f}/2 = {W*LX/2:.0f} kN/m（等分布）。"
   f"四辺支持の we = {WE_Z:.2f} kN/m に対し {W*LX/2/WE_Z:.2f} 倍。", h=48)
an("問2：一方向とみなすと長辺梁の荷重は大きく評価されるので、長辺梁については安全側。"
   "ただし短辺梁には荷重を載せないことになるため、短辺梁の設計荷重を拾い忘れると危険側になる。"
   "一方向として扱う場合でも、短辺方向の梁に作用する荷重（スラブ端部の反力や、"
   "そこに載る壁・設備荷重）を別途確認する必要がある。", h=60)
an("問3：自由辺は荷重を負担しないので、その分は残り3辺（特に自由辺と向かい合う辺と、"
   "自由辺に直交する2辺）へ回り込む。略算として「自由辺に直交する方向の一方向スラブ」"
   "とみなすと、自由辺に平行な2辺へ荷重が集中するものとして拾うことになり、"
   "実際より大きめの荷重を見込むため安全側となる。", h=60)
an(f"問4：(1) 鉛直荷重 = w・Lc = {W:.0f}×{LC} = {W*LC:.1f} kN/m。"
   f"(2) mt = w・Lc²/2 = {W:.0f}×{LC}²/2 = {W*LC**2/2:.2f} kN・m/m。"
   "(3) 片持ちスラブは片側にしか荷重がないため、支持梁の材軸まわりに偏心した荷重となり、"
   "釣り合うための相手側がいない。そのためスラブ付け根の曲げが、そのまま支持梁のねじりとして"
   "作用する。両側にスラブがある場合は左右の偏心モーメントが打ち消し合うので、"
   "通常ねじりは問題にならない。", h=76)
an("問5：①支持条件の判断（吹抜け・大開口・小梁の有無）②小梁が入ると分割領域が変わる "
   "③開口部の荷重をどの梁に載せるか ④片持ち部のねじりの見落とし "
   "⑤隣接スラブとの境界で荷重を二重に拾う／拾い忘れる "
   "⑥一貫計算ソフトの床荷重の自動配分と手計算の整合確認。", h=56)
aw("※ 45°分割法・等価等分布荷重は略算法。規準および一貫計算の扱いとの整合を確認すること。", h=26)

XLSX = os.path.join(OUT, "スラブから梁への荷重伝達問題集.xlsx")
wb.save(XLSX)
print("saved:", XLSX)
