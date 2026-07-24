# -*- coding: utf-8 -*-
"""杭の水平力に対する検討 問題集（図つき）Excel。出力: docs/pile_lateral/杭の水平力検討問題集.xlsx
1 杭応力解析モデル（ばね支承梁・外力・釣合）/ 2 地盤バネ kh（Eo/N換算・非線形・液状化）
3 水平力の曲げモーメント分布（Chang・杭頭条件）/ 4 M-N図と配筋
※ kh算定式・係数・液状化低減は道示/建築基礎構造設計指針で確認要
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
OUT = "docs/pile_lateral"; FIG = os.path.join(OUT, "figures"); os.makedirs(FIG, exist_ok=True)

D = 1.0
I = math.pi * D**4 / 64
EI = 2.1e7 * I
kh = 5000.0
beta = (kh * D / (4 * EI)) ** 0.25
H = 200.0


def save(fig, n):
    p = os.path.join(FIG, n); fig.savefig(p, dpi=130, bbox_inches="tight"); plt.close(fig); return p


def fig_model():
    fig, ax = plt.subplots(figsize=(11.0, 6.4))
    # 杭（縦の梁）
    ax.add_patch(mpatches.Rectangle((4.5, 0.5), 1.0, 6.0, fc="#c8c8c8", ec="k", lw=1.5))
    ax.axhline(6.5, color="#8B5A2B", lw=1.2, ls=":")
    ax.text(0.5, 6.7, "地表面", fontproperties=jp, fontsize=8, color="#8B5A2B")
    # 地盤ばね（水平）
    for yy in np.linspace(1.0, 6.0, 8):
        zz = np.linspace(0, 1.2, 30)
        ax.plot(3.3 + 0.12 * np.sin(zz / 1.2 * 5 * math.pi), 4.5 - 3.3 * 0 + yy * 0 + yy - zz * 0,
                color="#7a3b00", lw=0)  # placeholder
    for yy in np.linspace(1.2, 6.0, 8):
        xs = np.linspace(3.2, 4.5, 30)
        ax.plot(xs, yy + 0.12 * np.sin((xs - 3.2) / 1.3 * 5 * math.pi), color="#7a3b00", lw=0.9)
        xs2 = np.linspace(5.5, 6.8, 30)
        ax.plot(xs2, yy + 0.12 * np.sin((xs2 - 5.5) / 1.3 * 5 * math.pi), color="#7a3b00", lw=0.9)
    ax.text(2.4, 3.5, "地盤ばね\n(水平)\nkh", ha="center", fontproperties=jp, fontsize=9, color="#7a3b00")
    ax.text(7.4, 3.5, "p = kh・y", ha="center", fontproperties=jp, fontsize=9, color="#7a3b00")
    # 外力
    ax.annotate("", xy=(5.0, 6.5), xytext=(5.0, 7.6), arrowprops=dict(arrowstyle="-|>", color="#c00000", lw=3))
    ax.text(5.15, 7.2, "軸力 N", fontproperties=jp, fontsize=10, color="#c00000")
    ax.annotate("", xy=(5.5, 6.3), xytext=(6.8, 6.3), arrowprops=dict(arrowstyle="-|>", color="#2a78d6", lw=3))
    ax.text(6.0, 6.55, "水平力 H", fontproperties=jp, fontsize=10, color="#2a78d6")
    ax.annotate("杭頭曲げ M\n（杭頭固定/自由）", xy=(4.5, 6.2), xytext=(1.4, 7.2),
                fontproperties=jp, fontsize=8.5, color="#548235",
                arrowprops=dict(arrowstyle="->", color="#548235"))
    ax.text(5.0, 0.0, "力の釣合：水平力 H ＝ 地盤反力（p=kh・y）の合計\n"
            "杭を梁、地盤を水平ばね（Winkler）とみなす弾性支承梁モデル",
            ha="center", fontproperties=jp, fontsize=9, color="#1f4e79")
    ax.set_xlim(0, 8.5); ax.set_ylim(-0.8, 8.0); ax.axis("off")
    ax.set_title("図 1  杭応力解析モデル（ばね支承梁・外力・釣合）",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig1_model.png")


def fig_kh():
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 4.8))
    # (a) kh 非線形
    ax = axes[0]
    y = np.linspace(0.2, 20, 100)
    khy = 5000 * (y / 1.0) ** (-0.5)
    ax.plot(y, khy, color="#c00000", lw=2)
    ax.set_xlabel("水平変位 y (mm)", fontproperties=jp, fontsize=9)
    ax.set_ylabel("水平地盤反力係数 kh (kN/m3)", fontproperties=jp, fontsize=9)
    ax.set_title("(a) kh の非線形（変位で低下）", fontproperties=jp, fontsize=9.5, fontweight="bold")
    ax.text(6, 6000, "kh ∝ y^(-1/2)\n変位が大きいほど kh 低下", fontproperties=jp, fontsize=9, color="#c00000")
    ax.grid(alpha=0.3)
    # (b) kh 算定と液状化
    ax = axes[1]
    ax.text(0.5, 0.95, "kh の算定と設計条件反映", transform=ax.transAxes, ha="center",
            fontproperties=jp, fontsize=10.5, fontweight="bold", color="#1f4e79")
    ax.text(0.04, 0.8,
            "・地盤反力 p = kh・y（y：水平変位）\n\n"
            "・kh は変形係数 Eo と杭径・変位で決まる\n"
            "  Eo は N値換算（Eo ≒ 700N）\n"
            "  kh = f(Eo, D, y)（非線形）※式は確認要\n\n"
            "・特性値 β = (kh・D/(4EI))^(1/4)\n"
            "  1/β が杭の変形の及ぶ長さの目安\n\n"
            "・液状化層は kh を低減係数 DE で低減\n"
            "  → 水平抵抗が下がり杭の曲げが増える",
            transform=ax.transAxes, fontproperties=jp, fontsize=9, va="top")
    ax.text(0.04, 0.05, "※ kh 算定式・DE は道示/基礎指針で確認要。",
            transform=ax.transAxes, fontproperties=jp, fontsize=7.8, color="#833c00")
    ax.axis("off")
    ax.set_title("(b) Eo/N換算・液状化低減", fontproperties=jp, fontsize=9.5, fontweight="bold")
    fig.suptitle("図 2  地盤バネ kh（Eo/N値換算・非線形・液状化反映）",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig2_kh.png")


def fig_moment():
    fig, axes = plt.subplots(1, 2, figsize=(13.0, 5.6), gridspec_kw={"width_ratios": [1.3, 1.0]})
    ax = axes[0]
    z = np.linspace(0, 25, 200)
    bz = beta * z
    Mfix = -(H / (2 * beta)) * np.exp(-bz) * (np.cos(bz) - np.sin(bz))
    Mfree = (H / beta) * np.exp(-bz) * np.sin(bz)
    ax.plot(Mfix, z, color="#c00000", lw=2, label="杭頭固定")
    ax.plot(Mfree, z, color="#2a78d6", lw=2, ls="--", label="杭頭自由（ピン）")
    ax.axvline(0, color="k", lw=0.8)
    ax.invert_yaxis()
    ax.set_xlabel("曲げモーメント M (kN・m)", fontproperties=jp, fontsize=9)
    ax.set_ylabel("深度 z (m)", fontproperties=jp, fontsize=9)
    ax.set_title("(a) 水平力による曲げM分布", fontproperties=jp, fontsize=9.5, fontweight="bold")
    ax.legend(prop=jp, fontsize=9); ax.grid(alpha=0.3)
    ax.annotate("杭頭で最大負M\n（固定）", xy=(Mfix[0], 0), xytext=(-450, 3),
                fontproperties=jp, fontsize=8, color="#c00000",
                arrowprops=dict(arrowstyle="->", color="#c00000"))
    ax.annotate("地中でMピーク\n（自由）", xy=(max(Mfree), z[np.argmax(Mfree)]), xytext=(150, 9),
                fontproperties=jp, fontsize=8, color="#2a78d6",
                arrowprops=dict(arrowstyle="->", color="#2a78d6"))
    ax = axes[1]
    ax.text(0.5, 0.95, "Chang の式（弾性地盤反力法）", transform=ax.transAxes, ha="center",
            fontproperties=jp, fontsize=10, fontweight="bold", color="#1f4e79")
    ax.text(0.04, 0.8,
            "特性値 β = (kh・D/(4EI))^(1/4)\n"
            f"  例 β = {beta:.3f} /m, 1/β = {1/beta:.2f}m\n\n"
            "【杭頭固定】\n"
            "  杭頭変位 y0 = H/(4EI・β^3)\n"
            "  杭頭曲げ M0 = H/(2β)\n"
            f"  例 H=200kN → y0={H/(4*EI*beta**3)*1000:.1f}mm,\n"
            f"       M0={H/(2*beta):.0f}kN・m\n\n"
            "【杭頭自由】\n"
            "  杭頭変位 y0 = H/(2EI・β^3)（固定の2倍）\n"
            "  地中 z≒π/(4β) 付近で最大曲げ",
            transform=ax.transAxes, fontproperties=jp, fontsize=8.8, va="top")
    ax.axis("off")
    ax.set_title("(b) 杭頭条件と変位・曲げ", fontproperties=jp, fontsize=9.5, fontweight="bold")
    fig.suptitle("図 3  水平力に対する曲げモーメント分布（杭頭固定/自由）",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig3_moment.png")


def fig_mn():
    fig, axes = plt.subplots(1, 2, figsize=(13.0, 5.2))
    # (a) M-N 相互作用図
    ax = axes[0]
    Mu = np.array([0, 350, 560, 620, 560, 350, 0])
    Nu = np.array([-800, 0, 900, 1800, 3200, 4600, 6000])
    ax.plot(Mu, Nu, color="#1f4e79", lw=2)
    ax.plot(-Mu, Nu, color="#1f4e79", lw=2)
    ax.fill_betweenx(Nu, -Mu, Mu, color="#cfe0f0", alpha=0.4)
    ax.plot(0, 1800, "o", color="#c00000", ms=6)
    ax.annotate("つり合い軸力\n（Mu最大）", xy=(620, 1800), xytext=(250, 3300),
                fontproperties=jp, fontsize=8, color="#c00000",
                arrowprops=dict(arrowstyle="->", color="#c00000"))
    ax.plot(536, 1500, "s", color="#548235", ms=8)
    ax.annotate("需要 (N=1500, M=536)\n包絡線の内側→OK", xy=(536, 1500), xytext=(-550, 4600),
                fontproperties=jp, fontsize=8, color="#548235",
                arrowprops=dict(arrowstyle="->", color="#548235"))
    ax.axhline(0, color="k", lw=0.6); ax.axvline(0, color="k", lw=0.6)
    ax.set_xlabel("曲げ耐力 M (kN・m)", fontproperties=jp, fontsize=9)
    ax.set_ylabel("軸力 N (kN)", fontproperties=jp, fontsize=9)
    ax.set_title("(a) M-N 相互作用図（P-M曲線）", fontproperties=jp, fontsize=9.5, fontweight="bold")
    ax.grid(alpha=0.3)
    # (b) 配筋計画
    ax = axes[1]
    ax.text(0.5, 0.95, "必要鉄筋・せん断・配筋計画", transform=ax.transAxes, ha="center",
            fontproperties=jp, fontsize=10.5, fontweight="bold", color="#1f4e79")
    ax.text(0.04, 0.82,
            "【必要鉄筋比 pg】\n"
            "  M-N図で需要(N,M)を満たす主筋量を決める\n"
            "  最小 pg ≒ 0.4%（場所打ち杭）\n"
            "  例 φ1000 → As=pg・Ag=0.004×0.785=31cm2\n\n"
            "【せん断の検討】\n"
            "  水平力によるせん断力 Q に対し帯筋(pw)\n"
            "  スパイラル筋・フープで確保\n\n"
            "【配筋計画（あき等）】\n"
            "  主筋のあき（径×1.5・粗骨材+α）確保\n"
            "  本数は あき・かぶりで決まる（pg最小＋納まり）\n"
            "  杭頭は曲げ大 → 主筋を密に、段落しに注意",
            transform=ax.transAxes, fontproperties=jp, fontsize=8.6, va="top")
    ax.axis("off")
    ax.set_title("(b) 配筋計画", fontproperties=jp, fontsize=9.5, fontweight="bold")
    fig.suptitle("図 4  杭 M-N 図と配筋（曲げ耐力・軸力・鉄筋比・せん断）",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig4_mn.png")


figs = {"model": fig_model(), "kh": fig_kh(), "moment": fig_moment(), "mn": fig_mn()}
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
title_row(ws, 1, "杭の水平力に対する検討 問題集（RC マンション設計担当・新人向け）", span=4)
body(ws, 2, "目標：杭の水平力解析（ばね支承梁）モデル・地盤バネkh・曲げモーメント分布・M-N図・"
            "配筋を理解し、水平力に対する杭の検討ができること。", span=4, h=32)
r = tbl(ws, 4, ["No.", "シート", "到達目標", "図"],
        [["1", "1 応力解析モデル", "モデル・外力・釣合を説明できる", "ばね支承梁"],
         ["2", "2 地盤バネ kh", "khの算定・Eo/N換算・非線形・液状化", "kh"],
         ["3", "3 曲げM分布", "水平力の曲げM分布を理解", "M図"],
         ["4", "4 M-N図と配筋", "M-N図・鉄筋比・せん断・あき", "M-N/配筋"]])
warn(ws, r + 2, "※ kh の算定式・係数、液状化低減係数DE、断面耐力の算定は"
                "道路橋示方書・建築基礎構造設計指針の最新版で確認すること。数値は例示。", span=4, h=40)

# ===== 1 応力解析モデル =====
ws = wb.create_sheet("1 応力解析モデル"); setup(ws, [8, 16, 18, 16, 12, 12])
title_row(ws, 1, "1  杭応力解析モデル（ばね支承梁・外力・釣合）")
head(ws, 3, "■ 図 1  杭応力解析モデル"); put_img(ws, figs["model"], "A4", w=760)
head(ws, 30, "■ 問題 1  解析モデル")
body(ws, 31, "杭の水平力解析で用いる『弾性支承梁（ばね支承梁）モデル』を説明せよ"
             "（杭を梁、地盤を水平ばね kh でモデル化）。地盤反力 p=kh・y の意味を述べよ。", h=40)
head(ws, 33, "■ 問題 2  外力と力の釣合")
body(ws, 34, "杭頭に作用する外力（軸力N・水平力H・曲げM）を挙げ、水平方向の力の釣合"
             "（水平力H＝地盤反力p=kh・yの合計）を説明せよ。", h=36)
head(ws, 36, "■ 問題 3  杭頭条件")
body(ws, 37, "杭頭固定（基礎と剛結）と杭頭自由（ピン）で、水平力に対する挙動（変位・曲げ）が"
             "どう変わるか述べよ。上下分離モデルとの関係にも触れよ。", h=36)

# ===== 2 地盤バネ kh =====
ws = wb.create_sheet("2 地盤バネkh"); setup(ws, [8, 16, 18, 16, 12, 12])
title_row(ws, 1, "2  地盤バネ kh（Eo/N換算・非線形・液状化）")
head(ws, 3, "■ 図 2  kh の非線形・算定"); put_img(ws, figs["kh"], "A4", w=860)
head(ws, 27, "■ 問題 1  水平地盤反力係数 kh")
body(ws, 28, "水平地盤反力係数 kh の意味（p=kh・y）と、変形係数 Eo から求めること、"
             "Eo の N値換算（Eo≒700N）を説明せよ。", h=36)
head(ws, 30, "■ 問題 2  kh の非線形")
body(ws, 31, "kh が水平変位 y の増加とともに低下する（非線形、kh∝y^(-1/2)）ことを説明せよ。"
             "設計で変位レベルに応じた kh を用いる意味を述べよ。", h=40)
head(ws, 33, "■ 問題 3  特性値 β")
body(ws, 34, "特性値 β=(kh・D/(4EI))^(1/4) の意味（杭の変形が及ぶ長さの逆数の目安、1/β）を述べよ。"
             "kh が大きい（硬い地盤）ほど β はどうなり、変形はどう変わるか。", h=40)
head(ws, 36, "■ 問題 4  液状化の反映")
body(ws, 37, "液状化判定の結果を杭の水平検討に反映する方法を述べよ（液状化層は kh を低減係数DEで"
             "低減、水平抵抗が下がり杭の変位・曲げが増える）。設計条件への反映が重要。", h=40)
warn(ws, 39, "※ kh 算定式・DE は道示/基礎指針で確認要。", h=22)

# ===== 3 曲げM分布 =====
ws = wb.create_sheet("3 曲げM分布"); setup(ws, [8, 16, 18, 16, 12, 12])
title_row(ws, 1, "3  水平力に対する曲げモーメント分布")
head(ws, 3, "■ 図 3  曲げM分布（Chang）"); put_img(ws, figs["moment"], "A4", w=820)
head(ws, 29, "■ 問題 1  M分布の形")
body(ws, 30, "杭頭固定と杭頭自由で、深さ方向の曲げモーメント分布がどう異なるか説明せよ"
             "（固定：杭頭で最大負M／自由：地中でMピーク）。図3で確認せよ。", h=40)
head(ws, 32, "■ 問題 2  Chang の式")
body(ws, 33, "特性値 β=(kh・D/(4EI))^(1/4) を用い、杭頭固定の杭頭変位 y0=H/(4EI・β^3)、"
             "杭頭曲げ M0=H/(2β) を、H=200kN・β=0.187 で求めよ。", h=40)
head(ws, 35, "■ 問題 3  杭頭固定と自由")
body(ws, 36, "同じ水平力でも、杭頭自由の変位は固定の約2倍（y0=H/(2EI・β^3)）になること、"
             "自由頭では最大曲げが地中（z≒π/(4β)）で生じることを説明せよ。", h=40)
head(ws, 38, "■ 問題 4  設計上の着目点")
body(ws, 39, "水平力に対する検討で着目すべき点（最大曲げ位置での断面照査、杭頭の曲げ、"
             "杭頭変位＝上部構造の変形との整合、液状化時の増大）を整理せよ。", h=40)

# ===== 4 M-N図と配筋 =====
ws = wb.create_sheet("4 MN図と配筋"); setup(ws, [8, 16, 18, 16, 12, 12])
title_row(ws, 1, "4  杭 M-N 図と配筋（鉄筋比・せん断・あき）")
head(ws, 3, "■ 図 4  M-N図と配筋"); put_img(ws, figs["mn"], "A4", w=840)
head(ws, 28, "■ 問題 1  M-N図の意味")
body(ws, 29, "杭の M-N（P-M）相互作用図の意味を説明せよ。軸力Nによって曲げ耐力Muが変わること"
             "（つり合い軸力までNが増えるとMu増、それ以上はMu減）を述べよ。", h=40)
head(ws, 31, "■ 問題 2  需要点の照査")
body(ws, 32, "需要（軸力N・曲げM）の点が M-N図の包絡線の内側にあれば断面はOKであることを説明せよ。"
             "軸力と曲げを同時に受ける杭では M-N図での照査が必要な理由を述べよ。", h=40)
head(ws, 34, "■ 問題 3  必要鉄筋比・せん断")
body(ws, 35, "M-N図を満たす主筋量（必要鉄筋比 pg、最小0.4%程度）の考え方、"
             "水平力によるせん断力に対する帯筋（pw、スパイラル/フープ）の検討を述べよ。", h=40)
head(ws, 37, "■ 問題 4  配筋計画（あき）")
body(ws, 38, "杭の配筋計画で、主筋のあき（径×1.5・粗骨材+α）・かぶりを確保しつつ本数を決めること、"
             "杭頭は曲げが大きいので主筋を密にする・段落しに注意することを述べよ。", h=40)
warn(ws, 40, "※ 断面耐力・必要鉄筋・せん断の算定は基礎指針/RC規準で確認要。", h=22)

# ===== 解答 =====
ws = wb.create_sheet("解答"); setup(ws, [4, 22, 60, 14])
title_row(ws, 1, "解答・解説", span=4); row = 2


def ah(t):
    global row; head(ws, row, t, span=4); row += 1


def an(t, h=None):
    global row; body(ws, row, t, span=4, ans=True, h=h); row += 1


def aw(t, h=None):
    global row; warn(ws, row, t, span=4, h=h); row += 1


ah("1  応力解析モデル")
an("問1：杭を曲げ剛性EIの梁、地盤を杭側面に連続する水平ばね kh でモデル化（Winkler・弾性支承梁）。"
   "各深さで地盤反力 p=kh・y（y：水平変位）が生じ、杭の変位に抵抗する。", h=44)
an("問2：外力は杭頭の軸力N・水平力H・曲げM。水平方向は H＝∫p dz（地盤反力p=kh・yの合計）で釣合う。"
   "杭は曲げを受けながら地盤反力で支えられる。", h=40)
an("問3：杭頭固定（基礎と剛結）は杭頭に大きな曲げが生じ変位は小さい。杭頭自由（ピン）は杭頭曲げ0で"
   "変位が大きく、地中で最大曲げ。上下分離では上部の柱脚反力が杭頭外力になる。", h=44)

ah("2  地盤バネ kh")
an("問1：kh は単位変位当たりの水平地盤反力（p=kh・y）。変形係数Eoから算定し、EoはN値換算"
   "（Eo≒700N 等）で求める。硬い地盤ほどkhが大きい。", h=40)
an("問2：kh は変位 y が大きいほど低下する（非線形、概ね kh∝y^(-1/2)）。地盤が大変位で軟化するため。"
   "設計では想定する変位レベルに応じた kh を用いる（過大評価を避ける）。", h=40)
an("問3：β=(kh・D/(4EI))^(1/4)。1/βが杭の変形・曲げの及ぶ深さの目安。khが大きい（硬い地盤）ほど"
   "βは大きく1/βは小さい＝変形は浅い範囲に集中し、杭頭曲げが大きくなる傾向。", h=44)
an("問4：液状化層は有効応力低下でkhが大きく低下するため、低減係数DE（FL・深度で0〜1）でkhを低減する。"
   "水平抵抗が下がると杭の変位・曲げが増えるため、液状化を設計条件に反映することが重要。", h=44)
aw("※ kh 算定式・DE は道示/基礎指針で確認要。", h=22)

ah("3  曲げM分布")
an("問1：杭頭固定は杭頭で最大の負モーメント（M0=H/(2β)）、深部で減衰しながら符号反転（波状）。"
   "杭頭自由は杭頭M=0で、地中 z≒π/(4β) 付近に最大曲げ。杭頭条件でM分布が大きく変わる。", h=44)
an("問2：y0=H/(4EI・β^3)=200/(4×1.03e6×0.187^3)≒7.5mm。M0=H/(2β)=200/(2×0.187)≒536kN・m。"
   "（β=0.187/m, EI=1.03e6kN・m2）", h=40)
an("問3：杭頭自由の変位 y0=H/(2EI・β^3) は固定の2倍。曲げは杭頭で0、地中の z≒π/(4β)≒4.2m 付近で"
   "最大となる。杭頭固定か自由かで最大曲げ位置・大きさが変わる。", h=40)
an("問4：最大曲げ位置での断面照査、杭頭部（固定なら曲げ大）の配筋、杭頭変位と上部構造の"
   "層間変形の整合、液状化時のkh低減による曲げ・変位増大への配慮。", h=40)

ah("4  M-N図と配筋")
an("問1：M-N図は軸力Nと曲げ耐力Muの関係。Nが小さい域ではNの増加でMuが増え、つり合い軸力で最大、"
   "それ以上はコンクリート圧壊が先行しMuが減る。杭断面の耐力を表す包絡線。", h=44)
an("問2：需要点(N,M)が包絡線の内側なら断面OK、外側ならNG。杭は軸力（鉛直）と曲げ（水平力）を"
   "同時に受けるため、単独でなくM-N図（相互作用）で照査する必要がある。", h=40)
an("問3：M-N図で需要を満たす主筋量から必要鉄筋比pgを決める（最小pg≒0.4%）。"
   "水平力によるせん断力Qに対して帯筋（pw、スパイラル/フープ）でせん断耐力を確保する。", h=40)
an("問4：主筋のあき（径×1.5・粗骨材径+α）とかぶりを確保して本数を決める（pg最小＋納まり）。"
   "杭頭は曲げが大きいため主筋を密に配置し、主筋の段落し（カットオフ）位置に注意する。", h=44)
aw("※ 断面耐力・必要鉄筋・せん断の算定は基礎指針/RC規準で確認要。", h=22)

XLSX = os.path.join(OUT, "杭の水平力検討問題集.xlsx"); wb.save(XLSX); print("saved:", XLSX)
