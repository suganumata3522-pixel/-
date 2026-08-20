# -*- coding: utf-8 -*-
"""全34冊の問題集を1つのExcelファイルに統合する。
出力: docs/構造設計問題集_総合版.xlsx
 - 00 表紙・目次（ロードマップ図＋ハイパーリンク付き一覧）
 - 01〜34 各テーマ1シート（元の目次・内容・解答を縦に連結、図はすべて保持）
"""
import os
from copy import copy
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.drawing.image import Image as XLImage
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.hyperlink import Hyperlink


def link_to(cell, sheet, ref="A1"):
    """ブック内リンク（location 指定）を設定する。"""
    cell.hyperlink = Hyperlink(ref=cell.coordinate, location=f"'{sheet}'!{ref}")

EMU = 9525
OUT = "docs/構造設計問題集_総合版.xlsx"

# (連番, 分野, テーマ短縮名, フォルダ, ファイル名)
TOPICS = [
    ("A", "RC造の基礎", "rc_basics", "RC造基礎問題集.xlsx"),
    ("A", "架構のモデル化", "rc_frame_design", "架構モデル化問題集.xlsx"),
    ("A", "架構モデル作成", "frame_model", "架構モデル作成問題集.xlsx"),
    ("A", "符号割", "symbol_assignment", "符号割問題集.xlsx"),
    ("A", "バランス配置", "balance_layout", "バランス配置問題集.xlsx"),
    ("B", "鉄筋比", "steel_ratio", "鉄筋比問題集.xlsx"),
    ("B", "鉄筋の定着", "rebar_anchorage", "鉄筋定着問題集.xlsx"),
    ("B", "鉄筋の継手", "rebar_splice", "鉄筋継手問題集.xlsx"),
    ("B", "付着設計", "bond_design", "付着設計問題集.xlsx"),
    ("B", "柱梁接合部", "rc_joint", "柱梁接合部問題集.xlsx"),
    ("B", "配筋調整", "rebar_adjust", "配筋調整問題集.xlsx"),
    ("C", "特殊スラブ", "special_slab", "特殊スラブ問題集.xlsx"),
    ("C", "階段設計", "stair", "階段設計問題集.xlsx"),
    ("C", "擁壁設計", "retaining_wall", "擁壁設計問題集.xlsx"),
    ("C", "擁壁の設計 No.3", "retaining_wall_design", "擁壁の設計問題集.xlsx"),
    ("C", "ねじり検討", "torsion", "ねじり検討問題集.xlsx"),
    ("C", "たわみ層間変形角", "deflection", "たわみ層間変形角問題集.xlsx"),
    ("D", "一次二次設計", "seismic_design", "一次二次設計問題集.xlsx"),
    ("D", "剛床移行せん断力", "diaphragm", "剛床移行せん断力問題集.xlsx"),
    ("D", "偏心率剛性率", "eccentricity", "偏心率剛性率問題集.xlsx"),
    ("D", "保有水平耐力", "capacity", "保有水平耐力計算問題集.xlsx"),
    ("D", "崩壊形", "collapse", "崩壊形問題集.xlsx"),
    ("D", "部材種別", "member_class", "部材種別問題集.xlsx"),
    ("D", "保証設計", "shear_margin", "保証設計問題集.xlsx"),
    ("E", "土圧", "earth_pressure", "土圧問題集.xlsx"),
    ("F", "柱状図の読み取り", "borelog", "柱状図の読み取り問題集.xlsx"),
    ("F", "各地盤定数", "soil_params", "各地盤定数問題集.xlsx"),
    ("F", "液状化判定", "liquefaction", "液状化判定問題集.xlsx"),
    ("G", "地盤の支持力", "bearing_terzaghi", "地盤の支持力Terzaghi問題集.xlsx"),
    ("G", "上下分離モデル", "updown_model", "上下分離モデル問題集.xlsx"),
    ("G", "柱状改良の支持力", "column_improve", "柱状改良の支持力問題集.xlsx"),
    ("G", "場所打ち杭の支持力", "castpile", "場所打ち杭の支持力問題集.xlsx"),
    ("H", "杭の水平力検討", "pile_lateral", "杭の水平力検討問題集.xlsx"),
    ("H", "既成杭の計算書確認", "precast_pile", "既成杭の計算書確認問題集.xlsx"),
    ("H", "基礎フーチング設計", "footing_design", "基礎フーチング設計問題集.xlsx"),
]

