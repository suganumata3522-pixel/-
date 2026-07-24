# -*- coding: utf-8 -*-
"""一次設計・二次設計 問題集（図つき）Excel 生成スクリプト。
出力: docs/seismic_design/一次二次設計問題集.xlsx
1 一次・二次設計の説明(2段階設計) / 2 力の組合せ(長期・短期)
3 設計地震力の違い(C0・想定加速度・Ai分布) / 4 各設計時の耐震要求性能
5 一次設計の検討必要事項(剛接架構・4本柱・突出部割増)
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

OUT = "docs/seismic_design"
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
# 図 1: 2段階設計の全体像
# ===========================================================================
def fig_twostep():
    fig, ax = plt.subplots(figsize=(12.5, 5.6))

    def box(x, y, w, h, title, lines, color):
        ax.add_patch(mpatches.FancyBboxPatch((x, y), w, h,
                     boxstyle="round,pad=0.05", fc=color, ec="k", lw=1.2))
        ax.text(x + w / 2, y + h - 0.4, title, fontproperties=jp,
                ha="center", fontsize=11, fontweight="bold")
        ax.text(x + w / 2, y + (h - 0.7) / 2, lines, fontproperties=jp,
                ha="center", va="center", fontsize=8.8, color="#333")

    box(0.3, 3.0, 5.2, 2.4, "一次設計（許容応力度計算）",
        "対象：中小地震（数十年に一度・震度5弱程度）\n"
        "地震力：標準せん断力係数 C0 ≥ 0.2\n"
        "検討：各部材が許容応力度以下\n"
        "　　　層間変形角 ≤ 1/200\n"
        "目標：損傷させない（弾性範囲）", "#cfe0f0")
    box(6.5, 3.0, 5.4, 2.4, "二次設計（保有水平耐力計算等）",
        "対象：大地震（数百年に一度・震度6強〜7）\n"
        "地震力：標準せん断力係数 C0 ≥ 1.0\n"
        "検討：保有水平耐力 ≥ 必要保有水平耐力\n"
        "　　　Qu ≥ Qun = Ds·Fes·Qud\n"
        "目標：倒壊させない（靭性で吸収）", "#cfead4")
    ax.annotate("", xy=(6.5, 4.2), xytext=(5.5, 4.2),
                arrowprops=dict(arrowstyle="-|>", color="#c00000", lw=2.5))
    ax.text(6.0, 4.5, "地震\n大", fontproperties=jp, ha="center", fontsize=8,
            color="#c00000")
    # 下：地震レベルと損傷の帯
    ax.annotate("", xy=(11.9, 1.8), xytext=(0.3, 1.8),
                arrowprops=dict(arrowstyle="-|>", color="#444", lw=1.5))
    ax.text(6, 1.4, "地震の大きさ →", fontproperties=jp, ha="center",
            fontsize=9)
    ax.text(2.9, 2.15, "無損傷", fontproperties=jp, ha="center", fontsize=8.5,
            color="#1f4e79")
    ax.text(9.2, 2.15, "損傷するが倒壊しない", fontproperties=jp, ha="center",
            fontsize=8.5, color="#1f7a1f")
    ax.text(6, 0.5,
            "建築基準法は『中小地震で損傷させず、大地震で倒壊させない』の 2 段階設計",
            fontproperties=jp, ha="center", fontsize=10, color="#1f4e79",
            fontweight="bold")
    ax.set_xlim(0, 12.2); ax.set_ylim(0, 5.8)
    ax.axis("off")
    ax.set_title("図 1  一次設計・二次設計（2 段階設計）の全体像",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig1_twostep.png")


# ===========================================================================
# 図 2: 荷重の組合せ
# ===========================================================================
def fig_loads():
    fig, ax = plt.subplots(figsize=(11.5, 5.2))
    rows = [
        ("長期", "常時", "G + P", "#cfe0f0",
         "G:固定荷重  P:積載荷重"),
        ("短期", "積雪時", "G + P + S", "#e8f0e0",
         "S:積雪荷重（多雪区域は長期に 0.7S）"),
        ("短期", "暴風時", "G + P + W", "#fde2c4",
         "W:風荷重（風圧力）"),
        ("短期", "地震時", "G + P + K", "#f8d0d0",
         "K:地震荷重（水平力）"),
    ]
    y = 4.2
    for period, case, combo, color, note in rows:
        ax.add_patch(mpatches.Rectangle((0.3, y), 1.3, 0.9, fc=color, ec="k",
                                        lw=0.8))
        ax.text(0.95, y + 0.45, period, fontproperties=jp, ha="center",
                va="center", fontsize=10, fontweight="bold")
        ax.text(2.2, y + 0.45, case, fontproperties=jp, va="center",
                fontsize=10)
        ax.text(4.3, y + 0.45, combo, fontproperties=jp, va="center",
                fontsize=12, fontweight="bold", color="#c00000")
        ax.text(7.2, y + 0.45, note, fontproperties=jp, va="center",
                fontsize=8.5, color="#555")
        y -= 1.1
    ax.text(5.7, 0.3,
            "長期は常時（G+P）。短期は積雪・暴風・地震を G+P に加える。\n"
            "許容応力度は 長期＜短期（短期は長期の 1.5〜2 倍）",
            fontproperties=jp, ha="center", fontsize=9.5, color="#1f4e79")
    ax.set_xlim(0, 11.5); ax.set_ylim(0, 5.5)
    ax.axis("off")
    ax.set_title("図 2  長期・短期に生ずる力の組合せ",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig2_loads.png")


# ===========================================================================
# 図 3: 設計地震力の違い（C0・Ai・加速度）
# ===========================================================================
def fig_seismic():
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 5.0))
    # (a) C0 の違いと Ai 分布
    ax = axes[0]
    # 2階建て：層せん断係数の高さ分布（一次）
    floors = ["1F", "2F"]
    Ci_1 = [0.2, 0.242]   # C0=0.2 の Ci（下→上）
    Ci_2 = [1.0, 1.21]    # C0=1.0
    y = [0.5, 1.5]
    ax.plot(Ci_1, y, "o-", color=C_BLUE, lw=2, label="一次 C0=0.2")
    ax.plot(Ci_2, y, "s-", color=C_PINK, lw=2, label="二次 C0=1.0")
    ax.set_yticks(y); ax.set_yticklabels(floors, fontproperties=jp)
    ax.set_xlabel("層せん断力係数 Ci = Z·Rt·Ai·C0", fontproperties=jp)
    ax.set_xlim(0, 1.4); ax.set_ylim(0, 2.1)
    ax.legend(prop=jp, fontsize=9, loc="upper center")
    ax.grid(alpha=0.25)
    ax.text(0.7, 0.15, "Ai：上階ほど割増（Ai>1）\n二次は一次の 5 倍（C0 が 5 倍）",
            fontproperties=jp, ha="center", fontsize=8.5, color="#444")
    ax.set_title("(a) 層せん断力係数（一次 vs 二次）",
                 fontproperties=jp, fontsize=10, fontweight="bold")

    # (b) 想定地震動・加速度
    ax = axes[1]
    ax.text(0.5, 0.92, "想定する地震動の違い", transform=ax.transAxes,
            ha="center", fontproperties=jp, fontsize=11, fontweight="bold",
            color="#1f4e79")
    tbl = [
        ("", "一次設計", "二次設計"),
        ("地震規模", "中小地震", "大地震"),
        ("再現期間", "数十年に一度", "数百年に一度"),
        ("震度の目安", "震度 5 弱程度", "震度 6 強〜7"),
        ("地表加速度", "80〜100 gal", "300〜400 gal"),
        ("標準せん断力係数 C0", "0.2 以上", "1.0 以上"),
    ]
    yy = 0.78
    for i, (a, b, c) in enumerate(tbl):
        col = "#dbe8f5" if i == 0 else ("#f7f7f7" if i % 2 else "white")
        for xx, w, txt in [(0.03, 0.34, a), (0.37, 0.30, b), (0.67, 0.30, c)]:
            ax.add_patch(mpatches.Rectangle((xx, yy), w, 0.115,
                         transform=ax.transAxes, fc=col, ec="#bbb", lw=0.6))
            ax.text(xx + w / 2, yy + 0.057, txt, transform=ax.transAxes,
                    ha="center", va="center", fontproperties=jp,
                    fontsize=8.5,
                    fontweight="bold" if i == 0 else "normal",
                    color="#c00000" if (i == 5) else "#333")
        yy -= 0.12
    ax.text(0.5, 0.02, "標準せん断力係数 C0 が 0.2 → 1.0（5 倍）が最大の違い",
            transform=ax.transAxes, ha="center", fontproperties=jp,
            fontsize=9, color="#c00000")
    ax.axis("off")
    ax.set_title("(b) 想定地震動と C0", fontproperties=jp, fontsize=10,
                 fontweight="bold")
    fig.suptitle("図 3  設計地震力の違い（想定加速度・標準せん断力係数）",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig3_seismic.png")


# ===========================================================================
# 図 4: 耐震要求性能
# ===========================================================================
def fig_performance():
    fig, ax = plt.subplots(figsize=(11.5, 5.0))
    levels = [
        ("使用性・損傷制御", "一次設計 / 中小地震", "無損傷・継続使用",
         "#a8dadc", "弾性範囲。ひび割れ・変形を許容内に"),
        ("安全性（人命保護）", "二次設計 / 大地震", "倒壊しない・人命保護",
         "#f4a261", "損傷するが靭性で倒壊を防ぐ"),
    ]
    y = 3.2
    for name, level, target, color, desc in levels:
        ax.add_patch(mpatches.FancyBboxPatch((0.4, y), 10.6, 1.6,
                     boxstyle="round,pad=0.05", fc=color, ec="k", lw=1))
        ax.text(0.9, y + 1.15, name, fontproperties=jp, fontsize=12,
                fontweight="bold", va="center")
        ax.text(0.9, y + 0.5, level, fontproperties=jp, fontsize=9,
                va="center", color="#333")
        ax.text(5.0, y + 1.1, f"目標：{target}", fontproperties=jp,
                fontsize=11, va="center", color="#7a3b3b")
        ax.text(5.0, y + 0.5, desc, fontproperties=jp, fontsize=8.5,
                va="center", color="#444")
        y -= 2.1
    ax.annotate("", xy=(0.15, 3.0), xytext=(0.15, 5.0),
                arrowprops=dict(arrowstyle="-|>", color="#c00000", lw=2.5))
    ax.text(-0.1, 4.0, "地震が大きいほど許容損傷も大きく", fontproperties=jp,
            rotation=90, fontsize=8.5, color="#c00000", va="center",
            ha="center")
    ax.text(5.7, 0.5,
            "一次＝使用性・損傷制御（壊さない）、二次＝安全性（倒さない・人命保護）",
            fontproperties=jp, ha="center", fontsize=10, color="#1f4e79",
            fontweight="bold")
    ax.set_xlim(-0.5, 11.4); ax.set_ylim(0, 5.4)
    ax.axis("off")
    ax.set_title("図 4  各設計時における耐震要求性能",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig4_performance.png")


# ===========================================================================
# 図 5: 一次設計の検討必要事項
# ===========================================================================
def fig_check():
    fig, axes = plt.subplots(1, 3, figsize=(14.5, 4.4))
    # (a) 剛接架構
    ax = axes[0]
    for x in [0, 3]:
        ax.plot([x, x], [0, 3], color="#1f4e79", lw=2.5)
    ax.plot([0, 3], [3, 3], color="#c00000", lw=2.5)
    for x in [0, 3]:
        ax.plot(x, 3, "o", color="k", ms=9)
        # 剛接を示す小さな三角
        ax.add_patch(mpatches.Polygon([(x, 3), (x + (0.4 if x == 0 else -0.4),
                     3), (x, 2.6)], closed=True, fc="#7a3b3b", alpha=0.5))
    ax.text(1.5, -0.7, "剛接架構\n（柱梁を剛接合し\nラーメンで抵抗）",
            fontproperties=jp, ha="center", fontsize=9, color="#444")
    ax.set_xlim(-0.8, 3.8); ax.set_ylim(-1.4, 3.6)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(a) 剛接架構", fontproperties=jp, fontsize=10,
                 fontweight="bold")

    # (b) 4本柱
    ax = axes[1]
    for (x, y) in [(0, 0), (2, 0), (0, 2), (2, 2)]:
        ax.add_patch(mpatches.Rectangle((x - 0.2, y - 0.2), 0.4, 0.4,
                     fc="#bdbdbd", ec="k", lw=1))
    ax.plot([0, 2, 2, 0, 0], [0, 0, 2, 2, 0], color="#c00000", lw=1.5)
    ax.text(1, -0.9, "4 本柱（最低 4 隅に柱）\n1 本でも欠けると\n"
                     "ねじれ・不安定",
            fontproperties=jp, ha="center", fontsize=9, color="#444")
    ax.set_xlim(-0.7, 2.7); ax.set_ylim(-1.6, 2.7)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(b) 4 本柱", fontproperties=jp, fontsize=10,
                 fontweight="bold")

    # (c) 突出部割増
    ax = axes[2]
    ax.add_patch(mpatches.Rectangle((0, 0), 3, 2, fc="#cfe0f0", ec="k",
                 lw=1.2))
    ax.add_patch(mpatches.Rectangle((1.0, 2), 1.0, 1.2, fc="#f8d0d0", ec="k",
                 lw=1.2))
    ax.text(1.5, 2.6, "塔屋", fontproperties=jp, ha="center", fontsize=8)
    ax.annotate("突出部（塔屋・PH）は\n地震力を割増（例 1.5 倍）",
                xy=(1.5, 2.8), xytext=(3.3, 2.6), fontproperties=jp,
                fontsize=8.5, color="#c00000",
                arrowprops=dict(arrowstyle="->", color="#c00000"))
    ax.text(1.5, -0.9, "突出部割増\n（小面積の突出は\n振動が増幅）",
            fontproperties=jp, ha="center", fontsize=9, color="#444")
    ax.set_xlim(-0.5, 6.0); ax.set_ylim(-1.6, 3.6)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(c) 突出部割増", fontproperties=jp, fontsize=10,
                 fontweight="bold")
    fig.suptitle("図 5  一次設計での検討必要事項（例）",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig5_check.png")


figs = {
    "twostep": fig_twostep(),
    "loads": fig_loads(),
    "seismic": fig_seismic(),
    "perf": fig_performance(),
    "check": fig_check(),
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
title_row(ws, 1, "一次設計・二次設計 問題集（RC マンション設計担当・新人向け）",
          span=4)
body(ws, 2,
     "目標：一次設計・二次設計の説明ができること。建築基準法の 2 段階設計"
     "（中小地震で損傷させない／大地震で倒壊させない）を、荷重の組合せ、"
     "設計地震力の違い、耐震要求性能、一次設計の検討事項の順に学ぶ。",
     span=4, h=44)
r = table(ws, 4,
          ["No.", "シート", "到達目標", "図"],
          [["1", "1 一次・二次設計", "一次・二次設計を説明できる", "2段階設計"],
           ["2", "2 力の組合せ", "長期・短期の力の組合せを理解する", "組合せ表"],
           ["3", "3 設計地震力の違い", "想定加速度・標準せん断力係数の違い",
            "C0・Ai・加速度"],
           ["4", "4 耐震要求性能", "各設計時の耐震要求性能を理解する",
            "使用性・安全性"],
           ["5", "5 一次設計の検討事項",
            "剛接架構・4本柱・突出部割増等を理解する", "検討事項"]])
body(ws, r + 2,
     "共通例：RC 2 階建て、総重量 ΣW=4,500 kN（RF 2,000＋2F 2,500）、"
     "Z=1.0・Rt=1.0。一次 C0=0.2 → ベースシア 900 kN。二次 C0=1.0。"
     "数値は本教材作成時に検算済み。実務は建築基準法施行令・技術基準解説書で"
     "確認すること。",
     span=4, h=58)

# ---- 1 一次・二次設計 ----
ws = wb.create_sheet("1 一次・二次設計")
setup(ws, [8, 18, 18, 16, 12, 12])
title_row(ws, 1, "1  一次設計・二次設計の説明")
head(ws, 3, "■ 図 1  2 段階設計の全体像")
put_img(ws, figs["twostep"], "A4", w=820)
head(ws, 30, "■ 問題 1  2 段階設計（穴埋め）")
body(ws, 31, "建築基準法は、中小地震（一次設計）で建物を【 ① 】させず、"
             "大地震（二次設計）で【 ② 】させない、という 2 段階で設計する。"
             "一次設計は【 ③ 】計算、二次設計は【 ④ 】計算（保有水平耐力等）で行う。",
     h=44)
head(ws, 33, "■ 問題 2  一次と二次の対応")
r = table(ws, 34,
          ["項目", "一次設計（記入）", "二次設計（記入）"],
          [["対象の地震", "", ""],
           ["計算方法", "", ""],
           ["標準せん断力係数 C0", "", ""],
           ["目標（性能）", "", ""]])
head(ws, r + 2, "■ 問題 3  ルートとの関係")
body(ws, r + 3, "許容応力度計算（一次設計）だけで済むケース（ルート 1）と、"
                "保有水平耐力計算（二次設計）まで要るケース（ルート 3）がある。"
                "建物規模・高さでどう分かれるか概略を述べよ"
                "（小規模は一次のみ、一定規模超は二次まで）。", h=44)
head(ws, r + 5, "■ 問題 4  なぜ 2 段階か")
body(ws, r + 6, "大地震を弾性（一次設計の延長）で全部受けるのではなく、"
                "『中小地震＝損傷させない／大地震＝倒壊させない』の 2 段階にする"
                "合理性を、経済性と安全性の両面から述べよ。", h=44)

# ---- 2 力の組合せ ----
ws = wb.create_sheet("2 力の組合せ")
setup(ws, [8, 18, 18, 16, 12, 12])
title_row(ws, 1, "2  長期・短期に生ずる力の組合せ")
head(ws, 3, "■ 図 2  荷重の組合せ")
put_img(ws, figs["loads"], "A4", w=760)
head(ws, 28, "■ 問題 1  組合せの穴埋め")
body(ws, 29, "記号：G=固定荷重、P=積載荷重、S=積雪、W=風、K=地震。"
             "次の組合せを埋めよ。", h=20)
r = table(ws, 31,
          ["区分", "状態", "組合せ（記入）"],
          [["長期", "常時", ""],
           ["短期", "積雪時", ""],
           ["短期", "暴風時", ""],
           ["短期", "地震時", ""]])
head(ws, r + 2, "■ 問題 2  長期と短期の許容応力度")
body(ws, r + 3, "長期荷重と短期荷重で、許容応力度の扱いがどう違うか"
                "（短期は長期の 1.5〜2 倍）。なぜ短期は割り増せるのか"
                "（一時的・まれな荷重だから）を述べよ。", h=40)
head(ws, r + 5, "■ 問題 3  多雪区域の扱い")
body(ws, r + 6, "多雪区域では、長期にも積雪の一部（0.7S）を見込む。"
                "また地震時・暴風時にも積雪を組み合わせる（G+P+0.35S+K 等）。"
                "なぜ雪を無視できないか述べよ。", h=40)
head(ws, r + 8, "■ 問題 4  組合せの使い分け")
body(ws, r + 9, "地震時（K）と暴風時（W）は通常同時に考えない（別々の短期）。"
                "その理由と、どちらが支配的になりやすいか"
                "（低層は地震、高層・軽量は風）を述べよ。", h=40)

# ---- 3 設計地震力の違い ----
ws = wb.create_sheet("3 設計地震力の違い")
setup(ws, [8, 18, 16, 14, 14, 12, 12])
title_row(ws, 1, "3  設計地震力の違い（想定加速度・標準せん断力係数）")
head(ws, 3, "■ 図 3  C0・Ai・想定加速度")
put_img(ws, figs["seismic"], "A4", w=820)
head(ws, 30, "■ 問題 1  地震層せん断力の式")
body(ws, 31, "地震層せん断力係数 Ci = Z·Rt·Ai·C0。各係数の意味を答えよ"
             "（Z:地域係数、Rt:振動特性係数、Ai:高さ方向分布係数、"
             "C0:標準せん断力係数）。層せん断力 Qi = Ci × その階から上の重量。", h=44)
head(ws, 33, "■ 問題 2  ベースシアの計算（一次）")
body(ws, 34, "ΣW=4,500 kN、Z=1.0、Rt=1.0、C0=0.2、1 階 Ai=1.0。"
             "1 階（最下層）の層せん断力＝ベースシア Qb を求めよ。", h=32)
r = table(ws, 36,
          ["項目", "式", "値（記入）"],
          [["C1（1階）", "Z·Rt·Ai·C0 = 1×1×1×0.2", ""],
           ["ベースシア Qb", "C1 × ΣW", ""]])
head(ws, r + 2, "■ 問題 3  一次と二次の違い")
body(ws, r + 3, "(1) C0 は一次で【 ① 】以上、二次で【 ② 】以上。二次は一次の"
                "何倍の地震力か。(2) 想定する地表加速度は一次で 80〜100gal、"
                "二次で 300〜400gal 程度。震度でいうと？", h=44)
head(ws, r + 5, "■ 問題 4  Ai 分布")
body(ws, r + 6, "Ai は上階ほど大きくなる（Ai≥1）。その物理的理由"
                "（上階ほど揺れが増幅される・むち振り効果）を述べよ。"
                "2 階建てで RF 層の Ai が 2F 層より大きくなることを確認せよ。", h=44)

# ---- 4 耐震要求性能 ----
ws = wb.create_sheet("4 耐震要求性能")
setup(ws, [8, 18, 18, 16, 12, 12])
title_row(ws, 1, "4  各設計時における耐震要求性能")
head(ws, 3, "■ 図 4  使用性・損傷制御 と 安全性")
put_img(ws, figs["perf"], "A4", w=800)
head(ws, 28, "■ 問題 1  性能の対応")
r = table(ws, 29,
          ["設計", "地震レベル", "要求性能（記入）", "目標状態（記入）"],
          [["一次設計", "中小地震", "", ""],
           ["二次設計", "大地震", "", ""]])
head(ws, r + 2, "■ 問題 2  損傷を許容する意味")
body(ws, r + 3, "二次設計（大地震）では『損傷を許容するが倒壊させない』。"
                "なぜ損傷を許すのか、また『倒壊させない＝人命保護』が"
                "最優先である理由を述べよ。", h=40)
head(ws, r + 5, "■ 問題 3  性能設計の考え方")
body(ws, r + 6, "地震の大きさに応じて許容する損傷が変わる（使用性→損傷制御→安全性）。"
                "この段階的な性能の考え方を、No.1-5（要求性能）教材と関連づけて"
                "整理せよ。", h=40)
head(ws, r + 8, "■ 問題 4  靭性の役割")
body(ws, r + 9, "大地震で倒壊を防ぐには、部材が粘り強く変形する『靭性』が重要。"
                "靭性を確保する RC の工夫を 2 つ挙げよ（せん断補強筋を密に／"
                "曲げ降伏先行＝強柱弱梁）。二次設計の Ds（構造特性係数）が"
                "靭性に応じて小さくできることも述べよ。", h=44)

# ---- 5 一次設計の検討事項 ----
ws = wb.create_sheet("5 一次設計の検討事項")
setup(ws, [8, 18, 18, 16, 12, 12])
title_row(ws, 1, "5  一次設計での検討必要事項")
head(ws, 3, "■ 図 5  剛接架構・4本柱・突出部割増")
put_img(ws, figs["check"], "A4", w=820)
head(ws, 28, "■ 問題 1  剛接架構")
body(ws, 29, "ラーメン構造は柱梁を『剛接合』して架構全体で水平力に抵抗する。"
             "剛接（剛節点）とピン接の違い、剛接架構がなぜ地震に有利かを述べよ。",
     h=40)
head(ws, 31, "■ 問題 2  4 本柱")
body(ws, 32, "構造は最低『4 本柱』（4 隅に柱）が基本。"
             "柱が 3 本以下や一直線だと何が問題か"
             "（水平力に対し不安定・ねじれ）を述べよ。", h=40)
head(ws, 34, "■ 問題 3  突出部の割増")
body(ws, 35, "屋上の塔屋（PH）・広告塔など小面積の突出部は、地震時に振動が増幅される"
             "ため設計用地震力を割り増す（例 1.5 倍）。なぜ突出部で振動が"
             "増幅されるか（むち振り効果）を述べよ。", h=40)
head(ws, 37, "■ 問題 4  その他の一次設計事項")
body(ws, 38, "一次設計で確認する事項をほかに 3 つ挙げよ"
             "（層間変形角 ≤ 1/200／各部材の許容応力度／"
             "偏心・剛性のバランス（No.10 参照）／局部の応力集中）。", h=44)
head(ws, 40, "■ 問題 5  実務まとめ")
body(ws, 41, "新人として一次設計の計算書をチェックするとき、確認する項目を"
             "4 つ挙げよ（荷重の組合せ／地震力 C0=0.2・Ai 分布／"
             "許容応力度以下／層間変形角 1/200 以下）。", h=44)

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


ah("1  一次・二次設計")
an("問1：①損傷（させない）②倒壊（させない）③許容応力度 ④保有水平耐力。"
   "中小地震で無損傷、大地震で倒壊させない 2 段階設計。", h=44)
an("問2：一次＝中小地震／許容応力度計算／C0≥0.2／損傷させない（使用性・損傷制御）。"
   "二次＝大地震／保有水平耐力計算等／C0≥1.0／倒壊させない（安全性）。", h=44)
an("問3：小規模・低層（一定の高さ・規模以下）はルート 1（許容応力度計算のみ）で可。"
   "一定規模を超えると保有水平耐力計算（ルート 3）等の二次設計が必要。"
   "高さ・階数・構造種別で分かれる（施行令・告示で規定）。", h=44)
an("問4：大地震を弾性で全部受けると部材が過大・非経済。"
   "発生頻度が極めて低い大地震には『損傷を許容し靭性で倒壊を防ぐ』方が"
   "経済的かつ人命を守れる。これが 2 段階（性能）設計の思想。", h=44)

ah("2  力の組合せ")
an("問1：長期・常時＝G+P。短期・積雪＝G+P+S。短期・暴風＝G+P+W。"
   "短期・地震＝G+P+K。", h=32)
an("問2：短期許容応力度は長期の 1.5〜2 倍。積雪・暴風・地震は一時的・まれな荷重で、"
   "作用時間が短く材料が塑性変形しにくいため、許容応力度を割り増せる。", h=40)
an("問3：多雪区域では雪が長期間積もるため、長期に 0.7S を見込み、"
   "地震・暴風時にも積雪を組み合わせる（G+P+0.35S+K 等）。"
   "雪の重量・頻度が無視できないため。", h=40)
an("問4：地震（K）と暴風（W）は発生機構が別で同時に最大にはならないため"
   "別々の短期として扱う。低層・重量大の建物は地震が、"
   "高層・軽量・受風面大の建物は風が支配的になりやすい。", h=40)

ah("3  設計地震力の違い")
an("問1：Z＝地域係数（地域の地震リスク、0.7〜1.0）。Rt＝振動特性係数"
   "（地盤・周期による）。Ai＝高さ方向分布係数（上階ほど大）。"
   "C0＝標準せん断力係数（一次 0.2／二次 1.0）。Qi=Ci×その階から上の重量。", h=44)
an("問2：C1=1×1×1×0.2=0.2。ベースシア Qb=0.2×4,500=900 kN。"
   "（ベースシア＝C0×ΣW が基本）。", h=32)
an("問3：(1)①0.2 ②1.0。二次は一次の 5 倍の地震力。"
   "(2)一次 80〜100gal＝震度 5 弱程度、二次 300〜400gal＝震度 6 強〜7 程度。", h=44)
an("問4：Ai は上階ほど大きい。地震時、建物上部ほど応答（揺れ）が増幅され"
   "（むち振り効果）、上階の慣性力が相対的に大きくなるため。"
   "2 階建てでも RF 層（α小）の Ai が 2F 層（α=1）より大きい。", h=44)

ah("4  耐震要求性能")
an("問1：一次＝中小地震＝使用性・損傷制御＝無損傷で継続使用。"
   "二次＝大地震＝安全性＝倒壊させず人命保護。", h=32)
an("問2：大地震を全て弾性で受けると過大・非経済なので、損傷（塑性変形）を"
   "許容してエネルギーを吸収させる。ただし人命に関わる『倒壊』だけは"
   "絶対に防ぐ＝人命保護が最優先。", h=40)
an("問3：地震が大きくなるほど許容損傷が増える（使用性→損傷制御→安全性）。"
   "同じ建物でも地震レベルごとに要求性能が変わる段階的な性能設計の考え方"
   "（No.1-5 要求性能教材と同じ枠組み）。", h=40)
an("問4：靭性確保＝①せん断補強筋（帯筋・あばら筋）を密に配しせん断破壊を防ぐ "
   "②柱梁耐力比>1 で梁先行降伏（強柱弱梁・全体崩壊型）にする。"
   "靭性が高いほど Ds（構造特性係数）を小さくでき、必要保有水平耐力を減らせる。",
   h=44)

ah("5  一次設計の検討事項")
an("問1：剛接＝節点で部材が一体回転（曲げを伝える）。ピン＝回転自由（曲げ伝えず）。"
   "剛接架構は柱梁が一体で曲げ抵抗し、水平力に対し架構全体で粘れるため地震に有利。",
   h=40)
an("問2：4 隅に柱があると水平力・ねじれに対し安定して抵抗できる。"
   "柱が 3 本以下や一直線だと、その直交方向やねじれに対して不安定になり"
   "水平力を安定して支えられない。", h=40)
an("問3：塔屋・PH など小面積で上に飛び出す部分は、質量が小さく固有周期が短いうえ"
   "建物頂部の大きな応答を受けるため振動が増幅される（むち振り効果）。"
   "そのため設計用地震力を割り増す（例 1.5 倍）。", h=40)
an("問4：①層間変形角 ≤ 1/200（変形制限）②各部材が許容応力度以下 "
   "③偏心率・剛性率のバランス（No.10 参照）④開口・段差部の局部応力集中の確認。",
   h=44)
an("問5：①荷重の組合せ（長期 G+P・短期 G+P+K 等）②地震力（C0=0.2・Ai 分布・"
   "Z・Rt）③各部材が許容応力度以下 ④層間変形角 1/200 以下。"
   "この 4 つが一次設計の骨格。", h=44)

XLSX = os.path.join(OUT, "一次二次設計問題集.xlsx")
wb.save(XLSX)
print("saved:", XLSX)
