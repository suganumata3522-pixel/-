# -*- coding: utf-8 -*-
"""偏心率・剛性率 問題集（図つき）Excel 生成スクリプト。
出力: docs/eccentricity/偏心率剛性率問題集.xlsx
1 各規程の意味 / 2 重心・剛心のイメージ / 3 偏心率の算出
4 剛性率の算出 / 5 制限値 / 6 改善方法
RC造マンションの設計担当を想定。数値は build 時に検算済み。
No.10(バランス配置)の姉妹編（算出・制限・改善に特化）。
"""
import os
import math
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

OUT = "docs/eccentricity"
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
# 図 1: 偏心率・剛性率の意味
# ===========================================================================
def fig_meaning():
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 5.0))
    # (a) 偏心率＝平面のねじれやすさ
    ax = axes[0]
    # 平面（伏図）で重心G・剛心Rがずれ→ねじれ
    ax.add_patch(mpatches.Rectangle((0, 0), 6, 4, fc="#eef3f8", ec="k",
                 lw=1.2))
    # 壁が左に集中
    ax.add_patch(mpatches.Rectangle((0.2, 0.3), 0.3, 3.4, fc="#e8c9ce",
                 ec="k", hatch="//", alpha=0.8))
    ax.plot(3, 2, "o", color="#1f7a1f", ms=13)
    ax.text(3.3, 2, "G(重心)", fontproperties=jp, fontsize=8.5,
            color="#1f7a1f", va="center")
    ax.plot(1.2, 2, "*", color="#c00000", ms=18)
    ax.text(1.2, 2.5, "R(剛心)", fontproperties=jp, fontsize=8.5,
            color="#c00000", ha="center")
    ax.plot([1.2, 3], [2, 2], color="#c00000", lw=1.2, ls="--")
    # ねじれ回転矢印
    ax.annotate("", xy=(5.3, 3.3), xytext=(4.7, 3.7),
                arrowprops=dict(arrowstyle="-|>", color="#7a3b3b", lw=2,
                                connectionstyle="arc3,rad=0.4"))
    ax.text(4.5, 4.4, "ねじれ振動", fontproperties=jp, fontsize=8.5,
            color="#7a3b3b")
    ax.text(3, -0.9,
            "偏心率＝重心 G と剛心 R のズレ（平面）\n"
            "→ 大きいとねじれ振動で隅の柱・壁が過大変形",
            fontproperties=jp, ha="center", fontsize=9, color="#444")
    ax.set_xlim(-0.5, 6.5); ax.set_ylim(-1.6, 4.8)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(a) 偏心率（平面のねじれやすさ）", fontproperties=jp,
                 fontsize=11, fontweight="bold")

    # (b) 剛性率＝立面の柔らかい階
    ax = axes[1]
    ys = [0, 1, 2, 3, 4]
    for i in range(4):
        soft = (i == 0)
        col = "#f8d0d0" if soft else "#cfe0f0"
        ax.add_patch(mpatches.Rectangle((0, ys[i]), 3, 1, fc=col, ec="k",
                     lw=1))
        ax.text(3.3, ys[i] + 0.5, f"{i+1}F", fontproperties=jp, fontsize=8,
                va="center")
    ax.text(1.5, 0.5, "柔らかい階\n（ピロティ）", fontproperties=jp,
            ha="center", va="center", fontsize=8, color="#c00000")
    ax.annotate("この階に変形集中", xy=(0, 0.5), xytext=(-2.3, 0.5),
                fontproperties=jp, fontsize=8.5, color="#c00000",
                va="center",
                arrowprops=dict(arrowstyle="->", color="#c00000"))
    ax.text(1.5, -0.9,
            "剛性率＝各階の剛さのバランス（立面）\n"
            "→ 特定階が柔らかいとそこに変形・損傷が集中",
            fontproperties=jp, ha="center", fontsize=9, color="#444")
    ax.set_xlim(-2.6, 4.2); ax.set_ylim(-1.6, 5.2)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(b) 剛性率（立面の剛さバランス）", fontproperties=jp,
                 fontsize=11, fontweight="bold")
    fig.suptitle("図 1  偏心率・剛性率の意味",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig1_meaning.png")


# ===========================================================================
# 図 2: 重心・剛心のイメージ
# ===========================================================================
def fig_gr():
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 4.8))
    # (a) 重心＝質量の中心
    ax = axes[0]
    ax.add_patch(mpatches.Rectangle((0, 0), 6, 4, fc="#eef3f8", ec="k",
                 lw=1.2))
    # 均等な質量点
    for x in np.linspace(0.7, 5.3, 5):
        for y in np.linspace(0.7, 3.3, 3):
            ax.plot(x, y, ".", color="#1f7a1f", ms=6)
    ax.plot(3, 2, "o", color="#1f7a1f", ms=14)
    ax.text(3, 2.4, "G", fontproperties=jp, fontsize=11, color="#1f7a1f",
            ha="center", fontweight="bold")
    ax.text(3, -0.8,
            "重心 G＝質量（重さ）の中心\n"
            "質量が一様なら平面の図心。X_g=Σ(m·x)/Σm",
            fontproperties=jp, ha="center", fontsize=9, color="#444")
    ax.set_xlim(-0.5, 6.5); ax.set_ylim(-1.5, 4.5)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(a) 重心 G（質量の中心）", fontproperties=jp, fontsize=11,
                 fontweight="bold")

    # (b) 剛心＝剛性の中心
    ax = axes[1]
    ax.add_patch(mpatches.Rectangle((0, 0), 6, 4, fc="#eef3f8", ec="k",
                 lw=1.2))
    # 壁（剛性）が左に集中
    ax.add_patch(mpatches.Rectangle((0.2, 0.3), 0.35, 3.4, fc="#e8c9ce",
                 ec="k", hatch="//", alpha=0.8))
    ax.text(0.4, 3.9, "壁（剛大）", fontproperties=jp, fontsize=7,
            color="#7a3b3b")
    ax.add_patch(mpatches.Rectangle((5.5, 0.3), 0.15, 3.4, fc="#cfe0c0",
                 ec="k", alpha=0.6))
    ax.plot(1.5, 2, "*", color="#c00000", ms=18)
    ax.text(1.5, 2.5, "R", fontproperties=jp, fontsize=11, color="#c00000",
            ha="center", fontweight="bold")
    ax.text(3, -0.8,
            "剛心 R＝剛性（かたさ）の中心\n"
            "剛い壁のある側に寄る。X_R=Σ(Ky·x)/ΣKy",
            fontproperties=jp, ha="center", fontsize=9, color="#444")
    ax.set_xlim(-0.5, 6.5); ax.set_ylim(-1.5, 4.5)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(b) 剛心 R（剛性の中心）", fontproperties=jp, fontsize=11,
                 fontweight="bold")
    fig.suptitle("図 2  重心 G と 剛心 R のイメージ",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig2_gr.png")


# ===========================================================================
# 図 3: 偏心率の算出
# ===========================================================================
def fig_ecc_calc():
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 5.0),
                              gridspec_kw={"width_ratios": [1.1, 1.0]})
    # (a) 平面と壁位置
    ax = axes[0]
    ax.add_patch(mpatches.Rectangle((0, 0), 12, 6, fc="#eef3f8", ec="k",
                 lw=1.2))
    walls = [("Y1", 0, 6.0), ("Y2", 6, 2.0), ("Y3", 12, 2.0)]
    for name, x, k in walls:
        ax.add_patch(mpatches.Rectangle((x - 0.2, 0.3), 0.4, 5.4,
                     fc="#e8c9ce" if k > 4 else "#cfe0c0", ec="k",
                     hatch="//" if k > 4 else "", alpha=0.8))
        ax.text(x, -0.6, f"{name}\nKy={k}", fontproperties=jp, ha="center",
                fontsize=8)
        ax.text(x, 6.3, f"x={x}", fontproperties=jp, ha="center", fontsize=7,
                color="#666")
    ax.plot(6, 3, "o", color="#1f7a1f", ms=12)
    ax.text(6, 3.4, "G(x=6)", fontproperties=jp, fontsize=8, color="#1f7a1f",
            ha="center")
    ax.plot(3.6, 3, "*", color="#c00000", ms=16)
    ax.text(3.6, 2.3, "R(x=3.6)", fontproperties=jp, fontsize=8,
            color="#c00000", ha="center")
    ax.annotate("", xy=(3.6, 4.3), xytext=(6, 4.3),
                arrowprops=dict(arrowstyle="<|-|>", color="#c00000", lw=1.2))
    ax.text(4.8, 4.6, "ex=2.4", fontproperties=jp, ha="center", fontsize=8,
            color="#c00000")
    ax.set_xlim(-0.8, 12.8); ax.set_ylim(-1.5, 7.0)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(a) 壁配置と重心・剛心（Y 方向）", fontproperties=jp,
                 fontsize=11, fontweight="bold")

    # (b) 計算手順
    ax = axes[1]
    ax.text(0.5, 0.95, "偏心率 Re の算出手順", transform=ax.transAxes,
            ha="center", fontproperties=jp, fontsize=12, fontweight="bold",
            color="#1f4e79")
    txt = (
        "① 剛心 X_R = Σ(Ky·x) / ΣKy\n"
        "  = (6×0 + 2×6 + 2×12) / (6+2+2)\n"
        "  = 36 / 10 = 3.6 m\n\n"
        "② 偏心距離 ex = |X_g − X_R|\n"
        "  = |6 − 3.6| = 2.4 m\n\n"
        "③ 弾力半径 re = √(KR / ΣKy)\n"
        "  KR = ΣKy·(x−X_R)² = 230.4\n"
        "  re = √(230.4/10) = 4.8 m\n\n"
        "④ 偏心率 Re = ex / re = 2.4/4.8 = 0.50")
    ax.text(0.05, 0.82, txt, transform=ax.transAxes, fontproperties=jp,
            fontsize=10, color="#333", va="top")
    ax.text(0.5, 0.05, "Re = 0.50 ＞ 0.15 → NG（Fe 割増し）",
            transform=ax.transAxes, ha="center", fontproperties=jp,
            fontsize=11, color="#c00000", fontweight="bold")
    ax.axis("off")
    ax.set_title("(b) 算出手順（4 ステップ）", fontproperties=jp,
                 fontsize=11, fontweight="bold")
    fig.suptitle("図 3  偏心率の算出（重心・剛心・弾力半径）",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig3_ecc.png")


# ===========================================================================
# 図 4: 剛性率の算出
# ===========================================================================
def fig_rigidity_calc():
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 5.0))
    # (a) 各階剛性の棒グラフ
    ax = axes[0]
    floors = ["1F", "2F", "3F", "4F"]
    Ri = [40, 100, 100, 95]
    rs_avg = sum(Ri) / len(Ri)
    Rs = [r / rs_avg for r in Ri]
    y = np.arange(4)
    bars = ax.barh(y, Rs, color=["#f8c0c0" if r < 0.6 else "#a8dadc"
                                 for r in Rs], ec="k", lw=0.6)
    ax.axvline(0.6, color="red", ls="--", lw=1.5)
    ax.text(0.62, 3.4, "制限 Rs>=0.6", fontproperties=jp, fontsize=8.5,
            color="red")
    for i, r in enumerate(Rs):
        ax.text(r + 0.03, i, f"{r:.2f}", fontproperties=jp, fontsize=9,
                va="center")
    ax.set_yticks(y); ax.set_yticklabels(floors, fontproperties=jp)
    ax.invert_yaxis()
    ax.set_xlabel("剛性率 Rs", fontproperties=jp)
    ax.set_xlim(0, 1.5)
    ax.set_title("(a) 各階の剛性率（1F ピロティ）", fontproperties=jp,
                 fontsize=11, fontweight="bold")
    ax.text(0.75, 3.9, "1F は Rs=0.48 < 0.6 → NG", fontproperties=jp,
            fontsize=8.5, color="#c00000", ha="center")

    # (b) 算出手順
    ax = axes[1]
    ax.text(0.5, 0.93, "剛性率 Rs の算出手順", transform=ax.transAxes,
            ha="center", fontproperties=jp, fontsize=12, fontweight="bold",
            color="#1f4e79")
    txt = (
        "① 各階の層間変形角 R_i を求める\n"
        "  R_i = 層間変位 / 階高\n\n"
        "② 各階の剛さ rs_i = 1 / R_i\n"
        "  （層間変形角の逆数）\n\n"
        "③ 全階の平均 rs_avg\n\n"
        "④ 剛性率 Rs_i = rs_i / rs_avg\n\n"
        "【例】層剛性 40:100:100:95（1F〜4F）\n"
        "  平均 = 83.75\n"
        "  1F: Rs = 40/83.75 = 0.48 → NG\n"
        "  2F: Rs = 100/83.75 = 1.19 → OK")
    ax.text(0.05, 0.83, txt, transform=ax.transAxes, fontproperties=jp,
            fontsize=9.5, color="#333", va="top")
    ax.text(0.5, 0.03, "Rs < 0.6 の階は Fs 割増し",
            transform=ax.transAxes, ha="center", fontproperties=jp,
            fontsize=10.5, color="#c00000", fontweight="bold")
    ax.axis("off")
    ax.set_title("(b) 算出手順", fontproperties=jp, fontsize=11,
                 fontweight="bold")
    fig.suptitle("図 4  剛性率の算出",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig4_rigidity.png")


# ===========================================================================
# 図 5: 制限値
# ===========================================================================
def fig_limits():
    fig, ax = plt.subplots(figsize=(11.5, 5.0))
    ax.text(0.5, 0.94, "偏心率・剛性率の制限値と割増し", transform=ax.transAxes,
            ha="center", fontproperties=jp, fontsize=13, fontweight="bold",
            color="#1f4e79")
    tbl = [
        ("指標", "制限値", "超えると", "意味"),
        ("偏心率 Re", "Re <= 0.15", "Fe 割増し",
         "平面のねじれ（重心と剛心のズレ）"),
        ("剛性率 Rs", "Rs >= 0.6", "Fs 割増し",
         "立面の剛さバランス（柔らかい階）"),
    ]
    yy = 0.72
    for i, row in enumerate(tbl):
        col = "#dbe8f5" if i == 0 else ("white" if i % 2 else "#f7f7f7")
        for xx, w, txt in [(0.03, 0.16, row[0]), (0.19, 0.22, row[1]),
                           (0.41, 0.20, row[2]), (0.61, 0.36, row[3])]:
            ax.add_patch(mpatches.Rectangle((xx, yy), w, 0.16,
                         transform=ax.transAxes, fc=col, ec="#bbb", lw=0.6))
            ax.text(xx + w / 2, yy + 0.08, txt, transform=ax.transAxes,
                    ha="center", va="center", fontproperties=jp,
                    fontsize=9, fontweight="bold" if i == 0 else "normal",
                    color="#c00000" if (i > 0 and xx in (0.19, 0.41)) else "#333")
        yy -= 0.18
    ax.text(0.5, 0.28,
            "Fes = Fe × Fs（形状係数）を必要保有水平耐力に乗じる\n"
            "偏心・剛性のアンバランスが大きいほど割増し（＝より強く設計）",
            transform=ax.transAxes, ha="center", fontproperties=jp,
            fontsize=10, color="#1f4e79")
    ax.text(0.5, 0.08,
            "ルート 1・2 では Re・Rs の確認が必須（超えると上位ルートへ）\n"
            "※具体の割増し係数は建築基準法施行令・告示で確認すること",
            transform=ax.transAxes, ha="center", fontproperties=jp,
            fontsize=9, color="#7a3b3b")
    ax.axis("off")
    return save(fig, "fig5_limits.png")


# ===========================================================================
# 図 6: 改善方法
# ===========================================================================
def fig_improve():
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 5.2))
    # (a) 偏心率の改善（壁を対称配置）
    ax = axes[0]
    # 改善前
    ax.add_patch(mpatches.Rectangle((0, 3), 5, 2.5, fc="#eef3f8", ec="k"))
    ax.add_patch(mpatches.Rectangle((0.2, 3.2), 0.3, 2.1, fc="#e8c9ce",
                 ec="k", hatch="//"))
    ax.plot(2.5, 4.25, "o", color="#1f7a1f", ms=8)
    ax.plot(1.0, 4.25, "*", color="#c00000", ms=12)
    ax.text(2.5, 5.7, "改善前：壁が片寄り（Re 大）", fontproperties=jp,
            ha="center", fontsize=8.5, color="#c00000")
    # 改善後
    ax.add_patch(mpatches.Rectangle((0, 0), 5, 2.5, fc="#eef3f8", ec="k"))
    ax.add_patch(mpatches.Rectangle((0.2, 0.2), 0.3, 2.1, fc="#e8c9ce",
                 ec="k", hatch="//"))
    ax.add_patch(mpatches.Rectangle((4.5, 0.2), 0.3, 2.1, fc="#e8c9ce",
                 ec="k", hatch="//"))
    ax.plot(2.5, 1.25, "o", color="#1f7a1f", ms=8)
    ax.plot(2.5, 1.25, "*", color="#c00000", ms=12)
    ax.text(2.5, -0.6, "改善後：両側に壁（G≒R、Re 小）", fontproperties=jp,
            ha="center", fontsize=8.5, color="#1f7a1f")
    ax.annotate("", xy=(2.5, 2.7), xytext=(2.5, 2.95),
                arrowprops=dict(arrowstyle="-|>", color="#444", lw=2))
    ax.set_xlim(-0.5, 5.5); ax.set_ylim(-1.3, 6.2)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(a) 偏心率の改善（壁を対称・反対側へ）",
                 fontproperties=jp, fontsize=10, fontweight="bold")

    # (b) 剛性率の改善（柔らかい階を補強）
    ax = axes[1]
    # 改善前（1Fピロティ）
    for i in range(4):
        soft = (i == 0)
        ax.add_patch(mpatches.Rectangle((0, i), 2, 1,
                     fc="#f8d0d0" if soft else "#cfe0f0", ec="k"))
    ax.text(1, 0.5, "壁なし", fontproperties=jp, ha="center", va="center",
            fontsize=7, color="#c00000")
    ax.text(1, 4.4, "改善前(Rs<0.6)", fontproperties=jp, ha="center",
            fontsize=8, color="#c00000")
    # 改善後
    for i in range(4):
        ax.add_patch(mpatches.Rectangle((4, i), 2, 1, fc="#cfe0f0", ec="k"))
    # 1階に壁orブレース
    ax.add_patch(mpatches.Rectangle((4.7, 0.1), 0.6, 0.8, fc="#e8c9ce",
                 ec="k", hatch="//"))
    ax.text(5, 0.5, "壁\n追加", fontproperties=jp, ha="center", va="center",
            fontsize=6, color="#7a3b3b")
    ax.text(5, 4.4, "改善後(Rs>=0.6)", fontproperties=jp, ha="center",
            fontsize=8, color="#1f7a1f")
    ax.annotate("", xy=(3.8, 2), xytext=(2.2, 2),
                arrowprops=dict(arrowstyle="-|>", color="#444", lw=2))
    ax.text(1, -0.9,
            "柔らかい階（ピロティ等）に\n壁・ブレース・断面増で剛性を補う",
            fontproperties=jp, ha="center", fontsize=8.5, color="#444")
    ax.set_xlim(-0.5, 6.5); ax.set_ylim(-1.5, 5.0)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(b) 剛性率の改善（柔らかい階を補強）",
                 fontproperties=jp, fontsize=10, fontweight="bold")
    fig.suptitle("図 6  偏心率・剛性率の改善方法",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig6_improve.png")


figs = {
    "meaning": fig_meaning(),
    "gr": fig_gr(),
    "ecc": fig_ecc_calc(),
    "rigidity": fig_rigidity_calc(),
    "limits": fig_limits(),
    "improve": fig_improve(),
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
title_row(ws, 1, "偏心率・剛性率 問題集（RC マンション設計担当・新人向け）",
          span=4)
body(ws, 2,
     "目標：偏心率・剛性率を理解しイメージできること。各規程の意味、重心・剛心の"
     "イメージ、算出方法（重心・剛心・弾力半径）、制限値、改善方法までを通す。"
     "No.10（バランス配置）の姉妹編で、本編は『算出・制限・改善』に特化。",
     span=4, h=44)
r = table(ws, 4,
          ["No.", "シート", "到達目標", "図"],
          [["1", "1 各規程の意味", "偏心率・剛性率の各規程の意味を理解する",
            "ねじれ・柔階"],
           ["2", "2 重心・剛心のイメージ", "重心・剛心位置をイメージできる",
            "G・R"],
           ["3", "3 偏心率の算出", "偏心率の算出方法を理解する",
            "剛心・弾力半径"],
           ["4", "4 剛性率の算出", "剛性率の算出方法を理解する",
            "各階剛性"],
           ["5", "5 制限値", "偏心率・剛性率の制限値を理解する", "制限値表"],
           ["6", "6 改善方法", "各改善方法がイメージできる", "壁配置・補強"]])
body(ws, r + 2,
     "共通例：Y 方向壁が左に集中（Ky=6:2:2、x=0:6:12）→ 剛心 X_R=3.6m、"
     "重心 X_g=6m、偏心 ex=2.4m、弾力半径 re=4.8m、偏心率 Re=0.50（NG）。"
     "4 階建て 1F ピロティ（層剛性 40:100:100:95）→ 1F 剛性率 Rs=0.48（NG）。"
     "数値は本教材作成時に検算済み。実務は建築基準法施行令・告示で確認すること。",
     span=4, h=58)

# ---- 1 各規程の意味 ----
ws = wb.create_sheet("1 各規程の意味")
setup(ws, [8, 18, 18, 16, 12, 12])
title_row(ws, 1, "1  偏心率・剛性率 各規程の意味")
head(ws, 3, "■ 図 1  偏心率・剛性率の意味")
put_img(ws, figs["meaning"], "A4", w=820)
head(ws, 30, "■ 問題 1  意味の対比")
r = table(ws, 31,
          ["項目", "偏心率（記入）", "剛性率（記入）"],
          [["何のバランスか", "", ""],
           ["平面/立面", "", ""],
           ["大きい/小さいと問題", "", ""],
           ["生じる現象", "", ""]])
body(ws, r + 2, "選択肢：平面のねじれ／立面の剛さ／重心と剛心のズレ／"
                "特定階への変形集中。", h=32)
head(ws, r + 4, "■ 問題 2  なぜ規制するか")
body(ws, r + 5, "(1) 偏心（ねじれ）が大きいと地震時に何が起こるか"
                "（剛心から遠い柱・壁が過大変形・先行破壊）。"
                "(2) 剛性率が悪い（柔らかい階がある）と何が起こるか"
                "（その階に変形・損傷が集中、層崩壊）。", h=44)
head(ws, r + 7, "■ 問題 3  歴史的教訓")
body(ws, r + 8, "1981 年の新耐震以前の建物で、偏心・剛性のアンバランスによる"
                "被害が多かった（ピロティのねじれ崩壊等）。"
                "新耐震で Re・Rs の規定が強化された経緯を 1 行で。", h=40)

# ---- 2 重心・剛心のイメージ ----
ws = wb.create_sheet("2 重心・剛心")
setup(ws, [8, 18, 18, 16, 12, 12])
title_row(ws, 1, "2  重心・剛心のイメージ")
head(ws, 3, "■ 図 2  重心 G と 剛心 R")
put_img(ws, figs["gr"], "A4", w=820)
head(ws, 28, "■ 問題 1  定義（穴埋め）")
body(ws, 29, "重心 G は建物の【 ① 】（重さ）の中心で、質量が一様なら平面の"
             "【 ② 】に一致する。剛心 R は【 ③ 】（かたさ）の中心で、"
             "剛い壁のある側に【 ④ 】。両者のズレが偏心である。", h=44)
head(ws, 31, "■ 問題 2  剛心はどちらに寄るか")
body(ws, 32, "壁を平面の左側に集中配置した場合、剛心 R は左右どちらに寄るか。"
             "重心 G（平面中央）とのズレはどうなるか。図でイメージせよ。", h=40)
head(ws, 34, "■ 問題 3  重心・剛心を動かす要素")
r = table(ws, 35,
          ["要素", "動かすのは 重心/剛心（記入）"],
          [["大きな吹抜け（質量が抜ける）", ""],
           ["片側への耐震壁の集中", ""],
           ["重い設備（屋上機器）の偏り", ""],
           ["コア（EV・階段）の片寄せ", ""]])
head(ws, r + 2, "■ 問題 4  理想の配置")
body(ws, r + 3, "偏心を小さくする理想は『重心 G と剛心 R が一致』すること。"
                "そのための配置の考え方を 1 行で（剛性要素を平面に対称・"
                "バランスよく）。", h=32)

# ---- 3 偏心率の算出 ----
ws = wb.create_sheet("3 偏心率の算出")
setup(ws, [8, 18, 16, 14, 14, 12, 12])
title_row(ws, 1, "3  偏心率の算出（重心・剛心・弾力半径）")
head(ws, 3, "■ 図 3  偏心率の算出手順")
put_img(ws, figs["ecc"], "A4", w=820)
head(ws, 30, "■ 問題 1  剛心の計算")
body(ws, 31, "Y 方向の壁：Y1（x=0, Ky=6）、Y2（x=6, Ky=2）、Y3（x=12, Ky=2）。"
             "剛心 X_R=Σ(Ky·x)/ΣKy を求めよ。", h=32)
r = table(ws, 34,
          ["壁", "x (m)", "Ky", "Ky·x（記入）"],
          [["Y1", "0", "6", ""],
           ["Y2", "6", "2", ""],
           ["Y3", "12", "2", ""],
           ["計", "—", "10", ""]])
body(ws, r + 2, "→ 剛心 X_R = Σ(Ky·x)/ΣKy = ___ m", h=20)
head(ws, r + 4, "■ 問題 2  偏心距離と弾力半径")
body(ws, r + 5, "(1) 重心 X_g=6m として、偏心距離 ex=|X_g−X_R| を求めよ。"
                "(2) 弾力半径 re=√(KR/ΣKy)、KR=ΣKy·(x−X_R)²=230.4 として re を求めよ。",
     h=40)
head(ws, r + 7, "■ 問題 3  偏心率")
body(ws, r + 8, "偏心率 Re=ex/re を求めよ。制限 0.15 と比較して判定せよ。"
                "弾力半径 re が大きい（剛性要素が外周に分散）ほど Re が"
                "小さくなることも述べよ。", h=40)
head(ws, r + 10, "■ 問題 4  X 方向・Y 方向")
body(ws, r + 11, "偏心率は X 方向・Y 方向それぞれで算出する。"
                 "この例は Y 方向壁の配置から X 座標の剛心を求めた。"
                 "Y 座標の剛心・Y 方向偏心率も同様に X 方向壁の配置から"
                 "求めることを述べよ。両方向とも 0.15 以下が必要。", h=44)

# ---- 4 剛性率の算出 ----
ws = wb.create_sheet("4 剛性率の算出")
setup(ws, [8, 18, 16, 14, 14, 12, 12])
title_row(ws, 1, "4  剛性率の算出")
head(ws, 3, "■ 図 4  剛性率の算出手順")
put_img(ws, figs["rigidity"], "A4", w=820)
head(ws, 30, "■ 問題 1  剛性率の計算")
body(ws, 31, "4 階建て、各階の層剛性（相対値）1F=40（ピロティ）、2F=100、"
             "3F=100、4F=95。剛性率 Rs_i=rs_i/rs_avg を求めよ。", h=32)
r = table(ws, 34,
          ["階", "層剛性 rs", "Rs=rs/rs_avg（記入）", "判定 Rs>=0.6（記入）"],
          [["1F", "40", "", ""],
           ["2F", "100", "", ""],
           ["3F", "100", "", ""],
           ["4F", "95", "", ""],
           ["平均", "83.75", "1.00", "—"]])
head(ws, r + 2, "■ 問題 2  剛性率の意味")
body(ws, r + 3, "剛性率 Rs は『その階の剛さ／全階平均の剛さ』。"
                "Rs<1 は平均より柔らかい階、Rs<0.6 は制限外（要注意）。"
                "1F がピロティで剛性率が下回る典型パターンを述べよ。", h=40)
head(ws, r + 5, "■ 問題 3  層間変形角との関係")
body(ws, r + 6, "剛性率は各階の層間変形角 R_i の逆数（rs_i=1/R_i）から求める。"
                "柔らかい階ほど層間変形角が大きく、rs が小さく、Rs も小さくなる。"
                "剛性率が『変形のしやすさのバランス』を表すことを説明せよ。", h=44)
head(ws, r + 8, "■ 問題 4  改善の方向")
body(ws, r + 9, "1F の Rs=0.48（NG）を 0.6 以上にするには、1F の層剛性を"
                "いくつ以上にすればよいか概算せよ（他階も変わるので目安）。"
                "対策（1F に壁・ブレース追加）にも触れよ。", h=40)

# ---- 5 制限値 ----
ws = wb.create_sheet("5 制限値")
setup(ws, [8, 18, 18, 16, 12, 12])
title_row(ws, 1, "5  偏心率・剛性率の制限値")
head(ws, 3, "■ 図 5  制限値と割増し")
put_img(ws, figs["limits"], "A4", w=800)
head(ws, 28, "■ 問題 1  制限値の暗記")
r = table(ws, 29,
          ["指標", "制限値（記入）", "超えると（記入）"],
          [["偏心率 Re", "", ""],
           ["剛性率 Rs", "", ""]])
head(ws, r + 2, "■ 問題 2  Fe・Fs の意味")
body(ws, r + 3, "偏心率が制限を超えると Fe、剛性率が制限を下回ると Fs を割増す。"
                "この Fes=Fe×Fs（形状係数）が必要保有水平耐力に乗じられる意味"
                "（アンバランスな建物はより強く設計する）を述べよ。", h=44)
head(ws, r + 5, "■ 問題 3  判定")
r = table(ws, r + 6,
          ["No.", "値", "判定（記入）", "対応（記入）"],
          [["(1)", "Re=0.10", "", ""],
           ["(2)", "Re=0.50", "", ""],
           ["(3)", "Rs=0.75", "", ""],
           ["(4)", "Rs=0.48", "", ""]])
head(ws, r + 2, "■ 問題 4  ルートとの関係")
body(ws, r + 3, "ルート 1・2 では Re≤0.15・Rs≥0.6 の確認が必須で、"
                "これを満たせないと上位ルート（保有水平耐力計算）へ進む必要がある。"
                "偏心・剛性の確認がルート選択に関わることを述べよ。", h=44)

# ---- 6 改善方法 ----
ws = wb.create_sheet("6 改善方法")
setup(ws, [8, 18, 18, 16, 12, 12])
title_row(ws, 1, "6  偏心率・剛性率の改善方法")
head(ws, 3, "■ 図 6  改善方法（偏心率・剛性率）")
put_img(ws, figs["improve"], "A4", w=820)
head(ws, 30, "■ 問題 1  偏心率の改善")
body(ws, 31, "偏心率（ねじれ）を改善する方法を 3 つ挙げよ"
             "（壁を平面に対称配置／偏りと反対側に壁を追加／"
             "コアを分散配置）。共通の狙い（剛心 R を重心 G に近づける）を述べよ。",
     h=44)
head(ws, 33, "■ 問題 2  剛性率の改善")
body(ws, 34, "剛性率（柔らかい階）を改善する方法を 3 つ挙げよ"
             "（柔らかい階に壁・ブレースを追加／柱断面を大きく／"
             "他階との剛性差を減らす）。ピロティ階への対策を具体的に。", h=44)
head(ws, 36, "■ 問題 3  改善のトレードオフ")
body(ws, 37, "偏心率改善で壁を追加すると、意匠（開口・動線）と干渉することがある。"
             "剛性率改善で 1F に壁を足すと駐車場・店舗の計画に影響する。"
             "構造と意匠のトレードオフをどう調整するか（早期の協議・"
             "鉄骨ブレース・そで壁等の工夫）を述べよ。", h=44)
head(ws, 39, "■ 問題 4  総合演習")
body(ws, 40, "本編の例（Re=0.50・1F Rs=0.48 でともに NG）の建物について、"
             "偏心率・剛性率を両方 OK にする改善案を提案せよ"
             "（右側の壁追加で Re→0、1F に壁追加で Rs→0.97 など）。"
             "No.10（バランス配置）教材の配置計画とも関連づけよ。", h=44)

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


ah("1  各規程の意味")
an("問1：偏心率＝重心と剛心のズレ／平面／大きいとねじれ／ねじれ振動で隅の柱過大変形。"
   "剛性率＝立面の剛さバランス／立面／柔らかい階があると問題／その階に変形・損傷集中。",
   h=44)
an("問2：(1)偏心大→地震時にねじれ振動が生じ、剛心から遠い柱・壁が過大変形して"
   "先行破壊。(2)剛性率が悪い→柔らかい階（ピロティ等）に変形・損傷が集中し層崩壊。",
   h=44)
an("問3：新耐震以前はピロティのねじれ崩壊等の被害が多発。"
   "1981 年の新耐震で偏心率 Re≤0.15・剛性率 Rs≥0.6 の規定と Fes 割増しが"
   "整備された。", h=40)

ah("2  重心・剛心")
an("問1：①質量 ②図心 ③剛性 ④寄る。重心＝重さの中心、剛心＝かたさの中心。", h=32)
an("問2：壁を左に集中→剛心 R は左に寄る。重心 G（中央）とのズレ（偏心）が"
   "大きくなり、ねじれやすい。", h=32)
an("問3：吹抜け＝重心を動かす（質量が抜ける）。壁の集中＝剛心を動かす。"
   "重い設備の偏り＝重心を動かす。コアの片寄せ＝剛心を動かす"
   "（壁で囲まれ剛性大）。", h=44)
an("問4：剛性要素（壁・ブレース）を平面に対称・バランスよく配置し、"
   "剛心 R を重心 G に一致させる。", h=32)

ah("3  偏心率の算出")
an("問1：Ky·x：Y1=6×0=0、Y2=2×6=12、Y3=2×12=24。合計 36。ΣKy=10。"
   "剛心 X_R=36/10=3.6 m。", h=32)
an("問2：(1)ex=|6−3.6|=2.4 m。(2)re=√(230.4/10)=√23.04=4.8 m。", h=32)
an("問3：Re=ex/re=2.4/4.8=0.50。制限 0.15 の 3 倍超で NG（Fe 割増し）。"
   "弾力半径 re は剛性要素が外周に分散するほど大きくなり、Re が下がる"
   "（＝ねじれに強い）。", h=44)
an("問4：偏心率は X・Y 両方向で算出。Y 方向壁の X 座標分布から X 方向の剛心・"
   "偏心率を、X 方向壁の Y 座標分布から Y 方向を求める。"
   "両方向とも Re≤0.15 が必要。", h=44)

ah("4  剛性率の算出")
an("問1：平均=83.75。Rs：1F=40/83.75=0.48（NG）、2F=100/83.75=1.19（OK）、"
   "3F=1.19（OK）、4F=95/83.75=1.13（OK）。", h=32)
an("問2：Rs はその階の剛さ／全階平均。Rs<0.6 は平均よりかなり柔らかく制限外。"
   "1F ピロティ（駐車場・店舗で壁が無い）は上階に比べ剛性が落ち Rs<0.6 に"
   "なりやすい典型。", h=40)
an("問3：剛性率は層間変形角 R_i の逆数（rs=1/R_i）から算出。"
   "柔らかい階は層間変形角が大きく rs 小→Rs 小。"
   "剛性率は各階の『変形のしやすさのバランス』を数値化したもの。", h=44)
an("問4：1F を 0.6×平均に。平均も動くので概算：1F を 95 程度（他階並み）に"
   "上げれば平均≒97.5、Rs=95/97.5≒0.97 で OK。"
   "対策＝1F に耐震壁・鉄骨ブレースを追加、または柱断面を大きくする。", h=44)

ah("5  制限値")
an("問1：偏心率 Re≤0.15、超えると Fe 割増し。剛性率 Rs≥0.6、下回ると Fs 割増し。",
   h=32)
an("問2：Fe＝偏心による割増し、Fs＝剛性アンバランスによる割増し。"
   "Fes=Fe×Fs を必要保有水平耐力に乗じる。"
   "アンバランスな建物ほど地震時の局部負担が増えるので、より強く設計させる仕組み。",
   h=44)
an("問3：(1)Re=0.10≤0.15 OK。(2)Re=0.50>0.15 NG→壁を対称配置で改善 or Fe 割増し。"
   "(3)Rs=0.75≥0.6 OK。(4)Rs=0.48<0.6 NG→柔階を補強 or Fs 割増し。", h=44)
an("問4：ルート 1・2 は Re≤0.15・Rs≥0.6 が前提。満たせないと"
   "保有水平耐力計算（ルート 3）へ。偏心・剛性の良し悪しが計算ルートを左右する。",
   h=40)

ah("6  改善方法")
an("問1：①壁を平面に対称配置 ②偏りと反対側に壁を追加 ③コアを分散配置。"
   "共通の狙いは剛心 R を重心 G に近づけ偏心 ex を小さくすること。", h=40)
an("問2：①柔らかい階に耐震壁・ブレースを追加 ②その階の柱断面を大きくする "
   "③他階の剛性を落として差を減らす（現実的でない場合も）。"
   "ピロティは 1F に壁・鉄骨ブレースを入れるのが定石。", h=44)
an("問3：偏心改善の壁は開口・動線と干渉→鉄骨ブレースやそで壁で最小限に。"
   "1F の壁は駐車場・店舗に影響→鉄骨ブレース（開放感維持）や"
   "コア壁の活用で両立。意匠と早期に協議し配置を決める。", h=44)
an("問4：右側（Y3）に壁を追加（Ky 2→6）→剛心 X_R=6.0=重心、Re=0（OK）。"
   "1F に壁追加（層剛性 40→95）→ Rs=0.97（OK）。"
   "両方 OK に。配置計画は No.10（バランス配置）と一体で検討する。", h=44)

XLSX = os.path.join(OUT, "偏心率剛性率問題集.xlsx")
wb.save(XLSX)
print("saved:", XLSX)
