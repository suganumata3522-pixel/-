# -*- coding: utf-8 -*-
"""擁壁の設計 問題集（No.3-1〜3-6）の図を生成する。
出力: docs/retaining_wall_design/figures/*.png
"""
import os
import math
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib import font_manager as fm

FONT = "/usr/share/fonts/truetype/fonts-japanese-gothic.ttf"
jp = fm.FontProperties(fname=FONT); fm.fontManager.addfont(FONT)
plt.rcParams["font.family"] = jp.get_name(); plt.rcParams["axes.unicode_minus"] = False
FIG = "docs/retaining_wall_design/figures"; os.makedirs(FIG, exist_ok=True)

SOIL = "#e8dcc0"; CONC = "#d0d0d0"; RED = "#c00000"; BLU = "#2a78d6"; GRN = "#548235"

# 設計例の諸元
H, T, TF, B = 3.0, 0.25, 0.40, 2.20
HS, LH = H - TF, B - T


def save(fig, n):
    p = os.path.join(FIG, n); fig.savefig(p, dpi=130, bbox_inches="tight"); plt.close(fig)
    print("fig:", p); return p


def hatch_ground(ax, x0, x1, y, n=9):
    for x in np.linspace(x0, x1, n):
        ax.plot([x, x - 0.12], [y, y - 0.16], color="#8B5A2B", lw=0.8)