CAT_NAME = {"A": "構造設計の基礎・モデル化", "B": "配筋・ディテール設計",
            "C": "各部材の設計", "D": "耐震設計（一次・二次設計）",
            "E": "荷重・外力", "F": "地盤・地盤調査",
            "G": "支持力・基礎形式", "H": "杭・基礎の設計"}
CAT_COLOR = {"A": "DBE5F1", "B": "DCE9D4", "C": "FDE7D4", "D": "F6DCDC",
             "E": "E6DCF0", "F": "D8ECEC", "G": "E9E2CF", "H": "DBE5F1"}

C_TITLE = "1F4E79"; C_SEC = "4472C4"
WIDTHS = [13, 17, 19, 17, 15, 15, 13, 13]
thin = Side(style="thin", color="BFBFBF")
f_cover = Font(name="MS PGothic", size=20, bold=True, color="FFFFFF")
f_topic = Font(name="MS PGothic", size=14, bold=True, color="FFFFFF")
f_sec = Font(name="MS PGothic", size=11, bold=True, color="FFFFFF")
f_body = Font(name="MS PGothic", size=10)
f_link = Font(name="MS PGothic", size=10, color="0563C1", underline="single")
f_hdr = Font(name="MS PGothic", size=10, bold=True, color="FFFFFF")
wrap = Alignment(wrap_text=True, vertical="top")
center = Alignment(horizontal="center", vertical="center", wrap_text=True)

wb = Workbook()
cover = wb.active; cover.title = "00 表紙・目次"


def sheet_name(i, name):
    s = f"{i:02d} {name}"
    for ch in "[]:*?/\\":
        s = s.replace(ch, "-")
    return s[:31]


def copy_sheet_into(src_ws, tgt, offset):
    """src_ws の内容を tgt の offset 行目以降にコピーし、次の開始行を返す。"""
    maxc = min(src_ws.max_column, 8)
    # セル（値＋書式）
    for row in src_ws.iter_rows(min_row=1, max_row=src_ws.max_row, max_col=maxc):
        for cell in row:
            tc = tgt.cell(row=cell.row + offset, column=cell.column)
            tc.value = cell.value
            if cell.has_style:
                tc.font = copy(cell.font); tc.fill = copy(cell.fill)
                tc.border = copy(cell.border); tc.alignment = copy(cell.alignment)
                tc.number_format = cell.number_format
    # 行高
    for r, dim in src_ws.row_dimensions.items():
        if dim.height:
            tgt.row_dimensions[r + offset].height = dim.height
    # 結合セル（1列目始まりの本文行は A:H に広げる）
    for mr in list(src_ws.merged_cells.ranges):
        r1, c1 = mr.min_row + offset, mr.min_col
        r2, c2 = mr.max_row + offset, min(mr.max_col, 8)
        if c1 == 1 and mr.max_col >= 3:
            c2 = 8
        if (r1, c1) != (r2, c2):
            try:
                tgt.merge_cells(start_row=r1, start_column=c1, end_row=r2, end_column=c2)
            except Exception:
                pass
    # 画像（表示サイズを保持して再アンカー）
    bottom = src_ws.max_row
    for img in list(src_ws._images):
        try:
            dw = int(img.anchor.ext.cx / EMU); dh = int(img.anchor.ext.cy / EMU)
            ar = img.anchor._from.row
        except Exception:
            dw, dh, ar = img.width, img.height, 0
        newr = ar + offset + 1  # 1-indexed セル参照
        tgt.add_image(img, f"A{newr}")
        img.width = dw; img.height = dh
        bottom = max(bottom, ar + 1 + int(dh / 19) + 1)
    return bottom + offset


def band(ws, row, text, fill, font, height=24, span=8):
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=span)
    c = ws.cell(row, 1, text); c.font = font
    c.fill = PatternFill("solid", fgColor=fill)
    c.alignment = Alignment(vertical="center", horizontal="left", indent=1)
    ws.row_dimensions[row].height = height


