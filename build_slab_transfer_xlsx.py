# -*- coding: utf-8 -*-
"""スラブの移行せん断力と断面算定 問題集。
出力: docs/slab_transfer_shear/スラブ移行せん断力問題集.xlsx
数値はすべて Python で検算済み（scratchpad/v2.py）。
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
OUT = "docs/slab_transfer_shear"; FIG = os.path.join(OUT, "figures")
os.makedirs(FIG, exist_ok=True)

RED, BLU, GRN, ORG = "#c00000", "#2a78d6", "#548235", "#c55a11"
CONC, SLAB = "#d9d9d9", "#e8e0d0"
# 検算済みの値
k = 0.2
Q2 = {"X1": 1800, "X2": 3000}; W2 = {"X1": 3000, "X2": 3000}
P2 = {g: k * W2[g] for g in W2}
Q1 = {"X1": 4800, "X2": 1200}
QS = {g: Q2[g] + P2[g] for g in Q2}
DQ = {g: Q1[g] - QS[g] for g in Q1}
DQD = abs(DQ["X1"])
B, T, FC, FT = 12000.0, 200.0, 36.0, 295.0
FSL = min(FC / 30, 0.49 + FC / 100); FSS = 1.5 * FSL
TAU = DQD * 1e3 / (B * T); TREQ = DQD * 1e3 / (B * FSS)
ASR = DQD * 1e3 / FT


def save(fig, n):
    p = os.path.join(FIG, n); fig.savefig(p, dpi=130, bbox_inches="tight"); plt.close(fig)
    print("fig:", p); return p


# ============ 図1 移行せん断力の概念 ============
def fig_concept():
    fig, ax = plt.subplots(figsize=(12.5, 6.4))
    xs = {"X1": 2.4, "X2": 8.6}
    for g, x in xs.items():
        ax.plot([x, x], [0, 6], color="#2e5b8a", lw=5, solid_capstyle="butt")
        ax.text(x, 6.35, f"{g}通り", ha="center", fontproperties=jp, fontsize=11, fontweight="bold")
    for y, lab in [(0, "1階（GL）"), (3, "2階床"), (6, "R階")]:
        ax.plot([1.2, 9.8], [y, y], color="#8a8a8a", lw=1.2, ls=(0, (6, 4)))
        ax.text(0.95, y, lab, ha="right", va="center", fontproperties=jp, fontsize=9, color="#555")
    # 2階スラブ（移行の経路）
    ax.add_patch(mpatches.Rectangle((2.4, 2.88), 6.2, 0.24, fc=SLAB, ec="k", lw=1.2))
    # 2層せん断力 Q2（上から流れてくる）
    for g, x in xs.items():
        ax.annotate("", xy=(x, 4.5), xytext=(x - 1.05, 4.5),
                    arrowprops=dict(arrowstyle="-|>", color=BLU, lw=3))
        ax.text(x - 1.1, 4.78, f"Q2={Q2[g]:,}", ha="center", fontproperties=jp, fontsize=9.5, color=BLU)
    ax.text(5.5, 5.5, "2層のせん断力 Q2（上階から流れてくる）", ha="center",
            fontproperties=jp, fontsize=10, color=BLU)
    # 2階の地震力 P2
    for g, x in xs.items():
        ax.annotate("", xy=(x, 3.0), xytext=(x - 1.05, 3.0),
                    arrowprops=dict(arrowstyle="-|>", color=RED, lw=3))
        ax.text(x - 1.1, 3.26, f"P2={P2[g]:,.0f}", ha="center", fontproperties=jp, fontsize=9.5, color=RED)
    # 移行せん断力 ΔQ（スラブ内）
    ax.annotate("", xy=(3.3, 2.55), xytext=(7.7, 2.55),
                arrowprops=dict(arrowstyle="-|>", color=ORG, lw=4))
    ax.text(5.5, 2.18, f"移行せん断力 ΔQ = {DQD:,.0f} kN\n（2階スラブが X2通り → X1通り へ伝達）",
            ha="center", va="top", fontproperties=jp, fontsize=10, color=ORG, fontweight="bold")
    # 1層せん断力 Q1
    for g, x in xs.items():
        ax.annotate("", xy=(x, 1.2), xytext=(x - 1.05, 1.2),
                    arrowprops=dict(arrowstyle="-|>", color=GRN, lw=3))
        ax.text(x - 1.1, 1.46, f"Q1={Q1[g]:,}", ha="center", fontproperties=jp, fontsize=9.5, color=GRN)
    ax.text(5.5, 0.55, "1層のせん断力 Q1（剛性分布が2層と変わる）", ha="center",
            fontproperties=jp, fontsize=10, color=GRN)
    # 節点つり合い
    ax.text(10.3, 3.0, "2階床の節点つり合い\n\n  Q2 + P2 + ΔQ = Q1\n\n"
            "→ ΔQ = Q1 −（Q2 + P2）", fontproperties=jp, fontsize=10.5, va="center",
            color="#1f4e79", bbox=dict(boxstyle="round", fc="#eaf1fb", ec="#2e75b6", lw=1.2))
    ax.set_xlim(-0.3, 14.2); ax.set_ylim(-0.2, 6.9); ax.axis("off")
    ax.set_title("図 1  移行せん断力の考え方（2階床レベルの力のつり合い）",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig1_concept.png")


# ============ 図2 算出フローと数値 ============
def fig_calc():
    fig, axes = plt.subplots(1, 2, figsize=(13.8, 5.2), gridspec_kw={"width_ratios": [1.0, 1.25]})
    ax = axes[0]
    steps = [("STEP 1", "2階の地震力", "P2 = k・W2  （k=0.2）", "#dbe5f1", "#2e5b8a"),
             ("STEP 2", "移行がない場合の1階せん断力", "Q1* = Q2 + P2", "#dce9d4", GRN),
             ("STEP 3", "移行せん断力", "ΔQ = Q1 − Q1*", "#fde7d4", ORG)]
    for i, (s, t_, f_, fc, ec) in enumerate(steps):
        y = 0.70 - i * 0.235
        ax.add_patch(mpatches.FancyBboxPatch((0.04, y), 0.92, 0.195,
                     boxstyle="round,pad=0.01", transform=ax.transAxes, fc=fc, ec=ec, lw=1.4))
        ax.text(0.09, y + 0.138, f"{s}　{t_}", transform=ax.transAxes,
                fontproperties=jp, fontsize=10, fontweight="bold", color=ec)
        ax.text(0.09, y + 0.055, f_, transform=ax.transAxes,
                fontproperties=jp, fontsize=11.5)
        if i < 2:
            ax.annotate("", xy=(0.5, y - 0.035), xytext=(0.5, y), xycoords="axes fraction",
                        arrowprops=dict(arrowstyle="-|>", color="#888", lw=2))
    ax.text(0.5, 0.045, "ΣΔQ = 0 になることで検算できる", transform=ax.transAxes,
            ha="center", fontproperties=jp, fontsize=10, color=RED)
    ax.axis("off")
    ax.set_title("(a) 算出の流れ", fontproperties=jp, fontsize=10.5, fontweight="bold")

    ax = axes[1]
    ax.axis("off")
    ax.set_title("(b) 計算結果", fontproperties=jp, fontsize=10.5, fontweight="bold")
    rows = [
        ["項目", "記号・式", "X1通り", "X2通り", "合計"],
        ["2層せん断力", "Q2", f"{Q2['X1']:,}", f"{Q2['X2']:,}", f"{sum(Q2.values()):,}"],
        ["2層地震用重量", "W2", f"{W2['X1']:,}", f"{W2['X2']:,}", f"{sum(W2.values()):,}"],
        ["2階の地震力", "P2 = 0.2・W2", f"{P2['X1']:,.0f}", f"{P2['X2']:,.0f}", f"{sum(P2.values()):,.0f}"],
        ["移行なしの1階", "Q1* = Q2+P2", f"{QS['X1']:,.0f}", f"{QS['X2']:,.0f}", f"{sum(QS.values()):,.0f}"],
        ["1層せん断力", "Q1", f"{Q1['X1']:,}", f"{Q1['X2']:,}", f"{sum(Q1.values()):,}"],
        ["移行せん断力", "ΔQ = Q1−Q1*", f"{DQ['X1']:+,.0f}", f"{DQ['X2']:+,.0f}", "0"],
    ]
    nc, nr = 5, len(rows)
    cw = [0.265, 0.235, 0.165, 0.165, 0.17]
    x0 = 0.0
    for r, row in enumerate(rows):
        y = 0.90 - r * 0.118
        x = x0
        for c, v in enumerate(row):
            hdr = (r == 0)
            last = (r == nr - 1)
            fc = "#2e75b6" if hdr else ("#fdecea" if last else ("#f7fafd" if r % 2 else "#ffffff"))
            ax.add_patch(mpatches.Rectangle((x, y), cw[c], 0.112, transform=ax.transAxes,
                         fc=fc, ec="#b4c6e7", lw=0.8))
            ax.text(x + cw[c] / 2, y + 0.056, v, transform=ax.transAxes, ha="center", va="center",
                    fontproperties=jp, fontsize=9,
                    fontweight="bold" if hdr or last else "normal",
                    color="white" if hdr else (RED if last and c >= 2 else "#222"))
            x += cw[c]
    ax.text(0.5, -0.055, "単位：kN　　ΣΔQ = (+2,400) + (−2,400) = 0 → つり合い OK",
            transform=ax.transAxes, ha="center", fontproperties=jp, fontsize=9.5, color=RED)
    return save(fig, "fig2_calc.png")


# ============ 図3 平面図と抵抗断面 ============
def fig_plan():
    fig, axes = plt.subplots(1, 2, figsize=(13.8, 5.0), gridspec_kw={"width_ratios": [1.3, 1.0]})
    ax = axes[0]
    ax.add_patch(mpatches.Rectangle((0, 0), 12, 8, fc=SLAB, ec="none"))
    for y, g in [(0, "X1"), (8, "X2")]:
        ax.plot([0, 12], [y, y], color="#2e5b8a", lw=6, solid_capstyle="butt")
        ax.text(-0.45, y, f"{g}通り", ha="right", va="center",
                fontproperties=jp, fontsize=10.5, fontweight="bold")
    # 検討断面
    ax.plot([0, 12], [4, 4], color=RED, lw=2.4, ls="--")
    ax.text(12.3, 4, "検討断面\n（通りに平行に切る）", fontproperties=jp,
            fontsize=9, color=RED, va="center")
    # 移行せん断力の流れ
    for xx in np.linspace(1.2, 10.8, 7):
        ax.annotate("", xy=(xx, 3.4), xytext=(xx, 4.6),
                    arrowprops=dict(arrowstyle="-|>", color=ORG, lw=1.8))
    ax.text(6, 5.6, f"移行せん断力 ΔQ = {DQD:,.0f} kN が\nX2通り → X1通り へ流れる",
            ha="center", fontproperties=jp, fontsize=10, color=ORG, fontweight="bold")
    # 有効幅
    ax.annotate("", xy=(0, -0.95), xytext=(12, -0.95),
                arrowprops=dict(arrowstyle="<->", color="#333", lw=1.4))
    ax.text(6, -1.35, f"スラブ有効幅 b = {B:,.0f} mm", ha="center", va="top",
            fontproperties=jp, fontsize=10.5, fontweight="bold")
    # 地震力の向き
    ax.annotate("", xy=(10.5, 9.1), xytext=(8.0, 9.1),
                arrowprops=dict(arrowstyle="-|>", color=BLU, lw=3))
    ax.text(9.25, 9.4, "地震力の向き", ha="center", fontproperties=jp, fontsize=9.5, color=BLU)
    ax.set_xlim(-3.6, 16.2); ax.set_ylim(-2.3, 10.0); ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(a) 2階床伏図（スラブが面内で力を伝える）",
                 fontproperties=jp, fontsize=10.5, fontweight="bold")

    ax = axes[1]
    ax.add_patch(mpatches.Rectangle((0, 0), 10, 1.6, fc=SLAB, ec="k", lw=1.6))
    ax.annotate("", xy=(0, -0.75), xytext=(10, -0.75),
                arrowprops=dict(arrowstyle="<->", color="#333", lw=1.4))
    ax.text(5, -1.15, f"有効幅 b = {B:,.0f} mm", ha="center", va="top",
            fontproperties=jp, fontsize=10, fontweight="bold")
    ax.annotate("", xy=(10.7, 0), xytext=(10.7, 1.6),
                arrowprops=dict(arrowstyle="<->", color="#333", lw=1.4))
    ax.text(11.0, 0.8, f"スラブ厚\nt = {T:,.0f} mm", va="center",
            fontproperties=jp, fontsize=10, fontweight="bold")
    for xx in np.linspace(0.7, 9.3, 9):
        ax.annotate("", xy=(xx + 0.45, 0.8), xytext=(xx - 0.3, 0.8),
                    arrowprops=dict(arrowstyle="-|>", color=ORG, lw=1.6))
    ax.text(5, 2.25, "この断面で面内せん断力 ΔQ を負担する",
            ha="center", fontproperties=jp, fontsize=10, color=ORG)
    ax.text(5, -2.1, f"断面積 A = b × t = {B:,.0f} × {T:,.0f}\n"
            f"　　　　 = {B*T/1e6:.1f} ×10^6 mm²",
            ha="center", va="top", fontproperties=jp, fontsize=10, color="#1f4e79")
    ax.set_xlim(-0.8, 13.8); ax.set_ylim(-3.4, 2.8); ax.axis("off")
    ax.set_title("(b) 抵抗断面の取り方", fontproperties=jp, fontsize=10.5, fontweight="bold")
    fig.suptitle("図 3  スラブが抵抗する断面（有効幅 × スラブ厚）",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig3_plan.png")


# ============ 図4 断面算定 ============
def fig_design():
    fig, axes = plt.subplots(1, 2, figsize=(13.8, 5.2))
    ax = axes[0]
    ts = np.array([120, 150, 180, 200, 250, 300])
    taus = DQD * 1e3 / (B * ts)
    cols = [RED if x > FSS else GRN for x in taus]
    ax.bar([str(t) for t in ts], taus, color=cols, ec="k", width=0.58)
    ax.axhline(FSS, color=RED, ls="--", lw=1.8)
    ax.text(5.42, FSS + 0.045, f"短期許容 fs={FSS:.3f}", ha="right",
            fontproperties=jp, fontsize=9.5, color=RED)
    for i, (t_, v) in enumerate(zip(ts, taus)):
        ax.text(i, v + 0.035, f"{v:.3f}", ha="center", fontproperties=jp, fontsize=8.6)
    ax.axvline(2.5, color="#888", ls=":", lw=1.2)
    ax.text(3.0, 1.72, "t=200mm を採用\n（t=150mm は NG）", fontproperties=jp,
            fontsize=9.5, color="#1f4e79")
    ax.set_xlabel("スラブ厚 t (mm)", fontproperties=jp, fontsize=9.5)
    ax.set_ylabel("面内せん断応力度 τ (N/mm²)", fontproperties=jp, fontsize=9.5)
    ax.set_ylim(0, 1.95); ax.grid(alpha=0.3, axis="y")
    ax.set_title("(a) スラブ厚と面内せん断応力度", fontproperties=jp, fontsize=10.5, fontweight="bold")

    ax = axes[1]
    ax.text(0.5, 0.965, "断面算定（短期・地震時）", transform=ax.transAxes, ha="center",
            fontproperties=jp, fontsize=11, fontweight="bold", color="#1f4e79")
    ax.text(0.04, 0.855,
            f"【許容せん断応力度】Fc = {FC:.0f} N/mm²\n"
            f"　長期 fs = min(Fc/30, 0.49+Fc/100)\n"
            f"　　　  = min({FC/30:.2f}, {0.49+FC/100:.2f}) = {FSL:.2f} N/mm²\n"
            f"　短期 fs = 1.5 × {FSL:.2f} = {FSS:.3f} N/mm²\n\n"
            f"【面内せん断応力度】\n"
            f"　τ = ΔQ /(b・t) = {DQD*1e3:,.0f} /({B:,.0f}×{T:,.0f})\n"
            f"　　 = {TAU:.3f} N/mm²  <=  {FSS:.3f}  → OK（余裕 {FSS/TAU:.2f} 倍）\n\n"
            f"【必要スラブ厚】\n"
            f"　t = ΔQ /(b・fs) = {DQD*1e3:,.0f} /({B:,.0f}×{FSS:.3f})\n"
            f"　　 = {TREQ:.0f} mm　→　t = {T:.0f} mm を採用\n\n"
            f"【伝達補強筋】SD295（短期 ft = {FT:.0f} N/mm²）\n"
            f"　As = ΔQ / ft = {DQD*1e3:,.0f} / {FT:.0f} = {ASR:,.0f} mm²\n"
            f"　有効幅 {B/1000:.0f}m に分布 → {ASR/(B/1000):.0f} mm²/m\n"
            f"　→ D13@200 ダブル（1,267 mm²/m）で OK",
            transform=ax.transAxes, fontproperties=jp, fontsize=9.1, va="top")
    ax.axis("off")
    ax.set_title("(b) 検定の計算", fontproperties=jp, fontsize=10.5, fontweight="bold")
    fig.suptitle("図 4  スラブの断面算定（面内せん断）",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig4_design.png")


F = {"concept": fig_concept(), "calc": fig_calc(),
     "plan": fig_plan(), "design": fig_design()}

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
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w
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


GIVEN = ("【与条件】水平震度 k = 0.2\n"
         "　2層せん断力 Q2 　　：X1通り 1,800 kN　／　X2通り 3,000 kN　（計 4,800 kN）\n"
         "　2層地震用重量 W2 　：X1通り 3,000 kN　／　X2通り 3,000 kN　（計 6,000 kN）\n"
         "　1層せん断力 Q1 　　：X1通り 4,800 kN　／　X2通り 1,200 kN　（計 6,000 kN）\n"
         "　2階スラブ：有効幅 b = 12,000 mm、厚さ t = 200 mm、Fc = 36 N/mm²、鉄筋 SD295")

# ---------- 目次 ----------
ws = wb.active; ws.title = "目次"; setup(ws, [5, 26, 52, 16])
title_row(ws, 1, "スラブの移行せん断力と断面算定 問題集", span=4)
body(ws, 2, "目標：剛性分布が階で変わるときに2階スラブが伝達する「移行せん断力」を算出し、"
            "スラブの面内せん断に対する断面算定（必要厚・伝達補強筋）ができること。", span=4, h=32)
r = tbl(ws, 4, ["No.", "シート", "到達目標", "図"],
        [["1", "1 移行せん断力とは", "移行せん断力が生じる理由を説明できる", "概念・つり合い"],
         ["2", "2 移行せん断力の算出", "ΔQ = Q1−(Q2+P2) を算出できる", "算出フロー・計算表"],
         ["3", "3 スラブの抵抗断面", "有効幅×スラブ厚の取り方を理解する", "伏図・断面"],
         ["4", "4 スラブの断面算定", "面内せん断の検定・必要厚・補強筋", "τ検定"]])
body(ws, r + 2, GIVEN, span=4, h=84)
warn(ws, r + 4, "※ 許容せん断応力度の式、短期の割増し、伝達補強筋の考え方は "
                "RC規準・技術基準解説書の最新版で確認すること。本教材の数値は手順理解のための例示。",
     span=4, h=36)

# ---------- 1 概念 ----------
ws = wb.create_sheet("1 移行せん断力とは"); setup(ws, [8, 16, 18, 16, 14, 14])
title_row(ws, 1, "1  移行せん断力とは")
head(ws, 3, "■ 図 1  2階床レベルの力のつり合い"); put_img(ws, F["concept"], "A4", w=900)
head(ws, 29, "■ 問題 1  なぜ移行せん断力が生じるのか")
body(ws, 30, "剛床（床が面内で十分に剛）と仮定した建物で、各通りが負担するせん断力は"
             "その階の剛性に応じて配分される。2層と1層で剛性の分布が変わると何が起こるか、"
             "本問の条件（2層は X2通りが多く負担、1層は X1通りが多く負担）に即して説明せよ。", h=52)
head(ws, 32, "■ 問題 2  節点のつり合い")
body(ws, 33, "2階床レベルで、ある通りに着目したときの力のつり合いを式で示せ。"
             "（上から流れてくる Q2、その階に作用する地震力 P2、スラブから流入/流出する ΔQ、"
             "下へ流れる Q1 の4つ）", h=46)
head(ws, 35, "■ 問題 3  ΣΔQ = 0 の意味")
body(ws, 36, "すべての通りの移行せん断力を合計すると 0 になる。これは何を意味するか述べよ。"
             "また、この性質が計算の検算に使えることを説明せよ。", h=40)
head(ws, 38, "■ 問題 4  どこを流れるのか")
body(ws, 39, "移行せん断力は建物のどの部材を通って伝達されるか。"
             "スラブが「面内」で力を受けるとはどういう状態か、曲げを受ける通常のスラブ設計との"
             "違いに触れて説明せよ。", h=46)

# ---------- 2 算出 ----------
ws = wb.create_sheet("2 移行せん断力の算出"); setup(ws, [8, 16, 18, 16, 14, 14])
title_row(ws, 1, "2  移行せん断力の算出")
head(ws, 3, "■ 与条件"); body(ws, 4, GIVEN, h=84)
head(ws, 9, "■ 図 2  算出の流れと計算結果"); put_img(ws, F["calc"], "A4", w=900)
head(ws, 33, "■ 問題 1  2階の地震力 P2")
body(ws, 34, "各通りの2階の地震力 P2 = k・W2 を求めよ（k = 0.2）。", h=26)
r = tbl(ws, 35, ["通り", "W2 (kN)", "P2 = 0.2・W2 (kN)"],
        [["X1通り", "3,000", ""], ["X2通り", "3,000", ""], ["合計", "6,000", ""]])
head(ws, r + 2, "■ 問題 2  移行がない場合の1階せん断力")
body(ws, r + 3, "もしスラブによる移行がないとすれば、各通りの1階せん断力は "
                "Q1* = Q2 + P2 となる。各通りについて求めよ。", h=32)
r2 = tbl(ws, r + 4, ["通り", "Q2 (kN)", "P2 (kN)", "Q1* = Q2+P2 (kN)"],
         [["X1通り", "1,800", "", ""], ["X2通り", "3,000", "", ""], ["合計", "4,800", "", ""]])
head(ws, r2 + 2, "■ 問題 3  移行せん断力 ΔQ")
body(ws, r2 + 3, "実際の1階せん断力 Q1 と問題2の Q1* との差が移行せん断力である。"
                 "ΔQ = Q1 − Q1* を各通りについて求め、符号の意味（＋＝スラブから流入、"
                 "−＝スラブへ流出）も答えよ。", h=46)
r3 = tbl(ws, r2 + 4, ["通り", "Q1 (kN)", "Q1* (kN)", "ΔQ = Q1−Q1* (kN)", "流入/流出"],
         [["X1通り", "4,800", "", "", ""], ["X2通り", "1,200", "", "", ""],
          ["合計", "6,000", "", "", "―"]])
head(ws, r3 + 2, "■ 問題 4  検算")
body(ws, r3 + 3, "(1) ΣQ1 = ΣQ2 + ΣP2 が成立することを確認せよ。\n"
                 "(2) ΣΔQ = 0 となることを確認せよ。\n"
                 "(3) 2階スラブが伝達すべき移行せん断力 ΔQ は何 kN で、どの通りからどの通りへ"
                 "流れるか答えよ。", h=56)

# ---------- 3 抵抗断面 ----------
ws = wb.create_sheet("3 スラブの抵抗断面"); setup(ws, [8, 16, 18, 16, 14, 14])
title_row(ws, 1, "3  スラブが抵抗する断面")
head(ws, 3, "■ 図 3  伏図と抵抗断面"); put_img(ws, F["plan"], "A4", w=900)
head(ws, 28, "■ 問題 1  検討断面の位置")
body(ws, 29, "移行せん断力に対してスラブを検討するとき、どこで断面を切るか。"
             "図3(a) を見て、切る向き（通りに平行か直交か）と、その理由を述べよ。", h=40)
head(ws, 31, "■ 問題 2  抵抗断面積")
body(ws, 32, "有効幅 b = 12,000 mm、スラブ厚 t = 200 mm のとき、"
             "面内せん断に抵抗する断面積 A = b × t を求めよ（mm² および ×10^6 mm²）。", h=36)
head(ws, 34, "■ 問題 3  有効幅の考え方")
body(ws, 35, "スラブに吹抜けや大きな開口がある場合、有効幅 b はどう扱うべきか述べよ。"
             "また、有効幅が小さくなると面内せん断応力度はどうなるか答えよ。", h=40)
head(ws, 37, "■ 問題 4  伝達経路の確認")
body(ws, 38, "移行せん断力は、スラブ面内 → 梁 → 柱・耐震壁 という経路で伝達される。"
             "スラブと梁が一体になっていること（打継ぎ・段差がないこと）が重要な理由を述べよ。", h=40)

# ---------- 4 断面算定 ----------
ws = wb.create_sheet("4 スラブの断面算定"); setup(ws, [8, 16, 18, 16, 14, 14])
title_row(ws, 1, "4  スラブの断面算定（面内せん断）")
head(ws, 3, "■ 図 4  断面算定"); put_img(ws, F["design"], "A4", w=900)
head(ws, 28, "■ 問題 1  許容せん断応力度")
body(ws, 29, "Fc = 36 N/mm² のとき、コンクリートの許容せん断応力度を求めよ。\n"
             "　長期 fs = min(Fc/30, 0.49 + Fc/100)　　短期 fs = 1.5 × 長期", h=40)
head(ws, 31, "■ 問題 2  面内せん断応力度の検定")
body(ws, 32, "ΔQ = 2,400 kN、b = 12,000 mm、t = 200 mm のとき、"
             "τ = ΔQ /(b・t) を求め、短期許容せん断応力度と比較して可否を判定せよ。"
             "余裕率（fs/τ）も求めよ。", h=44)
r = tbl(ws, 33, ["項目", "式", "値（記入）"],
        [["断面積 A", "b × t", ""], ["せん断応力度 τ", "ΔQ /(b・t)", ""],
         ["短期許容 fs", "1.5 × min(Fc/30, 0.49+Fc/100)", ""],
         ["判定", "τ <= fs か", ""], ["余裕率", "fs / τ", ""]])
head(ws, r + 2, "■ 問題 3  必要スラブ厚")
body(ws, r + 3, "τ = fs となる限界のスラブ厚 t = ΔQ /(b・fs) を求めよ。"
                "その結果から、t = 150 mm では成立するか、t = 200 mm を採用する理由を述べよ。", h=44)
head(ws, r + 5, "■ 問題 4  伝達補強筋")
body(ws, r + 6, "移行せん断力をスラブ筋で伝達させる場合の必要鉄筋量 As = ΔQ / ft を求めよ"
                "（SD295、短期 ft = 295 N/mm²）。有効幅 12.0 m に分布させたときの mm²/m を求め、"
                "下表から配筋を選定せよ。", h=48)
r2 = tbl(ws, r + 7, ["配筋", "鉄筋量 (mm²/m)", "可否（記入）"],
         [["D10@200 ダブル", "713", ""], ["D13@200 ダブル", "1,267", ""],
          ["D13@150 ダブル", "1,689", ""]])
head(ws, r2 + 2, "■ 問題 5  実務上の留意点")
body(ws, r2 + 3, "移行せん断力の検討が特に重要になるのはどのような場合か挙げよ"
                 "（耐震壁が途中階で切れる、ピロティ、剛性分布が階で大きく変わる、"
                 "吹抜け・大開口でスラブの有効幅が小さい、細長い平面、スラブに段差がある）。", h=52)
warn(ws, r2 + 5, "※ 許容せん断応力度の式・短期の割増し・伝達補強筋の考え方は規準で確認要。", h=26)

# ---------- 解答 ----------
ws = wb.create_sheet("解答"); setup(ws, [5, 22, 58, 16])
title_row(ws, 1, "解答・解説", span=4); row = 2


def ah(t_):
    global row; head(ws, row, t_, span=4); row += 1


def an(t_, h=None):
    global row; body(ws, row, t_, span=4, ans=True, h=h); row += 1


def aw(t_, h=None):
    global row; warn(ws, row, t_, span=4, h=h); row += 1


ah("1  移行せん断力とは")
an("問1：剛床と仮定すると、各階のせん断力はその階の剛性に比例して各通りに配分される。"
   "本問では2層は X2通りが多く負担（3,000 > 1,800）するのに対し、1層では X1通りが"
   "多く負担（4,800 > 1,200）する。つまり階によって『どの通りが主に抵抗するか』が入れ替わる。"
   "この配分の差を埋めるため、2階床で通り間に力を受け渡す必要が生じる。これが移行せん断力。", h=72)
an("問2：Q2 ＋ P2 ＋ ΔQ ＝ Q1　（ΔQ について解くと ΔQ ＝ Q1 −（Q2 ＋ P2））。"
   "上から流れてきた Q2 に、その階の地震力 P2 が加わり、"
   "さらにスラブを介して出入りする ΔQ を加えたものが、下階へ流れる Q1 になる。", h=52)
an("問3：ΣΔQ = 0 は、スラブが力を『発生させている』のではなく、"
   "通りから通りへ『受け渡している』だけであることを意味する（内力のやり取り）。"
   "ある通りへの流入は必ず別の通りからの流出と釣り合う。"
   "したがって各通りの ΔQ を合計して 0 にならなければ、どこかに計算誤りがある。", h=60)
an("問4：床スラブ（および床梁）を通って伝達される。通常のスラブ設計は鉛直荷重による"
   "『面外（曲げ）』の検討だが、移行せん断力はスラブを水平な板として見たときの"
   "『面内（せん断）』の検討である。スラブを深い梁（ダイアフラグム）とみなして扱う。", h=56)

ah("2  移行せん断力の算出")
an("問1：P2 = 0.2 × 3,000 = 600 kN（X1通り・X2通りとも）。合計 1,200 kN。", h=28)
an("問2：Q1* = Q2 + P2。X1通り：1,800 + 600 = 2,400 kN。X2通り：3,000 + 600 = 3,600 kN。"
   "合計 6,000 kN。", h=36)
an("問3：ΔQ = Q1 − Q1*。\n"
   "　X1通り：4,800 − 2,400 = ＋2,400 kN（スラブから流入）\n"
   "　X2通り：1,200 − 3,600 = −2,400 kN（スラブへ流出）", h=48)
an("問4：(1) ΣQ1 = 6,000、ΣQ2 + ΣP2 = 4,800 + 1,200 = 6,000 で一致 → OK。\n"
   "(2) ΣΔQ = (＋2,400) + (−2,400) = 0 → つり合い OK。\n"
   "(3) 2階スラブが伝達すべき移行せん断力は ΔQ = 2,400 kN。"
   "X2通り（1層で負担が減る側）から X1通り（1層で負担が増える側）へ流れる。", h=64)

ah("3  スラブの抵抗断面")
an("問1：通りに平行な向きに切る。移行せん断力は X2通りから X1通りへ、"
   "通りと直交する向きに流れるので、その流れを横切る面（＝通りに平行な面）が"
   "せん断に抵抗する断面になる。", h=48)
an("問2：A = b × t = 12,000 × 200 = 2,400,000 mm² = 2.4 ×10^6 mm²。", h=28)
an("問3：吹抜けや大開口の部分は力を伝達できないため、有効幅 b からその幅を差し引く"
   "（残った部分の幅の合計を b とする）。b が小さくなると τ = ΔQ/(b・t) は反比例して"
   "大きくなるため、同じ移行せん断力でも検定が厳しくなる。", h=52)
an("問4：スラブ面内のせん断力は、最終的に梁を介して柱・耐震壁に伝えられる。"
   "スラブと梁が一体でないと、この経路の途中で力が伝わらず、"
   "想定した耐震要素まで力が届かない。段差や打継ぎがある場合は、"
   "その位置で力が伝達できるか（補強筋の連続性）を確認する必要がある。", h=60)

ah("4  スラブの断面算定")
an("問1：長期 fs = min(36/30, 0.49 + 36/100) = min(1.20, 0.85) = 0.85 N/mm²。"
   "短期 fs = 1.5 × 0.85 = 1.275 N/mm²。（Fc が大きいと 0.49+Fc/100 側が効く）", h=44)
an("問2：A = 12,000 × 200 = 2.4×10^6 mm²。"
   "τ = ΔQ/(b・t) = 2,400×10³ / 2.4×10^6 = 1.000 N/mm²。"
   "短期許容 1.275 N/mm² に対し τ = 1.000 <= 1.275 → OK。余裕率 = 1.275/1.000 = 1.27 倍。", h=52)
an("問3：t = ΔQ/(b・fs) = 2,400×10³/(12,000 × 1.275) = 157 mm。"
   "t = 150 mm では τ = 2,400×10³/(12,000×150) = 1.333 > 1.275 となり NG。"
   "必要厚 157 mm を上回る標準的な寸法として t = 200 mm を採用する。", h=56)
an("問4：As = ΔQ / ft = 2,400×10³ / 295 = 8,136 mm²。"
   "有効幅 12.0 m に分布させると 8,136 / 12.0 = 678 mm²/m。"
   "D10@200 ダブル（713）でも数値上は満たすが余裕が小さいため、"
   "D13@200 ダブル（1,267 mm²/m）を採用するのが実務的。", h=60)
an("問5：①耐震壁が途中階で切れる（壁の打切り）②1階がピロティ ③剛性分布が階で大きく変わる "
   "④吹抜け・大開口でスラブの有効幅が小さい ⑤細長い平面で床が面内で変形しやすい "
   "⑥スラブに段差があり力の伝達経路が切れる。これらの場合は剛床仮定自体の成立も"
   "併せて確認する。", h=64)
aw("※ 許容せん断応力度の式・短期の割増し・伝達補強筋の考え方は RC規準／技術基準解説書で確認要。", h=28)

XLSX = os.path.join(OUT, "スラブ移行せん断力問題集.xlsx")
wb.save(XLSX)
print("saved:", XLSX)
