# -*- coding: utf-8 -*-
"""問題集ライブラリ 総合目次（カリキュラム）Excel。出力: docs/問題集ライブラリ総合目次.xlsx
全34の図解Excel問題集＋風/地震/VEのMarkdown教材を分野別に整理し、学習の進め方を示す。
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
OUT = "docs"; FIG = os.path.join(OUT, "index_figures"); os.makedirs(FIG, exist_ok=True)

# 分野: (キー, タイトル, 色, [(No, テーマ, フォルダ, ファイル, 到達目標)])
CATS = [
    ("A", "構造設計の基礎・モデル化", "#dbe5f1", [
        (1, "RC造の基礎", "rc_basics", "RC造基礎問題集.xlsx", "RC造の材料・構造形式・設計の流れ"),
        (2, "架構のモデル化", "rc_frame_design", "架構モデル化問題集.xlsx", "部材・節点・剛域・支点のモデル化"),
        (3, "架構モデル作成", "frame_model", "架構モデル作成問題集.xlsx", "2階建て架構の作成・一次/二次設計"),
        (4, "符号割", "symbol_assignment", "符号割問題集.xlsx", "部材符号の付け方・集約"),
        (5, "バランス配置", "balance_layout", "バランス配置問題集.xlsx", "耐震要素のバランス配置"),
    ]),
    ("B", "配筋・ディテール設計", "#dCe9d4", [
        (6, "鉄筋比", "steel_ratio", "鉄筋比問題集.xlsx", "pg/pt/pw/ps・釣合鉄筋比pb"),
        (7, "鉄筋の定着", "rebar_anchorage", "鉄筋定着問題集.xlsx", "定着長Lb・折曲げ定着"),
        (8, "鉄筋の継手", "rebar_splice", "鉄筋継手問題集.xlsx", "重ね継手・継手位置"),
        (9, "付着設計", "bond_design", "付着設計問題集.xlsx", "付着応力・付着割裂"),
        (10, "柱梁接合部", "rc_joint", "柱梁接合部問題集.xlsx", "接合部せん断Vju・形状係数"),
        (11, "配筋調整", "rebar_adjust", "配筋調整問題集.xlsx", "目的別の配筋調整・納まり"),
    ]),
    ("C", "各部材の設計", "#fde7d4", [
        (12, "特殊スラブ", "special_slab", "特殊スラブ問題集.xlsx", "片持ち・段差・開口スラブ"),
        (13, "階段設計", "stair", "階段設計問題集.xlsx", "階段の応力・配筋"),
        (14, "擁壁設計", "retaining_wall", "擁壁設計問題集.xlsx", "土圧・安定・断面算定"),
        (0, "擁壁の設計 No.3", "retaining_wall_design", "擁壁の設計問題集.xlsx",
         "種類/土圧選別/安定計算/応力/配筋/排水"),
        (15, "ねじり検討", "torsion", "ねじり検討問題集.xlsx", "ねじりモーメント・Bach/Rausch"),
        (16, "たわみ・層間変形角", "deflection", "たわみ層間変形角問題集.xlsx", "変形増大率K・層間変形角"),
    ]),
    ("D", "耐震設計（一次・二次設計）", "#f6dcdc", [
        (17, "一次・二次設計", "seismic_design", "一次二次設計問題集.xlsx", "許容応力度/保有水平耐力の流れ"),
        (18, "剛床・移行せん断力", "diaphragm", "剛床移行せん断力問題集.xlsx", "剛床仮定・移行せん断力"),
        (19, "偏心率・剛性率", "eccentricity", "偏心率剛性率問題集.xlsx", "Re<=0.15・Rs>=0.6・Fes"),
        (20, "保有水平耐力", "capacity", "保有水平耐力計算問題集.xlsx", "Qu>=Qun=Ds・Fes・Qud"),
        (21, "崩壊形", "collapse", "崩壊形問題集.xlsx", "全体/部分/局部崩壊・強柱弱梁"),
        (22, "部材種別", "member_class", "部材種別問題集.xlsx", "FA〜FD・Ds値"),
        (23, "保証設計", "shear_margin", "保証設計問題集.xlsx", "せん断余裕率・曲げ先行"),
    ]),
    ("E", "荷重・外力", "#e6dcf0", [
        (24, "土圧", "earth_pressure", "土圧問題集.xlsx", "静止/主働/受働土圧・Ka/Kp"),
    ]),
    ("F", "地盤・地盤調査", "#d8ecec", [
        (25, "柱状図の読み取り", "borelog", "柱状図の読み取り問題集.xlsx", "KBM・標高深度・N値・支持層判定"),
        (26, "各地盤定数", "soil_params", "各地盤定数問題集.xlsx", "N/φ/C/qu/Eo/FC/ρ/pc・換算式"),
        (27, "液状化判定", "liquefaction", "液状化判定問題集.xlsx", "FL/PL/Dcy・地盤定数低減"),
    ]),
    ("G", "支持力・基礎形式", "#e9e2cf", [
        (28, "地盤の支持力(Terzaghi)", "bearing_terzaghi", "地盤の支持力Terzaghi問題集.xlsx", "3項・支持力係数・砂/粘土"),
        (29, "上下分離モデル", "updown_model", "上下分離モデル問題集.xlsx", "分離/一体・支点条件・接地圧"),
        (30, "柱状改良の支持力", "column_improve", "柱状改良の支持力問題集.xlsx", "複合地盤/改良体式・改良率"),
        (31, "場所打ち杭の支持力", "castpile", "場所打ち杭の支持力問題集.xlsx", "先端+周面・許容圧縮/引抜き"),
    ]),
    ("H", "杭・基礎の設計", "#dbe5f1", [
        (32, "杭の水平力検討", "pile_lateral", "杭の水平力検討問題集.xlsx", "ばね支承梁・kh・M-N図・配筋"),
        (33, "既成杭の計算書確認", "precast_pile", "既成杭の計算書確認問題集.xlsx", "杭種類/工法・反力反映・干渉"),
        (34, "基礎フーチング設計", "footing_design", "基礎フーチング設計問題集.xlsx", "地反力/杭反力・独立/べた/杭/偏心"),
    ]),
]


def fig_roadmap():
    fig, ax = plt.subplots(figsize=(13.5, 7.6))
    # 2列×4段でカテゴリを配置し、学習の流れを矢印で示す
    order = ["A", "B", "C", "D", "E", "F", "G", "H"]
    pos = {"A": (0.06, 0.80), "B": (0.55, 0.80), "C": (0.06, 0.56), "D": (0.55, 0.56),
           "E": (0.06, 0.32), "F": (0.55, 0.32), "G": (0.06, 0.08), "H": (0.55, 0.08)}
    cmap = {k: (t, c, items) for k, t, c, items in CATS}
    for k in order:
        x, y = pos[k]; title, color, items = cmap[k]
        ax.add_patch(mpatches.FancyBboxPatch((x, y), 0.39, 0.18, boxstyle="round,pad=0.008",
                     transform=ax.transAxes, fc=color, ec="#2e5b8a", lw=1.3))
        ax.text(x + 0.02, y + 0.145, f"{k}. {title}", transform=ax.transAxes,
                fontproperties=jp, fontsize=10, fontweight="bold", color="#1f3a5f")
        names = "・".join(it[1] for it in items)
        ax.text(x + 0.02, y + 0.06, names, transform=ax.transAxes, fontproperties=jp,
                fontsize=6.4, color="#333", va="center", wrap=True)
        ax.text(x + 0.35, y + 0.145, f"{len(items)}冊", transform=ax.transAxes,
                fontproperties=jp, fontsize=8, color="#c00000", ha="right")
    ax.text(0.5, 0.99, "上部構造（A〜D）→ 荷重（E）→ 地盤・基礎（F〜H）へと進む",
            transform=ax.transAxes, ha="center", fontproperties=jp, fontsize=10,
            color="#1f4e79", fontweight="bold")
    ax.axis("off")
    ax.set_title("構造設計 問題集ライブラリ 学習ロードマップ（全35冊）",
                 fontproperties=jp, fontsize=14, fontweight="bold")
    p = os.path.join(FIG, "roadmap.png"); fig.savefig(p, dpi=130, bbox_inches="tight"); plt.close(fig)
    return p


roadmap = fig_roadmap()
print("roadmap:", roadmap)

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.drawing.image import Image as XLImage
from openpyxl.utils import get_column_letter
wb = Workbook()
C_TITLE = "1F4E79"; C_HEAD = "2E75B6"
thin = Side(style="thin", color="BFBFBF"); border = Border(left=thin, right=thin, top=thin, bottom=thin)
f_title = Font(name="MS PGothic", size=15, bold=True, color="FFFFFF")
f_head = Font(name="MS PGothic", size=11, bold=True, color="FFFFFF")
f_body = Font(name="MS PGothic", size=10)
f_cat = Font(name="MS PGothic", size=11, bold=True, color="1F3A5F")
wrap = Alignment(wrap_text=True, vertical="top")
center = Alignment(horizontal="center", vertical="center", wrap_text=True)


def setup(ws, widths):
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.sheet_view.showGridLines = False


def title_row(ws, row, text, span):
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=span)
    c = ws.cell(row, 1, text); c.font = f_title; c.fill = PatternFill("solid", fgColor=C_TITLE)
    c.alignment = Alignment(vertical="center", horizontal="left", indent=1); ws.row_dimensions[row].height = 30


def head(ws, row, text, span):
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=span)
    c = ws.cell(row, 1, text); c.font = f_head; c.fill = PatternFill("solid", fgColor=C_HEAD)
    c.alignment = Alignment(vertical="center", horizontal="left", indent=1); ws.row_dimensions[row].height = 22


def body(ws, row, text, span, h=None):
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=span)
    c = ws.cell(row, 1, text); c.font = f_body; c.alignment = wrap
    if h:
        ws.row_dimensions[row].height = h


# ===== 概要 =====
ws = wb.active; ws.title = "概要"; setup(ws, [4, 26, 60, 16])
title_row(ws, 1, "構造設計 問題集ライブラリ 総合目次（RC マンション設計担当・新人向け）", 4)
body(ws, 2, "本ライブラリは、ゼネコン構造設計部の新入社員が RC マンションの構造設計を体系的に学ぶための"
            "図解つき問題集（全35冊＋風/地震/VEのMarkdown教材）です。各冊は『目次→図解つき内容→解答』の"
            "構成で、数値例はすべて検算済み。規準・告示に依存する値には『確認要』を明記しています。", 4, h=48)
img = XLImage(roadmap); ratio = 940 / img.width; img.width = 940; img.height = int(img.height * ratio)
ws.add_image(img, "A4")
body(ws, 42, "使い方：上部構造（A〜D）で骨組・配筋・部材・耐震を学び、荷重（E）を押さえ、"
             "地盤・基礎（F〜H）で地盤調査から支持力・杭・基礎設計へ進むと、設計の一連の流れを"
             "上流から下流までたどれます。各行の『フォルダ/ファイル』から該当のExcelを開いてください。", 4, h=48)

# ===== カリキュラム一覧 =====
ws = wb.create_sheet("カリキュラム一覧"); setup(ws, [5, 22, 44, 26, 22])
title_row(ws, 1, "カリキュラム一覧（分野別・全34冊）", 5)
r = 2
# 見出し行
hdrs = ["No.", "テーマ", "到達目標（主）", "フォルダ", "ファイル"]
for j, htxt in enumerate(hdrs):
    c = ws.cell(r, 1 + j, htxt); c.font = Font(name="MS PGothic", size=10, bold=True, color="FFFFFF")
    c.fill = PatternFill("solid", fgColor=C_HEAD); c.alignment = center; c.border = border
r += 1
seq = 0
for key, ctitle, color, items in CATS:
    ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=5)
    c = ws.cell(r, 1, f"{key}. {ctitle}"); c.font = f_cat
    c.fill = PatternFill("solid", fgColor=color.replace("#", ""))
    c.alignment = Alignment(vertical="center", horizontal="left", indent=1)
    ws.row_dimensions[r].height = 20
    r += 1
    for no, name, folder, fname, obj in items:
        seq += 1
        vals = [seq, name, obj, f"docs/{folder}/", fname]
        for j, v in enumerate(vals):
            c = ws.cell(r, 1 + j, v); c.font = f_body
            c.alignment = center if j == 0 else wrap; c.border = border
            if r % 2 == 0:
                c.fill = PatternFill("solid", fgColor="F7FAFD")
        r += 1

# ===== 補足教材 =====
ws = wb.create_sheet("補足教材"); setup(ws, [5, 24, 60, 18])
title_row(ws, 1, "補足教材（Markdown 形式）", 4)
body(ws, 2, "以下は図解Excel問題集とは別に用意しているMarkdown形式の教材です。"
            "荷重（風・地震）と VE ワークショップを扱います。", 4, h=32)
r = 4
head(ws, r, "■ 荷重・その他の教材", 4); r += 1
rows = [["風荷重", "docs/wind/", "基準風速・速度圧・風力係数・高さ方向分布（00_formulas〜04_solutions）"],
        ["地震荷重", "docs/seismic/", "地震層せん断力・Ai分布・Co・地域係数（00_formulas〜04_solutions）"],
        ["VE ワークショップ", "docs/ve_workshop/", "VE（Value Engineering）の考え方・ケース・演習（00_guide〜04_solutions）"]]
for j, htxt in enumerate(["教材", "フォルダ", "内容"]):
    c = ws.cell(r, 1 + j, htxt); c.font = Font(name="MS PGothic", size=10, bold=True, color="FFFFFF")
    c.fill = PatternFill("solid", fgColor=C_HEAD); c.alignment = center; c.border = border
    if j == 2:
        ws.merge_cells(start_row=r, start_column=3, end_row=r, end_column=4)
r += 1
for row_data in rows:
    ws.cell(r, 1, row_data[0]).font = f_body
    ws.cell(r, 2, row_data[1]).font = f_body
    ws.merge_cells(start_row=r, start_column=3, end_row=r, end_column=4)
    ws.cell(r, 3, row_data[2]).font = f_body
    for cc in range(1, 5):
        ws.cell(r, cc).border = border; ws.cell(r, cc).alignment = wrap
    ws.row_dimensions[r].height = 30
    r += 1
body(ws, r + 1, "※ 全教材は Git リポジトリの docs/ 配下で管理。各Excelは図解・解答つきで、"
                "規準依存値には『確認要』を明記しています。", 4, h=32)

XLSX = os.path.join(OUT, "問題集ライブラリ総合目次.xlsx"); wb.save(XLSX); print("saved:", XLSX)
