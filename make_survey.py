# -*- coding: utf-8 -*-
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

wb = openpyxl.Workbook()
ws = wb.active
ws.title = "アンケート"

# ---- スタイル定義 ----
title_font = Font(name="Meiryo UI", size=14, bold=True, color="FFFFFF")
head_font  = Font(name="Meiryo UI", size=11, bold=True, color="FFFFFF")
q_font     = Font(name="Meiryo UI", size=11, bold=True)
body_font  = Font(name="Meiryo UI", size=10)
note_font  = Font(name="Meiryo UI", size=9, color="555555")

title_fill = PatternFill("solid", fgColor="1F4E78")
qhead_fill = PatternFill("solid", fgColor="2E75B6")
opt_fill   = PatternFill("solid", fgColor="DCE6F1")
ans_fill   = PatternFill("solid", fgColor="FFF2CC")

thin = Side(style="thin", color="BFBFBF")
border = Border(left=thin, right=thin, top=thin, bottom=thin)

wrap_top = Alignment(wrap_text=True, vertical="top")
wrap_ctr = Alignment(wrap_text=True, vertical="center")
center   = Alignment(horizontal="center", vertical="center", wrap_text=True)

# ---- 列幅 ----
ws.column_dimensions["A"].width = 4
ws.column_dimensions["B"].width = 8
ws.column_dimensions["C"].width = 60
ws.column_dimensions["D"].width = 14
ws.column_dimensions["E"].width = 40

r = 1

def merge(cell_range):
    ws.merge_cells(cell_range)

# ===== タイトル =====
merge(f"A{r}:E{r}")
c = ws.cell(r, 1, "RC標準雑詳細図WG　方針検討アンケート")
c.font = title_font; c.fill = title_fill; c.alignment = center
ws.row_dimensions[r].height = 30
r += 1

# ===== リード文 =====
merge(f"A{r}:E{r+1}")
c = ws.cell(r, 1,
    "お疲れ様です。RC標準雑詳細図WGでは今後の作図方針を決定するにあたり、部内の皆様のご意見を伺いたく存じます。\n"
    "お手数ですが、別紙資料をご参照のうえ、下記設問へのご回答をお願いいたします。")
c.font = body_font; c.alignment = wrap_top
ws.row_dimensions[r].height = 18; ws.row_dimensions[r+1].height = 18
r += 2

# ===== 回答者欄 =====
ws.cell(r, 2, "回答者").font = q_font
ws.cell(r, 2).fill = opt_fill; ws.cell(r, 2).border = border
ws.cell(r, 2).alignment = wrap_ctr
merge(f"C{r}:E{r}")
ws.cell(r, 3).fill = ans_fill; ws.cell(r, 3).border = border
ws.cell(r, 1).border = border
r += 2

# ===== ヘッダ行 =====
headers = ["", "設問", "内容", "回答欄", "ご意見・理由"]
for i, h in enumerate(headers, start=1):
    cell = ws.cell(r, i, h)
    cell.font = head_font; cell.fill = qhead_fill
    cell.alignment = center; cell.border = border
ws.row_dimensions[r].height = 20
r += 1

def add_question(no, title, body, options, answer_hint="該当に○", reason=True, body_height=None):
    """1設問を、本文行＋選択肢行で構成して書き込む"""
    global r
    start = r
    # --- 本文行 ---
    ws.cell(r, 2, no).font = q_font
    ws.cell(r, 2).alignment = center; ws.cell(r, 2).fill = opt_fill
    c = ws.cell(r, 3, f"{title}\n{body}")
    c.font = body_font; c.alignment = wrap_top
    ws.cell(r, 3).fill = PatternFill("solid", fgColor="F2F2F2")
    ws.row_dimensions[r].height = body_height or 60
    # 回答欄・理由欄（設問ブロック全体で結合）
    nrows = 1 + len(options)
    merge(f"D{start}:D{start+nrows-1}")
    merge(f"E{start}:E{start+nrows-1}")
    da = ws.cell(start, 4, answer_hint if not options else "")
    da.font = note_font; da.alignment = center; da.fill = ans_fill
    ea = ws.cell(start, 5, "")
    ea.fill = PatternFill("solid", fgColor="FFFDE7")
    ea.alignment = wrap_top
    r += 1
    # --- 選択肢行 ---
    for label, text in options:
        ws.cell(r, 2, "").fill = opt_fill
        c = ws.cell(r, 3, f"{label}　{text}")
        c.font = body_font; c.alignment = wrap_top
        ws.row_dimensions[r].height = 30
        r += 1
    # 罫線
    for rr in range(start, r):
        for cc in range(1, 6):
            ws.cell(rr, cc).border = border

# ===== ① =====
add_question("①",
    "雑詳細図の利用形式について",
    "雑詳細図の運用方法として、以下のどちらが望ましいとお考えですか。",
    [("A", "必要な納まりを都度抜粋して使う「カタログ的な利用」とする"),
     ("B", "あらかじめレイアウトまで作り込み、物件で使用しない箇所は斜線で消す形式とする")],
    body_height=45)

# ===== ② =====
add_question("②",
    "標準図・部材リストとの情報の重複について",
    "雑詳細図で伝えたいポイントを明確にするため、標準図や部材リストから読み取れる情報は極力省略する方向で検討しています。"
    "（省略により情報量が極端に薄くなる場合は記載を残すことを想定）",
    [("A", "標準図・部材リストと重複する情報は省略してよい"),
     ("B", "これまで通り、重複する情報も記載しておくべき")],
    body_height=60)

# ===== ③ =====
add_question("③",
    "拡大図の縮尺について",
    "拡大図の縮尺として、最も見やすいと感じるものを一つお選びください。",
    [("□", "1/20"),
     ("□", "1/15"),
     ("□", "1/12"),
     ("□", "1/10")],
    body_height=40)

# ===== ④ =====
add_question("④",
    "拡大図の記載方針について",
    "各種手摺配筋詳細図、片持ちスラブ先端壁・手摺配筋詳細図、パラペット配筋詳細図には既に拡大図を記載しています。"
    "図面間の濃度差を統一する観点から、以降の図面についても下記方針で進めたいと考えています。\n"
    "(1) 配筋が細かく分かりにくい図面に拡大図を併記する方針に賛成か／より限定的にすべきか\n"
    "(2) 「拡大図が必要」と判断する基準についてご意見をお聞かせください（例：鉄筋本数、定着・継手の有無、納まりの複雑さ、縮尺 等）",
    [("(1)", "上記方針で進めてよい　／　拡大図はより限定的にすべき　（どちらかを右欄に記入）"),
     ("(2)", "判断基準についてのご意見（右欄に自由記述）")],
    body_height=90)

# ===== 締め =====
merge(f"A{r}:E{r}")
c = ws.cell(r, 1, "以上、ご協力のほどよろしくお願い申し上げます。")
c.font = body_font; c.alignment = Alignment(vertical="center")
ws.row_dimensions[r].height = 22

# 印刷設定
ws.print_options.horizontalCentered = True
ws.page_setup.orientation = "portrait"
ws.page_setup.fitToWidth = 1
ws.page_setup.fitToHeight = 0
ws.sheet_properties.pageSetUpPr.fitToPage = True
ws.freeze_panes = "A2"

wb.save("RC標準雑詳細図WG_方針アンケート.xlsx")
print("saved")
