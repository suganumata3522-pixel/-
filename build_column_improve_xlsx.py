# -*- coding: utf-8 -*-
"""柱状改良の支持力 問題集（図つき）Excel。出力: docs/column_improve/柱状改良の支持力問題集.xlsx
1 柱状改良とは（浅層/深層・改良体・Fc）/ 2 支持力の考え方（複合地盤/改良体式）
3 改良体の支持力算定（先端支持力・改良体強度・鉛直応力度）/ 4 配置計画
※ 支持力係数・安全率・複合地盤式は指針（改良地盤の設計指針等）で確認要
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
OUT = "docs/column_improve"; FIG = os.path.join(OUT, "figures"); os.makedirs(FIG, exist_ok=True)


def save(fig, n):
    p = os.path.join(FIG, n); fig.savefig(p, dpi=130, bbox_inches="tight"); plt.close(fig); return p


def fig_types():
    fig, axes = plt.subplots(1, 2, figsize=(13.0, 5.0))
    # (a) 浅層改良
    ax = axes[0]
    ax.add_patch(mpatches.Rectangle((0, 3.0), 6, 3.0, fc="#f0e6d2", ec="none"))  # 地盤
    ax.add_patch(mpatches.Rectangle((0.5, 4.2), 5.0, 1.0, fc="#b8b0a0", ec="k", hatch="//"))  # 改良
    ax.add_patch(mpatches.Rectangle((1.5, 5.2), 3.0, 0.6, fc="#d9d9d9", ec="k"))  # 基礎
    ax.text(3.0, 4.7, "浅層改良（表層全面）", ha="center", fontproperties=jp, fontsize=9)
    ax.text(3.0, 3.4, "軟弱層", ha="center", fontproperties=jp, fontsize=8, color="#7a6a4a")
    ax.annotate("", xy=(0.2, 4.2), xytext=(0.2, 5.2), arrowprops=dict(arrowstyle="<->", color="#333"))
    ax.text(0.0, 4.7, "〜2m\n程度", ha="right", va="center", fontproperties=jp, fontsize=7.5)
    ax.set_xlim(-0.6, 6.2); ax.set_ylim(2.8, 6.2); ax.axis("off")
    ax.set_title("(a) 浅層改良（浅い軟弱層を全面固化）", fontproperties=jp, fontsize=9.5, fontweight="bold")
    # (b) 深層（柱状）改良
    ax = axes[1]
    ax.add_patch(mpatches.Rectangle((0, 0), 6, 5.5, fc="#f0e6d2", ec="none"))
    ax.add_patch(mpatches.Rectangle((0, 0), 6, 1.0, fc="#c8b48c", ec="k"))  # 支持層
    ax.text(3.0, 0.4, "支持層（N値大）", ha="center", fontproperties=jp, fontsize=8, color="#7a5a2a")
    for cx in [1.2, 3.0, 4.8]:
        ax.add_patch(mpatches.Rectangle((cx - 0.35, 1.0), 0.7, 4.0, fc="#b8b0a0", ec="k", hatch="//"))
    ax.add_patch(mpatches.Rectangle((0.4, 5.0), 5.2, 0.6, fc="#d9d9d9", ec="k"))  # 基礎
    ax.annotate("改良体 φ600〜1000\n設計基準強度 Fc", xy=(3.0, 3.0), xytext=(6.3, 3.4),
                fontproperties=jp, fontsize=8.5, color="#1f4e79",
                arrowprops=dict(arrowstyle="->", color="#1f4e79"))
    ax.text(3.0, 5.7, "深層（柱状）改良", ha="center", fontproperties=jp, fontsize=9)
    ax.set_xlim(-0.4, 9.0); ax.set_ylim(-0.3, 6.2); ax.axis("off")
    ax.set_title("(b) 深層（柱状）改良（柱状に固化・深い層へ）", fontproperties=jp, fontsize=9.5, fontweight="bold")
    fig.suptitle("図 1  柱状改良（浅層・深層）と改良体", fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig1_types.png")


def fig_methods():
    fig, axes = plt.subplots(1, 2, figsize=(13.0, 5.0))
    # (a) 複合地盤
    ax = axes[0]
    ax.add_patch(mpatches.Rectangle((0, 0), 6, 4.0, fc="#f0e6d2", ec="k"))
    for cx in np.linspace(0.8, 5.2, 4):
        ax.add_patch(mpatches.Rectangle((cx - 0.3, 0.3), 0.6, 3.4, fc="#b8b0a0", ec="k", hatch="//"))
    ax.add_patch(mpatches.Rectangle((0.2, 4.0), 5.6, 0.6, fc="#d9d9d9", ec="k"))
    ax.annotate("", xy=(3.0, 4.0), xytext=(3.0, 5.0), arrowprops=dict(arrowstyle="-|>", color="#c00000", lw=2.5))
    ax.text(3.0, 5.2, "建物荷重", ha="center", fontproperties=jp, fontsize=9, color="#c00000")
    ax.text(3.0, -0.6, "改良体＋周辺地盤を一体（複合地盤）\nとして平均的な支持力・沈下を評価\n改良率 ap で加算",
            ha="center", fontproperties=jp, fontsize=8.5, color="#1f4e79")
    ax.set_xlim(-0.3, 6.3); ax.set_ylim(-1.5, 5.6); ax.axis("off")
    ax.set_title("(a) 複合地盤としての設計", fontproperties=jp, fontsize=9.5, fontweight="bold")
    # (b) 改良体式（杭状）
    ax = axes[1]
    ax.add_patch(mpatches.Rectangle((0, 0), 6, 4.0, fc="#f0e6d2", ec="k"))
    ax.add_patch(mpatches.Rectangle((0, 0), 6, 0.8, fc="#c8b48c", ec="k"))
    ax.add_patch(mpatches.Rectangle((2.6, 0.8), 0.8, 3.2, fc="#b8b0a0", ec="k", hatch="//"))
    ax.add_patch(mpatches.Rectangle((1.8, 4.0), 2.4, 0.6, fc="#d9d9d9", ec="k"))
    ax.annotate("", xy=(3.0, 4.0), xytext=(3.0, 5.0), arrowprops=dict(arrowstyle="-|>", color="#c00000", lw=2.5))
    # 先端支持力・周面摩擦
    ax.annotate("", xy=(3.0, 0.7), xytext=(3.0, 0.2), arrowprops=dict(arrowstyle="-|>", color="#548235", lw=2))
    ax.text(3.6, 0.4, "先端支持力\nqp·Ap", fontproperties=jp, fontsize=8, color="#548235")
    for yy in [1.5, 2.5, 3.5]:
        ax.annotate("", xy=(2.5, yy), xytext=(2.2, yy - 0.3), arrowprops=dict(arrowstyle="->", color="#c55a11"))
    ax.text(0.2, 2.5, "周面\n摩擦", fontproperties=jp, fontsize=8, color="#c55a11")
    ax.text(3.0, -0.6, "改良体を杭とみなし\n先端支持力＋周面摩擦、\nまたは改良体強度で決まる軸力",
            ha="center", fontproperties=jp, fontsize=8.5, color="#1f4e79")
    ax.set_xlim(-0.3, 6.3); ax.set_ylim(-1.5, 5.6); ax.axis("off")
    ax.set_title("(b) 改良体（杭状）としての設計", fontproperties=jp, fontsize=9.5, fontweight="bold")
    fig.suptitle("図 2  柱状改良の支持力の考え方（複合地盤／改良体式）",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig2_methods.png")


def fig_calc():
    fig, ax = plt.subplots(figsize=(12.0, 5.4))
    ax.text(0.5, 0.95, "改良体1本の許容支持力の考え方", transform=ax.transAxes, ha="center",
            fontproperties=jp, fontsize=11, fontweight="bold", color="#1f4e79")
    # 改良体強度
    ax.add_patch(mpatches.FancyBboxPatch((0.03, 0.55), 0.42, 0.3, boxstyle="round,pad=0.01",
                 transform=ax.transAxes, fc="#e8f0fa", ec="#2e75b6", lw=1.2))
    ax.text(0.24, 0.79, "(1) 改良体強度で決まる軸力", transform=ax.transAxes, ha="center",
            fontproperties=jp, fontsize=9.5, fontweight="bold", color="#1f4e79")
    ax.text(0.24, 0.64, "Ra1 = fc・Ap\n fc=Fc/3（長期）, Ap=π(d/2)^2\n例 Fc=1000→fc=333, φ800→Ra1≒168kN",
            transform=ax.transAxes, ha="center", va="center", fontproperties=jp, fontsize=8.5)
    # 先端支持力
    ax.add_patch(mpatches.FancyBboxPatch((0.55, 0.55), 0.42, 0.3, boxstyle="round,pad=0.01",
                 transform=ax.transAxes, fc="#eaf7ea", ec="#548235", lw=1.2))
    ax.text(0.76, 0.79, "(2) 先端支持力で決まる軸力", transform=ax.transAxes, ha="center",
            fontproperties=jp, fontsize=9.5, fontweight="bold", color="#548235")
    ax.text(0.76, 0.64, "Rp = qp・Ap,  qp=α・N（先端N値）\n（＋周面摩擦）\n例 N=30→qp=4500→Rp≒2262kN",
            transform=ax.transAxes, ha="center", va="center", fontproperties=jp, fontsize=8.5)
    ax.annotate("", xy=(0.5, 0.44), xytext=(0.24, 0.55), xycoords="axes fraction",
                arrowprops=dict(arrowstyle="-|>", color="#c00000", lw=1.6))
    ax.annotate("", xy=(0.5, 0.44), xytext=(0.76, 0.55), xycoords="axes fraction",
                arrowprops=dict(arrowstyle="-|>", color="#c00000", lw=1.6))
    ax.add_patch(mpatches.FancyBboxPatch((0.24, 0.28), 0.52, 0.14, boxstyle="round,pad=0.01",
                 transform=ax.transAxes, fc="#f8d0d0", ec="#c00000", lw=1.2))
    ax.text(0.5, 0.35, "許容支持力 Ra = min( Ra1, Rp )\n柱状改良は改良体強度(1)で決まることが多い",
            transform=ax.transAxes, ha="center", va="center", fontproperties=jp, fontsize=9.5,
            fontweight="bold", color="#c00000")
    ax.text(0.5, 0.13, "鉛直応力度の照査：σ = P/Ap <= fc（＝Fc/3）\n"
            "例 P=150kN, φ800 → σ=298kN/m2 <= fc=333kN/m2 → OK",
            transform=ax.transAxes, ha="center", va="center", fontproperties=jp, fontsize=9, color="#1f4e79")
    ax.axis("off")
    ax.set_title("図 3  改良体の支持力（強度・先端・鉛直応力度）",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig3_calc.png")


def fig_layout():
    fig, axes = plt.subplots(1, 2, figsize=(13.0, 4.8))
    # (a) 配置（格子）
    ax = axes[0]
    pitch = 1.5; d = 0.8
    for i in range(4):
        for j in range(3):
            ax.add_patch(plt.Circle((i * pitch, j * pitch), d / 2, fc="#b8b0a0", ec="k"))
    # 分担面積
    ax.add_patch(mpatches.Rectangle((1 * pitch - pitch / 2, 1 * pitch - pitch / 2), pitch, pitch,
                 fill=False, ec="#c00000", lw=1.5, ls="--"))
    ax.text(1 * pitch, 1 * pitch - pitch / 2 - 0.25, "分担面積 A=1.5×1.5", ha="center",
            fontproperties=jp, fontsize=8, color="#c00000")
    ax.annotate("", xy=(0, -0.7), xytext=(pitch, -0.7), arrowprops=dict(arrowstyle="<->", color="#333"))
    ax.text(pitch / 2, -0.95, "芯間隔 1.5m", ha="center", fontproperties=jp, fontsize=8)
    ax.text(0, 3.6, "改良体 φ800（格子配置）", fontproperties=jp, fontsize=9, color="#1f4e79")
    ax.set_xlim(-1.0, 5.2); ax.set_ylim(-1.3, 4.0); ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(a) 配置計画（格子・芯間隔・改良率）", fontproperties=jp, fontsize=9.5, fontweight="bold")
    # (b) 複合地盤式
    ax = axes[1]
    ax.text(0.5, 0.93, "複合地盤の許容支持力度", transform=ax.transAxes, ha="center",
            fontproperties=jp, fontsize=10.5, fontweight="bold", color="#1f4e79")
    ax.text(0.05, 0.78,
            "改良率 ap = Ap / A\n"
            "  Ap=π(d/2)^2=0.503m2（φ800）\n"
            "  A=1.5×1.5=2.25m2\n"
            "  ap = 0.503/2.25 = 0.223\n\n"
            "複合地盤 qa = ap・fc + (1-ap)・q_soil\n"
            "  = 0.223×333 + 0.777×30\n"
            "  ≒ 98 kN/m2\n\n"
            "  fc：改良体の許容応力度（=Fc/3）\n"
            "  q_soil：周辺地盤の許容支持力度",
            transform=ax.transAxes, fontproperties=jp, fontsize=9, va="top")
    ax.axis("off")
    ax.set_title("(b) 改良率と複合地盤の支持力", fontproperties=jp, fontsize=9.5, fontweight="bold")
    fig.suptitle("図 4  配置計画（改良率・芯間隔）と複合地盤の支持力",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig4_layout.png")


figs = {"types": fig_types(), "methods": fig_methods(), "calc": fig_calc(), "layout": fig_layout()}
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


def tbl(ws, start_row, headers, rows, col1=1):
    r = start_row
    for j, htxt in enumerate(headers):
        c = ws.cell(r, col1 + j, htxt); c.font = Font(name="MS PGothic", size=10, bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor=C_HEAD); c.alignment = center; c.border = border
    for data in rows:
        r += 1
        for j, v in enumerate(data):
            c = ws.cell(r, col1 + j, v); c.font = f_body
            c.alignment = wrap if j == 0 else center; c.border = border
            if r % 2 == 0:
                c.fill = PatternFill("solid", fgColor="F2F7FC")
    return r


def put_img(ws, path, anchor, w=None):
    img = XLImage(path)
    if w:
        ratio = w / img.width; img.width = w; img.height = int(img.height * ratio)
    ws.add_image(img, anchor)


# ===== 目次 =====
ws = wb.active; ws.title = "目次"; setup(ws, [4, 24, 54, 16])
title_row(ws, 1, "柱状改良の支持力 問題集（RC マンション設計担当・新人向け）", span=4)
body(ws, 2, "目標：柱状改良（深層混合処理）の考え方を理解し、改良体の支持力（改良体強度・先端支持力・"
            "鉛直応力度）と複合地盤の支持力・配置計画を検討できること。", span=4, h=32)
r = tbl(ws, 4, ["No.", "シート", "到達目標", "図"],
        [["1", "1 柱状改良とは", "浅層/深層・改良体・Fcを理解", "改良断面"],
         ["2", "2 支持力の考え方", "複合地盤/改良体式を理解", "2つの設計法"],
         ["3", "3 改良体の支持力算定", "強度・先端・鉛直応力度を計算", "算定"],
         ["4", "4 配置計画", "改良率・芯間隔・複合支持力", "配置"]])
warn(ws, r + 2, "※ 改良体の設計基準強度Fc、支持力係数α、安全率、複合地盤の式は"
                "『建築物のための改良地盤の設計及び品質管理指針』等で確認すること。数値は例示。", span=4, h=40)

# ===== 1 柱状改良とは =====
ws = wb.create_sheet("1 柱状改良とは"); setup(ws, [8, 16, 18, 16, 12, 12])
title_row(ws, 1, "1  柱状改良とは（浅層/深層・改良体・Fc）")
head(ws, 3, "■ 図 1  浅層・深層改良と改良体"); put_img(ws, figs["types"], "A4", w=840)
head(ws, 27, "■ 問題 1  浅層と深層の目安")
r = tbl(ws, 28, ["工法", "深さの目安", "考え方"],
        [["浅層改良", "〜2m 程度", "浅い軟弱層を全面固化（べた基礎的）"],
         ["深層（柱状）改良", "2m〜（支持層まで）", "柱状に固化し深い層へ荷重を伝える（記入）"]])
head(ws, r + 2, "■ 問題 2  改良体の諸元")
body(ws, r + 3, "改良体の径φ（600〜1000mm程度）と設計基準強度Fc（改良体の一軸圧縮強度）の意味を述べよ。"
                "セメント系固化材と原地盤を混合して柱状の改良体を造ることを説明せよ。", h=40)
head(ws, r + 5, "■ 問題 3  適用の判断")
body(ws, r + 6, "柱状改良が適する地盤・建物（比較的軽い建物、浅い支持層、軟弱層が厚くない）を述べよ。"
                "重い建物・深い支持層では場所打ち杭等を選ぶことにも触れよ。", h=40)

# ===== 2 支持力の考え方 =====
ws = wb.create_sheet("2 支持力の考え方"); setup(ws, [8, 16, 18, 16, 12, 12])
title_row(ws, 1, "2  支持力の考え方（複合地盤／改良体式）")
head(ws, 3, "■ 図 2  2つの設計法"); put_img(ws, figs["methods"], "A4", w=840)
head(ws, 27, "■ 問題 1  複合地盤")
body(ws, 28, "複合地盤としての設計（改良体＋周辺地盤を一体とし、改良率apで平均的な支持力・沈下を評価）"
             "の考え方を説明せよ。", h=36)
head(ws, 30, "■ 問題 2  改良体式（杭状）")
body(ws, 31, "改良体を杭とみなす設計（先端支持力＋周面摩擦、または改良体強度で決まる軸力）の"
             "考え方を説明せよ。柱状改良ではどちらが支配的になりやすいか述べよ。", h=40)
head(ws, 33, "■ 問題 3  使い分け")
body(ws, 34, "複合地盤式と改良体式（杭状）の使い分け（改良率・配置・支持層の有無・建物規模）を述べよ。", h=32)

# ===== 3 改良体の支持力算定 =====
ws = wb.create_sheet("3 支持力算定"); setup(ws, [8, 16, 18, 16, 12, 12])
title_row(ws, 1, "3  改良体の支持力算定（強度・先端・鉛直応力度）")
head(ws, 3, "■ 図 3  改良体の支持力"); put_img(ws, figs["calc"], "A4", w=800)
head(ws, 29, "■ 問題 1  改良体強度で決まる軸力")
body(ws, 30, "φ800mm（Ap=0.503m2）、Fc=1000kN/m2 のとき、改良体強度で決まる長期許容軸力"
             "Ra1=fc・Ap（fc=Fc/3）を求めよ。", h=32)
head(ws, 32, "■ 問題 2  先端支持力")
body(ws, 33, "先端地盤N=30、支持力係数α=150（qp=α・N、確認要）のとき、先端支持力"
             "Rp=qp・Ap を求めよ。Ra1 と比べてどちらが支配的か述べよ。", h=36)
head(ws, 35, "■ 問題 3  鉛直応力度の照査")
body(ws, 36, "改良体1本の負担軸力P=150kN、φ800（Ap=0.503m2）のとき、鉛直応力度σ=P/Ap を求め、"
             "許容応力度 fc=Fc/3=333kN/m2 と比較して照査せよ。", h=36)
head(ws, 38, "■ 問題 4  支配要因")
body(ws, 39, "柱状改良では、なぜ改良体自体の強度（fc・Ap）が支持力を支配しやすいのか述べよ"
             "（セメント改良体の強度は先端地盤の支持力より小さいことが多い）。", h=36)
warn(ws, 41, "※ 支持力係数α・安全率・Fcは指針で確認要。数値は手順理解のための例示。", h=24)

# ===== 4 配置計画 =====
ws = wb.create_sheet("4 配置計画"); setup(ws, [8, 16, 18, 16, 12, 12])
title_row(ws, 1, "4  配置計画（改良率・芯間隔）と複合地盤")
head(ws, 3, "■ 図 4  配置計画・複合地盤"); put_img(ws, figs["layout"], "A4", w=840)
head(ws, 27, "■ 問題 1  改良率の計算")
body(ws, 28, "φ800（Ap=0.503m2）を芯間隔1.5m×1.5m（分担面積A=2.25m2）の格子配置とするとき、"
             "改良率 ap=Ap/A を求めよ。", h=32)
head(ws, 30, "■ 問題 2  複合地盤の許容支持力度")
body(ws, 31, "問1の ap を用い、複合地盤の許容支持力度 qa=ap・fc+(1-ap)・q_soil を求めよ"
             "（fc=333kN/m2、周辺地盤 q_soil=30kN/m2）。", h=36)
head(ws, 33, "■ 問題 3  配置のパターン")
body(ws, 34, "柱状改良の配置パターン（格子・千鳥・建物荷重下への集中配置）と、"
             "芯間隔・改良率で支持力・沈下を調整する考え方を述べよ。", h=40)
head(ws, 36, "■ 問題 4  設計の流れ")
body(ws, 37, "柱状改良の設計の流れをまとめよ（①地盤・建物荷重の把握→②工法選定（浅層/深層）→"
             "③改良体の径・Fc・長さ設定→④支持力・鉛直応力度・沈下の照査→⑤配置・改良率決定）。", h=44)
warn(ws, 39, "※ 改良率・複合地盤式・安全率は指針で確認要。", h=22)

# ===== 解答 =====
ws = wb.create_sheet("解答"); setup(ws, [4, 22, 60, 14])
title_row(ws, 1, "解答・解説", span=4); row = 2


def ah(t):
    global row; head(ws, row, t, span=4); row += 1


def an(t, h=None):
    global row; body(ws, row, t, span=4, ans=True, h=h); row += 1


def aw(t, h=None):
    global row; warn(ws, row, t, span=4, h=h); row += 1


ah("1  柱状改良とは")
an("問1：浅層改良＝〜2m程度の浅い軟弱層を全面固化（べた基礎的に支持）。"
   "深層（柱状）改良＝柱状に固化して2m以深・支持層まで荷重を伝える。厚い軟弱層に用いる。", h=40)
an("問2：改良体は径φ600〜1000mm程度の円柱で、セメント系固化材を原地盤に混合・撹拌して造る。"
   "Fc＝改良体の設計基準強度（一軸圧縮強度）で、許容応力度の基準になる。", h=40)
an("問3：柱状改良は比較的軽い建物・浅い支持層・軟弱層がそれほど厚くない場合に適する。"
   "重い建物や深い支持層では改良体強度が不足しやすく、場所打ち杭・既製杭を選ぶ。", h=40)

ah("2  支持力の考え方")
an("問1：改良体と周辺地盤を一体（複合地盤）とみなし、改良率apに応じて改良体と地盤の"
   "支持力・剛性を加重平均して、地盤全体の支持力・沈下を評価する。", h=40)
an("問2：改良体を杭とみなし、先端支持力＋周面摩擦で支持力を評価する。ただし柱状改良では"
   "改良体（セメント土）の強度が小さいため、改良体強度で決まる軸力（fc・Ap）が支配的になりやすい。", h=44)
an("問3：厚い軟弱層を面的に改良し支持力・沈下を確保するなら複合地盤式、"
   "支持層に到達させ杭的に使うなら改良体式。建物規模・支持層深さ・改良率で選ぶ。", h=40)

ah("3  改良体の支持力算定")
an("問1：fc=Fc/3=1000/3=333kN/m2。Ra1=fc・Ap=333×0.503≒168kN。（改良体強度で決まる長期軸力）", h=32)
an("問2：qp=α・N=150×30=4500kN/m2。Rp=qp・Ap=4500×0.503≒2262kN。"
   "Ra1（168kN）<< Rp（2262kN）なので、改良体強度Ra1が支配する。", h=36)
an("問3：σ=P/Ap=150/0.503≒298kN/m2。fc=333kN/m2 に対し σ<=fc なのでOK（余裕率 約1.1）。", h=32)
an("問4：セメント系改良体の強度（数百〜千数百kN/m2程度）は、支持層地盤が発揮できる先端支持力より"
   "小さいことが多い。よって min(改良体強度, 先端支持力)＝改良体強度が支配しやすい。", h=40)
aw("※ 支持力係数α・安全率・Fcは指針で確認要。", h=22)

ah("4  配置計画")
an("問1：ap=Ap/A=0.503/2.25≒0.223（改良率 約22%）。", h=28)
an("問2：qa=ap・fc+(1-ap)・q_soil=0.223×333+0.777×30≒74.3+23.3≒98kN/m2。", h=32)
an("問3：格子・千鳥・荷重集中位置への配置がある。芯間隔を詰める（apを上げる）と支持力↑・沈下↓。"
   "建物の応力分布に応じて改良率・配置を調整し、経済性と性能を両立させる。", h=40)
an("問4：①地盤調査・建物荷重把握→②工法選定（浅層/深層）→③改良体の径・Fc・長さ設定→"
   "④支持力（改良体強度・先端）・鉛直応力度・沈下の照査→⑤配置・改良率の決定→⑥品質管理。", h=44)
aw("※ 改良率・複合地盤式・安全率は指針で確認要。", h=22)

XLSX = os.path.join(OUT, "柱状改良の支持力問題集.xlsx"); wb.save(XLSX); print("saved:", XLSX)
