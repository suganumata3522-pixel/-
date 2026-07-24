# -*- coding: utf-8 -*-
"""剛床・移行せん断力 問題集（図つき）Excel 生成スクリプト。
出力: docs/diaphragm/剛床移行せん断力問題集.xlsx
1 剛床と非剛床の選別 / 2 剛床・非剛床の力の流れ(水平力分担)
3 移行せん断力の算出 / 4 移行せん断力に対する床の設計 / 5 不適切な吹抜けの判断
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

OUT = "docs/diaphragm"
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
# 図 1: 剛床 vs 非剛床
# ===========================================================================
def fig_rigid_vs():
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 5.0))
    # (a) 剛床（床が剛体として並進・回転）
    ax = axes[0]
    # 変形前
    ax.plot([0, 6, 6, 0, 0], [0, 0, 3, 3, 0], color="#999", lw=1, ls="--")
    # 剛床：床全体が平行移動（剛体）
    sh = 1.0
    ax.add_patch(mpatches.Rectangle((sh, 3 - 0.25), 6, 0.5, fc="#9ec6e8",
                 ec="#1f4e79", lw=2))
    ax.plot([sh, 6 + sh, 6 + sh, sh, sh], [0, 0, 3, 3, 0], color="#c00000",
            lw=2)
    # 3構面の柱（同じだけ変位）
    for x in [0, 3, 6]:
        ax.plot([x, x + sh], [0, 3], color="#1f4e79", lw=1.5)
    ax.annotate("", xy=(6 + sh + 0.4, 3), xytext=(6 + sh - 0.6, 3),
                arrowprops=dict(arrowstyle="-|>", color="#c00000", lw=2))
    ax.text(3, 3.6, "剛床＝床が面内で剛（変形しない）", fontproperties=jp,
            ha="center", fontsize=9, color="#1f4e79")
    ax.text(3, -0.9,
            "床が剛体として並進・回転。\n"
            "各構面の水平変位が床で拘束され揃う\n"
            "→ 剛性比で水平力を分担（＋偏心でねじれ）",
            fontproperties=jp, ha="center", fontsize=9, color="#444")
    ax.set_xlim(-0.5, 8); ax.set_ylim(-1.6, 4.0)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(a) 剛床（rigid diaphragm）", fontproperties=jp,
                 fontsize=11, fontweight="bold")

    # (b) 非剛床（床が面内で変形）
    ax = axes[1]
    ax.plot([0, 6, 6, 0, 0], [0, 0, 3, 3, 0], color="#999", lw=1, ls="--")
    # 非剛床：床が弓なりに変形（各構面バラバラ）
    xs = np.linspace(0, 6, 30)
    top = 3 + 0 * xs
    disp = 0.4 + 1.0 * np.sin(np.pi * xs / 6)  # 中央が多く変位
    ax.plot(xs + disp, top, color="#c00000", lw=2)
    ax.add_patch(mpatches.Rectangle((0.4, 3 - 0.13), 6, 0.26, fc="#f4c9a0",
                 ec="#7a3b3b", lw=1, alpha=0.5))
    for x in [0, 3, 6]:
        d = 0.4 + 1.0 * np.sin(np.pi * x / 6)
        ax.plot([x, x + d], [0, 3], color="#1f4e79", lw=1.5)
    ax.text(3, 3.6, "非剛床＝床が面内で変形する", fontproperties=jp,
            ha="center", fontsize=9, color="#7a3b3b")
    ax.text(3, -0.9,
            "床が弓なりに変形し各構面がバラバラに動く\n"
            "→ 各構面は負担範囲（負担面積）の荷重を受ける\n"
            "（剛性比では分担しない）",
            fontproperties=jp, ha="center", fontsize=9, color="#444")
    ax.set_xlim(-0.5, 8); ax.set_ylim(-1.6, 4.0)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(b) 非剛床（flexible diaphragm）", fontproperties=jp,
                 fontsize=11, fontweight="bold")
    fig.suptitle("図 1  剛床 と 非剛床",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig1_rigid_vs.png")


# ===========================================================================
# 図 2: 水平力分担
# ===========================================================================
def fig_share():
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 5.0))
    # (a) 剛床：剛性比で分担
    ax = axes[0]
    # 3構面 平面（上から見た伏図）
    frames = [("Y1\n壁", 8.0, 444, 0), ("Y2\nﾌﾚｰﾑ", 2.0, 111, 3.5),
              ("Y3\n壁", 8.0, 444, 7)]
    for label, K, Q, y in frames:
        ax.add_patch(mpatches.Rectangle((0, y - 0.2), 8, 0.4,
                     fc="#bcd2ea" if K > 5 else "#e8e8e8", ec="k", lw=1))
        ax.text(-0.8, y, label, fontproperties=jp, ha="center", va="center",
                fontsize=8)
        # 分担せん断（矢印の長さ∝Q）
        ax.annotate("", xy=(4 + Q / 130, y + 0.55), xytext=(4, y + 0.55),
                    arrowprops=dict(arrowstyle="-|>", color="#c00000",
                                    lw=2.5))
        ax.text(4 + Q / 130 + 0.3, y + 0.55, f"{Q}kN", fontproperties=jp,
                fontsize=8, color="#c00000", va="center")
    ax.text(4, 9.0, "層せん断 Q=1000kN を剛性比 K で分担", fontproperties=jp,
            ha="center", fontsize=9, color="#1f4e79")
    ax.text(4, -1.2,
            "剛床：Qi = Q × Ki/ΣK\n"
            "剛性の大きい壁構面（Y1・Y3）が多く負担",
            fontproperties=jp, ha="center", fontsize=9, color="#444")
    ax.set_xlim(-1.8, 9.5); ax.set_ylim(-2.0, 9.5)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(a) 剛床の分担（剛性比）", fontproperties=jp, fontsize=11,
                 fontweight="bold")

    # (b) 非剛床：負担面積で分担
    ax = axes[1]
    for label, y in [("Y1", 0), ("Y2", 3.5), ("Y3", 7)]:
        ax.add_patch(mpatches.Rectangle((0, y - 0.2), 8, 0.4, fc="#e8e8e8",
                     ec="k", lw=1))
        ax.text(-0.8, y, label, fontproperties=jp, ha="center", va="center",
                fontsize=8)
    # 負担範囲（各構面の中間で分ける）
    ax.axhline(1.75, color="#7a3b3b", lw=1, ls=":")
    ax.axhline(5.25, color="#7a3b3b", lw=1, ls=":")
    ax.annotate("", xy=(8.6, 0), xytext=(8.6, 1.75),
                arrowprops=dict(arrowstyle="<|-|>", color="#7a3b3b"))
    ax.text(9.0, 0.9, "負担\n範囲", fontproperties=jp, fontsize=7.5,
            color="#7a3b3b", va="center")
    # 各構面へ負担面積の荷重（矢印同程度）
    for y in [0, 3.5, 7]:
        ax.annotate("", xy=(5, y + 0.5), xytext=(4, y + 0.5),
                    arrowprops=dict(arrowstyle="-|>", color="#c00000",
                                    lw=2))
    ax.text(4, 9.0, "各構面は『負担範囲』の荷重を受ける", fontproperties=jp,
            ha="center", fontsize=9, color="#7a3b3b")
    ax.text(4, -1.2,
            "非剛床：剛性でなく分担幅（負担面積）で決まる\n"
            "剛性の大きい壁でも負担範囲分しか受けない",
            fontproperties=jp, ha="center", fontsize=9, color="#444")
    ax.set_xlim(-1.8, 10.2); ax.set_ylim(-2.0, 9.5)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(b) 非剛床の分担（負担面積）", fontproperties=jp,
                 fontsize=11, fontweight="bold")
    fig.suptitle("図 2  剛床・非剛床の水平力分担",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig2_share.png")


# ===========================================================================
# 図 3: 移行せん断力
# ===========================================================================
def fig_transfer():
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 5.4))
    # (a) セットバック・壁抜けで床が力を移送
    ax = axes[0]
    h = 3
    # 下階（広い・壁あり）
    ax.add_patch(mpatches.Rectangle((0, 0), 8, h, fc="#eef3f8", ec="k",
                 lw=1.2))
    ax.add_patch(mpatches.Rectangle((0.5, 0.3), 1.0, h - 0.6, fc="#e8c9ce",
                 ec="k", lw=1, hatch="//", alpha=0.7))
    ax.add_patch(mpatches.Rectangle((6.5, 0.3), 1.0, h - 0.6, fc="#e8c9ce",
                 ec="k", lw=1, hatch="//", alpha=0.7))
    ax.text(1.0, 0.0 - 0.4, "下階の壁", fontproperties=jp, ha="center",
            fontsize=7.5, color="#7a3b3b")
    # 上階（セットバック・壁位置ずれ）
    ax.add_patch(mpatches.Rectangle((2, h), 4, h, fc="#eef3f8", ec="k",
                 lw=1.2))
    ax.add_patch(mpatches.Rectangle((3.4, h + 0.3), 1.0, h - 0.6,
                 fc="#e8c9ce", ec="k", lw=1, hatch="//", alpha=0.7))
    ax.text(4.0, 2 * h + 0.3, "上階の壁（位置ずれ）", fontproperties=jp,
            ha="center", fontsize=7.5, color="#7a3b3b")
    # 地震力（上階）
    ax.annotate("", xy=(6.3, 2 * h - 0.5), xytext=(5.3, 2 * h - 0.5),
                arrowprops=dict(arrowstyle="-|>", color="#c00000", lw=2))
    ax.text(4, 2 * h - 0.8, "上階の地震力 P", fontproperties=jp, ha="center",
            fontsize=8.5, color="#c00000")
    # 床（境界＝h レベル）でせん断移送
    ax.plot([0, 8], [h, h], color="#1f7a1f", lw=3)
    ax.annotate("床（水平構面）が\nP を下階の壁位置まで移送\n→ 移行せん断力 T",
                xy=(4, h), xytext=(8.4, h - 0.3), fontproperties=jp,
                fontsize=8.5, color="#1f7a1f",
                arrowprops=dict(arrowstyle="->", color="#1f7a1f"))
    ax.text(4, -1.4,
            "上下階で耐震要素の位置が変わる（セットバック・壁抜け）と\n"
            "その階の床が集中的に水平力を移送する（移行せん断力）",
            fontproperties=jp, ha="center", fontsize=9, color="#444")
    ax.set_xlim(-0.5, 10.5); ax.set_ylim(-2.0, 2 * h + 0.9)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(a) 移行せん断力が生じる仕組み", fontproperties=jp,
                 fontsize=11, fontweight="bold")

    # (b) 床＝深い梁（ダイアフラム）モデル
    ax = axes[1]
    # 床を平面（伏図）で、水平力を受ける深い梁として
    ax.add_patch(mpatches.Rectangle((0, 0), 10, 3, fc="#cfe0f0", ec="k",
                 lw=1.2))
    ax.text(5, 3.4, "床（水平構面）＝横向きの深い梁", fontproperties=jp,
            ha="center", fontsize=9, color="#1f4e79")
    # 分布地震力（床全体）
    for xx in np.linspace(0.5, 9.5, 8):
        ax.annotate("", xy=(xx, 3), xytext=(xx, 3.7),
                    arrowprops=dict(arrowstyle="-|>", color="#c00000", lw=1))
    ax.text(5, 4.0, "床に作用する水平力（慣性力）", fontproperties=jp,
            ha="center", fontsize=8, color="#c00000")
    # 両端＝壁（支点）
    for x in [0, 10]:
        ax.add_patch(mpatches.Rectangle((x - 0.3, -0.6), 0.6, 0.6,
                     fc="#e8c9ce", ec="k", hatch="//"))
        ax.annotate("", xy=(x, -0.9), xytext=(x, -1.5),
                    arrowprops=dict(arrowstyle="-|>", color="#1f7a1f", lw=2))
    ax.text(0, -1.8, "壁（支点反力）", fontproperties=jp, ha="center",
            fontsize=7.5, color="#1f7a1f")
    ax.text(10, -1.8, "壁（支点反力）", fontproperties=jp, ha="center",
            fontsize=7.5, color="#1f7a1f")
    ax.text(5, -2.6,
            "床を『両端を壁で支えた深い梁』とみなす。\n"
            "床の面内せん断・曲げ（引張は端部の梁筋）で伝達",
            fontproperties=jp, ha="center", fontsize=9, color="#444")
    ax.set_xlim(-1, 11); ax.set_ylim(-3.2, 4.4)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(b) 床＝ダイアフラム（深い梁）モデル", fontproperties=jp,
                 fontsize=11, fontweight="bold")
    fig.suptitle("図 3  移行せん断力（床を介した水平力の受け渡し）",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig3_transfer.png")


# ===========================================================================
# 図 4: 床の設計（有効床幅・面内せん断）
# ===========================================================================
def fig_floor_design():
    fig, ax = plt.subplots(figsize=(11, 5.2))
    # 伏図：床に吹抜けがあり、有効床幅が狭まる
    ax.add_patch(mpatches.Rectangle((0, 0), 12, 6, fc="#cfe0f0", ec="k",
                 lw=1.2))
    # 吹抜け
    ax.add_patch(mpatches.Rectangle((3.5, 2.5), 5, 2, fc="white", ec="#c00000",
                 lw=2, hatch="xx"))
    ax.text(6, 3.5, "吹抜け\n5m", fontproperties=jp, ha="center", va="center",
            fontsize=9, color="#c00000")
    # 有効床幅（吹抜けの上下に残る床）
    ax.annotate("", xy=(9.5, 0), xytext=(9.5, 2.5),
                arrowprops=dict(arrowstyle="<|-|>", color="#1f7a1f", lw=1.5))
    ax.annotate("", xy=(9.5, 4.5), xytext=(9.5, 6),
                arrowprops=dict(arrowstyle="<|-|>", color="#1f7a1f", lw=1.5))
    ax.text(10.0, 1.25, "有効床幅\nの一部", fontproperties=jp, fontsize=8,
            color="#1f7a1f", va="center")
    # せん断の流れ
    for yy in [1.2, 5.0]:
        ax.annotate("", xy=(11, yy), xytext=(1, yy),
                    arrowprops=dict(arrowstyle="-|>", color="#7a3b3b", lw=2,
                                    alpha=0.6))
    ax.text(6, -0.9,
            "吹抜けで床が欠損 → 残る有効床幅 Beff でせん断を伝える\n"
            "面内せん断応力 τ = T / (Beff · t)  （t:床厚）",
            fontproperties=jp, ha="center", fontsize=9.5, color="#444")
    ax.text(6, 7.0,
            "T=300kN・全幅12m・吹抜け5m→Beff=7m・t=150 → τ=0.29 N/mm²\n"
            "吹抜けを 9m に広げると Beff=3m → τ=0.67 N/mm²（2.3 倍！）",
            fontproperties=jp, ha="center", fontsize=9, color="#c00000")
    ax.set_xlim(-0.5, 12.5); ax.set_ylim(-1.6, 7.6)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("図 4  移行せん断力に対する床の設計（有効床幅・面内せん断）",
                 fontproperties=jp, fontsize=12, fontweight="bold")
    return save(fig, "fig4_floor.png")


# ===========================================================================
# 図 5: 不適切な吹抜け
# ===========================================================================
def fig_void_ng():
    fig, axes = plt.subplots(1, 3, figsize=(14.5, 4.4))
    # (a) くびれ部の吹抜け（NG）
    ax = axes[0]
    ax.add_patch(mpatches.Polygon([(0, 0), (5, 0), (5, 2), (3, 2), (3, 4),
                 (5, 4), (5, 6), (0, 6)], closed=True, fc="#cfe0f0", ec="k",
                 lw=1.2))
    ax.add_patch(mpatches.Rectangle((0.5, 2.3), 2, 1.4, fc="white",
                 ec="#c00000", lw=2, hatch="xx"))
    ax.text(3.2, 3, "くびれ部", fontproperties=jp, fontsize=8, color="#c00000")
    ax.text(2.2, -0.9, "L 形・くびれの入隅に\n吹抜け → 力が伝わらない",
            fontproperties=jp, ha="center", fontsize=8.5, color="#444")
    ax.set_xlim(-0.5, 6); ax.set_ylim(-1.7, 6.5)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(a) くびれ部の吹抜け", fontproperties=jp, fontsize=10,
                 fontweight="bold")

    # (b) 大きな吹抜けで床分断（NG）
    ax = axes[1]
    ax.add_patch(mpatches.Rectangle((0, 0), 6, 6, fc="#cfe0f0", ec="k",
                 lw=1.2))
    ax.add_patch(mpatches.Rectangle((1, 1), 4, 4, fc="white", ec="#c00000",
                 lw=2, hatch="xx"))
    ax.text(3, 3, "大吹抜け\n（EV/階段）", fontproperties=jp, ha="center",
            va="center", fontsize=8, color="#c00000")
    ax.text(3, -0.9, "床の大部分が吹抜け\n→ 残る床が細く τ 過大",
            fontproperties=jp, ha="center", fontsize=8.5, color="#444")
    ax.set_xlim(-0.5, 6.5); ax.set_ylim(-1.7, 6.5)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(b) 大吹抜けで床分断", fontproperties=jp, fontsize=10,
                 fontweight="bold")

    # (c) 良い例（分散・小さい吹抜け）
    ax = axes[2]
    ax.add_patch(mpatches.Rectangle((0, 0), 6, 6, fc="#cfead4", ec="k",
                 lw=1.2))
    ax.add_patch(mpatches.Rectangle((2.3, 2.3), 1.4, 1.4, fc="white",
                 ec="#1f7a1f", lw=1.5))
    ax.text(3, 3, "小吹抜け", fontproperties=jp, ha="center", va="center",
            fontsize=8, color="#1f7a1f")
    ax.text(3, -0.9, "吹抜けは小さく中央寄り\n→ 有効床幅を確保（OK）",
            fontproperties=jp, ha="center", fontsize=8.5, color="#1f7a1f")
    ax.set_xlim(-0.5, 6.5); ax.set_ylim(-1.7, 6.5)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(c) 良い例", fontproperties=jp, fontsize=10,
                 fontweight="bold")
    fig.suptitle("図 5  吹抜けが不適切（せん断力移行が必要）な部位",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig5_void.png")


figs = {
    "rigid_vs": fig_rigid_vs(),
    "share": fig_share(),
    "transfer": fig_transfer(),
    "floor": fig_floor_design(),
    "void": fig_void_ng(),
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
title_row(ws, 1, "剛床・移行せん断力 問題集（RC マンション設計担当・新人向け）",
          span=4)
body(ws, 2,
     "目標：剛床・移行せん断力を理解すること。床（水平構面）が水平力をどう伝えるか、"
     "剛床/非剛床の選別、力の流れ（水平力分担）、移行せん断力の算出、床の設計、"
     "不適切な吹抜けの判断までを通す。『床は水平力を運ぶ深い梁』が勘所。",
     span=4, h=44)
r = table(ws, 4,
          ["No.", "シート", "到達目標", "図"],
          [["1", "1 剛床と非剛床の選別",
            "剛床と非剛床の選別ができる", "剛床vs非剛床"],
           ["2", "2 力の流れ（水平力分担）",
            "剛床・非剛床時の水平力分担を説明できる", "剛性比/負担面積"],
           ["3", "3 移行せん断力の算出",
            "移行せん断力を算出できる", "力の移送・深い梁"],
           ["4", "4 床の設計",
            "移行せん断力に対して床の設計ができる", "有効床幅・τ"],
           ["5", "5 不適切な吹抜け",
            "せん断力移行が必要な吹抜けを判断できる", "NG例・良い例"]])
body(ws, r + 2,
     "共通例：層せん断 Q=1,000 kN、3 構面の剛性比 8:2:8 → 分担 444:111:444 kN。"
     "床全幅 12m・吹抜け 5m → 有効床幅 7m、移行せん断 T=300kN、床厚 150 → "
     "τ≒0.29 N/mm²。数値は本教材作成時に検算済み。実務は RC 規準・技術基準解説書で"
     "確認すること。",
     span=4, h=58)

# ---- 1 剛床と非剛床の選別 ----
ws = wb.create_sheet("1 剛床と非剛床")
setup(ws, [8, 18, 18, 16, 12, 12])
title_row(ws, 1, "1  剛床と非剛床の選別")
head(ws, 3, "■ 図 1  剛床 と 非剛床")
put_img(ws, figs["rigid_vs"], "A4", w=820)
head(ws, 30, "■ 問題 1  定義（穴埋め）")
body(ws, 31, "剛床とは、床（水平構面）が面内で【 ① 】で、水平力を受けると床全体が"
             "【 ② 】として並進・回転する床。各鉛直構面の水平変位が揃うため、"
             "水平力を【 ③ 】比で分担する。非剛床は床が面内で【 ④ 】し、"
             "各構面がバラバラに動く。", h=44)
head(ws, 33, "■ 問題 2  剛床とみなせるか（選別）")
body(ws, 34, "次の床が『剛床とみなせる／みなせない（非剛床）』を判定せよ。", h=20)
r = table(ws, 36,
          ["No.", "床の状況", "剛床/非剛床（記入）"],
          [["(1)", "一般的な RC スラブ（全面連続・十分な厚さ）", ""],
           ["(2)", "大きな吹抜けで床が細く分断されている", ""],
           ["(3)", "L 形・コの字形で入隅がくびれている", ""],
           ["(4)", "デッキプレート等で面内剛性が小さい床", ""],
           ["(5)", "細長い（アスペクト比大）の床", ""]])
head(ws, r + 2, "■ 問題 3  剛床仮定の意義")
body(ws, r + 3, "一貫構造計算では通常『剛床仮定』を置く。その利点"
                "（各節点の水平変位を床ごとに 1 つにまとめられ計算が簡単）と、"
                "剛床とみなせない場合に必要な配慮（弾性床・分割）を述べよ。", h=44)
head(ws, r + 5, "■ 問題 4  マンションでの判断")
body(ws, r + 6, "RC マンションの一般階は剛床とみなせることが多いが、"
                "剛床仮定が危うくなる部位を 2 つ挙げよ"
                "（大きな吹抜け／くびれ・雁行の入隅）。", h=40)

# ---- 2 力の流れ ----
ws = wb.create_sheet("2 力の流れ")
setup(ws, [8, 18, 16, 14, 14, 12, 12])
title_row(ws, 1, "2  剛床・非剛床時の力の流れ（水平力分担）")
head(ws, 3, "■ 図 2  剛性比 と 負担面積")
put_img(ws, figs["share"], "A4", w=820)
head(ws, 30, "■ 問題 1  剛床の分担計算")
body(ws, 31, "層せん断 Q=1,000 kN。3 構面の剛性 K=8:2:8（Y1:Y2:Y3）。"
             "剛床として各構面の分担 Qi=Q×Ki/ΣK を求めよ。", h=32)
r = table(ws, 34,
          ["構面", "剛性 K", "分担率 Ki/ΣK（記入）", "分担 Qi (kN)（記入）"],
          [["Y1（壁）", "8", "", ""],
           ["Y2（フレーム）", "2", "", ""],
           ["Y3（壁）", "8", "", ""],
           ["計", "18", "1.00", "1000"]])
head(ws, r + 2, "■ 問題 2  剛床と非剛床で分担はどう違うか")
body(ws, r + 3, "同じ 3 構面で、(a) 剛床 と (b) 非剛床（負担面積が均等）では、"
                "剛性の大きい壁構面（Y1・Y3）の分担がどう変わるか。"
                "剛床では剛性比、非剛床では負担面積で決まることを説明せよ。", h=44)
head(ws, r + 5, "■ 問題 3  偏心とねじれ")
body(ws, r + 6, "剛床では、剛心と重心がずれる（偏心）と、水平力に加えて"
                "『ねじれ』が生じ、剛心から遠い構面の分担が増える。"
                "この現象を No.10（偏心率）教材と関連づけて 2 行で述べよ。", h=44)
head(ws, r + 8, "■ 問題 4  力の伝達経路")
body(ws, r + 9, "水平力（地震・風）が『床 → 鉛直構面（壁・柱）→ 基礎 → 地盤』へ"
                "流れる経路で、床（水平構面）が果たす役割を 1 行で"
                "（各構面へ水平力を分配・伝達する）。", h=32)

# ---- 3 移行せん断力の算出 ----
ws = wb.create_sheet("3 移行せん断力の算出")
setup(ws, [8, 18, 16, 14, 14, 12, 12])
title_row(ws, 1, "3  移行せん断力の算出")
head(ws, 3, "■ 図 3  移行せん断力の仕組み・深い梁モデル")
put_img(ws, figs["transfer"], "A4", w=820)
head(ws, 30, "■ 問題 1  移行せん断力とは（穴埋め）")
body(ws, 31, "移行せん断力とは、上下階で耐震要素（壁）の【 ① 】が変わる"
             "（セットバック・壁抜け・ピロティ等）ときに、その階の【 ② 】が"
             "水平力を抵抗要素の位置まで【 ③ 】するせん断力。"
             "床を『両端を壁で支えた【 ④ 】』とみなして伝達を検討する。", h=44)
head(ws, 33, "■ 問題 2  移行せん断力の算定")
body(ws, 34, "上階の地震力 P=400 kN が、上階には受ける壁がなく、床を介して"
             "下階の壁位置へ移送される。移行せん断力 T を求めよ（この単純例では T=P）。"
             "実際には力の作用位置と抵抗位置の差から釣合いで求めることを述べよ。", h=44)
head(ws, 36, "■ 問題 3  ダイアフラム（深い梁）モデル")
body(ws, 37, "床を『横向きの深い梁』とみなすと、床には面内の【 ① 】と"
             "【 ② 】が生じる。曲げによる引張は床の端部（境界の梁・帯筋）が、"
             "せん断は床全体（有効床幅）が負担する。この考え方を説明せよ。", h=44)
head(ws, 39, "■ 問題 4  移行せん断力が大きくなる条件")
body(ws, 40, "移行せん断力が大きくなる（床の負担が増す）条件を 3 つ挙げよ"
             "（耐震要素の位置ずれが大きい／壁抜け・ピロティ／セットバック・"
             "上下で構造形式が変わる）。", h=40)

# ---- 4 床の設計 ----
ws = wb.create_sheet("4 床の設計")
setup(ws, [8, 18, 16, 14, 14, 12, 12])
title_row(ws, 1, "4  移行せん断力に対する床の設計")
head(ws, 3, "■ 図 4  有効床幅と面内せん断応力")
put_img(ws, figs["floor"], "A4", w=760)
head(ws, 30, "■ 問題 1  面内せん断応力の計算")
body(ws, 31, "床全幅 12m、吹抜け 5m → 有効床幅 Beff=7m、床厚 t=150mm、"
             "移行せん断力 T=300 kN。面内せん断応力 τ=T/(Beff·t) を求めよ"
             "（N/mm²）。", h=32)
r = table(ws, 34,
          ["項目", "式", "値（記入）"],
          [["有効床幅 Beff", "12 − 5", ""],
           ["面内せん断応力 τ", "300×10³/(7000×150)", ""]])
head(ws, r + 2, "■ 問題 2  吹抜けを広げた場合")
body(ws, r + 3, "吹抜けを 5m → 9m に広げると、有効床幅 Beff と τ はどうなるか。"
                "τ が何倍になるか計算せよ（Beff が狭まるほど τ 急増）。", h=32)
head(ws, r + 5, "■ 問題 3  床の補強")
body(ws, r + 6, "τ がコンクリート床の許容面内せん断応力度を超える場合の対策を"
                "3 つ挙げよ（床の増厚／ダイアフラム筋（面内せん断・引張補強）の追加／"
                "小梁・境界梁で床を補強）。", h=40)
head(ws, r + 8, "■ 問題 4  床の端部（コード材）")
body(ws, r + 9, "床を深い梁とみなすと、曲げによる引張は床の端部に集中する。"
                "この端部の引張を負担する『コード材（境界梁・帯筋）』の役割を"
                "述べよ。開口・吹抜けが端部にあると特に注意が要る理由も。", h=44)

# ---- 5 不適切な吹抜け ----
ws = wb.create_sheet("5 不適切な吹抜け")
setup(ws, [8, 18, 18, 16, 12, 12])
title_row(ws, 1, "5  吹抜けが不適切（せん断力移行が必要）な部位の判断")
head(ws, 3, "■ 図 5  NG 例・良い例")
put_img(ws, figs["void"], "A4", w=820)
head(ws, 28, "■ 問題 1  不適切な吹抜けの判定")
body(ws, 29, "次の吹抜けが『不適切（せん断力移行の検討が必要）／許容』かを判定せよ。",
     h=20)
r = table(ws, 31,
          ["No.", "吹抜けの位置・大きさ", "判定（記入）"],
          [["(1)", "L 形・くびれの入隅にある吹抜け", ""],
           ["(2)", "床の大部分を占める大吹抜け（EV・階段が集中）", ""],
           ["(3)", "床中央の小さな吹抜け（有効床幅を確保）", ""],
           ["(4)", "耐震要素へ力を送る経路上を横切る吹抜け", ""]])
head(ws, r + 2, "■ 問題 2  なぜ位置が問題か")
body(ws, r + 3, "同じ面積の吹抜けでも、位置によって危険度が変わる。"
                "『くびれ部・入隅』『力の伝達経路上』の吹抜けが特に危険な理由を、"
                "有効床幅とせん断の流れから説明せよ。", h=44)
head(ws, r + 5, "■ 問題 3  対策")
body(ws, r + 6, "不適切な吹抜けを設けざるを得ない場合の対策を 3 つ挙げよ"
                "（吹抜け周囲を境界梁で囲う／床を増厚・補強配筋／"
                "吹抜けを小さく・位置を移す／エキスパンションで別構造に分ける）。",
     h=40)
head(ws, r + 8, "■ 問題 4  実務チェック")
body(ws, r + 9, "意匠から大きな吹抜け（メゾネット・吹抜けリビング）の要望が出たとき、"
                "構造設計者が確認する項目を 3 つ挙げよ"
                "（有効床幅とτ／床の伝達経路が切れないか／"
                "剛床仮定が成立するか（非剛床なら別途検討））。", h=44)

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


ah("1  剛床と非剛床")
an("問1：①剛（変形しない）②剛体 ③剛性（比）④変形。"
   "剛床は床が剛体として動き変位が揃う、非剛床は床が面内変形する。", h=44)
an("問2：(1)剛床（一般 RC スラブは面内剛性大）(2)非剛床（分断で剛性低下）"
   "(3)非剛床寄り（くびれで伝達不良）(4)非剛床（デッキは面内柔）"
   "(5)非剛床寄り（細長いと弓なりに変形）。", h=44)
an("問3：剛床仮定＝各床の水平自由度を並進 2＋回転 1 にまとめられ、"
   "計算が大幅に簡単・安定。剛床とみなせない場合は弾性床（面内剛性を考慮）や"
   "床を分割してモデル化し、床自体の面内応力を検討する。", h=44)
an("問4：①大きな吹抜け（床が細く分断）②くびれ・雁行の入隅"
   "（力が伝わりにくい）。一般階は剛床でよいが、これらは要注意。", h=40)

ah("2  力の流れ")
an("問1：ΣK=18。分担率 Y1=8/18=0.44、Y2=2/18=0.11、Y3=0.44。"
   "分担 Y1=444kN、Y2=111kN、Y3=444kN（計 1000）。"
   "剛性の大きい壁が多く負担する。", h=44)
an("問2：剛床＝剛性比で分担 → 壁（Y1・Y3）が大きく負担（444kN）。"
   "非剛床＝負担面積で分担 → 壁でも負担範囲分（≒333kN）しか受けず、"
   "剛性は関係しない。剛床か非剛床かで壁の負担が大きく変わる。", h=44)
an("問3：剛床では剛心（剛性の中心）と重心（質量の中心）がずれると、"
   "水平力に偏心モーメントが加わりねじれが生じ、剛心から遠い構面の分担が増える。"
   "偏心率を小さく抑える配置が重要（No.10 参照）。", h=44)
an("問4：床は水平力を各鉛直構面（壁・柱）へ分配・伝達する『水平の板』。"
   "床がなければ各構面に力が届かない。床→構面→基礎→地盤の経路の起点。", h=32)

ah("3  移行せん断力の算出")
an("問1：①位置 ②床（水平構面）③移送（伝達）④深い梁（ダイアフラム）。", h=32)
an("問2：単純例では T=P=400 kN。実際は、水平力の作用位置（上階の慣性力）と"
   "抵抗要素（下階の壁）の位置の差に対し、床が両者を結んで釣り合わせる"
   "せん断力として T を算定する。", h=44)
an("問3：床＝横向きの深い梁とみなすと、面内①せん断②曲げが生じる。"
   "曲げ引張は床端部（境界梁・コード材）が、面内せん断は床全体（有効床幅）が"
   "負担する。壁を支点、慣性力を分布荷重とした梁のイメージ。", h=44)
an("問4：①上下階で耐震要素の位置ずれが大きい ②壁抜け・ピロティ（下階で壁消失）"
   "③セットバック・上下で構造形式が変わる。これらで床の移送負担が増える。", h=40)

ah("4  床の設計")
an("問1：Beff=12−5=7m。τ=300×10³/(7000×150)=300,000/1,050,000=0.286 N/mm²。",
   h=32)
an("問2：吹抜け 9m → Beff=12−9=3m。τ=300×10³/(3000×150)=0.667 N/mm²。"
   "0.667/0.286=2.3 倍。吹抜けを広げ有効床幅が狭まると τ が急増する。", h=40)
an("問3：①床を増厚して断面積を増やす ②ダイアフラム筋（面内せん断・端部引張の"
   "補強配筋）を追加 ③吹抜け周囲を小梁・境界梁で囲って補強。"
   "τ が許容を超えたらこれらで対応。", h=40)
an("問4：床を深い梁とみなすと曲げ引張が端部に集中する。この引張を負担するのが"
   "コード材（境界梁・床端部の帯筋）。端部に開口・吹抜けがあるとコード材が"
   "切れて引張を伝えられず、力の流れが途切れるため特に注意。", h=44)

ah("5  不適切な吹抜け")
an("問1：(1)不適切（くびれ入隅は伝達不良）(2)不適切（有効床幅が過小で τ 過大）"
   "(3)許容（有効床幅を確保）(4)不適切（伝達経路を分断）。", h=44)
an("問2：くびれ部・入隅は元々床幅が狭く、そこに吹抜けが加わると有効床幅が"
   "極端に小さくなり τ が過大に。伝達経路上の吹抜けは、力が抵抗要素へ届く"
   "『通り道』を塞ぐため力の流れが途切れる。位置が面積以上に重要。", h=44)
an("問3：①吹抜け周囲を境界梁で囲い、床端部の引張・せん断を負担させる "
   "②床を増厚・補強配筋 ③吹抜けを小さく／位置を伝達経路から外す "
   "④どうしても大きい場合はエキスパンションで別構造に分ける。", h=44)
an("問4：①吹抜け後の有効床幅と面内せん断応力 τ ②水平力の伝達経路が"
   "切れていないか（抵抗要素へ届くか）③剛床仮定が成立するか"
   "（非剛床になるなら弾性床・分割で別途検討）。", h=44)

XLSX = os.path.join(OUT, "剛床移行せん断力問題集.xlsx")
wb.save(XLSX)
print("saved:", XLSX)
