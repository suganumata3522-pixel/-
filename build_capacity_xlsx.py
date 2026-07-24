# -*- coding: utf-8 -*-
"""保有水平耐力計算 問題集（図つき）Excel 生成スクリプト。
出力: docs/capacity/保有水平耐力計算問題集.xlsx
1 基本概念・設計方針 / 2 必要保有水平耐力のパラメータ / 3 Ds値の意味(強度型・靭性型)
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

OUT = "docs/capacity"
FIG = os.path.join(OUT, "figures")
os.makedirs(FIG, exist_ok=True)
C_BLUE = "#2a78d6"; C_PINK = "#d55181"


def save(fig, name):
    p = os.path.join(FIG, name)
    fig.savefig(p, dpi=130, bbox_inches="tight")
    plt.close(fig)
    return p


# 図1: 保有水平耐力の概念（荷重-変形曲線）
def fig_concept():
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 5.0))
    ax = axes[0]
    d = np.linspace(0, 10, 100)
    Q = np.where(d < 3, d / 3 * 1350, 1350)
    Q = np.where(d < 3, 450 * d, 1350)
    Q = np.minimum(450 * d, 1350)
    ax.plot(d, Q, color="#c00000", lw=2.5)
    ax.axhline(1350, color="#1f7a1f", lw=1.5, ls="--")
    ax.text(5.2, 1400, "保有水平耐力 Qu（架構が支えられる最大の水平力）",
            fontproperties=jp, fontsize=8.5, color="#1f7a1f")
    ax.axhline(900, color=C_BLUE, lw=1.2, ls=":")
    ax.text(5.5, 780, "一次設計 (C0=0.2)", fontproperties=jp, fontsize=8,
            color=C_BLUE)
    ax.annotate("必要保有水平耐力 Qun\n= Ds·Fes·Qud", xy=(3, 1350),
                xytext=(1.0, 1600), fontproperties=jp, fontsize=8.5,
                color="#7a3b3b",
                arrowprops=dict(arrowstyle="->", color="#7a3b3b"))
    ax.set_xlabel("水平変形 δ", fontproperties=jp)
    ax.set_ylabel("水平力 Q (kN)", fontproperties=jp)
    ax.set_xlim(0, 10); ax.set_ylim(0, 1900)
    ax.grid(alpha=0.25)
    ax.set_title("(a) 荷重-変形曲線と保有水平耐力",
                 fontproperties=jp, fontsize=11, fontweight="bold")
    # (b) 崩壊メカニズム（ヒンジ）
    ax = axes[1]
    for x in [0, 3, 6]:
        ax.plot([x, x], [0, 6], color="#1f4e79", lw=2)
    for y in [3, 6]:
        ax.plot([0, 6], [y, y], color="#c00000", lw=2)
    for x in [0, 3, 6]:
        ax.plot(x, 0.2, "o", mfc="white", mec="#c00000", ms=9, mew=2)
    for y in [3, 6]:
        for x in [0, 3, 6]:
            for dx in ([0.4] if x == 0 else [-0.4] if x == 6 else [-0.4, 0.4]):
                ax.plot(x + dx, y, "o", mfc="white", mec="#c00000", ms=8,
                        mew=2)
    ax.text(3, -0.9,
            "保有水平耐力＝崩壊メカニズム（ヒンジが十分できて\n"
            "架構全体が耐えられる最大水平力）で決まる",
            fontproperties=jp, ha="center", fontsize=9, color="#444")
    ax.text(3, 6.6, "○＝塑性ヒンジ", fontproperties=jp, ha="center",
            fontsize=8.5, color="#c00000")
    ax.set_xlim(-1, 7); ax.set_ylim(-1.7, 7.2)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(b) 崩壊メカニズム（塑性ヒンジ）",
                 fontproperties=jp, fontsize=11, fontweight="bold")
    fig.suptitle("図 1  保有水平耐力計算の基本概念",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig1_concept.png")


# 図2: Qun のパラメータ分解
def fig_param():
    fig, ax = plt.subplots(figsize=(12, 5.0))
    ax.text(0.5, 0.9, "必要保有水平耐力  Qun = Ds × Fes × Qud",
            transform=ax.transAxes, ha="center", fontproperties=jp,
            fontsize=15, fontweight="bold", color="#c00000")
    boxes = [
        (0.05, "Ds（構造特性係数）", "#cfead4",
         "靭性（粘り）に応じた低減\n0.3(靭性大)〜0.55(靭性小)\n"
         "よく粘る建物ほど小さい"),
        (0.37, "Fes（形状係数）", "#fde2c4",
         "Fe×Fs（偏心率・剛性率）\n1.0〜1.5\nアンバランスなほど大きい"),
        (0.69, "Qud（地震層せん断力）", "#cfe0f0",
         "= Z·Rt·Ai·C0·ΣW\nC0=1.0（大地震）\n建物重量×地震力"),
    ]
    for x, title, color, desc in boxes:
        ax.add_patch(mpatches.FancyBboxPatch(
            (x, 0.28), 0.28, 0.42, boxstyle="round,pad=0.02",
            transform=ax.transAxes, fc=color, ec="k", lw=1.2))
        ax.text(x + 0.14, 0.63, title, transform=ax.transAxes, ha="center",
                fontproperties=jp, fontsize=10.5, fontweight="bold")
        ax.text(x + 0.14, 0.42, desc, transform=ax.transAxes, ha="center",
                va="center", fontproperties=jp, fontsize=8.5, color="#333")
    ax.text(0.5, 0.1,
            "判定：保有水平耐力 Qu ≧ 必要保有水平耐力 Qun\n"
            "例）W=4500kN, Qud=4500(C0=1.0), Ds=0.3, Fes=1.0 → Qun=1350kN",
            transform=ax.transAxes, ha="center", fontproperties=jp,
            fontsize=9.5, color="#1f4e79")
    ax.axis("off")
    ax.set_title("図 2  必要保有水平耐力のパラメータ",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig2_param.png")


# 図3: Ds値（強度型 vs 靭性型）
def fig_ds():
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 5.0))
    ax = axes[0]
    d = np.linspace(0, 10, 100)
    # 強度型：高い耐力・小さい変形で終わる
    Qs = np.minimum(1400 * d / 1.5, 2100)
    Qs = np.where(d < 2.2, 2100 * d / 2.2, 2100)
    Qs = np.where(d < 3.0, Qs, np.maximum(2100 - (d - 3.0) * 700, 0))
    # 靭性型：低め耐力だが大変形まで粘る
    Qt = np.where(d < 2.0, 1150 * d / 2.0, 1150)
    Qt = np.where(d < 9, Qt, np.maximum(1150 - (d - 9) * 300, 0))
    ax.plot(d, Qs, color=C_PINK, lw=2.5, label="強度型（Ds 大 0.5〜）")
    ax.plot(d, Qt, color=C_BLUE, lw=2.5, label="靭性型（Ds 小 0.3〜）")
    ax.fill_between(d, 0, Qt, color=C_BLUE, alpha=0.1)
    ax.set_xlabel("変形 δ", fontproperties=jp)
    ax.set_ylabel("水平力 Q", fontproperties=jp)
    ax.set_xlim(0, 10); ax.set_ylim(0, 2400)
    ax.legend(prop=jp, fontsize=9, loc="upper right")
    ax.text(5, 200, "靭性型は大変形まで粘り\nエネルギー吸収大（面積）",
            fontproperties=jp, fontsize=8.5, color=C_BLUE, ha="center")
    ax.set_title("(a) 強度型 vs 靭性型の荷重-変形",
                 fontproperties=jp, fontsize=11, fontweight="bold")
    # (b) 説明
    ax = axes[1]
    ax.text(0.5, 0.92, "Ds（構造特性係数）の意味", transform=ax.transAxes,
            ha="center", fontproperties=jp, fontsize=12, fontweight="bold",
            color="#1f4e79")
    ax.text(0.5, 0.7,
            "Ds は『靭性（粘り）による地震力の低減係数』",
            transform=ax.transAxes, ha="center", fontproperties=jp,
            fontsize=10.5, color="#c00000")
    ax.text(0.5, 0.45,
            "■ 靭性型（Ds 小 0.3〜）\n"
            "  よく粘る（変形能力大）→ 地震エネルギーを\n"
            "  変形で吸収 → 必要な耐力を小さくできる\n\n"
            "■ 強度型（Ds 大 0.5〜）\n"
            "  粘らない（脆性）→ 地震力を耐力で受ける\n"
            "  → 大きな耐力が必要（Qun 大）",
            transform=ax.transAxes, ha="center", fontproperties=jp,
            fontsize=9.5, color="#333")
    ax.text(0.5, 0.08,
            "同じ Qud でも Ds が小さいほど Qun が小さくて済む\n"
            "（靭性を確保すれば経済的に設計できる）",
            transform=ax.transAxes, ha="center", fontproperties=jp,
            fontsize=9, color="#1f7a1f")
    ax.axis("off")
    ax.set_title("(b) Ds の意味", fontproperties=jp, fontsize=11,
                 fontweight="bold")
    fig.suptitle("図 3  Ds 値の意味（強度型・靭性型）",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig3_ds.png")


figs = {"concept": fig_concept(), "param": fig_param(), "ds": fig_ds()}
print("figures:", list(figs.keys()))

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


ws = wb.active
ws.title = "目次"
setup(ws, [4, 22, 60, 14])
title_row(ws, 1, "保有水平耐力計算 問題集（RC マンション設計担当・新人向け）",
          span=4)
body(ws, 2,
     "目標：保有水平耐力計算（Ds・保証設計）が説明できること。二次設計の中核で、"
     "大地震に対し『保有水平耐力 Qu ≧ 必要保有水平耐力 Qun』を確認する。"
     "一次二次設計（No.5）教材の続き。", span=4, h=44)
r = table(ws, 4, ["No.", "シート", "到達目標", "図"],
          [["1", "1 基本概念・設計方針",
            "保有水平耐力計算の基本概念・方針を説明できる", "荷重変形・ヒンジ"],
           ["2", "2 必要保有水平耐力のパラメータ",
            "Qun のパラメータを理解している", "Ds·Fes·Qud"],
           ["3", "3 Ds値の意味",
            "Ds値の意味（強度型・靭性型）を理解している", "荷重変形曲線"]])
body(ws, r + 2,
     "共通例：RC 2 階建て ΣW=4,500 kN。Qud=Z·Rt·C0·W（C0=1.0）=4,500kN。"
     "Ds=0.3（靭性型）・Fes=1.0 → Qun=1,350kN。"
     "数値は本教材作成時に検算済み。実務は建築基準法施行令・技術基準解説書で確認。",
     span=4, h=44)

# 1
ws = wb.create_sheet("1 基本概念")
setup(ws, [8, 18, 18, 16, 12, 12])
title_row(ws, 1, "1  保有水平耐力計算の基本概念・設計方針")
head(ws, 3, "■ 図 1  基本概念")
put_img(ws, figs["concept"], "A4", w=820)
head(ws, 30, "■ 問題 1  基本概念（穴埋め）")
body(ws, 31, "保有水平耐力 Qu とは、大地震時に架構が【 ① 】メカニズムを形成して"
             "支えられる【 ② 】の水平力。二次設計では『Qu ≧【 ③ 】(Qun)』を確認する。"
             "これは大地震で【 ④ 】させないための検討である。", h=44)
head(ws, 33, "■ 問題 2  設計方針")
body(ws, 34, "保有水平耐力計算は、建物を徐々に押していく（増分解析／荷重増分法）ことで"
             "崩壊メカニズムと保有水平耐力を求める。この解析の流れを説明せよ"
             "（弾性→部材が順にヒンジ→崩壊メカニズム形成→Qu 確定）。", h=44)
head(ws, 36, "■ 問題 3  一次設計との関係")
body(ws, 37, "一次設計（C0=0.2・許容応力度）と二次設計（保有水平耐力）の役割分担を"
             "述べよ。なぜ二次設計が必要か（一次だけでは大地震の安全性を保証できない）。",
     h=40)
head(ws, 39, "■ 問題 4  ルート")
body(ws, 40, "保有水平耐力計算はルート 3 の中核。ルート 1・2（許容応力度・簡易）で"
             "済まない規模・形状の建物で必要になることを述べよ。", h=32)

# 2
ws = wb.create_sheet("2 パラメータ")
setup(ws, [8, 18, 16, 14, 14, 12, 12])
title_row(ws, 1, "2  必要保有水平耐力のパラメータ Qun=Ds·Fes·Qud")
head(ws, 3, "■ 図 2  パラメータ分解")
put_img(ws, figs["param"], "A4", w=800)
head(ws, 28, "■ 問題 1  各パラメータの意味")
r = table(ws, 29, ["記号", "名称", "意味・範囲（記入）"],
          [["Ds", "構造特性係数", ""],
           ["Fes", "形状係数", ""],
           ["Qud", "地震層せん断力", ""]])
head(ws, r + 2, "■ 問題 2  Qun の計算")
body(ws, r + 3, "ΣW=4,500kN、Qud=4,500kN（C0=1.0）。次の 3 ケースで Qun=Ds·Fes·Qud を"
                "計算せよ。", h=22)
r = table(ws, r + 5, ["ケース", "Ds", "Fes", "Qun（記入）"],
          [["靭性型・整形", "0.30", "1.0", ""],
           ["強度型・整形", "0.55", "1.0", ""],
           ["靭性型・偏心あり", "0.35", "1.25", ""]])
head(ws, r + 2, "■ 問題 3  Fes の意味")
body(ws, r + 3, "Fes=Fe×Fs（偏心率・剛性率による割増し、No.6 偏心率剛性率教材参照）。"
                "偏心・剛性がアンバランスな建物ほど Fes が大きくなり、必要保有水平耐力が"
                "増える理由を述べよ。", h=40)
head(ws, r + 5, "■ 問題 4  判定")
body(ws, r + 6, "保有水平耐力 Qu=1,500kN の建物が、Qun=1,350kN（靭性型・整形）を"
                "満たすか判定せよ。余裕度 Qu/Qun も求めよ。", h=32)

# 3
ws = wb.create_sheet("3 Ds値の意味")
setup(ws, [8, 18, 18, 16, 12, 12])
title_row(ws, 1, "3  Ds 値の意味（強度型・靭性型）")
head(ws, 3, "■ 図 3  強度型 vs 靭性型")
put_img(ws, figs["ds"], "A4", w=820)
head(ws, 30, "■ 問題 1  Ds の定義")
body(ws, 31, "Ds（構造特性係数）は建物の【 ① 】（粘り）に応じた地震力の【 ② 】係数。"
             "靭性が大きいほど Ds は【 ③ 】く（0.3 程度）、靭性が小さい（脆性）ほど"
             "【 ④ 】く（0.55 程度）なる。", h=44)
head(ws, 33, "■ 問題 2  強度型と靭性型")
r = table(ws, 34, ["型", "特徴（記入）", "Ds（記入）", "設計の考え方（記入）"],
          [["靭性型", "", "", ""],
           ["強度型", "", "", ""]])
head(ws, r + 2, "■ 問題 3  なぜ靭性型が有利か")
body(ws, r + 3, "同じ地震力（Qud）でも、靭性型（Ds 小）は必要保有水平耐力 Qun が"
                "小さくて済む。荷重-変形曲線の『エネルギー吸収（面積）』の観点から、"
                "靭性型がなぜ小さい耐力でよいかを説明せよ。", h=44)
head(ws, r + 5, "■ 問題 4  靭性型にするための条件")
body(ws, r + 6, "建物を靭性型（Ds 小）にするには、部材が粘り強く壊れる必要がある。"
                "その条件を 3 つ挙げよ（曲げ降伏先行＝強柱弱梁／せん断破壊を防ぐ"
                "（保証設計）／部材種別を良く FA・FB にする）。"
                "No.7 崩壊形・No.8 部材種別・保証設計教材と関連することも述べよ。",
     h=44)

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


ah("1  基本概念")
an("問1：①崩壊（崩壊）②最大 ③必要保有水平耐力 ④倒壊。"
   "大地震で倒壊させないための保有耐力の検討。", h=40)
an("問2：建物に水平力を少しずつ増やして載荷（増分解析）。弾性→応力の大きい部材から"
   "順に塑性ヒンジ→ヒンジが十分できて崩壊メカニズム形成→その時の水平力が"
   "保有水平耐力 Qu。", h=44)
an("問3：一次設計＝中小地震で許容応力度内（損傷させない）。二次設計＝大地震で"
   "崩壊させない（保有水平耐力）。一次だけでは弾性範囲の確認のみで、大地震時の"
   "終局的な安全性は保証できないため二次設計が必要。", h=44)
an("問4：ルート 3（保有水平耐力計算）の中核。高さ・規模・形状で"
   "ルート 1・2 が使えない建物で必要。", h=32)

ah("2  パラメータ")
an("問1：Ds＝構造特性係数（靭性による低減、0.3〜0.55）。Fes＝形状係数"
   "（偏心率・剛性率による割増し、1.0〜1.5）。Qud＝地震層せん断力"
   "（Z·Rt·Ai·C0·ΣW、C0=1.0）。", h=44)
an("問2：靭性型・整形＝0.3×1.0×4500=1,350kN。強度型・整形＝0.55×1.0×4500=2,475kN。"
   "靭性型・偏心あり＝0.35×1.25×4500=1,969kN。", h=44)
an("問3：Fes は偏心（ねじれ）・剛性アンバランスによる割増し。"
   "アンバランスな建物は地震時に局部（隅・柔階）へ負担が集中するため、"
   "その分だけ必要保有水平耐力を割り増して安全を確保する。", h=44)
an("問4：Qu=1,500 ≧ Qun=1,350 → OK。余裕度 Qu/Qun=1,500/1,350=1.11。", h=32)

ah("3  Ds値の意味")
an("問1：①靭性 ②低減 ③小さ ④大き。靭性大→Ds 小、脆性→Ds 大。", h=32)
an("問2：靭性型＝よく粘る（変形能力大）／Ds 小（0.3）／変形でエネルギー吸収し"
   "耐力は小さくてよい。強度型＝粘らない（脆性）／Ds 大（0.55）／"
   "地震力を耐力で受けるので大きな耐力が必要。", h=44)
an("問3：靭性型は荷重-変形曲線が大変形まで伸び、曲線下の面積（吸収エネルギー）が"
   "大きい。地震エネルギーを変形で吸収できるので、ピークの耐力（Qu）が小さくても"
   "倒壊しない。だから Ds を小さく＝Qun を小さくできる。", h=44)
an("問4：①柱梁耐力比>1 で梁曲げ降伏先行（強柱弱梁・全体崩壊型）②せん断破壊を"
   "保証設計で防ぐ（せん断余裕率 n）③部材種別を FA・FB にする"
   "（軸力比・帯筋・せん断余裕）。No.7 崩壊形・No.8 部材種別・保証設計と一体。",
   h=44)

XLSX = os.path.join(OUT, "保有水平耐力計算問題集.xlsx")
wb.save(XLSX)
print("saved:", XLSX)
