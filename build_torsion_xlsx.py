# -*- coding: utf-8 -*-
"""ねじりに対する検討 問題集（図つき）Excel 生成スクリプト。
出力: docs/torsion/ねじり検討問題集.xlsx
1 ねじりを受ける部材の選別 / 2 ねじりモーメントTの算定
3 釣合ねじり・変形適合ねじり / 4 ねじり剛性GJ・Bach式τmax
5 Rausch式・必要鉄筋(軸方向筋・あばら筋) / 6 曲げとねじりの組合せ応力
RC造マンションの設計担当を想定。数値は build 時に検算済み。
"""
import os
import math
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from mpl_toolkits.mplot3d import Axes3D  # noqa
from matplotlib import font_manager as fm

FONT_PATH = "/usr/share/fonts/truetype/fonts-japanese-gothic.ttf"
jp = fm.FontProperties(fname=FONT_PATH)
fm.fontManager.addfont(FONT_PATH)
plt.rcParams["font.family"] = jp.get_name()
plt.rcParams["axes.unicode_minus"] = False

OUT = "docs/torsion"
FIG = os.path.join(OUT, "figures")
os.makedirs(FIG, exist_ok=True)

C_BLUE = "#2a78d6"
C_PINK = "#d55181"


def save(fig, name):
    p = os.path.join(FIG, name)
    fig.savefig(p, dpi=130, bbox_inches="tight")
    plt.close(fig)
    return p