# ============ 図1  擁壁の種類 ============
def fig_types():
    fig, axes = plt.subplots(1, 5, figsize=(15.5, 4.6))
    specs = [
        ("(a) 重力式", "自重のみで抵抗\n無筋・小規模向\nH<=3m 程度",
         [[0, 0], [1.9, 0], [1.35, 3.0], [0.75, 3.0]]),
        ("(b) もたれ式", "背面地山に\nもたれて抵抗\n切土部で有利",
         [[0, 0], [1.5, 0], [2.5, 3.0], [2.0, 3.0]]),
        ("(c) L型（片持ち梁式）", "かかと版上の\n土の重量を利用\n前面に用地不要",
         None),
        ("(d) 逆T型", "つま先版・かかと版\n両側に張出し\n最も一般的",
         None),
        ("(e) 控え壁式", "控え壁で竪壁を\n補強・高擁壁向\nH>6m 程度",
         None),
    ]
    for ax, (title, note, poly) in zip(axes, specs):
        if poly:
            ax.add_patch(mpatches.Polygon(poly, fc=CONC, ec="k", lw=1.4))
            ax.add_patch(mpatches.Polygon(
                [[poly[2][0], 3.0], [4.0, 3.0], [4.0, 0], [poly[1][0], 0]], fc=SOIL, ec="none"))
        elif "L型" in title:
            ax.add_patch(mpatches.Rectangle((0, 0), 2.2, 0.4, fc=CONC, ec="k", lw=1.4))
            ax.add_patch(mpatches.Rectangle((0, 0.4), 0.25, 2.6, fc=CONC, ec="k", lw=1.4))
            ax.add_patch(mpatches.Rectangle((0.25, 0.4), 1.95, 2.6, fc=SOIL, ec="none"))
            ax.annotate("かかと版上の土", xy=(1.2, 1.8), xytext=(1.0, 3.5),
                        fontproperties=jp, fontsize=7.5, color=RED, ha="center",
                        arrowprops=dict(arrowstyle="->", color=RED))
        elif "逆T型" in title:
            ax.add_patch(mpatches.Rectangle((0, 0), 2.6, 0.4, fc=CONC, ec="k", lw=1.4))
            ax.add_patch(mpatches.Rectangle((0.6, 0.4), 0.25, 2.6, fc=CONC, ec="k", lw=1.4))
            ax.add_patch(mpatches.Rectangle((0.85, 0.4), 1.75, 2.6, fc=SOIL, ec="none"))
            ax.annotate("つま先版", xy=(0.3, 0.2), xytext=(-0.5, -0.75),
                        fontproperties=jp, fontsize=7.5, color=BLU,
                        arrowprops=dict(arrowstyle="->", color=BLU))
        else:
            ax.add_patch(mpatches.Rectangle((0, 0), 2.6, 0.4, fc=CONC, ec="k", lw=1.4))
            ax.add_patch(mpatches.Rectangle((0.6, 0.4), 0.25, 2.6, fc=CONC, ec="k", lw=1.4))
            ax.add_patch(mpatches.Polygon([[0.85, 0.4], [0.85, 2.4], [1.9, 0.4]],
                         fc="#b8b8b8", ec="k", lw=1.1))
            ax.add_patch(mpatches.Rectangle((0.85, 0.4), 1.75, 2.6, fc=SOIL, ec="none", alpha=0.5))
            ax.annotate("控え壁", xy=(1.2, 1.2), xytext=(1.9, 2.6),
                        fontproperties=jp, fontsize=7.5, color=GRN,
                        arrowprops=dict(arrowstyle="->", color=GRN))
        hatch_ground(ax, -0.35, 4.0, 0)
        ax.plot([-0.4, 4.1], [0, 0], color="#8B5A2B", lw=1.2)
        ax.text(1.9, -1.35, note, ha="center", va="top", fontproperties=jp, fontsize=7.8, color="#333")
        ax.set_xlim(-0.6, 4.2); ax.set_ylim(-2.6, 4.3)
        ax.set_aspect("equal"); ax.axis("off")
        ax.set_title(title, fontproperties=jp, fontsize=9.5, fontweight="bold")
    fig.suptitle("図 1  擁壁の種類と抵抗機構", fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig1_types.png")


# ============ 図2  土圧の選別 ============
def fig_earth_pressure():
    fig, axes = plt.subplots(1, 3, figsize=(15.0, 4.8),
                             gridspec_kw={"width_ratios": [1.15, 1.0, 1.0]})
    # (a) 変位と土圧係数
    ax = axes[0]
    d = np.linspace(-1.0, 1.0, 400)
    K = np.where(d >= 0, 0.5 - 0.1667 * np.tanh(d * 6),
                 0.5 + 2.5 * np.tanh(-d * 2.2))
    ax.plot(d, K, color=RED, lw=2.2)
    ax.axvline(0, color="k", lw=0.9)
    ax.axhline(0.5, color="#888", ls=":", lw=1)
    ax.axhline(1 / 3, color=BLU, ls=":", lw=1)
    ax.text(0.60, 0.36, "主働土圧 Ka=1/3", fontproperties=jp, fontsize=9, color=BLU)
    ax.text(-0.97, 0.62, "静止土圧 K0≒0.5", fontproperties=jp, fontsize=9, color="#555")
    ax.text(-0.98, 3.02, "受働土圧 Kp=3", fontproperties=jp, fontsize=9, color=GRN)
    ax.annotate("壁が前に動く\n（背面土がゆるむ）", xy=(0.55, 0.34), xytext=(0.18, 1.35),
                fontproperties=jp, fontsize=8, color=BLU,
                arrowprops=dict(arrowstyle="->", color=BLU))
    ax.annotate("壁が背面に押込む", xy=(-0.62, 2.55), xytext=(-0.62, 1.15),
                ha="center", fontproperties=jp, fontsize=8, color=GRN,
                arrowprops=dict(arrowstyle="->", color=GRN))
    ax.set_xlabel("壁の変位（← 背面側　0　前面側 →）", fontproperties=jp, fontsize=9)
    ax.set_ylabel("土圧係数 K", fontproperties=jp, fontsize=9)
    ax.set_ylim(0, 3.2); ax.set_xticks([]); ax.grid(alpha=0.3, axis="y")
    ax.set_title("(a) 壁の変位と土圧係数", fontproperties=jp, fontsize=10, fontweight="bold")
    # (b) 形式別の採用土圧
    ax = axes[1]
    ax.text(0.5, 0.96, "擁壁形式と採用する土圧", transform=ax.transAxes, ha="center",
            fontproperties=jp, fontsize=10.5, fontweight="bold", color="#1f4e79")
    rows = [("L型・逆T型\n（片持ち梁式）", "主働土圧 Ka", "わずかに変位でき\n背面土がゆるむ", "#dbe5f1"),
            ("重力式・もたれ式", "主働土圧 Ka\n（剛なら K0 も検討）", "自重で抵抗。変位が\n小さければ K0 側", "#dce9d4"),
            ("地下外壁・剛な壁\n（変位できない）", "静止土圧 K0", "変位が拘束され\n土がゆるまない", "#fde7d4"),
            ("受働側（つま先前面）", "受働土圧 Kp\n※通常は見込まない", "掘削・洗掘で失われ\nうるため安全側に無視", "#f6dcdc")]
    for i, (a, b, c, col) in enumerate(rows):
        y = 0.76 - i * 0.20
        ax.add_patch(mpatches.FancyBboxPatch((0.02, y), 0.96, 0.165,
                     boxstyle="round,pad=0.006", transform=ax.transAxes, fc=col, ec="#8ea9c9", lw=1))
        ax.text(0.16, y + 0.083, a, transform=ax.transAxes, ha="center", va="center",
                fontproperties=jp, fontsize=7.6, fontweight="bold")
        ax.text(0.47, y + 0.083, b, transform=ax.transAxes, ha="center", va="center",
                fontproperties=jp, fontsize=7.8, color=RED)
        ax.text(0.79, y + 0.083, c, transform=ax.transAxes, ha="center", va="center",
                fontproperties=jp, fontsize=7.2, color="#444")
    ax.axis("off")
    ax.set_title("(b) 形式に応じた土圧の選別", fontproperties=jp, fontsize=10, fontweight="bold")
    # (c) 仮想背面
    ax = axes[2]
    ax.add_patch(mpatches.Rectangle((0, 0), 2.2, 0.4, fc=CONC, ec="k", lw=1.3))
    ax.add_patch(mpatches.Rectangle((0, 0.4), 0.25, 2.6, fc=CONC, ec="k", lw=1.3))
    ax.add_patch(mpatches.Rectangle((0.25, 0.4), 1.95, 2.6, fc=SOIL, ec="none"))
    ax.plot([2.2, 2.2], [0, 3.0], color=RED, lw=2.4, ls="--")
    ax.text(2.32, 1.6, "仮想背面\n（かかと版端部を\n通る鉛直面）", fontproperties=jp,
            fontsize=8, color=RED, va="center")
    for i, yy in enumerate(np.linspace(0.15, 2.85, 7)):
        L = 0.12 + 0.55 * (1 - yy / 3.0)
        ax.annotate("", xy=(2.2, yy), xytext=(2.2 + L, yy),
                    arrowprops=dict(arrowstyle="-|>", color=BLU, lw=1.3))
    ax.text(1.1, 3.35, "この面に主働土圧を作用させる", ha="center",
            fontproperties=jp, fontsize=8.5, color=BLU)
    ax.text(1.1, -0.55, "かかと版上の土は『擁壁の一部』として\n"
            "鉛直力に算入する（二重に数えない）", ha="center", va="top",
            fontproperties=jp, fontsize=8, color="#833c00")
    hatch_ground(ax, -0.3, 3.4, 0)
    ax.plot([-0.35, 3.45], [0, 0], color="#8B5A2B", lw=1.2)
    ax.set_xlim(-0.5, 3.6); ax.set_ylim(-1.5, 3.8); ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(c) 仮想背面の考え方", fontproperties=jp, fontsize=10, fontweight="bold")
    fig.suptitle("図 2  擁壁の種類に応じた土圧の選別", fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig2_pressure.png")


# ============ 図3  安定計算 ============
def fig_stability():
    fig, axes = plt.subplots(1, 2, figsize=(14.0, 5.8),
                             gridspec_kw={"width_ratios": [1.25, 1.0]})
    ax = axes[0]
    ax.add_patch(mpatches.Rectangle((0, 0), B, TF, fc=CONC, ec="k", lw=1.4))
    ax.add_patch(mpatches.Rectangle((0, TF), T, HS, fc=CONC, ec="k", lw=1.4))
    ax.add_patch(mpatches.Rectangle((T, TF), LH, HS, fc=SOIL, ec="none"))
    # 鉛直力（矢印は作用位置、内訳は左上の一覧に）
    ax.annotate("", xy=(T / 2, 0.55), xytext=(T / 2, 1.50),
                arrowprops=dict(arrowstyle="-|>", color=RED, lw=2))
    ax.text(T / 2, 1.60, "W1", ha="center", fontproperties=jp, fontsize=8, color=RED)
    ax.annotate("", xy=(B / 2, 0.50), xytext=(B / 2, 0.95),
                arrowprops=dict(arrowstyle="-|>", color=RED, lw=2))
    ax.text(B / 2 - 0.05, 1.02, "W2", ha="right", fontproperties=jp, fontsize=8, color=RED)
    ax.annotate("", xy=(T + LH / 2, 1.30), xytext=(T + LH / 2, 2.60),
                arrowprops=dict(arrowstyle="-|>", color=RED, lw=2.4))
    ax.text(T + LH / 2 + 0.06, 2.70, "W3+W4", ha="left", fontproperties=jp,
            fontsize=8, color=RED)
    ax.text(-0.86, H + 1.55,
            "W1 竪壁    15.6 kN/m (x=0.125)\n"
            "W2 底版    21.1 kN/m (x=1.100)\n"
            "W3 土      91.3 kN/m (x=1.225)\n"
            "W4 上載    19.5 kN/m (x=1.225)\n"
            "ΣV = 147.5 kN/m,  Mr = 160.9 kN・m/m",
            va="top", fontproperties=jp, fontsize=8, color=RED,
            bbox=dict(boxstyle="round", fc="#fdf0f0", ec=RED, lw=0.9))
    # 土圧
    ax.plot([B, B], [0, H], color=BLU, lw=2, ls="--")
    for yy in np.linspace(0.15, 2.85, 7):
        L = 0.15 + 0.62 * (1 - yy / H)
        ax.annotate("", xy=(B, yy), xytext=(B + L, yy),
                    arrowprops=dict(arrowstyle="-|>", color=BLU, lw=1.3))
    ax.annotate("", xy=(B - 0.02, 1.0), xytext=(B + 1.25, 1.0),
                arrowprops=dict(arrowstyle="-|>", color=BLU, lw=3))
    ax.text(B + 1.3, 1.0, "ΣH=37.0 kN/m\n(Pa=27.0 @1.00m\n Pq=10.0 @1.50m)",
            fontproperties=jp, fontsize=8, color=BLU, va="center")
    # つま先
    ax.plot([0], [0], marker="o", ms=8, color=RED)
    ax.text(-0.1, -0.22, "つま先 O\n（モーメントの基準）", ha="center", va="top",
            fontproperties=jp, fontsize=8, color=RED)
    # 接地圧
    ax.plot([0, B], [-0.75, -0.75], color="#8B5A2B", lw=1)
    ax.add_patch(mpatches.Polygon([[0, -0.75], [B, -0.75], [B, -0.88], [0, -1.6]],
                 fc="#f0e0c8", ec="#8B5A2B", lw=1.4))
    ax.text(-0.05, -1.62, "qmax\n120.8", ha="center", va="top", fontproperties=jp,
            fontsize=8, color=RED)
    ax.text(B + 0.05, -0.95, "qmin 13.3", ha="left", va="top", fontproperties=jp,
            fontsize=8, color=GRN)
    ax.annotate("", xy=(0, -0.62), xytext=(B, -0.62),
                arrowprops=dict(arrowstyle="<->", color="#333"))
    ax.text(B / 2, -0.55, "B=2.20m", ha="center", fontproperties=jp, fontsize=8)
    hatch_ground(ax, -0.3, B + 1.4, 0)
    ax.set_xlim(-0.9, B + 2.5); ax.set_ylim(-2.3, H + 1.9)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(a) 力の集計（L型擁壁 H=3.0m）", fontproperties=jp, fontsize=10, fontweight="bold")
    ax = axes[1]
    ax.text(0.5, 0.97, "3つの安定照査", transform=ax.transAxes, ha="center",
            fontproperties=jp, fontsize=11, fontweight="bold", color="#1f4e79")
    blocks = [
        ("① 滑動", "Fs = ΣV・μ / ΣH\n= 147.5×0.5 / 37.0 = 1.99  >= 1.5  OK", "#dbe5f1", "#2e5b8a"),
        ("② 転倒", "Fs = Mr / Mo = 160.9 / 42.0 = 3.83  >= 2.0  OK\n"
                  "e = B/2 −(Mr−Mo)/ΣV = 0.294m < B/6 = 0.367m", "#dce9d4", GRN),
        ("③ 支持力", "qmax = ΣV/B・(1 + 6e/B)\n= 67.0×(1+0.802) = 120.8 <= qa=150  OK",
         "#fde7d4", "#c55a11"),
    ]
    for i, (t, d, fc, ec) in enumerate(blocks):
        y = 0.71 - i * 0.26
        ax.add_patch(mpatches.FancyBboxPatch((0.03, y), 0.94, 0.21,
                     boxstyle="round,pad=0.008", transform=ax.transAxes, fc=fc, ec=ec, lw=1.3))
        ax.text(0.08, y + 0.155, t, transform=ax.transAxes, fontproperties=jp,
                fontsize=10, fontweight="bold", color=ec)
        ax.text(0.08, y + 0.06, d, transform=ax.transAxes, fontproperties=jp,
                fontsize=8.3, va="center")
    ax.text(0.5, 0.05, "e > B/6 なら底版が浮き上がり\n三角形分布 qmax = 2ΣV/(3d)",
            transform=ax.transAxes, ha="center", fontproperties=jp, fontsize=8.5, color=RED)
    ax.axis("off")
    ax.set_title("(b) 滑動・転倒・支持力", fontproperties=jp, fontsize=10, fontweight="bold")
    fig.suptitle("図 3  L型擁壁の安定計算", fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig3_stability.png")


# ============ 図4  応力算定 ============
def fig_stress():
    fig, axes = plt.subplots(1, 3, figsize=(15.0, 5.0),
                             gridspec_kw={"width_ratios": [1.0, 1.0, 1.05]})
    Ka = 1 / 3
    # (a) 竪壁の荷重
    ax = axes[0]
    ax.add_patch(mpatches.Rectangle((0, 0), T, HS, fc=CONC, ec="k", lw=1.4))
    for yy in np.linspace(0.12, HS - 0.12, 8):
        dep = HS - yy
        L = Ka * 10 * 0.045 + Ka * 18 * dep * 0.045
        ax.annotate("", xy=(T, yy), xytext=(T + L, yy),
                    arrowprops=dict(arrowstyle="-|>", color=BLU, lw=1.2))
    ax.plot([T + Ka * 10 * 0.045, T + Ka * 10 * 0.045 + Ka * 18 * HS * 0.045],
            [HS, 0], color=BLU, lw=1.6)
    ax.text(T + 0.9, 2.3, "Ka・q\n(矩形)", fontproperties=jp, fontsize=8, color=BLU)
    ax.text(T + 0.9, 0.6, "Ka・γ・y\n(三角)", fontproperties=jp, fontsize=8, color=BLU)
    ax.plot([0, T], [0, 0], color=RED, lw=3)
    ax.text(T / 2, -0.3, "付け根＝設計断面", ha="center", fontproperties=jp, fontsize=8, color=RED)
    ax.annotate("", xy=(-0.25, 0), xytext=(-0.25, HS),
                arrowprops=dict(arrowstyle="<->", color="#333"))
    ax.text(-0.35, HS / 2, "h=2.6m", ha="right", va="center", fontproperties=jp, fontsize=8)
    ax.set_xlim(-0.9, 2.0); ax.set_ylim(-0.8, HS + 0.4); ax.axis("off")
    ax.set_title("(a) 竪壁＝片持ち梁", fontproperties=jp, fontsize=10, fontweight="bold")
    # (b) 竪壁のM図
    ax = axes[1]
    y = np.linspace(0, HS, 100)
    dep = HS - y
    M = Ka * 18 * dep ** 3 / 6 + Ka * 10 * dep ** 2 / 2
    ax.plot(M, y, color=RED, lw=2.2)
    ax.fill_betweenx(y, 0, M, color="#f8d0d0", alpha=0.6)
    ax.axhline(0, color="k", lw=0.8)
    ax.plot([28.84], [0], marker="o", color=RED, ms=7)
    ax.annotate("付け根 M=28.84 kN・m/m\nQ=28.95 kN/m", xy=(28.84, 0), xytext=(6.0, 0.85),
                fontproperties=jp, fontsize=8.5, color=RED,
                arrowprops=dict(arrowstyle="->", color=RED))
    ax.text(2.0, 2.2, "M = Ka・γ・h³/6\n     + Ka・q・h²/2", fontproperties=jp,
            fontsize=9, color="#1f4e79")
    ax.set_xlabel("曲げモーメント (kN・m/m)", fontproperties=jp, fontsize=9)
    ax.set_ylabel("竪壁の高さ (m)", fontproperties=jp, fontsize=9)
    ax.set_ylim(0, HS); ax.grid(alpha=0.3)
    ax.set_title("(b) 竪壁の曲げM分布", fontproperties=jp, fontsize=10, fontweight="bold")
    # (c) かかと版
    ax = axes[2]
    ax.add_patch(mpatches.Rectangle((0, 0), LH, 0.42, fc=CONC, ec="k", lw=1.4))
    for x in np.linspace(0.08, LH - 0.08, 10):
        ax.annotate("", xy=(x, 0.44), xytext=(x, 1.25),
                    arrowprops=dict(arrowstyle="-|>", color=RED, lw=1.5))
    ax.text(LH / 2, 1.38, "下向き w=66.4 kN/m2\n（土46.8＋上載10.0＋自重9.6）",
            ha="center", fontproperties=jp, fontsize=8.2, color=RED)
    qa_, qb_ = 108.6, 13.3
    for i, x in enumerate(np.linspace(0.08, LH - 0.08, 10)):
        v = (qa_ + (qb_ - qa_) * x / LH) / 108.6 * 0.95
        ax.annotate("", xy=(x, -0.02), xytext=(x, -0.02 - v),
                    arrowprops=dict(arrowstyle="-|>", color=GRN, lw=1.4))
    ax.plot([0, LH], [-0.97, -0.14], color=GRN, lw=1.6)
    ax.text(LH / 2, -1.35, "上向き 地反力 108.6 → 13.3 kN/m2", ha="center",
            fontproperties=jp, fontsize=8.2, color=GRN)
    ax.plot([0, 0], [0, 0.42], color=RED, lw=4)
    ax.text(-0.08, 0.75, "設計断面\n（竪壁背面）", ha="right", fontproperties=jp,
            fontsize=8, color=RED)
    ax.annotate("", xy=(0, -1.62), xytext=(LH, -1.62),
                arrowprops=dict(arrowstyle="<->", color="#333"))
    ax.text(LH / 2, -1.78, "Lh = 1.95m", ha="center", va="top", fontproperties=jp, fontsize=8)
    ax.text(LH / 2, -2.15, "差引き M=126.2−85.6=40.6 kN・m/m（上側引張）",
            ha="center", va="top", fontproperties=jp, fontsize=8.6, color="#1f4e79")
    ax.set_xlim(-0.85, LH + 0.35); ax.set_ylim(-2.7, 2.0); ax.axis("off")
    ax.set_title("(c) かかと版＝上下荷重の差", fontproperties=jp, fontsize=10, fontweight="bold")
    fig.suptitle("図 4  竪壁・底版の応力算定", fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig4_stress.png")


# ============ 図5  必要鉄筋・配筋 ============
def fig_rebar():
    fig, axes = plt.subplots(1, 2, figsize=(14.0, 5.6),
                             gridspec_kw={"width_ratios": [1.15, 1.0]})
    ax = axes[0]
    ax.add_patch(mpatches.Rectangle((0, 0), B, TF, fc=CONC, ec="k", lw=1.4))
    ax.add_patch(mpatches.Rectangle((0, TF), T, HS, fc=CONC, ec="k", lw=1.4))
    ax.add_patch(mpatches.Rectangle((T, TF), LH, HS, fc=SOIL, ec="none"))
    # 竪壁主筋（背面＝引張側）
    ax.plot([T - 0.06, T - 0.06], [0.12, H - 0.06], color=RED, lw=3.2)
    ax.plot([T - 0.06, B - 0.15], [0.12, 0.12], color=RED, lw=3.2)
    ax.annotate("竪壁主筋（背面＝引張側）\nD16@200 = 993 mm²/m", xy=(T - 0.06, 2.0),
                xytext=(B + 0.25, 2.45), fontproperties=jp, fontsize=8.4, color=RED,
                arrowprops=dict(arrowstyle="->", color=RED))
    # かかと版主筋（上側＝引張）
    ax.plot([T + 0.05, B - 0.08], [TF - 0.07, TF - 0.07], color=GRN, lw=3.2)
    ax.annotate("かかと版主筋（上側＝引張）\nD13@150 = 845 mm²/m", xy=(1.5, TF - 0.07),
                xytext=(B + 0.25, 1.15), fontproperties=jp, fontsize=8.4, color=GRN,
                arrowprops=dict(arrowstyle="->", color=GRN))
    # 配力筋
    for yy in [0.9, 1.6, 2.3]:
        ax.plot([T - 0.13], [yy], marker="o", ms=4, color=BLU)
    ax.annotate("配力筋（水平筋）", xy=(T - 0.13, 1.6), xytext=(-0.95, 2.3),
                fontproperties=jp, fontsize=8, color=BLU,
                arrowprops=dict(arrowstyle="->", color=BLU))
    # 定着（出隅・入隅）
    ax.add_patch(mpatches.Circle((T - 0.06, 0.2), 0.30, fill=False, ec="#c55a11", lw=1.8, ls="--"))
    ax.annotate("入隅の定着\n（竪壁主筋を底版へ\n L 型に回して定着）", xy=(T + 0.2, 0.28),
                xytext=(0.95, -0.95), fontproperties=jp, fontsize=8, color="#c55a11",
                arrowprops=dict(arrowstyle="->", color="#c55a11"))
    ax.annotate("かぶり 70mm\n（土に接する側）", xy=(0.05, 1.5), xytext=(-1.0, 0.95),
                fontproperties=jp, fontsize=8, color="#555",
                arrowprops=dict(arrowstyle="->", color="#555"))
    hatch_ground(ax, -0.3, B + 0.2, 0)
    ax.set_xlim(-1.25, B + 2.1); ax.set_ylim(-1.7, H + 0.5)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(a) 引張側に主筋を配する", fontproperties=jp, fontsize=10, fontweight="bold")
    ax = axes[1]
    ax.text(0.5, 0.97, "必要鉄筋量の算定  As = M /(ft・j)", transform=ax.transAxes,
            ha="center", fontproperties=jp, fontsize=10.5, fontweight="bold", color="#1f4e79")
    ax.text(0.04, 0.86,
            "  ft = 195 N/mm²（SD295・長期）,  j = 7/8・d,  d = 厚 − かぶり\n\n"
            "【竪壁】M = 28.84 kN・m/m,  厚250, かぶり70\n"
            "   d = 180mm,  j = 157.5mm\n"
            "   As = 28.84×10^6 /(195×157.5) = 939 mm²/m\n"
            "   最小 0.2%×250 = 500 mm²/m  → 計算値が支配\n"
            "   採用 D16@200 = 993 mm²/m  OK\n\n"
            "【かかと版】M = 40.60 kN・m/m,  厚400, かぶり70\n"
            "   d = 330mm,  j = 288.8mm\n"
            "   As = 40.60×10^6 /(195×288.8) = 721 mm²/m\n"
            "   最小 0.2%×400 = 800 mm²/m  → 最小鉄筋量が支配\n"
            "   採用 D13@150 = 845 mm²/m  OK",
            transform=ax.transAxes, fontproperties=jp, fontsize=8.8, va="top")
    ax.text(0.04, 0.09, "計算値と最小鉄筋量の『大きい方』を採用する。\n"
            "かかと版はしばしば最小鉄筋量で決まる。",
            transform=ax.transAxes, fontproperties=jp, fontsize=8.6, color=RED, va="top")
    ax.axis("off")
    ax.set_title("(b) 必要鉄筋量と配筋の選定", fontproperties=jp, fontsize=10, fontweight="bold")
    fig.suptitle("図 5  必要鉄筋量の計算と配筋計画", fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig5_rebar.png")


# ============ 図6  排水処理 ============
def fig_drain():
    fig, axes = plt.subplots(1, 2, figsize=(14.0, 5.6),
                             gridspec_kw={"width_ratios": [1.15, 1.0]})
    ax = axes[0]
    ax.add_patch(mpatches.Rectangle((0, 0), B, TF, fc=CONC, ec="k", lw=1.4))
    ax.add_patch(mpatches.Rectangle((0, TF), T, HS, fc=CONC, ec="k", lw=1.4))
    ax.add_patch(mpatches.Rectangle((T, TF), LH, HS, fc=SOIL, ec="none"))
    # 透水層（裏込め砕石）
    ax.add_patch(mpatches.Rectangle((T, TF), 0.42, HS, fc="#c9c2a8", ec="k", lw=0.9, hatch="..."))
    ax.annotate("裏込め透水層\n（砕石・フィルター材）", xy=(T + 0.21, 2.1),
                xytext=(B + 0.3, 2.75), fontproperties=jp, fontsize=8.3, color="#7a5a2a",
                arrowprops=dict(arrowstyle="->", color="#7a5a2a"))
    # 水抜き穴
    for yy in [0.75, 1.55, 2.35]:
        ax.add_patch(mpatches.Rectangle((-0.09, yy), T + 0.18, 0.11, fc="white", ec=BLU, lw=1.6))
        ax.annotate("", xy=(-0.42, yy + 0.055), xytext=(-0.10, yy + 0.055),
                    arrowprops=dict(arrowstyle="-|>", color=BLU, lw=1.6))
    ax.annotate("水抜き穴\n内径 75mm 以上\n壁面 3m² 以内ごとに 1 個以上", xy=(-0.35, 1.61),
                xytext=(-2.75, 1.05), fontproperties=jp, fontsize=8.3, color=BLU,
                arrowprops=dict(arrowstyle="->", color=BLU))
    # 地表面の勾配・止水
    ax.plot([T, B + 0.5], [H, H + 0.22], color="#8B5A2B", lw=2)
    ax.text(B + 0.55, H + 0.3, "地表面は擁壁から\n離れる方向に勾配", fontproperties=jp,
            fontsize=8, color="#8B5A2B", va="center")
    # 底版下の排水
    ax.add_patch(mpatches.Circle((T + 0.21, TF - 0.12), 0.09, fc=BLU, ec="k", lw=0.8))
    ax.annotate("底部の排水管（暗渠）", xy=(T + 0.21, TF - 0.12), xytext=(B + 0.3, 0.05),
                fontproperties=jp, fontsize=8, color=BLU,
                arrowprops=dict(arrowstyle="->", color=BLU))
    hatch_ground(ax, -0.4, B + 0.2, 0)
    ax.set_xlim(-3.1, B + 2.6); ax.set_ylim(-0.7, H + 1.0)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(a) 排水処理（水圧を非考慮とするための条件）",
                 fontproperties=jp, fontsize=10, fontweight="bold")
    # (b) 水圧の影響
    ax = axes[1]
    y = np.linspace(0, 3.0, 200)
    dep = 3.0 - y
    dry = (1 / 3) * 18 * dep
    hw = 2.0
    wet = np.where(dep <= 1.0, (1 / 3) * 18 * dep,
                   (1 / 3) * 18 * 1.0 + (1 / 3) * 10.2 * (dep - 1.0)) \
        + np.where(dep <= 1.0, 0.0, 9.8 * (dep - 1.0))
    ax.plot(dry, y, color=GRN, lw=2.2, label="排水良好（水圧なし）")
    ax.plot(wet, y, color=RED, lw=2.2, label="背面に湛水（GL-1.0m）")
    ax.fill_betweenx(y, dry, wet, color="#f8d0d0", alpha=0.5)
    ax.axhline(1.0, color=BLU, ls=":", lw=1.2)
    ax.text(24, 1.08, "▽ 水位", fontproperties=jp, fontsize=8, color=BLU)
    ax.annotate("底部 18.0 → 32.4 kN/m²\n（1.80 倍）", xy=(32.4, 0.02), xytext=(3.2, 0.62),
                fontproperties=jp, fontsize=8.5, color=RED,
                arrowprops=dict(arrowstyle="->", color=RED))
    ax.set_xlabel("水平圧力 (kN/m²)", fontproperties=jp, fontsize=9)
    ax.set_ylabel("擁壁の高さ (m)", fontproperties=jp, fontsize=9)
    ax.legend(prop=jp, fontsize=8.5, loc="upper right")
    ax.grid(alpha=0.3); ax.set_xlim(0, 36); ax.set_ylim(0, 3.0)
    ax.text(9.5, 2.62, "合力 27.0 → 41.4 kN/m（1.53 倍）\n転倒M 27.0 → 36.6 kN・m/m（1.36 倍）",
            fontproperties=jp, fontsize=8.5, color=RED, va="top")
    ax.set_title("(b) 排水不良で水圧が加わると", fontproperties=jp, fontsize=10, fontweight="bold")
    fig.suptitle("図 6  水圧を非考慮とできる排水処理", fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig6_drain.png")


if __name__ == "__main__":
    fig_types(); fig_earth_pressure(); fig_stability()
    fig_stress(); fig_rebar(); fig_drain()
    print("all figures done")
