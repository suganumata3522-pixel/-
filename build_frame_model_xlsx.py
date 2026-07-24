# -*- coding: utf-8 -*-
"""架構モデル作成 問題集（図つき）Excel 生成スクリプト。
出力: docs/frame_model/架構モデル作成問題集.xlsx
1 架構モデルの作成(2階建て仮想建物・スパン・階高)
2 標準部材剛性(断面形状→I→K→剛比)
3 剛度増大率(床・壁の取り付き→φ)
4 剛域の設定(接合部＋袖壁・パラペット)
RC造マンションの設計担当を想定。数値は build 時に検算済み。
No.4 教材(rc_frame_design)の姉妹編。
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

OUT = "docs/frame_model"
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
# 図 1: 2階建て仮想建物の架構モデル
# ===========================================================================
def fig_model():
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 5.4),
                              gridspec_kw={"width_ratios": [1.2, 1.0]})
    # (a) 立面（実建物 → 線材モデル）
    ax = axes[0]
    spans = [0, 6, 12]
    h = 3.5
    ys = [0, h, 2 * h]
    # 実部材（薄いグレー）
    for x in spans:
        ax.add_patch(mpatches.Rectangle((x - 0.3, 0), 0.6, 2 * h,
                                        fc="#e8e8e8", ec="#ccc", lw=0.6,
                                        zorder=1))
    for y in [h, 2 * h]:
        for i in range(len(spans) - 1):
            ax.add_patch(mpatches.Rectangle((spans[i] + 0.3, y - 0.35),
                                            spans[i + 1] - spans[i] - 0.6, 0.7,
                                            fc="#e8e8e8", ec="#ccc", lw=0.6,
                                            zorder=1))
    # 線材モデル（軸線）
    for x in spans:
        ax.plot([x, x], [0, 2 * h], color="#1f4e79", lw=2, zorder=3)
    for y in [h, 2 * h]:
        ax.plot([spans[0], spans[-1]], [y, y], color="#c00000", lw=2,
                zorder=3)
    # 節点
    for x in spans:
        for y in ys:
            ax.plot(x, y, "o", color="k", ms=7, zorder=5)
    # 支点（固定）
    for x in spans:
        ax.plot(x, 0, "s", color="k", ms=10, zorder=5)
        ax.plot([x - 0.35, x + 0.35], [-0.35, -0.35], color="k", lw=2)
    # ラベル
    ax.text(-1.3, h / 2, "1階\n階高 3.5", fontproperties=jp, fontsize=8,
            va="center", ha="center", color="#1f4e79")
    ax.text(-1.3, h + h / 2, "2階\n階高 3.5", fontproperties=jp, fontsize=8,
            va="center", ha="center", color="#1f4e79")
    ax.text(3, 2 * h + 0.4, "スパン 6.0m", fontproperties=jp, ha="center",
            fontsize=8, color="#c00000")
    ax.text(9, 2 * h + 0.4, "スパン 6.0m", fontproperties=jp, ha="center",
            fontsize=8, color="#c00000")
    ax.text(6, -1.2, "実部材（グレー）を軸線の線材（柱=青／梁=赤）に置換\n"
                     "節点＝柱梁の交点、支点＝柱脚固定",
            fontproperties=jp, ha="center", fontsize=9, color="#444")
    ax.set_xlim(-2.4, 13); ax.set_ylim(-1.7, 2 * h + 1.0)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(a) 2 階建て架構の立面モデル（X 方向）",
                 fontproperties=jp, fontsize=11, fontweight="bold")

    # (b) 伏図（平面）
    ax = axes[1]
    xl = [0, 6, 12]
    yl = [0, 7]
    for x in xl:
        for y in yl:
            ax.add_patch(mpatches.Rectangle((x - 0.3, y - 0.3), 0.6, 0.6,
                                            fc="#bdbdbd", ec="k", lw=1,
                                            zorder=3))
    for y in yl:
        ax.plot([xl[0], xl[-1]], [y, y], color="#c00000", lw=2)
    for x in xl:
        ax.plot([x, x], [yl[0], yl[-1]], color="#c00000", lw=2)
    # 軸線名
    for i, x in enumerate(xl):
        ax.text(x, -0.9, f"X{i+1}", fontproperties=jp, ha="center",
                fontsize=8, bbox=dict(boxstyle="circle,pad=0.1", fc="white",
                                      ec="k", lw=0.6))
    for i, y in enumerate(yl):
        ax.text(-0.9, y, f"Y{i+1}", fontproperties=jp, va="center",
                fontsize=8, bbox=dict(boxstyle="circle,pad=0.1", fc="white",
                                      ec="k", lw=0.6))
    ax.text(3, 7.5, "6.0m", fontproperties=jp, ha="center", fontsize=8)
    ax.text(9, 7.5, "6.0m", fontproperties=jp, ha="center", fontsize=8)
    ax.text(-0.9, 3.5, "7.0m", fontproperties=jp, ha="center", fontsize=8,
            rotation=90)
    ax.text(6, -1.9, "伏図：X 方向 2 スパン × Y 方向 1 スパン\n"
                     "柱 6 本・大梁で構成（純ラーメン）",
            fontproperties=jp, ha="center", fontsize=9, color="#444")
    ax.set_xlim(-1.6, 13); ax.set_ylim(-2.4, 8.2)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(b) 基準階 伏図", fontproperties=jp, fontsize=11,
                 fontweight="bold")
    fig.suptitle("図 1  2 階建て仮想建物の架構モデル",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig1_model.png")


# ===========================================================================
# 図 2: 標準部材剛性
# ===========================================================================
def fig_stiffness():
    fig, ax = plt.subplots(figsize=(11.5, 4.8))
    ax.text(0.5, 0.93, "断面形状 → 断面二次モーメント I → 剛度 K → 剛比 k",
            transform=ax.transAxes, ha="center", fontproperties=jp,
            fontsize=12, fontweight="bold", color="#1f4e79")
    # 断面図
    ax1 = fig.add_axes([0.05, 0.2, 0.2, 0.5])
    ax1.add_patch(mpatches.Rectangle((0, 0), 400, 700, fc="#bcd2ea", ec="k"))
    ax1.set_xlim(-100, 500); ax1.set_ylim(-100, 800)
    ax1.set_aspect("equal"); ax1.axis("off")
    ax1.annotate("", xy=(0, -50), xytext=(400, -50),
                 arrowprops=dict(arrowstyle="<|-|>", color="k", lw=0.8))
    ax1.text(200, -140, "b=400", fontproperties=jp, ha="center", fontsize=8)
    ax1.annotate("", xy=(-60, 0), xytext=(-60, 700),
                 arrowprops=dict(arrowstyle="<|-|>", color="k", lw=0.8))
    ax1.text(-180, 350, "D=700", fontproperties=jp, rotation=90,
             va="center", fontsize=8)
    ax1.set_title("大梁 断面", fontproperties=jp, fontsize=9)
    # 式
    fig.text(0.55, 0.62, "① 断面二次モーメント", fontproperties=jp,
             fontsize=10, fontweight="bold", color="#c00000")
    fig.text(0.55, 0.5, "I = b·D^3/12 = 400×700^3/12 = 1.14×10^10 mm4",
             fontproperties=jp, fontsize=10)
    fig.text(0.55, 0.38, "② 剛度（部材長で割る）", fontproperties=jp,
             fontsize=10, fontweight="bold", color="#c00000")
    fig.text(0.55, 0.26, "K = I / ℓ = 1.14×10^10 / 6000 = 1.91×10^6 mm³",
             fontproperties=jp, fontsize=10)
    fig.text(0.55, 0.14, "③ 剛比（標準剛度 K0 で基準化）", fontproperties=jp,
             fontsize=10, fontweight="bold", color="#c00000")
    fig.text(0.55, 0.03, "k = K / K0 = 1.91×10^6 / 1.0×10^5 = 19.1",
             fontproperties=jp, fontsize=10)
    ax.axis("off")
    return save(fig, "fig2_stiffness.png")


# ===========================================================================
# 図 3: 剛度増大率
# ===========================================================================
def fig_phi():
    fig, axes = plt.subplots(1, 3, figsize=(14, 4.2))
    data = [
        ("両側スラブ付き大梁", 2.0, C_BLUE, True, True),
        ("片側スラブ付き大梁", 1.5, C_PINK, True, False),
        ("スラブなし（小梁等）", 1.0, "#888", False, False),
    ]
    for ax, (label, phi, col, left, right) in zip(axes, data):
        bw, D, t, flange = 1.0, 1.6, 0.4, 1.6
        # ウェブ
        ax.add_patch(mpatches.Rectangle((-bw / 2, 0), bw, D - t, fc="#d9d9d9",
                                        ec="k", lw=1))
        # スラブ（フランジ）
        if left:
            ax.add_patch(mpatches.Rectangle((-bw / 2 - flange, D - t), flange,
                                            t, fc="#bcd2ea", ec="k", lw=1))
        if right:
            ax.add_patch(mpatches.Rectangle((bw / 2, D - t), flange, t,
                                            fc="#bcd2ea", ec="k", lw=1))
        ax.add_patch(mpatches.Rectangle((-bw / 2, D - t), bw, t, fc="#bcd2ea",
                                        ec="k", lw=1))
        ax.text(0, -0.45, label, fontproperties=jp, ha="center", fontsize=9)
        ax.text(0, -0.95, f"φ = {phi}", fontproperties=jp, ha="center",
                fontsize=13, fontweight="bold", color=col)
        ax.set_xlim(-3, 3); ax.set_ylim(-1.4, 2.2)
        ax.set_aspect("equal"); ax.axis("off")
    fig.suptitle("図 3  剛度増大率 φ ── 床（スラブ）の取り付きで梁剛性を割増す",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    fig.text(0.5, 0.02,
             "評価剛度 = φ × K。スラブが圧縮フランジとして働き T 形断面になるため剛性増。"
             "両側 φ≒2.0／片側 φ≒1.5／なし φ=1.0（目安）",
             ha="center", fontproperties=jp, fontsize=9, color="#444")
    return save(fig, "fig3_phi.png")


# ===========================================================================
# 図 4: 剛域（接合部＋袖壁・パラペット）
# ===========================================================================
def fig_rigid():
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 5.6))
    # (a) 接合部剛域
    ax = axes[0]
    Dc, Dg = 0.6, 0.7
    L, h = 6.0, 3.5
    # 柱2本・梁1本（軸線）
    ax.plot([0, 0], [0, h], color="#1f4e79", lw=2)
    ax.plot([L, L], [0, h], color="#1f4e79", lw=2)
    ax.plot([0, L], [h * 0.6, h * 0.6], color="#c00000", lw=2)
    # 剛域（太線）
    rz = Dc / 2 - Dg / 4  # 0.125
    for x, s in [(0, 1), (L, -1)]:
        ax.plot([x, x + s * rz], [h * 0.6, h * 0.6], color="k", lw=7,
                solid_capstyle="butt", zorder=4)
    ax.annotate("剛域 = 柱せい/2 − 梁せい/4\n= 300 − 175 = 125mm",
                xy=(rz, h * 0.6), xytext=(0.8, h * 0.6 - 1.3),
                fontproperties=jp, fontsize=8.5, color="k",
                arrowprops=dict(arrowstyle="->", color="k"))
    ax.annotate("可とう長さ（変形する部分）",
                xy=(L / 2, h * 0.6 + 0.15), xytext=(L / 2, h * 0.6 + 1.0),
                fontproperties=jp, fontsize=8.5, color="#1f7a1f", ha="center",
                arrowprops=dict(arrowstyle="->", color="#1f7a1f"))
    ax.text(L / 2, -1.0, "柱梁接合部：部材が重なる部分は剛域（変形しない）",
            fontproperties=jp, ha="center", fontsize=9, color="#444")
    ax.set_xlim(-1, L + 1); ax.set_ylim(-1.6, h + 0.5)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(a) 接合部の剛域", fontproperties=jp, fontsize=10,
                 fontweight="bold")

    # (b) 袖壁付き柱・腰壁付き梁
    ax = axes[1]
    # 柱
    ax.add_patch(mpatches.Rectangle((0, 0), 0.5, 4.0, fc="#d9d9d9", ec="k",
                                     lw=1.2))
    # 袖壁
    ax.add_patch(mpatches.Rectangle((0.5, 0.5), 1.3, 3.0, fc="#e8c9ce",
                                     ec="k", lw=1, hatch="//", alpha=0.7))
    ax.text(1.15, 3.8, "袖壁", fontproperties=jp, ha="center", fontsize=8,
            color="#7a3b3b")
    # 剛域（袖壁の分、柱の可とう部が短くなる）
    ax.plot([0.25, 0.25], [0.5, 3.5], color="k", lw=6, alpha=0.5)
    ax.annotate("袖壁が付くと\n柱の剛域が拡大\n→ 可とう長さ短縮\n→ 剛性UP",
                xy=(0.25, 2.0), xytext=(2.2, 2.6), fontproperties=jp,
                fontsize=8.5, color="#c00000",
                arrowprops=dict(arrowstyle="->", color="#c00000"))
    # 腰壁付き梁（下に短く）
    ax.add_patch(mpatches.Rectangle((0, -1.2), 4.0, 0.5, fc="#bcd2ea",
                                     ec="k", lw=1.2))
    ax.add_patch(mpatches.Rectangle((2.0, -1.9), 2.0, 0.7, fc="#e8c9ce",
                                     ec="k", lw=1, hatch="//", alpha=0.7))
    ax.text(3.0, -2.2, "腰壁/パラペット", fontproperties=jp, ha="center",
            fontsize=7.5, color="#7a3b3b")
    ax.text(1.9, -3.1,
            "袖壁・腰壁・パラペットの取り付きで\n"
            "その部分は剛域になり、可とう長さが短くなる\n"
            "（＝短柱・短梁化。せん断破壊に注意）",
            fontproperties=jp, ha="center", fontsize=9, color="#c00000")
    ax.set_xlim(-0.5, 5.5); ax.set_ylim(-3.6, 4.4)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(b) 袖壁・パラペットによる剛域", fontproperties=jp,
                 fontsize=10, fontweight="bold")
    fig.suptitle("図 4  剛域の設定（接合部＋袖壁・パラペット）",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig4_rigid.png")


figs = {
    "model": fig_model(),
    "stiffness": fig_stiffness(),
    "phi": fig_phi(),
    "rigid": fig_rigid(),
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
title_row(ws, 1, "架構モデル作成 問題集（RC マンション設計担当・新人向け）", span=4)
body(ws, 2,
     "目標：2 階建て仮想建物の架構モデルが作成できること。一貫構造計算に入力する"
     "解析モデルを、スパン・階高・断面から組み立てる。標準部材剛性、床・壁による"
     "剛度増大率、袖壁・パラペットによる剛域までを通す。No.4 教材（柱梁のモデル化）の姉妹編。",
     span=4, h=44)
r = table(ws, 4,
          ["No.", "シート", "到達目標", "図"],
          [["1", "1 架構モデルの作成",
            "スパン・階高に対して架構モデルを作成できる", "立面・伏図"],
           ["2", "2 標準部材剛性",
            "断面形状に対して標準部材剛性を算出できる", "I→K→剛比"],
           ["3", "3 剛度増大率",
            "床・壁の取り付きに応じ剛度増大率を設定できる", "T形梁 φ"],
           ["4", "4 剛域の設定",
            "袖壁・パラペットの取り付きによる剛域を設定できる", "接合部・袖壁"]])
body(ws, r + 2,
     "共通モデル：2 階建て・X 方向 2 スパン（6.0m）×Y 方向 1 スパン（7.0m）、"
     "階高 3.5m。柱 600 角、大梁 400×700、小梁 300×500。Fc21・Ec=2.05×10⁴。"
     "標準剛度 K0=1.0×10⁵ mm³。数値は本教材作成時に検算済み。",
     span=4, h=58)

# ---- 1 架構モデルの作成 ----
ws = wb.create_sheet("1 架構モデルの作成")
setup(ws, [8, 18, 16, 14, 14, 12, 12])
title_row(ws, 1, "1  架構モデルの作成（スパン・階高）")
head(ws, 3, "■ 図 1  2 階建て仮想建物の架構モデル")
put_img(ws, figs["model"], "A4", w=820)
head(ws, 30, "■ 問題 1  モデル化の基本（穴埋め）")
body(ws, 31, "架構モデルでは、実部材を断面の【 ① 】を通る線材に置き換える（線材置換）。"
             "柱梁の交点を【 ② 】、柱脚を【 ③ 】（固定またはピン）とする。"
             "スパンは柱の【 ④ 】間距離、階高は床から床までの高さで取る。", h=44)
head(ws, 33, "■ 問題 2  節点・部材の数え上げ")
body(ws, 34, "図 1(a) の X 方向 2 スパン・2 階建てラーメンについて答えよ。", h=20)
r = table(ws, 36,
          ["項目", "数（記入）"],
          [["節点数（柱脚含む）", ""],
           ["柱の本数（1 構面）", ""],
           ["大梁の本数（1 構面）", ""],
           ["支点（柱脚）数", ""]])
head(ws, r + 2, "■ 問題 3  立面と伏図")
body(ws, r + 3, "(1) 立面モデル（X 方向）と伏図（平面）の役割の違いを述べよ。"
                "(2) この建物を X 方向・Y 方向それぞれで解析する理由（方向ごとに"
                "剛性・耐力が異なる）を 1 行で。", h=40)
head(ws, r + 5, "■ 問題 4  境界条件")
body(ws, r + 6, "柱脚を『固定』とするか『ピン』とするかで、柱の曲げモーメント分布が"
                "どう変わるか。直接基礎で基礎梁が堅固なら通常どちらか。", h=40)

# ---- 2 標準部材剛性 ----
ws = wb.create_sheet("2 標準部材剛性")
setup(ws, [8, 18, 16, 14, 14, 12, 12])
title_row(ws, 1, "2  断面形状に対する標準部材剛性")
head(ws, 3, "■ 図 2  I → K → 剛比")
put_img(ws, figs["stiffness"], "A4", w=760)
head(ws, 26, "■ 問題 1  断面二次モーメント I")
body(ws, 27, "各部材の I = b·D³/12 を計算せよ（有効数字 3 桁）。", h=20)
r = table(ws, 29,
          ["部材", "断面 b×D", "I = b·D³/12（記入）"],
          [["柱 C", "600×600", ""],
           ["大梁 G", "400×700", ""],
           ["小梁 B", "300×500", ""]])
head(ws, r + 2, "■ 問題 2  剛度 K")
body(ws, r + 3, "K = I / ℓ（ℓ：部材長）。柱は階高 h=3500、大梁はスパン L=6000 として"
                "剛度を求めよ。", h=22)
r = table(ws, r + 5,
          ["部材", "I", "ℓ", "K = I/ℓ（記入）"],
          [["柱 C", "1.08×10^10", "3500", ""],
           ["大梁 G", "1.14×10^10", "6000", ""]])
head(ws, r + 2, "■ 問題 3  剛比 k")
body(ws, r + 3, "標準剛度 K0=1.0×10⁵ mm³ で基準化した剛比 k=K/K0 を求めよ。"
                "剛比は D 値法（層せん断力の柱への配分）等で使う相対値であることも述べよ。",
     h=32)
r = table(ws, r + 6,
          ["部材", "K", "k = K/K0（記入）"],
          [["柱 C", "3.09×10^6", ""],
           ["大梁 G", "1.91×10^6", ""]])
head(ws, r + 2, "■ 問題 4  剛比の意味")
body(ws, r + 3, "柱の剛比が梁より大きい（この例で kc=30.9 > kg=19.1）と、"
                "節点の回転拘束や層せん断力配分にどう影響するか。"
                "『標準剛度 K0』は絶対値でなく相対比を出すための基準値である点も述べよ。",
     h=44)

# ---- 3 剛度増大率 ----
ws = wb.create_sheet("3 剛度増大率")
setup(ws, [8, 18, 16, 14, 14, 12, 12])
title_row(ws, 1, "3  床・壁の取り付きによる剛度増大率 φ")
head(ws, 3, "■ 図 3  スラブ付き大梁の剛度増大率")
put_img(ws, figs["phi"], "A4", w=820)
head(ws, 26, "■ 問題 1  剛度増大率とは")
body(ws, 27, "大梁にスラブ（床）が取り付くと、スラブが圧縮フランジとして働き"
             "【 ① 】形断面となって曲げ剛性が増す。この割増しを剛度増大率 φ という。"
             "評価剛度 = φ × K で入力する。", h=32)
head(ws, 29, "■ 問題 2  φ の設定")
r = table(ws, 30,
          ["部材・条件", "剛度増大率 φ", "評価剛度（K に対し）"],
          [["両側スラブ付き大梁", "2.0", "2.0×K"],
           ["片側スラブ付き大梁", "1.5", "1.5×K"],
           ["スラブなし（独立小梁）", "1.0", "1.0×K"]])
body(ws, r + 2, "問題 2 の大梁 G（K=1.91×10⁶）について、両側スラブ付きの評価剛度を"
                "求めよ。φ を見込まない場合と比べ剛度は何倍か。", h=32)
head(ws, r + 4, "■ 問題 3  なぜ φ を見込むか")
body(ws, r + 5, "剛度増大率を見込まない（φ=1.0 のまま）と、梁剛性を過小評価する。"
                "その結果、① 柱への応力配分 ② 建物の変形・固有周期 が"
                "どちらにずれるか説明せよ。", h=44)
head(ws, r + 7, "■ 問題 4  壁の取り付き")
body(ws, r + 8, "梁に腰壁・垂れ壁、柱に袖壁が取り付く場合も剛性が増す。"
                "ただし床（スラブ）の増大率 φ とは別に、壁は『剛域』として扱うことが多い"
                "（次シート）。剛度増大率（φ）と剛域の違いを 1 行で。", h=44)

# ---- 4 剛域の設定 ----
ws = wb.create_sheet("4 剛域の設定")
setup(ws, [8, 18, 16, 14, 14, 12, 12])
title_row(ws, 1, "4  袖壁・パラペットの取り付きによる剛域")
head(ws, 3, "■ 図 4  接合部剛域＋袖壁・パラペット")
put_img(ws, figs["rigid"], "A4", w=820)
head(ws, 30, "■ 問題 1  接合部剛域の計算")
body(ws, 31, "柱 600 角・大梁せい 700 の接合部。剛域端は「フェイスから部材せいの 1/4 "
             "内側」とする。梁の剛域長・柱の剛域長を求めよ。", h=32)
r = table(ws, 34,
          ["項目", "式", "値（記入）"],
          [["梁の剛域長（片側）", "柱せい/2 − 梁せい/4 = 300 − 175", ""],
           ["柱の剛域長（片側）", "梁せい/2 − 柱せい/4 = 350 − 150", ""]])
head(ws, r + 2, "■ 問題 2  袖壁付き柱の剛域")
body(ws, r + 3, "柱に袖壁（出 800mm）が取り付くと、柱の剛域が袖壁の分だけ拡大し、"
                "可とう長さ（変形する部分）が短くなる。"
                "(1) 剛性はどうなるか（増／減）。"
                "(2) 副作用として何に注意するか（短柱化＝せん断破壊）。", h=44)
head(ws, r + 5, "■ 問題 3  パラペット・腰壁付き梁")
body(ws, r + 6, "梁に腰壁・パラペット（せい 900mm）が付くと、梁の剛域が上下に拡大する。"
                "最上階のパラペット付き梁・腰壁付き梁で剛域を見落とすと、"
                "梁剛性・応力をどう誤るか述べよ。", h=44)
head(ws, r + 8, "■ 問題 4  剛域を無視 vs 過大評価")
body(ws, r + 9, "(1) 袖壁・腰壁の剛域を無視すると、剛性を過小評価し変形・周期を"
                "過大に見積もる。(2) 一方、雑壁の剛域を全部見込むと、"
                "短柱・短梁が生じて特定部材にせん断力が集中する。"
                "実務では『剛性は見込み、短柱化は耐震スリットで回避』等の方針を"
                "決めることを述べよ（No.1-4 耐震スリット教材参照）。", h=58)

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


ah("1  架構モデルの作成")
an("問1：①図心（中心軸）②節点 ③支点 ④中心（軸線）。"
   "実部材を軸線の線材に置き換え、交点＝節点、柱脚＝支点でモデル化する。", h=44)
an("問2：節点数＝3 通り×3 レベル（1F/2F/RF）=9（うち柱脚 3）。"
   "柱＝3 通り×2 層=6 本。大梁＝2 スパン×2 レベル=4 本。支点＝3。", h=44)
an("問3：(1)立面モデル＝各構面の柱・梁の応力・変形を解く。"
   "伏図＝平面的な部材配置・スラブ・荷重範囲を示す。"
   "(2)X 方向と Y 方向でスパン・部材・壁配置が異なり、剛性・耐力が違うため"
   "方向ごとに解析する。", h=58)
an("問4：柱脚固定＝柱脚に大きな曲げが生じ、反曲点は柱の中央より上。"
   "ピン＝柱脚曲げ 0。直接基礎で基礎梁が堅固なら通常『固定』とする。", h=44)

ah("2  標準部材剛性")
an("問1：柱 C=600×600³/12=1.08×10¹⁰。大梁 G=400×700³/12=1.14×10¹⁰。"
   "小梁 B=300×500³/12=3.13×10⁹ mm⁴。", h=32)
an("問2：柱 K=1.08×10¹⁰/3500=3.09×10⁶。大梁 K=1.14×10¹⁰/6000=1.91×10⁶ mm³。",
   h=32)
an("問3：柱 k=3.09×10⁶/1.0×10⁵=30.9。大梁 k=1.91×10⁶/1.0×10⁵=19.1。"
   "剛比は D 値法で層せん断力を柱へ配分する際などに使う相対値。", h=44)
an("問4：柱剛比が大きいと節点の回転拘束が強く（梁が相対的に柔らかい）、"
   "層せん断力配分でも剛比の大きい柱が多く負担する。"
   "K0 は絶対値でなく、部材間の相対比（剛比）を出すための任意の基準値。", h=44)

ah("3  剛度増大率")
an("問1：①T（T 形断面）。スラブが圧縮フランジになり中立軸から遠いコンクリートが"
   "増えて曲げ剛性が増す。評価剛度=φ×K。", h=32)
an("問2：両側スラブ付き φ=2.0 → 評価剛度=2.0×1.91×10⁶=3.81×10⁶ mm³。"
   "φ=1.0（見込まない）に対し 2 倍。", h=32)
an("問3：φ を見込まないと梁剛性を過小評価する。その結果、"
   "①柱への応力配分が実状とずれ（梁が柔らかいと柱に曲げが集中しない方向）、"
   "②建物剛性を過小評価して変形・固有周期を過大に見積もる。"
   "一貫計算では φ を自動考慮するのが一般的。", h=44)
an("問4：剛度増大率 φ＝床（スラブ）が付いた梁の断面剛性を割増す係数（連続的な補正）。"
   "剛域＝壁・接合部で部材が『変形しない剛な区間』として扱う（部材長を短縮）。"
   "φ は断面、剛域は長さの補正、と区別する。", h=44)

ah("4  剛域の設定")
an("問1：梁の剛域=600/2−700/4=300−175=125mm。"
   "柱の剛域=700/2−600/4=350−150=200mm。", h=32)
an("問2：(1)剛性は増す（可とう長さが短くなり曲げ剛性 UP）。"
   "(2)副作用＝短柱化。柱の変形できる長さが短くなり地震時にせん断力が集中、"
   "せん断破壊（脆性）の危険。袖壁を耐震スリットで縁切りするか、"
   "せん断補強を密にする。", h=58)
an("問3：腰壁・パラペットの分、梁の剛域が上下に拡大し可とう長さが短縮→梁剛性 UP。"
   "剛域を見落とすと梁剛性を過小評価し、その梁の負担応力・端部モーメントを"
   "過小評価する（危険側にもなり得る）。最上階の腰壁・パラペット付き梁は特に注意。",
   h=58)
an("問4：(1)剛域を無視→剛性過小→変形・周期過大（不経済または危険側）。"
   "(2)雑壁の剛域を全部見込む→短柱・短梁が生じ、特定部材にせん断集中。"
   "実務は『剛性は見込むが、短柱化する雑壁は耐震スリットで縁を切る』等、"
   "方針を決めて一貫させる（No.1-4 耐震スリット参照）。", h=58)

XLSX = os.path.join(OUT, "架構モデル作成問題集.xlsx")
wb.save(XLSX)
print("saved:", XLSX)