# ===========================================================================
# 図 1: ねじりを受ける部材
# ===========================================================================
def fig_members():
    fig, axes = plt.subplots(1, 3, figsize=(14.5, 4.6))
    # (a) 片持ちスラブを支える大梁
    ax = axes[0]
    ax.add_patch(mpatches.Rectangle((0, 1.5), 0.7, 0.9, fc="#bcd2ea", ec="k",
                                     lw=1.2))  # 梁断面
    ax.add_patch(mpatches.Rectangle((0.7, 1.9), 3.0, 0.2, fc="#cfe0c0",
                                     ec="k", lw=1.0))  # 片持ちスラブ
    for x in np.linspace(1.0, 3.4, 5):
        ax.annotate("", xy=(x, 2.1), xytext=(x, 2.7),
                    arrowprops=dict(arrowstyle="-|>", color="#c00000", lw=1.2))
    ax.text(2.2, 2.9, "床荷重 w", fontproperties=jp, ha="center", fontsize=8.5,
            color="#c00000")
    # ねじりの回転矢印
    ax.annotate("", xy=(0.35, 1.0), xytext=(0.35, 0.5),
                arrowprops=dict(arrowstyle="-|>", color="#7a3b3b", lw=2,
                                connectionstyle="arc3,rad=0.5"))
    ax.text(0.35, 0.15, "ねじり T", fontproperties=jp, ha="center",
            fontsize=9, color="#7a3b3b")
    ax.text(1.8, -0.5, "片持ちスラブ・バルコニーを\n支える大梁（偏心荷重）",
            fontproperties=jp, ha="center", fontsize=9, color="#444")
    ax.set_xlim(-0.4, 3.9); ax.set_ylim(-1.1, 3.2)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(a) 片持ち床を支える大梁", fontproperties=jp,
                 fontsize=10, fontweight="bold")

    # (b) L形梁・段差梁
    ax = axes[1]
    ax.add_patch(mpatches.Rectangle((0.8, 0), 0.8, 2.5, fc="#bcd2ea", ec="k",
                                     lw=1.2))
    ax.add_patch(mpatches.Rectangle((1.6, 0), 1.2, 0.7, fc="#9ec6e8", ec="k",
                                     lw=1.0))
    ax.annotate("", xy=(2.2, 0.9), xytext=(2.2, 1.5),
                arrowprops=dict(arrowstyle="-|>", color="#c00000", lw=1.2))
    ax.text(2.6, 1.2, "偏心\n荷重", fontproperties=jp, fontsize=8,
            color="#c00000")
    ax.text(1.4, -0.6, "L 形・段差梁\n（断面が非対称）", fontproperties=jp,
            ha="center", fontsize=9, color="#444")
    ax.set_xlim(-0.2, 3.4); ax.set_ylim(-1.2, 3.0)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(b) L形・段差梁", fontproperties=jp,
                 fontsize=10, fontweight="bold")

    # (c) 曲がり梁・周辺梁
    ax = axes[2]
    th = np.linspace(0, np.pi / 2, 40)
    R = 2.0
    ax.plot(R * np.cos(th), R * np.sin(th), color="#1f4e79", lw=8,
            solid_capstyle="round", alpha=0.8)
    for a in [0.5, 1.0]:
        ax.annotate("", xy=(R * math.cos(a), R * math.sin(a) - 0.5),
                    xytext=(R * math.cos(a), R * math.sin(a)),
                    arrowprops=dict(arrowstyle="-|>", color="#c00000", lw=1.2))
    ax.text(1.6, 1.6, "曲がり梁\n（平面的に湾曲）", fontproperties=jp,
            fontsize=8.5, color="#444", ha="center")
    ax.text(1.0, -0.6, "曲がり梁・らせん階段梁\n（曲げがねじりを誘発）",
            fontproperties=jp, ha="center", fontsize=9, color="#444")
    ax.set_xlim(-0.3, 2.6); ax.set_ylim(-1.2, 2.4)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(c) 曲がり梁・階段梁", fontproperties=jp,
                 fontsize=10, fontweight="bold")
    fig.suptitle("図 1  ねじりを受ける部材の例",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig1_members.png")


# ===========================================================================
# 図 2: ねじりモーメント T の算定
# ===========================================================================
def fig_torque():
    fig, ax = plt.subplots(figsize=(10, 5.0))
    # 大梁を軸方向に見る（梁は左右に伸びる）
    ax.add_patch(mpatches.Rectangle((0, 1.5), 8, 0.5, fc="#bcd2ea", ec="k",
                                     lw=1.2))
    ax.text(4, 1.75, "大梁（ねじりを受ける）", fontproperties=jp, ha="center",
            fontsize=9, color="#1f4e79")
    # 片持ちスラブ（手前に張り出す＝上から見て偏心）
    ax.add_patch(mpatches.Rectangle((0, 2.0), 8, 0.15, fc="#cfe0c0", ec="k",
                                     lw=0.8))
    # 分布ねじり t = w × e （単位長さあたり）
    for x in np.linspace(0.5, 7.5, 8):
        ax.annotate("", xy=(x, 1.4), xytext=(x, 0.9),
                    arrowprops=dict(arrowstyle="-|>", color="#7a3b3b", lw=1.5,
                                    connectionstyle="arc3,rad=0.4"))
    ax.text(4, 0.4, "分布ねじりモーメント t = w · e（単位長さあたり）",
            fontproperties=jp, ha="center", fontsize=9.5, color="#7a3b3b")
    # 支点反力ねじり
    ax.plot(0, 1.75, "^", color="k", ms=12)
    ax.plot(8, 1.75, "^", color="k", ms=12)
    ax.annotate("端部ねじり T = t·L/2\n（両端の柱・直交梁が受ける）",
                xy=(0, 1.75), xytext=(1.5, 3.2), fontproperties=jp,
                fontsize=9, color="#c00000",
                arrowprops=dict(arrowstyle="->", color="#c00000"))
    # 偏心距離の説明
    ax.annotate("", xy=(6.5, 2.07), xytext=(6.5, 1.75),
                arrowprops=dict(arrowstyle="<|-|>", color="#1f4e79", lw=1))
    ax.text(6.9, 1.9, "偏心 e", fontproperties=jp, fontsize=8.5,
            color="#1f4e79")
    ax.text(4, -0.3,
            "床の反力 w が梁芯から偏心 e の位置に載る → 単位長さに t=w·e のねじり\n"
            "梁全長 L に一様なら、端部ねじり T = t·L/2（梁の中央で 0）",
            fontproperties=jp, ha="center", fontsize=9, color="#444")
    ax.set_xlim(-0.5, 8.8); ax.set_ylim(-0.9, 3.7)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("図 2  ねじりモーメント T の算定（偏心荷重）",
                 fontproperties=jp, fontsize=12, fontweight="bold")
    return save(fig, "fig2_torque.png")


# ===========================================================================
# 図 3: 釣合ねじり vs 変形適合ねじり
# ===========================================================================
def fig_balance():
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 5.0))
    # (a) 釣合ねじり
    ax = axes[0]
    ax.add_patch(mpatches.Rectangle((0, 1.2), 5, 0.5, fc="#bcd2ea", ec="k",
                                     lw=1.2))
    ax.add_patch(mpatches.Rectangle((5, 0), 0.6, 3.0, fc="#d9d9d9", ec="k",
                                     lw=1.2))  # 柱
    # 片持ちスラブ（梁の片側のみ）
    ax.add_patch(mpatches.Rectangle((0, 1.7), 5, 0.15, fc="#cfe0c0", ec="k"))
    for x in np.linspace(0.5, 4.5, 6):
        ax.annotate("", xy=(x, 1.85), xytext=(x, 2.4),
                    arrowprops=dict(arrowstyle="-|>", color="#c00000",
                                    lw=1.2))
    ax.text(2.5, -0.6,
            "片持ちスラブが梁の片側だけ\n→ ねじりに『釣り合う相手がいない』\n"
            "→ 梁のねじり抵抗が無いと崩壊",
            fontproperties=jp, ha="center", fontsize=9, color="#c00000")
    ax.text(2.5, 3.3, "釣合ねじり（静定ねじり）", fontproperties=jp,
            ha="center", fontsize=11, color="#c00000", fontweight="bold")
    ax.set_xlim(-0.4, 6.0); ax.set_ylim(-1.4, 3.7)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(a) 釣合ねじり ── 省略不可",
                 fontproperties=jp, fontsize=10, fontweight="bold")

    # (b) 変形適合ねじり
    ax = axes[1]
    ax.add_patch(mpatches.Rectangle((0, 1.2), 5, 0.5, fc="#bcd2ea", ec="k",
                                     lw=1.2))
    # 両側スラブ（連続）
    ax.add_patch(mpatches.Rectangle((0, 1.7), 5, 0.15, fc="#cfe0c0", ec="k"))
    ax.add_patch(mpatches.Rectangle((0, 1.05), 5, 0.15, fc="#cfe0c0", ec="k"))
    ax.text(2.5, 2.15, "上階側スラブ", fontproperties=jp, ha="center",
            fontsize=7.5, color="#444")
    ax.text(2.5, 0.75, "下階側スラブ（連続）", fontproperties=jp, ha="center",
            fontsize=7.5, color="#444")
    ax.text(2.5, -0.6,
            "スラブが梁の両側に連続\n→ ねじると隣スラブが抵抗（変形が拘束）\n"
            "→ ひび割れ後ねじり剛性が激減、応力が再配分される",
            fontproperties=jp, ha="center", fontsize=9, color="#1f7a1f")
    ax.text(2.5, 3.3, "変形適合ねじり（不静定ねじり）", fontproperties=jp,
            ha="center", fontsize=11, color="#1f7a1f", fontweight="bold")
    ax.set_xlim(-0.4, 5.4); ax.set_ylim(-1.4, 3.7)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(b) 変形適合ねじり ── 低減可",
                 fontproperties=jp, fontsize=10, fontweight="bold")
    fig.suptitle("図 3  釣合ねじり と 変形適合ねじり",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig3_balance.png")


# ===========================================================================
# 図 4: Bach式（長方形断面のねじり応力分布）と GJ
# ===========================================================================
def fig_bach():
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 5.0))
    # (a) 応力分布（短辺中央で最大）
    ax = axes[0]
    b, D = 400, 800
    ax.add_patch(mpatches.Rectangle((0, 0), b, D, fc="#eef3f8", ec="k",
                                     lw=1.2))
    # せん断流（周方向）
    for r in [0.85, 0.55]:
        ax.add_patch(mpatches.Rectangle(
            (b / 2 * (1 - r), D / 2 * (1 - r)), b * r, D * r,
            fc="none", ec="#7a3b3b", lw=1.0, ls="--"))
    # 最大点（長辺の中央＝短辺方向の表面中央）
    ax.plot(b, D / 2, "o", color="#c00000", ms=10, zorder=5)
    ax.plot(0, D / 2, "o", color="#c00000", ms=10, zorder=5)
    ax.annotate("τmax\n（長辺の中央表面）", xy=(b, D / 2), xytext=(b + 90, D / 2),
                fontproperties=jp, fontsize=9, color="#c00000", va="center",
                arrowprops=dict(arrowstyle="->", color="#c00000"))
    ax.plot(b / 2, 0, "s", color="#1f7a1f", ms=8, zorder=5)
    ax.text(b / 2, -70, "隅角部は τ=0", fontproperties=jp, ha="center",
            fontsize=8, color="#1f7a1f")
    ax.annotate("", xy=(-60, 0), xytext=(-60, D),
                arrowprops=dict(arrowstyle="<|-|>", color="k", lw=1))
    ax.text(-110, D / 2, "D=800", fontproperties=jp, rotation=90,
            va="center", fontsize=9)
    ax.annotate("", xy=(0, D + 50), xytext=(b, D + 50),
                arrowprops=dict(arrowstyle="<|-|>", color="k", lw=1))
    ax.text(b / 2, D + 90, "b=400", fontproperties=jp, ha="center", fontsize=9)
    ax.set_xlim(-180, b + 260); ax.set_ylim(-130, D + 150)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(a) 長方形断面のねじり応力（Bach）",
                 fontproperties=jp, fontsize=10, fontweight="bold")

    # (b) 式まとめ
    ax = axes[1]
    ax.text(0.5, 0.92, "Bach 式（弾性・長方形断面）", transform=ax.transAxes,
            ha="center", fontproperties=jp, fontsize=12, fontweight="bold",
            color="#1f4e79")
    ax.text(0.5, 0.72, "τmax = T / (α · b² · D)", transform=ax.transAxes,
            ha="center", fontproperties=jp, fontsize=15, color="#c00000",
            fontweight="bold")
    ax.text(0.5, 0.5,
            "ねじり定数 J = β · b³ · D、 剛性 GJ\n"
            "α・β は 長辺/短辺 比 (D/b) で決まる係数",
            transform=ax.transAxes, ha="center", fontproperties=jp,
            fontsize=10, color="#333")
    # 係数表
    tbl = ("D/b :  1.0    1.5    2.0    3.0    ∞\n"
           " α  : 0.208  0.231  0.246  0.267  0.333\n"
           " β  : 0.141  0.196  0.229  0.263  0.333")
    ax.text(0.5, 0.24, tbl, transform=ax.transAxes, ha="center",
            fontproperties=jp, fontsize=9.5, color="#1f4e79",
            family="monospace")
    ax.text(0.5, 0.04,
            "特性：τmax は長辺の中央表面で最大、隅角部で 0。薄く長いほど不利。",
            transform=ax.transAxes, ha="center", fontproperties=jp,
            fontsize=8.5, color="#7a3b3b")
    ax.axis("off")
    ax.set_title("(b) Bach 式と係数表", fontproperties=jp,
                 fontsize=10, fontweight="bold")
    fig.suptitle("図 4  ねじり剛性 GJ と Bach 式による τmax",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig4_bach.png")


# ===========================================================================
# 図 5: Rausch式（立体トラス）
# ===========================================================================
def fig_rausch():
    fig = plt.figure(figsize=(13.5, 5.2))
    # (a) 立体トラスの概念（3D 風）
    ax = fig.add_subplot(1, 2, 1, projection="3d")
    b, D, L = 1.0, 1.6, 3.0
    # 角の柱（軸方向筋）
    corners = [(0, 0), (b, 0), (b, D), (0, D)]
    for (x, y) in corners:
        ax.plot([x, x], [y, y], [0, L], color="#1f4e79", lw=2.5)
    # あばら筋（閉じたフープ）
    for z in np.linspace(0.3, L - 0.3, 5):
        xs = [0, b, b, 0, 0]
        ys = [0, 0, D, D, 0]
        ax.plot(xs, ys, [z] * 5, color="#c00000", lw=1.5)
    # 斜めコンクリート圧縮ストラット
    for i, z in enumerate(np.linspace(0.3, L - 0.9, 4)):
        ax.plot([0, b], [0, 0], [z, z + 0.6], color="#f4a261", lw=2,
                alpha=0.7)
    ax.text(b / 2, D / 2, L + 0.4, "ねじり T", fontproperties=jp,
            ha="center", fontsize=9, color="#7a3b3b")
    ax.set_box_aspect((b, D, L))
    ax.axis("off")
    ax.view_init(elev=18, azim=-60)
    ax.set_title("(a) Rausch の立体トラス", fontproperties=jp,
                 fontsize=10, fontweight="bold")

    # (b) 式まとめ
    ax = fig.add_subplot(1, 2, 2)
    ax.text(0.5, 0.93, "Rausch 式（立体トラス理論）", transform=ax.transAxes,
            ha="center", fontproperties=jp, fontsize=12, fontweight="bold",
            color="#1f4e79")
    ax.text(0.5, 0.74, "T = 2 · A0 · (Aw · fw / s)", transform=ax.transAxes,
            ha="center", fontproperties=jp, fontsize=14, color="#c00000",
            fontweight="bold")
    ax.text(0.5, 0.52,
            "A0：あばら筋芯で囲む閉断面積（x1·y1）\n"
            "Aw：あばら筋 1 本の断面積、s：ピッチ、fw：許容応力度\n\n"
            "必要あばら筋：Aw/s = T / (2·A0·fw)\n"
            "必要軸方向筋：Al = (Aw/s) · u0  （u0：閉断面の周長）",
            transform=ax.transAxes, ha="center", fontproperties=jp,
            fontsize=9.5, color="#333")
    ax.text(0.5, 0.12,
            "特性：あばら筋（フープ）と軸方向筋（4 隅＋周囲）を\n"
            "セットで配置して初めてねじりに抵抗（片方だけでは不可）",
            transform=ax.transAxes, ha="center", fontproperties=jp,
            fontsize=8.5, color="#7a3b3b")
    ax.axis("off")
    ax.set_title("(b) Rausch 式と必要鉄筋", fontproperties=jp,
                 fontsize=10, fontweight="bold")
    fig.suptitle("図 5  Rausch 式 ── ねじりの必要鉄筋（軸方向筋・あばら筋）",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig5_rausch.png")


# ===========================================================================
# 図 6: 曲げ＋ねじりの組合せ
# ===========================================================================
def fig_combined():
    fig, axes = plt.subplots(1, 3, figsize=(14, 4.4))
    b, D = 400, 800
    titles = ["曲げせん断 τv", "ねじり τt", "合成 τ = τv + τt"]
    for k, (ax, ttl) in enumerate(zip(axes, titles)):
        ax.add_patch(mpatches.Rectangle((0, 0), b, D, fc="#eef3f8", ec="k",
                                         lw=1.0))
        if k == 0:
            # 曲げせん断：全面ほぼ一様（放物線）→ 片側矢印
            for y in np.linspace(60, D - 60, 6):
                ax.annotate("", xy=(b * 0.7, y), xytext=(b * 0.3, y),
                            arrowprops=dict(arrowstyle="-|>", color=C_BLUE,
                                            lw=1.2))
            ax.text(b / 2, -70, "0.47 N/mm²", fontproperties=jp, ha="center",
                    fontsize=9, color=C_BLUE)
        elif k == 1:
            # ねじり：周方向（左右で逆向き）
            for y in np.linspace(60, D - 60, 6):
                ax.annotate("", xy=(60, y), xytext=(20, y),
                            arrowprops=dict(arrowstyle="-|>", color="#7a3b3b",
                                            lw=1.0))
                ax.annotate("", xy=(b - 20, y), xytext=(b - 60, y),
                            arrowprops=dict(arrowstyle="-|>", color="#7a3b3b",
                                            lw=1.0))
            ax.text(b / 2, -70, "1.27 N/mm²", fontproperties=jp, ha="center",
                    fontsize=9, color="#7a3b3b")
        else:
            # 合成：片側で加算（大）、反対側で相殺
            ax.add_patch(mpatches.Rectangle((0, 0), 40, D, fc="#c00000",
                                            alpha=0.3))
            ax.text(b / 2, D / 2, "片側で\n最大", fontproperties=jp,
                    ha="center", va="center", fontsize=9, color="#c00000")
            ax.text(b / 2, -70, "1.74 N/mm²", fontproperties=jp, ha="center",
                    fontsize=9, color="#c00000", fontweight="bold")
        ax.set_xlim(-40, b + 40); ax.set_ylim(-140, D + 40)
        ax.set_aspect("equal"); ax.axis("off")
        ax.set_title(ttl, fontproperties=jp, fontsize=10, fontweight="bold")
    fig.suptitle("図 6  曲げ（せん断）とねじりの組合せ応力 ── 片側の表面で足し合わさる",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig6_combined.png")


figs = {
    "members": fig_members(),
    "torque": fig_torque(),
    "balance": fig_balance(),
    "bach": fig_bach(),
    "rausch": fig_rausch(),
    "combined": fig_combined(),
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
title_row(ws, 1, "ねじりに対する検討 問題集（構造設計部・新人向け）", span=4)
body(ws, 2,
     "目標：RC 部材のねじりに対する検討ができること。ねじりを受ける部材の選別から、"
     "ねじりモーメント T の算定、釣合／変形適合ねじりの区別、ねじり剛性 GJ・Bach 式の"
     "τmax、Rausch 式の必要鉄筋、曲げとの組合せまでを通す。片持ちスラブを支える大梁を想定。",
     span=4, h=44)
r = table(ws, 4,
          ["No.", "シート", "到達目標", "図"],
          [["1", "1 部材の選別", "ねじりを受ける部材を選別できる", "部材例"],
           ["2", "2 T の算定", "ねじりモーメント T を算定できる", "偏心荷重"],
           ["3", "3 釣合/変形適合", "釣合・変形適合ねじりを説明できる", "2 種の比較"],
           ["4", "4 GJ・Bach式", "GJ・ねじり応力度 τmax を計算できる", "応力分布"],
           ["5", "5 Rausch式", "必要軸方向筋・あばら筋を算定できる", "立体トラス"],
           ["6", "6 曲げとの組合せ", "曲げ＋ねじりの組合せ応力を検討できる", "応力の重ね"]])
body(ws, r + 2,
     "共通モデル：長方形断面 b=400×D=800 の大梁（片持ちスラブを支える）。"
     "T=40 kN·m、Ec=20,500・ν=0.2（G=8,542）、SD295。"
     "係数 α・β は D/b で決まる（本教材は D/b=2.0：α=0.246、β=0.229）。"
     "式は弾性理論（Bach）＋立体トラス（Rausch）の代表形。実務は RC 規準・"
     "靭性指針で確認すること。",
     span=4, h=58)

# ---- 1 部材の選別 ----
ws = wb.create_sheet("1 部材の選別")
setup(ws, [8, 18, 18, 16, 12, 12])
title_row(ws, 1, "1  ねじりを受ける部材の選別")
head(ws, 3, "■ 図 1  ねじりを受ける部材の例")
put_img(ws, figs["members"], "A4", w=820)
head(ws, 26, "■ 問題 1  ねじりが生じる条件")
body(ws, 27, "部材にねじりが生じる基本条件を答えよ（荷重の作用線が部材のせん断中心"
             "（≒図心）から偏心している）。次の各部材でねじりの有無を判定せよ。", h=32)
r = table(ws, 29,
          ["No.", "部材", "ねじり有無（記入）", "理由（記入）"],
          [["(1)", "両側に対称にスラブが載る中間大梁", "", ""],
           ["(2)", "片持ちバルコニーを片側だけ支える大梁", "", ""],
           ["(3)", "らせん階段の曲がり梁", "", ""],
           ["(4)", "L 形（段差付き）断面の梁", "", ""],
           ["(5)", "外周梁（外壁側に庇・手摺が偏心）", "", ""]])
head(ws, r + 2, "■ 問題 2  なぜ両側対称だとねじりが小さいか")
body(ws, r + 3, "中間大梁で左右のスラブ荷重が対称なら、ねじりが打ち消される理由を"
                "1 行で。逆に片側だけ／荷重差があるとねじりが残る。", h=32)
head(ws, r + 5, "■ 問題 3  マンションでのねじり部材")
body(ws, r + 6, "RC マンションでねじり検討が要る代表部位を 3 つ挙げよ"
                "（片持ちバルコニーを支える外周大梁／片持ち庇のある梁／"
                "エレベーター周りの段差梁 等）。", h=40)

# ---- 2 T の算定 ----
ws = wb.create_sheet("2 Tの算定")
setup(ws, [8, 18, 18, 16, 12, 12])
title_row(ws, 1, "2  ねじりモーメント T の算定")
head(ws, 3, "■ 図 2  偏心荷重によるねじり")
put_img(ws, figs["torque"], "A4", w=780)
head(ws, 28, "■ 問題 1  分布ねじりと端部ねじり")
body(ws, 29, "片持ちスラブの反力 w=15 kN/m が、大梁芯から偏心 e=1.0m の位置に載る。"
             "(1) 単位長さあたりの分布ねじり t を求めよ（t=w·e）。"
             "(2) 梁スパン L=6m のとき、端部ねじりモーメント T を求めよ（T=t·L/2）。",
     h=44)
r = table(ws, 32,
          ["項目", "式", "値（記入）"],
          [["分布ねじり t", "w · e = 15 × 1.0", ""],
           ["端部ねじり T", "t · L / 2 = t × 6 / 2", ""]])
head(ws, r + 2, "■ 問題 2  ねじりの分布")
body(ws, r + 3, "一様分布ねじり t が両端で対称に支持される梁では、ねじりモーメント図は"
                "どんな形か（端部で最大 ±t·L/2、中央で 0 の直線）。曲げの Q 図と似ている"
                "ことを確認せよ。", h=40)
head(ws, r + 5, "■ 問題 3  集中ねじり")
body(ws, r + 6, "梁の途中に片持ち小梁が取り付き、その反力 P=30kN が偏心 e=0.8m の"
                "位置に載る。集中ねじり T=P·e を求めよ。集中ねじりは取り付き点で"
                "ねじりモーメントが段状に変化することも述べよ。", h=40)
head(ws, r + 8, "■ 問題 4  ねじりの伝達先")
body(ws, r + 9, "梁のねじりモーメントは最終的にどこへ伝わるか"
                "（端部の柱・直交梁の曲げ／ねじりへ）。柱・直交梁側でも"
                "この反力ねじりを受ける設計が要ることを述べよ。", h=40)

# ---- 3 釣合/変形適合 ----
ws = wb.create_sheet("3 釣合変形適合")
setup(ws, [8, 18, 18, 16, 12, 12])
title_row(ws, 1, "3  釣合ねじり と 変形適合ねじり")
head(ws, 3, "■ 図 3  2 種類のねじり")
put_img(ws, figs["balance"], "A4", w=820)
head(ws, 30, "■ 問題 1  定義")
body(ws, 31, "(1) 釣合ねじり（静定ねじり）とは何か。省略できない理由を、"
             "力の釣り合いの観点から説明せよ（他に抵抗する要素がない）。", h=40)
body(ws, 32, "(2) 変形適合ねじり（不静定ねじり）とは何か。低減できる理由を、"
             "ひび割れ後のねじり剛性低下と応力再配分の観点から説明せよ。", h=40)
head(ws, 34, "■ 問題 2  判別")
r = table(ws, 35,
          ["No.", "状況", "釣合/変形適合（記入）"],
          [["(1)", "片持ちバルコニーを片側だけ支える外周梁", ""],
           ["(2)", "両側に連続スラブが載る中間大梁の微小なねじり", ""],
           ["(3)", "片持ち庇（キャノピー）を支える梁", ""],
           ["(4)", "直交する小梁が片側に取り付く大梁（スラブは両側連続）", ""]])
head(ws, r + 2, "■ 問題 3  設計方針の違い")
body(ws, r + 3, "釣合ねじりと変形適合ねじりで、設計上の扱いがどう違うか。"
                "(a) 釣合＝ねじりに対して確実に鉄筋で抵抗（省略不可）。"
                "(b) 変形適合＝ひび割れ発生ねじり以下に抑える／最小補強で対応。"
                "それぞれ 1 行で補足せよ。", h=44)
head(ws, r + 5, "■ 問題 4  なぜ区別が重要か")
body(ws, r + 6, "変形適合ねじりを『釣合ねじり』と誤って全ねじりに鉄筋設計すると"
                "どうなるか（過大・不経済）。逆に釣合ねじりを見落とすと（崩壊）。"
                "区別の重要性を述べよ。", h=44)

# ---- 4 GJ・Bach ----
ws = wb.create_sheet("4 GJ・Bach式")
setup(ws, [8, 18, 16, 14, 14, 12, 12])
title_row(ws, 1, "4  ねじり剛性 GJ と Bach 式による τmax")
head(ws, 3, "■ 図 4  ねじり応力分布と Bach 式")
put_img(ws, figs["bach"], "A4", w=820)
head(ws, 30, "■ 問題 1  ねじり定数 J とねじり剛性 GJ")
body(ws, 31, "b=400×D=800（D/b=2.0）。J=β·b³·D（β=0.229）、G=Ec/(2(1+ν))。"
             "Ec=20,500、ν=0.2 として J・G・GJ を求めよ。", h=32)
r = table(ws, 34,
          ["項目", "式", "値（記入）"],
          [["G", "Ec/(2(1+ν))=20500/2.4", ""],
           ["J", "0.229×400³×800", ""],
           ["GJ", "G × J", ""]])
head(ws, r + 2, "■ 問題 2  Bach 式で τmax")
body(ws, r + 3, "ねじり T=40 kN·m のとき、τmax=T/(α·b²·D)（α=0.246）を求めよ。",
     h=22)
r = table(ws, r + 5,
          ["項目", "式", "値（記入）"],
          [["τmax", "40×10⁶/(0.246×400²×800)", ""]])
head(ws, r + 2, "■ 問題 3  Bach 式の特性")
body(ws, r + 3, "(1) τmax はどの位置で最大になるか（長辺の中央表面）、"
                "どこで 0 か（隅角部）。(2) 同じ断面積でも『薄く長い』断面ほど"
                "ねじりに弱い理由を述べよ（α が 1/3 に近づき τmax 増、"
                "J が小さくねじれやすい）。", h=44)
head(ws, r + 5, "■ 問題 4  ねじれ角")
body(ws, r + 6, "ねじれ角 θ = T·L /(G·J)。L=6m の梁全体のねじれ角を求めよ"
                "（T=40kN·m、GJ は問題 1 の値）。過大なねじれ変形は"
                "スラブのひび割れ・仕上げ不具合の原因になることも述べよ。", h=44)

# ---- 5 Rausch ----
ws = wb.create_sheet("5 Rausch式")
setup(ws, [8, 18, 16, 14, 14, 12, 12])
title_row(ws, 1, "5  Rausch 式 ── 必要軸方向筋・あばら筋")
head(ws, 3, "■ 図 5  立体トラスと Rausch 式")
put_img(ws, figs["rausch"], "A4", w=820)
head(ws, 30, "■ 問題 1  立体トラスの理解")
body(ws, 31, "ねじりを受ける RC 部材は、ひび割れ後『立体トラス』として抵抗する。"
             "トラスの構成要素を答えよ（斜めコンクリート圧縮ストラット／"
             "あばら筋（引張フープ）／軸方向筋（4 隅＋周囲の引張材））。"
             "あばら筋だけ・軸方向筋だけでは抵抗できない理由も述べよ。", h=44)
head(ws, 33, "■ 問題 2  必要あばら筋")
body(ws, 34, "T=40 kN·m、かぶり 50mm → あばら筋芯 x1=300・y1=700、"
             "閉断面積 A0=x1·y1、fw=295。必要あばら筋 Aw/s=T/(2·A0·fw) を求めよ。",
     h=32)
r = table(ws, 37,
          ["項目", "式", "値（記入）"],
          [["A0", "300×700", ""],
           ["Aw/s", "40×10⁶/(2×A0×295)", ""],
           ["s=150 の必要 aw", "(Aw/s)×150", ""],
           ["採用（D10 2脚=142 等）", "", ""]])
head(ws, r + 2, "■ 問題 3  必要軸方向筋")
body(ws, r + 3, "閉断面の周長 u0=2(x1+y1)。必要軸方向筋 Al=(Aw/s)·u0 を求め、"
                "配筋（D13 何本相当か）を検討せよ。軸方向筋は 4 隅と各辺に"
                "分散配置することも述べよ。", h=40)
r = table(ws, r + 6,
          ["項目", "式", "値（記入）"],
          [["u0", "2×(300+700)", ""],
           ["Al", "(Aw/s)×u0", ""],
           ["配筋（D13=127）", "Al/127 本", ""]])
head(ws, r + 2, "■ 問題 4  Rausch 式の特性と配筋ルール")
body(ws, r + 3, "(1) Rausch 式は薄肉閉断面（中空管）の理論で、中実断面では"
                "外周部だけがねじりに効くとみなす。この考え方を 1 行で。"
                "(2) ねじり用あばら筋は『閉じたフープ（135°フック）』でなければ"
                "ならない理由。(3) ねじり筋は曲げ・せん断用の鉄筋に『加算』して"
                "配筋することも述べよ。", h=58)

# ---- 6 曲げとの組合せ ----
ws = wb.create_sheet("6 曲げとの組合せ")
setup(ws, [8, 18, 16, 14, 14, 12, 12])
title_row(ws, 1, "6  曲げ（せん断）とねじりの組合せ応力")
head(ws, 3, "■ 図 6  組合せ応力（片側の表面で加算）")
put_img(ws, figs["combined"], "A4", w=820)
head(ws, 28, "■ 問題 1  せん断応力の重ね合わせ")
body(ws, 29, "曲げによるせん断 τv とねじりによる τt は、断面の片側の表面では"
             "同じ向きになり足し合わさる。反対側では逆向きで相殺する。"
             "τv=0.47、τt=1.27 のとき、最大となる側の合成 τ を求めよ。", h=44)
r = table(ws, 32,
          ["項目", "値（記入）"],
          [["曲げせん断 τv = Q/(b·j)", "0.47"],
           ["ねじり τt = τmax", "1.27"],
           ["合成 τ（加算側）", ""],
           ["相殺側 τ", ""]])
head(ws, r + 2, "■ 問題 2  許容応力度との比較")
body(ws, r + 3, "合成 τ をコンクリートの許容せん断応力度と比較する。"
                "τ が許容以下ならコンクリートで負担、超える分は鉄筋（ねじり用"
                "あばら筋＋せん断補強筋）で負担する、という流れを説明せよ。", h=44)
head(ws, r + 5, "■ 問題 3  鉄筋量の合算")
body(ws, r + 6, "同じあばら筋が『せん断用』と『ねじり用』を兼ねる場合、"
                "必要量はどう合算するか（せん断用 Aw/s ＋ ねじり用 Aw/s を"
                "加算した量を配置）。軸方向筋も曲げ用主筋＋ねじり用軸方向筋を"
                "加算する考え方を述べよ。", h=44)
head(ws, r + 8, "■ 問題 4  実務チェック")
body(ws, r + 9, "ねじりを受ける梁の配筋で確認する項目を 4 つ挙げよ："
                "①あばら筋が閉フープ（135°フック）か ②ねじり用軸方向筋を"
                "四隅＋周囲に配したか ③せん断＋ねじりの合算量を満たすか "
                "④釣合ねじりか変形適合ねじりかの判定。", h=44)

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


ah("1  部材の選別")
an("問1：ねじりは荷重の作用線が部材のせん断中心（≒図心）から偏心すると生じる。"
   "(1)無し（左右対称で打ち消す）(2)有り（片側偏心）(3)有り（曲げがねじりを誘発）"
   "(4)有り（非対称断面）(5)有り（庇・手摺の偏心）。", h=58)
an("問2：左右のスラブ荷重が対称なら、両側の偏心モーメントが逆向きで相殺され"
   "正味ねじりがほぼ 0。片側だけ・荷重差があると差分が残ってねじりになる。", h=40)
an("問3：①片持ちバルコニーを支える外周大梁 ②片持ち庇・キャノピーのある梁 "
   "③EV・段差まわりの L 形梁。マンションはバルコニー外周梁が代表例。", h=40)

ah("2  T の算定")
an("問1：(1)t=w·e=15×1.0=15 kN·m/m。(2)T=t·L/2=15×6/2=45 kN·m。", h=32)
an("問2：一様分布ねじりのねじりモーメント図は、両端で ±t·L/2、中央で 0 の直線"
   "（曲げの Q 図＝せん断力図と同じ形）。ねじりも『分布荷重を積分した図』になる。",
   h=44)
an("問3：集中ねじり T=P·e=30×0.8=24 kN·m。取り付き点でねじりモーメント図が"
   "段状（不連続）に変化する（集中荷重で Q 図が段変化するのと同じ）。", h=40)
an("問4：梁のねじりは端部の柱の曲げ・ねじり、または直交梁の曲げへ伝わる。"
   "受け側（柱・直交梁）もこの反力ねじり・曲げに耐える設計が必要"
   "（ねじりは『伝達先』まで追う）。", h=44)

ah("3  釣合/変形適合")
an("問1：(1)釣合ねじり＝外力ねじりに釣り合う他の要素がなく、その部材のねじり抵抗が"
   "なければ静的に成立しない（崩壊）。よって省略不可、全ねじりを鉄筋で負担。"
   "(2)変形適合ねじり＝隣接部材（連続スラブ等）が変形を拘束することで生じる不静定な"
   "ねじり。ひび割れでねじり剛性が激減すると応力が曲げ側へ再配分されるため低減できる。",
   h=72)
an("問2：(1)釣合ねじり (2)変形適合ねじり (3)釣合ねじり (4)変形適合ねじり。"
   "『片持ちで釣り合う相手がいない＝釣合』『両側連続で拘束＝変形適合』が判別の勘所。",
   h=44)
an("問3：(a)釣合＝ねじりに対し確実に閉フープ＋軸方向筋で全ねじりを負担（省略不可）。"
   "(b)変形適合＝ひび割れ発生ねじり Tcr 以下に収まれば最小補強でよい／剛性低減を"
   "見込んで応力再配分を考慮。", h=44)
an("問4：変形適合を釣合と誤ると全ねじりに鉄筋設計＝過大・不経済。"
   "釣合を見落とすとねじり抵抗不足で脆性的に崩壊。両者の区別が安全性と経済性の"
   "分かれ目。", h=44)

ah("4  GJ・Bach 式")
an("問1：G=20500/2.4=8,542 N/mm²。J=0.229×400³×800=0.229×6.4×10⁷×800="
   "1.172×10¹⁰ mm⁴。GJ=8,542×1.172×10¹⁰=1.00×10¹⁴ N·mm²（≒100×10¹²）。", h=44)
an("問2：τmax=40×10⁶/(0.246×160,000×800)=40×10⁶/(3.15×10⁷)=1.27 N/mm²。", h=32)
an("問3：(1)長辺の中央表面で最大、隅角部で 0。(2)薄く長い断面は α が 1/3 に近づき"
   "τmax が大きく、かつ J が小さくてねじれやすい。ねじりには『ずんぐりした』"
   "断面（正方形に近い）が有利。", h=44)
an("問4：θ=T·L/(GJ)=40×10⁶×6000/(1.00×10¹⁴)=2.4×10⁻³ rad（≒0.14°）。"
   "微小だが、過大なねじれ変形はスラブ端のひび割れ・タイル/仕上げの割れを招く。",
   h=44)

ah("5  Rausch 式")
an("問1：立体トラス＝①斜めコンクリート圧縮ストラット ②あばら筋（引張フープ・輪方向）"
   "③軸方向筋（4 隅＋周囲の引張材）。ねじりは斜めひび割れを生じ、これに"
   "フープと軸方向筋の両方で抵抗する立体トラスを形成する。どちらか一方では"
   "トラスが閉じず抵抗できない。", h=58)
an("問2：A0=300×700=210,000 mm²。Aw/s=40×10⁶/(2×210,000×295)="
   "40×10⁶/(1.239×10⁸)=0.323 mm²/mm（=323 mm²/m）。"
   "s=150→必要 aw=48.4 mm²/組 → D10（2 脚=142）で十分（あき・最小径に注意）。",
   h=58)
an("問3：u0=2×(300+700)=2,000 mm。Al=0.323×2,000=646 mm²。"
   "D13（127）×5.1→6 本相当、または D16（199）×3.2→4 本。"
   "四隅と各辺に分散配置（周囲に回す）。", h=44)
an("問4：(1)ねじりは外周のせん断流が抵抗するので、中実断面でも外周の薄肉閉断面"
   "だけが効くとみなす（Rausch）。(2)ねじりは全周にせん断流が回るので、"
   "閉じたフープ（135°フックで確実に閉合）でないと引張を伝えられない。"
   "(3)ねじり用鉄筋は曲げ・せん断用とは別に必要量を『加算』して配筋する。", h=58)

ah("6  曲げとの組合せ")
an("問1：加算側 τ=τv+τt=0.47+1.27=1.74 N/mm²。相殺側 τ=|1.27−0.47|=0.80 N/mm²。"
   "片側の表面で最大になるので、その側で照査する。", h=44)
an("問2：合成 τ をコンクリートの許容せん断応力度 fs と比較。τ≦fs なら"
   "コンクリートで負担（最小補強）。τ>fs なら超過分を鉄筋（ねじり用閉フープ＋"
   "せん断補強筋）で負担する。", h=44)
an("問3：同じあばら筋がせん断とねじりを兼ねる場合、必要 Aw/s は"
   "『せん断用 Aw/s ＋ ねじり用 Aw/s』を加算した量を配置する。"
   "軸方向筋も『曲げ用主筋 ＋ ねじり用軸方向筋』を加算。ねじりは"
   "既存鉄筋に上乗せ、が基本。", h=44)
an("問4：①あばら筋が閉フープ（135°フック）か ②ねじり用軸方向筋を四隅＋周囲に"
   "配したか ③せん断＋ねじりの合算量を満たすか ④釣合／変形適合の判定"
   "（釣合なら省略不可）。", h=44)

XLSX = os.path.join(OUT, "ねじり検討問題集.xlsx")
wb.save(XLSX)
print("saved:", XLSX)
