# -*- coding: utf-8 -*-
"""柱状図の読み取り 問題集（図つき）Excel。出力: docs/borelog/柱状図の読み取り問題集.xlsx
1 柱状図の基本（KBM・孔口標高・標高・深度）/ 2 N値と貫入量（標準貫入試験）
3 土質分類と土質試験 / 4 地下水位・地層傾斜・支持層判定
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
OUT = "docs/borelog"; FIG = os.path.join(OUT, "figures"); os.makedirs(FIG, exist_ok=True)

GLE = 2.50  # 孔口標高 T.P.+2.50m
# (top, bot, 土質名, N代表, 色)
LAYERS = [(0.0, 1.5, "盛土", 3, "#c9a66b"),
          (1.5, 5.0, "シルト", 3, "#93b072"),
          (5.0, 9.0, "細砂", 12, "#e7d189"),
          (9.0, 13.0, "粘土", 5, "#7fa87f"),
          (13.0, 15.0, "砂礫", 40, "#c3a884"),
          (15.0, 18.0, "砂礫（支持層）", 55, "#a2896c")]
# N値プロファイル（深度, N）
NPROF = [(0.5, 2), (1.5, 4), (2.5, 2), (3.5, 3), (4.5, 4), (5.5, 8), (6.5, 11),
         (7.5, 13), (8.5, 15), (9.5, 4), (10.5, 5), (11.5, 6), (12.5, 7),
         (13.5, 30), (14.5, 45), (15.5, 55), (16.5, 60), (17.5, 62)]
WT = 2.0  # 地下水位 深度


def save(fig, n):
    p = os.path.join(FIG, n); fig.savefig(p, dpi=130, bbox_inches="tight"); plt.close(fig); return p


def fig_log():
    fig, (axS, axN) = plt.subplots(1, 2, figsize=(11.5, 7.4),
                                   gridspec_kw={"width_ratios": [1.5, 2.3]}, sharey=True)
    # --- 土質柱状図 ---
    for top, bot, name, N, c in LAYERS:
        axS.add_patch(mpatches.Rectangle((0, top), 1, bot - top, fc=c, ec="k", lw=0.8))
        axS.text(0.5, (top + bot) / 2, name, ha="center", va="center",
                 fontproperties=jp, fontsize=9)
        # 標高（左に注記）
        axS.text(-0.06, top, f"{GLE - top:+.2f}", ha="right", va="center",
                 fontproperties=jp, fontsize=7.5, color="#1f4e79", clip_on=False)
    axS.text(-0.06, 18.0, f"{GLE - 18.0:+.2f}", ha="right", va="center",
             fontproperties=jp, fontsize=7.5, color="#1f4e79", clip_on=False)
    axS.set_xlim(0, 1); axS.set_ylim(18, 0)
    axS.set_yticks(range(0, 19, 1))
    axS.set_ylabel("深度 GL-(m)", fontproperties=jp, fontsize=10)
    axS.set_xticks([])
    axS.set_title("土質柱状図", fontproperties=jp, fontsize=10, fontweight="bold")
    axS.text(-0.18, -1.15, "標高\nT.P.(m)", ha="center", va="center",
             fontproperties=jp, fontsize=8, color="#1f4e79", clip_on=False)
    # 地下水位（axS内に▽マーカー、ラベルはaxN側の空きスペースへ）
    axS.plot([0.9], [WT], marker="v", color="#1f77b4", ms=10, clip_on=False)
    axS.plot([0, 1], [WT, WT], color="#1f77b4", lw=0.8, ls=":")
    # 孔口標高
    axS.annotate("孔口標高 T.P.+2.50m\n（GL-0.00 の基準）", xy=(0.5, 0.0), xytext=(0.0, -2.3),
                 fontproperties=jp, fontsize=8, color="#c00000", ha="center",
                 arrowprops=dict(arrowstyle="->", color="#c00000"), clip_on=False)
    # --- N値グラフ ---
    d = [p[0] for p in NPROF]; nv = [min(p[1], 50) for p in NPROF]
    axN.step([0] + nv, [0] + d, where="post", color="#c00000", lw=1.6)
    axN.fill_betweenx([0] + d, 0, [0] + nv, step="post", color="#c00000", alpha=0.12)
    for (dep, N) in NPROF:
        lab = f"{N}" if N <= 50 else f"{N}*"
        axN.text(min(N, 50) + 1.2, dep, lab, va="center", fontproperties=jp, fontsize=7)
    for x in [10, 20, 30, 40, 50]:
        axN.axvline(x, color="#cccccc", lw=0.6, zorder=0)
    axN.axhline(15.0, color="#7a3b00", lw=1.2, ls="--")
    axN.text(30, 2.4, "▽ 地下水位 GL-2.0m（T.P.+0.5m）", fontproperties=jp,
             fontsize=8.5, color="#1f77b4", va="center")
    axN.text(6, 16.8, "砂礫＝支持層\nGL-15.0m（T.P.-12.5m）", fontproperties=jp,
             fontsize=8.5, color="#7a3b00", va="center")
    axN.set_xlim(0, 60); axN.set_ylim(18, 0)
    axN.set_xlabel("N値（*印は50超・換算N）", fontproperties=jp, fontsize=9)
    axN.set_title("N値グラフ", fontproperties=jp, fontsize=10, fontweight="bold")
    fig.suptitle("図 1  柱状図の構成と読み方（標高・深度・土質・N値）",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    fig.subplots_adjust(left=0.14, top=0.9)
    return save(fig, "fig1_log.png")


def fig_spt():
    fig, axes = plt.subplots(1, 2, figsize=(13.0, 5.4),
                             gridspec_kw={"width_ratios": [1.0, 1.3]})
    # (a) 試験装置
    ax = axes[0]
    ax.add_patch(mpatches.Rectangle((-0.35, 0), 0.7, 0.6, fc="#8a8a8a", ec="k"))  # アンビル
    ax.plot([0, 0], [0.6, 5.2], color="k", lw=2)  # ロッド上
    ax.add_patch(mpatches.Rectangle((-0.55, 3.0), 1.1, 1.4, fc="#b0b0b0", ec="k"))  # ハンマー
    ax.annotate("ハンマー 63.5kg", xy=(0.55, 3.7), xytext=(1.3, 4.3),
                fontproperties=jp, fontsize=9, arrowprops=dict(arrowstyle="->"))
    ax.annotate("", xy=(-1.0, 3.0), xytext=(-1.0, 5.0),
                arrowprops=dict(arrowstyle="<->", color="#c00000"))
    ax.text(-1.15, 4.0, "落下高\n76cm", ha="right", va="center",
            fontproperties=jp, fontsize=9, color="#c00000")
    ax.plot([0, 0], [-2.5, 0], color="k", lw=2)  # ロッド下
    ax.add_patch(mpatches.Rectangle((-0.18, -3.5), 0.36, 1.0, fc="#6b8cbe", ec="k"))  # サンプラー
    ax.annotate("サンプラー\n（標準貫入試験用）", xy=(0.18, -3.0), xytext=(0.9, -2.6),
                fontproperties=jp, fontsize=9, arrowprops=dict(arrowstyle="->"))
    ax.axhline(-2.5, color="#8B5A2B", lw=1.0, ls=":")
    ax.text(-1.9, -2.3, "地盤", fontproperties=jp, fontsize=8, color="#8B5A2B")
    ax.set_xlim(-2.2, 2.6); ax.set_ylim(-4.2, 5.6); ax.set_aspect("auto"); ax.axis("off")
    ax.set_title("(a) 標準貫入試験（SPT）の装置", fontproperties=jp, fontsize=10, fontweight="bold")
    # (b) 打撃回数の記録
    ax = axes[1]
    ax.text(0.5, 0.94, "打撃回数の記録（N値の求め方）", transform=ax.transAxes, ha="center",
            fontproperties=jp, fontsize=11, fontweight="bold", color="#1f4e79")
    # 貫入バー：予備打ち15cm + 本打ち30cm(=N)
    ax.add_patch(mpatches.Rectangle((0.1, 0.55), 0.2, 0.22, transform=ax.transAxes,
                 fc="#dddddd", ec="k"))
    ax.text(0.2, 0.66, "予備打ち\n0-15cm", transform=ax.transAxes, ha="center", va="center",
            fontproperties=jp, fontsize=8)
    ax.add_patch(mpatches.Rectangle((0.3, 0.55), 0.4, 0.22, transform=ax.transAxes,
                 fc="#cfe0f0", ec="k"))
    ax.text(0.5, 0.66, "本打ち 15-45cm（30cm）\n= この打撃回数が N 値",
            transform=ax.transAxes, ha="center", va="center", fontproperties=jp, fontsize=8.5)
    ax.text(0.05, 0.4,
            "・本打ち 30cm に要した打撃回数 = N 値\n"
            "・10cm ごとに打撃回数を記録（例 6/8/9 → N=23）\n"
            "・打撃で 30cm 入らない時は 50 回で打切り\n"
            "  貫入量を記録（例 50回/12cm）→ 換算 N = 50×30/12 = 125\n"
            "・N値は地盤の硬さ・締り具合の指標（相対値）",
            transform=ax.transAxes, fontproperties=jp, fontsize=9, va="top")
    ax.axis("off")
    ax.set_title("(b) N値と貫入量", fontproperties=jp, fontsize=10, fontweight="bold")
    fig.suptitle("図 2  標準貫入試験（SPT）とN値・貫入量",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig2_spt.png")


def fig_soil():
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 4.8),
                             gridspec_kw={"width_ratios": [1.4, 1.2]})
    # (a) 粒径区分バー
    ax = axes[0]
    segs = [("粘土", 0.0, 1.0, "#7fa87f"), ("シルト", 1.0, 2.0, "#93b072"),
            ("砂", 2.0, 3.6, "#e7d189"), ("礫", 3.6, 5.0, "#c3a884"),
            ("石", 5.0, 5.8, "#a2896c")]
    for name, x0, x1, c in segs:
        ax.add_patch(mpatches.Rectangle((x0, 0.3), x1 - x0, 0.5, fc=c, ec="k"))
        ax.text((x0 + x1) / 2, 0.55, name, ha="center", va="center",
                fontproperties=jp, fontsize=10, fontweight="bold")
    # 境界の粒径
    for x, lab in [(1.0, "0.005"), (2.0, "0.075"), (3.6, "2"), (5.0, "75")]:
        ax.text(x, 0.22, lab, ha="center", va="top", fontproperties=jp, fontsize=8, color="#c00000")
    ax.text(2.9, 0.05, "粒径（mm）　←細かい　　　粗い→", ha="center",
            fontproperties=jp, fontsize=8.5, color="#444")
    ax.text(0.5, 0.9, "細粒分（0.075mm未満）", ha="center", fontproperties=jp, fontsize=8,
            color="#33691e")
    ax.text(4.3, 0.9, "粗粒分（0.075mm以上）", ha="center", fontproperties=jp, fontsize=8,
            color="#7a3b00")
    ax.set_xlim(-0.2, 6.0); ax.set_ylim(0, 1.05); ax.axis("off")
    ax.set_title("(a) 粒径による土質区分", fontproperties=jp, fontsize=10, fontweight="bold")
    # (b) 土質試験一覧
    ax = axes[1]
    ax.text(0.5, 0.95, "主な土質試験と得られる定数", transform=ax.transAxes, ha="center",
            fontproperties=jp, fontsize=11, fontweight="bold", color="#1f4e79")
    ax.text(0.03, 0.82,
            "【物理試験】\n"
            "・含水比／土粒子密度／単位体積重量\n"
            "・粒度試験（ふるい分け・沈降）→ 粒径加積\n"
            "・液性・塑性限界（コンシステンシー）\n\n"
            "【力学試験】\n"
            "・一軸圧縮試験 → qu（粘着力 c=qu/2）\n"
            "・三軸圧縮試験 → c, φ\n"
            "・圧密試験 → 圧密降伏応力 pc, Cc\n"
            "・standard 貫入試験 → N値（原位置）",
            transform=ax.transAxes, fontproperties=jp, fontsize=9, va="top")
    ax.axis("off")
    ax.set_title("(b) 土質試験", fontproperties=jp, fontsize=10, fontweight="bold")
    fig.suptitle("図 3  土質分類（粒径）と土質試験", fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig3_soil.png")


def fig_slope():
    fig, ax = plt.subplots(figsize=(12, 6.2))
    # 2本の柱状図 BH1(左), BH2(右)  水平距離20m
    def draw_log(x0, gle, sup_depth, label):
        w = 1.2
        lyr = [(0.0, 1.5, "#c9a66b"), (1.5, 5.0, "#93b072"), (5.0, 9.0, "#e7d189"),
               (9.0, sup_depth - 2, "#7fa87f"), (sup_depth - 2, sup_depth, "#c3a884"),
               (sup_depth, sup_depth + 3, "#a2896c")]
        for top, bot, c in lyr:
            ax.add_patch(mpatches.Rectangle((x0, top), w, bot - top, fc=c, ec="k", lw=0.6))
        ax.text(x0 + w / 2, -0.7, label, ha="center", fontproperties=jp, fontsize=10, fontweight="bold")
        ax.text(x0 + w / 2, -1.4, f"孔口 T.P.{gle:+.1f}m", ha="center",
                fontproperties=jp, fontsize=8, color="#c00000")
        # 支持層上端
        ax.plot([x0, x0 + w], [sup_depth, sup_depth], color="#7a3b00", lw=2)
        ax.text(x0 + w / 2, sup_depth + 1.5, f"支持層\nGL-{sup_depth:.1f}\nT.P.{gle - sup_depth:+.1f}",
                ha="center", va="center", fontproperties=jp, fontsize=7.5, color="#7a3b00")
        return x0 + w / 2, gle - sup_depth

    cx1, e1 = draw_log(1.0, 2.5, 15.0, "BH-1")
    cx2, e2 = draw_log(8.0, 2.5, 17.0, "BH-2")
    # 傾斜線（支持層上端を結ぶ）：深度で結ぶ
    ax.plot([cx1, cx2], [15.0, 17.0], color="#c00000", lw=2, ls="--")
    ax.annotate("支持層は BH-2 側へ傾斜\n高低差2.0m / 距離20m = 勾配 1/10（約5.7°）",
                xy=((cx1 + cx2) / 2, 16.0), xytext=(3.4, 12.3),
                fontproperties=jp, fontsize=9, color="#c00000",
                arrowprops=dict(arrowstyle="->", color="#c00000"))
    # 水平距離
    ax.annotate("", xy=(cx1, -2.4), xytext=(cx2, -2.4),
                arrowprops=dict(arrowstyle="<->", color="#333"))
    ax.text((cx1 + cx2) / 2, -2.9, "水平距離 20m", ha="center",
            fontproperties=jp, fontsize=9, color="#333")
    ax.set_xlim(-0.5, 10.5); ax.set_ylim(20, -3.6)
    ax.set_ylabel("深度 GL-(m)", fontproperties=jp, fontsize=10)
    ax.set_xticks([])
    ax.set_title("図 4  2本の柱状図から地層傾斜・支持層を判定",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig4_slope.png")


figs = {"log": fig_log(), "spt": fig_spt(), "soil": fig_soil(), "slope": fig_slope()}
print("figs:", list(figs.keys()))

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.drawing.image import Image as XLImage
from openpyxl.utils import get_column_letter
wb = Workbook()
C_TITLE = "1F4E79"; C_HEAD = "2E75B6"; C_ANS = "E2EFDA"
thin = Side(style="thin", color="BFBFBF"); border = Border(left=thin, right=thin, top=thin, bottom=thin)
f_title = Font(name="MS PGothic", size=15, bold=True, color="FFFFFF")
f_head = Font(name="MS PGothic", size=11, bold=True, color="FFFFFF")
f_body = Font(name="MS PGothic", size=10); f_ans = Font(name="MS PGothic", size=10, color="375623")
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


def table(ws, start_row, headers, rows, col1=1):
    r = start_row
    for j, htxt in enumerate(headers):
        c = ws.cell(r, col1 + j, htxt); c.font = Font(name="MS PGothic", size=10, bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor=C_HEAD); c.alignment = center; c.border = border
    for data in rows:
        r += 1
        for j, v in enumerate(data):
            c = ws.cell(r, col1 + j, v); c.font = f_body
            c.alignment = center if j > 0 else wrap; c.border = border
            if r % 2 == 0:
                c.fill = PatternFill("solid", fgColor="F2F7FC")
    return r


def put_img(ws, path, anchor, w=None):
    img = XLImage(path)
    if w:
        ratio = w / img.width; img.width = w; img.height = int(img.height * ratio)
    ws.add_image(img, anchor)


# ===== 目次 =====
ws = wb.active; ws.title = "目次"; setup(ws, [4, 24, 58, 14])
title_row(ws, 1, "柱状図の読み取り 問題集（RC マンション設計担当・新人向け）", span=4)
body(ws, 2, "目標：ボーリング柱状図を読み、標高・深度・N値・土質・地下水位を把握し、"
            "地層傾斜と支持層を判定できること。地盤調査の一次資料を正しく読む力を養う。", span=4, h=32)
r = table(ws, 4, ["No.", "シート", "到達目標", "図"],
          [["1", "1 柱状図の基本", "KBM・孔口標高・標高・深度を読める", "柱状図"],
           ["2", "2 N値と貫入量", "標準貫入試験とN値・貫入量を理解", "SPT"],
           ["3", "3 土質分類と試験", "土質区分・土質試験を理解する", "粒径/試験"],
           ["4", "4 水位・傾斜・支持層", "地下水位推定・地層傾斜・支持層判定", "2本柱状図"]])
body(ws, r + 2, "柱状図は地盤の断面図。この読み取りが基礎形式（直接/杭）・支持層・"
                "液状化検討・地盤定数のすべての出発点になる。", span=4, h=32)

# ===== 1 柱状図の基本 =====
ws = wb.create_sheet("1 柱状図の基本"); setup(ws, [8, 16, 18, 16, 12, 12])
title_row(ws, 1, "1  柱状図の基本（KBM・孔口標高・標高・深度）")
head(ws, 3, "■ 図 1  柱状図の構成"); put_img(ws, figs["log"], "A4", w=720)
head(ws, 33, "■ 用語の整理")
r = table(ws, 34, ["用語", "意味"],
          [["KBM（仮ベンチマーク）", "現場に設けた高さの基準点。ここから孔口標高を測量する"],
           ["孔口標高", "ボーリング孔の口（GL-0.00）の標高。T.P.（東京湾平均海面）等で表す"],
           ["標高（T.P.）", "海面基準の高さ。標高 = 孔口標高 - 深度"],
           ["深度（GL-）", "地表面（孔口）からの深さ。柱状図の縦軸"]])
head(ws, r + 2, "■ 問題 1  標高の計算")
body(ws, r + 3, "孔口標高 T.P.+2.50m の柱状図で、深度 GL-15.0m の支持層上端の標高（T.P.）を求めよ。"
                "また深度 GL-9.0m の標高も求めよ。", h=32)
head(ws, r + 5, "■ 問題 2  柱状図の列")
body(ws, r + 6, "柱状図には「標高／深度／土質記号（柱状）／土質名／N値／色調・記事」等の列がある。"
                "図1を見て、各層の土質名・深度範囲・代表N値を読み取り表にまとめよ。", h=40)
head(ws, r + 8, "■ 問題 3  KBM と測量")
body(ws, r + 9, "KBM（仮ベンチマーク）と孔口標高の関係を説明せよ。複数のボーリングの標高を"
                "そろえるために、なぜ KBM から測量して標高を付けるのか述べよ。", h=40)

# ===== 2 N値と貫入量 =====
ws = wb.create_sheet("2 N値と貫入量"); setup(ws, [8, 16, 18, 16, 12, 12])
title_row(ws, 1, "2  N値と貫入量（標準貫入試験 SPT）")
head(ws, 3, "■ 図 2  標準貫入試験とN値"); put_img(ws, figs["spt"], "A4", w=820)
head(ws, 27, "■ 問題 1  試験の諸元")
body(ws, 28, "標準貫入試験の諸元（ハンマー質量・落下高さ・予備打ち・本打ち）を答えよ。"
             "また N 値は何を表す指標か述べよ。", h=32)
head(ws, 30, "■ 問題 2  N値の求め方")
body(ws, 31, "本打ちで 10cm ごとに 6/8/9 回を要した。N値はいくつか。"
             "また 50 回打っても 12cm しか入らなかった場合の記録法と換算N値を求めよ。", h=32)
head(ws, 33, "■ 問題 3  貫入量の意味")
body(ws, 34, "「50回/12cm」のように打撃回数と貫入量をセットで記録する理由を述べよ。"
             "硬い地盤（支持層）での N値の扱い（換算N・50以上）に触れよ。", h=40)
head(ws, 36, "■ 問題 4  N値の目安")
r = table(ws, 37, ["N値", "砂質土の状態", "粘性土の状態"],
          [["0〜4", "非常にゆるい", "非常に軟らかい"],
           ["4〜10", "ゆるい", "軟らかい"],
           ["10〜30", "中位", "中位〜硬い"],
           ["30〜50", "密", "硬い"],
           ["50〜", "非常に密（支持層候補）", "非常に硬い"]])
body(ws, r + 1, "※N値は相対的な指標。同じN値でも砂と粘土で意味が異なる（換算式は別教材）。", h=28)

# ===== 3 土質分類と試験 =====
ws = wb.create_sheet("3 土質分類と試験"); setup(ws, [8, 16, 18, 16, 12, 12])
title_row(ws, 1, "3  土質分類と土質試験")
head(ws, 3, "■ 図 3  粒径区分と土質試験"); put_img(ws, figs["soil"], "A4", w=820)
head(ws, 28, "■ 問題 1  粒径による分類")
body(ws, 29, "土を粒径の小さい順に並べよ（粘土・シルト・砂・礫・石）。"
             "また細粒分（0.075mm未満）と粗粒分の境界の粒径を答えよ。", h=32)
head(ws, 31, "■ 問題 2  土質試験と得られる定数")
r = table(ws, 32, ["試験", "得られる主な値", "用途（記入）"],
          [["粒度試験", "粒径加積曲線・細粒分含有率FC", ""],
           ["一軸圧縮試験", "一軸圧縮強さ qu → c=qu/2", ""],
           ["三軸圧縮試験", "粘着力 c・内部摩擦角 φ", ""],
           ["圧密試験", "圧密降伏応力 pc・圧縮指数 Cc", ""]])
head(ws, r + 2, "■ 問題 3  土質記号の読み取り")
body(ws, r + 3, "柱状図の土質記号（柱状パターン）から、砂・粘土・礫・シルトを判別できるようにする。"
                "図1の各層の土質名を読み、細粒土層／粗粒土層に分類せよ。", h=40)
head(ws, r + 5, "■ 問題 4  試験の使い分け")
body(ws, r + 6, "粘性土の強度を知りたいとき（一軸・三軸）、砂の締り具合を知りたいとき（N値）、"
                "圧密沈下を検討したいとき（圧密試験）—目的に応じた試験の選び方を述べよ。", h=40)

# ===== 4 水位・傾斜・支持層 =====
ws = wb.create_sheet("4 水位傾斜支持層"); setup(ws, [8, 16, 18, 16, 12, 12])
title_row(ws, 1, "4  地下水位の推定・地層傾斜・支持層判定")
head(ws, 3, "■ 図 4  2本の柱状図と地層傾斜"); put_img(ws, figs["slope"], "A4", w=760)
head(ws, 30, "■ 問題 1  地下水位の推定")
body(ws, 31, "地下水位は柱状図のどの記録から推定するか述べよ（孔内水位▽・掘削中の湧水・"
             "被圧水頭など）。孔口標高+2.50m、水位深度2.0mのとき水位標高を求めよ。", h=40)
head(ws, 33, "■ 問題 2  地層傾斜の算定")
body(ws, 34, "BH-1 の支持層上端 GL-15.0m（T.P.-12.5m）、BH-2 は GL-17.0m（T.P.-14.5m）、"
             "水平距離20m。支持層の傾斜（勾配・角度）を求めよ。", h=32)
head(ws, 36, "■ 問題 3  支持層の判定")
body(ws, 37, "支持層とみなす条件を述べよ（N値の目安：砂礫・砂でN≧50、粘性土でN≧20程度／"
             "十分な層厚・連続性／杭先端下に軟弱層がない）。図の砂礫層が支持層といえるか論ぜよ。", h=44)
head(ws, 39, "■ 問題 4  基礎への反映")
body(ws, 40, "地層が傾斜している場合、基礎（杭長・支持層への根入れ）にどう配慮するか述べよ。"
             "建物の位置ごとに支持層深さが変わることの影響（杭長の変化・不同沈下）に触れよ。", h=44)

# ===== 解答 =====
ws = wb.create_sheet("解答"); setup(ws, [4, 22, 60, 14])
title_row(ws, 1, "解答・解説", span=4); row = 2


def ah(t):
    global row; head(ws, row, t, span=4); row += 1


def an(t, h=None):
    global row; body(ws, row, t, span=4, ans=True, h=h); row += 1


ah("1  柱状図の基本")
an("問1：標高 = 孔口標高 - 深度。支持層上端 = 2.50 - 15.0 = T.P.-12.50m。"
   "深度9.0m = 2.50 - 9.0 = T.P.-6.50m。", h=32)
an("問2：（図1）盛土 GL0.0-1.5 N≒3／シルト 1.5-5.0 N≒3（軟弱）／細砂 5.0-9.0 N≒12／"
   "粘土 9.0-13.0 N≒5／砂礫 13.0-15.0 N≒40／砂礫（支持層）15.0- N≧50。", h=44)
an("問3：KBMは現場に設けた高さの基準点。各ボーリングの孔口標高をKBMから測量して付ける。"
   "こうすると複数孔の標高が同一基準でそろい、地層を標高で連続的に対比できる（傾斜が読める）。", h=44)

ah("2  N値と貫入量")
an("問1：ハンマー63.5kg、落下高76cm、予備打ち0-15cm、本打ち15-45cm（30cm）。"
   "本打ち30cmの打撃回数がN値。N値は地盤の硬さ・締り具合を表す相対指標。", h=40)
an("問2：N = 6+8+9 = 23。50回で12cmは「50/12」と記録し、換算N = 50×30/12 = 125。"
   "支持層など硬い地盤は50打切りとし貫入量で換算する。", h=40)
an("問3：硬い地盤では30cm入る前に50回に達するため、打撃回数だけでは硬さを表せない。"
   "貫入量とセットで記録し、換算N（50×30/貫入量）で相対的な硬さを評価する。", h=40)
an("問4：N値の目安（砂：0-4ゆるい/10-30中位/30-密/50-非常に密＝支持層候補、"
   "粘土：0-4非常に軟/4-10軟/10-30中〜硬/30-硬）。砂と粘土で同N値でも意味が異なる。", h=40)

ah("3  土質分類と試験")
an("問1：小→大：粘土 < シルト < 砂 < 礫 < 石。細粒分と粗粒分の境界は 0.075mm。"
   "粘土0.005mm未満、シルト0.005-0.075、砂0.075-2、礫2-75、石75mm超。", h=40)
an("問2：粒度→細粒分含有率FC（液状化・分類）／一軸→qu, c=qu/2（粘土の強度）／"
   "三軸→c,φ（せん断強度）／圧密→pc, Cc（沈下量の予測）。", h=40)
an("問3：柱状パターン（砂は点、粘土は横線、礫は丸、シルトは細線 等）で判別。"
   "図1では盛土・砂・砂礫が粗粒土系、シルト・粘土が細粒土系。", h=40)
an("問4：粘性土の強度→一軸（簡便）・三軸（c,φ）。砂の締り→N値（原位置）。"
   "圧密沈下→圧密試験（pc,Cc）。目的（強度か沈下か）と土質で試験を選ぶ。", h=40)

ah("4  水位・傾斜・支持層")
an("問1：孔内水位▽の記録・掘削中の湧水/逸水・被圧水頭などから推定。"
   "水位標高 = 2.50 - 2.0 = T.P.+0.50m。液状化・浮力・山留めに影響。", h=40)
an("問2：高低差 = 15.0 - 17.0 の深度差＝標高差2.0m。勾配 = 2.0/20 = 1/10（10%）。"
   "角度 = arctan(0.1) ≒ 5.7°。支持層はBH-2側へ下がる。", h=40)
an("問3：支持層条件＝十分なN値（砂・砂礫N≧50、粘性土N≧20程度）・十分な層厚と連続性・"
   "先端下に軟弱層がないこと。図の砂礫層(N≧50)は層厚もあり支持層とみなせる。", h=44)
an("問4：傾斜地盤では建物位置ごとに支持層深さ（＝杭長）が変わる。杭長を位置ごとに設定し、"
   "支持層への所定の根入れを確保する。支持層深さの誤読は不同沈下・支持力不足につながる。", h=44)

XLSX = os.path.join(OUT, "柱状図の読み取り問題集.xlsx"); wb.save(XLSX); print("saved:", XLSX)