# ===== 各テーマのシートを作成 =====
index_rows = []
for i, (cat, name, folder, fname) in enumerate(TOPICS, start=1):
    path = os.path.join("docs", folder, fname)
    src = load_workbook(path)
    sname = sheet_name(i, name)
    ws = wb.create_sheet(sname)
    for j, w in enumerate(WIDTHS, 1):
        ws.column_dimensions[get_column_letter(j)].width = w
    ws.sheet_view.showGridLines = False
    # テーマ見出し
    band(ws, 1, f"{i:02d}. {name}　［{cat}. {CAT_NAME[cat]}］", C_TITLE, f_topic, height=32)
    c = ws.cell(2, 1, "▲ 目次シートへ戻る")
    c.font = f_link; link_to(c, "00 表紙・目次")
    row = 3
    nfig = 0
    for s in src.sheetnames:
        band(ws, row + 1, f"【{s}】", C_SEC, f_sec)
        row = copy_sheet_into(src[s], ws, offset=row + 1)
        nfig += len(src[s]._images)
        row += 2
    index_rows.append((i, cat, name, sname, len(src.sheetnames), nfig))
    print(f"{i:02d} {name:20} sheets={len(src.sheetnames)} figs={nfig} rows={row}")

# ===== 表紙・目次 =====
for j, w in enumerate([6, 26, 30, 30, 10, 10], 1):
    cover.column_dimensions[get_column_letter(j)].width = w
cover.sheet_view.showGridLines = False
band(cover, 1, "構造設計 問題集 総合版（RC マンション設計担当・新入社員向け）",
     C_TITLE, f_cover, height=44, span=6)
cover.merge_cells("A2:F2")
c = cover.cell(2, 1, "全35テーマ・169図解・全問解答つき。分野A〜Hの順に学ぶと、"
                    "上部構造 → 荷重 → 地盤・基礎 と設計の流れを上流から下流までたどれます。"
                    "数値例はすべて検算済み。規準・告示に依存する値には『確認要』を明記しています。")
c.font = f_body; c.alignment = wrap; cover.row_dimensions[2].height = 34
rm = "docs/index_figures/roadmap.png"
if os.path.exists(rm):
    im = XLImage(rm); ratio = 900 / im.width
    cover.add_image(im, "A4"); im.width = 900; im.height = int(im.height * ratio)

r0 = 42
band(cover, r0, "■ 収録テーマ一覧（テーマ名をクリックすると該当シートへ移動）",
     C_SEC, f_sec, span=6)
r = r0 + 1
for j, h in enumerate(["No.", "分野", "テーマ", "シート", "節数", "図数"]):
    cc = cover.cell(r, 1 + j, h); cc.font = f_hdr
    cc.fill = PatternFill("solid", fgColor=C_SEC); cc.alignment = center
    cc.border = Border(left=thin, right=thin, top=thin, bottom=thin)
cur = None
for (i, cat, name, sname, nsh, nfig) in index_rows:
    if cat != cur:
        r += 1; cur = cat
        cover.merge_cells(start_row=r, start_column=1, end_row=r, end_column=6)
        cc = cover.cell(r, 1, f"{cat}. {CAT_NAME[cat]}")
        cc.font = Font(name="MS PGothic", size=11, bold=True, color="1F3A5F")
        cc.fill = PatternFill("solid", fgColor=CAT_COLOR[cat])
        cc.alignment = Alignment(vertical="center", horizontal="left", indent=1)
        cover.row_dimensions[r].height = 20
    r += 1
    vals = [i, cat, name, sname, nsh, nfig]
    for j, v in enumerate(vals):
        cc = cover.cell(r, 1 + j, v)
        cc.font = f_link if j == 2 else f_body
        cc.alignment = wrap if j in (2, 3) else center
        cc.border = Border(left=thin, right=thin, top=thin, bottom=thin)
        if j == 2:
            link_to(cc, sname)
r += 2
cover.merge_cells(start_row=r, start_column=1, end_row=r, end_column=6)
cc = cover.cell(r, 1, "※ 各テーマシートは『目次 → 内容（図解＋問題）→ 解答』を縦に連結しています。"
                     "先頭の「▲ 目次シートへ戻る」でこのページに戻れます。")
cc.font = f_body; cc.alignment = wrap; cover.row_dimensions[r].height = 30

wb.save(OUT)
print("saved:", OUT, f"{os.path.getsize(OUT)/1024/1024:.1f} MB", "sheets:", len(wb.sheetnames))
