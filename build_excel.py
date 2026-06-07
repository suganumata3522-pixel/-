# -*- coding: utf-8 -*-
"""住宅性能評価・構造判定 副業委託 調査まとめ Excel生成"""
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

wb = openpyxl.Workbook()

# ---- 共通スタイル ----
HEADER_FILL = PatternFill("solid", fgColor="1F4E78")
HEADER_FONT = Font(name="Meiryo", size=11, bold=True, color="FFFFFF")
TITLE_FONT = Font(name="Meiryo", size=14, bold=True, color="1F4E78")
SUB_FONT = Font(name="Meiryo", size=10, italic=True, color="555555")
CELL_FONT = Font(name="Meiryo", size=10)
BOLD = Font(name="Meiryo", size=10, bold=True)
HL_FILL = PatternFill("solid", fgColor="FFF2CC")     # 推奨ハイライト
GREEN_FILL = PatternFill("solid", fgColor="E2EFDA")   # 在宅可
GREY_FILL = PatternFill("solid", fgColor="F2F2F2")
RED_FONT = Font(name="Meiryo", size=10, color="C00000")
thin = Side(style="thin", color="BFBFBF")
BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)
WRAP = Alignment(wrap_text=True, vertical="top")
WRAP_C = Alignment(wrap_text=True, vertical="center", horizontal="center")


def style_header(ws, row, ncols):
    for c in range(1, ncols + 1):
        cell = ws.cell(row=row, column=c)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = WRAP_C
        cell.border = BORDER


def put_rows(ws, start, rows, widths, header_row_idx=None):
    for r_off, rowvals in enumerate(rows):
        r = start + r_off
        for c, val in enumerate(rowvals, start=1):
            cell = ws.cell(row=r, column=c, value=val)
            cell.font = CELL_FONT
            cell.alignment = WRAP
            cell.border = BORDER
    for c, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(c)].width = w


# ============================================================
# シート0: サマリー / 結論
# ============================================================
ws = wb.active
ws.title = "0_結論サマリー"
ws.sheet_view.showGridLines = False
ws["A1"] = "住宅性能評価・構造判定 副業委託 調査まとめ"
ws["A1"].font = TITLE_FONT
ws["A2"] = "対象者プロファイル：構造設計一級建築士／RC造が得意・S造経験あり・木造は学習前提／完全在宅希望／月10〜30時間（将来本業化）"
ws["A2"].font = SUB_FONT
ws["A3"] = "作成日：2026-06-06　※単価・在宅可否は応募前に各機関へ要再確認（多くが交渉次第）"
ws["A3"].font = SUB_FONT

summary = [
    ["#", "結論", "根拠・補足"],
    ["1",
     "市況は明確に『売り手市場』。構造設計一級は全国で累計約1.1万人と希少。2025年4月の4号特例縮小で木造2階建ても構造審査対象化し、性能評価・適判・長期優良・省エネ判定が同時に拡大、機関は委託・嘱託で人材確保に奔走中。",
     "日経クロステック『構造1級・設備1級は引く手あまたのレア資格』／住宅産業新聞：24年度設計性能評価は28万戸(+6.3%)・新築の34.2%が取得"],
    ["2",
     "『完全在宅×構造の業務委託』が最も成立しやすいのは【住宅性能評価の“設計”評価（PC上の図面・計算書審査）】。日本ERIが公式に『検査ではないので自宅・事務所のPCで実施可』と明示。ビューローベリタスも設計図面評価(構造)の業務委託を副業可で募集。",
     "日本ERI業務委託ページ／ビューローベリタス求人。建設(現場検査)評価は出向必須なので“設計評価”枠に絞るのが在宅成立の鍵。"],
    ["3",
     "『構造適合性判定(適判)そのもの』の完全在宅・業務委託の公募は無し。適判は判定図書を機関管理下で審査する集合判定型が法の建付け。BCJ/TBTC等の“アルバイト・嘱託(週1〜4日・出社混在)”が受け皿。",
     "建築基準法18条の2。BCJ構造判定部アルバイト、TBTCは65歳以降嘱託・週4可。適判は中長期目標として。"],
    ["4",
     "資格の注意：構造設計一級建築士でも“適判員”には別途【構造計算適合判定資格者検定】合格＋大臣登録が必要(免除なし)。一方、性能評価員は【住宅性能評価員講習(法定・約4日/約10万円)修了】だけで開始でき、こちらが副業の即効ルート。",
     "国交省適判検定案内／品確法13条。受験資格(一級+実務5年)は構造一級なら通常クリア。"],
    ["5",
     "収入の現実値：性能評価の設計図面審査は1件1〜2万円・所要1.5〜3h。月20hで手取り月11〜32万円が射程。適判主体なら1件2〜5万円で月30h時36〜54万円も。源泉10.21%が機関側で控除される。",
     "JIO委託検査(木造現場)7,500〜12,000円/件[公式]、性能評価図面審査1〜2万円/件[業界相場]、適判2〜5万円/件[推測]。国交省主任技師単価66,900円/日。"],
    ["6",
     "最優先アクション3つ：①住宅性能評価員講習を申込→修了証取得 ②日本ERIの業務委託に応募(在宅明示) ③ビューローベリタス＆住宅あんしん保証へエントリー。木造は需要最大なのでHOWTEC等の許容応力度講習(数万円)を1本受け案件枠を広げる。",
     "詳細は各シート参照。RC/S造が得意でも、木造を覚えると案件ボリュームゾーン(戸建)を取り込め副業の安定度が大きく上がる。"],
]
start = 5
style_header(ws, start, 3)
put_rows(ws, start, summary, [5, 70, 60])
ws.row_dimensions[start].height = 20
for r in range(start + 1, start + len(summary)):
    ws.row_dimensions[r].height = 78
# ハイライト推奨行
for r in (start + 2, start + 6):
    for c in range(1, 4):
        ws.cell(row=r, column=c).fill = HL_FILL

# ============================================================
# シート1: 募集機関一覧
# ============================================================
ws1 = wb.create_sheet("1_募集機関一覧")
ws1.sheet_view.showGridLines = False
ws1["A1"] = "委託員を募集している主要機関一覧（性能評価＋構造適判）"
ws1["A1"].font = TITLE_FONT
ws1["A2"] = "在宅可否：◎=公式に在宅明示／○=設計審査は実質在宅可／△=一部在宅・要交渉／×=出社/現場前提／- =記載なし要問合せ"
ws1["A2"].font = SUB_FONT

cols1 = ["#", "機関名", "募集職種", "完全在宅", "報酬・単価目安", "資格・経験要件", "取扱構造", "応募URL / 連絡先", "備考(出典・状況)"]
data1 = [
    cols1,
    ["1", "日本ERI", "住宅性能評価員(業務委託)", "◎",
     "件数払い(単価非公開)。設計評価図面審査は業界相場1〜2万円/件", "評価員講習修了+建築士。構造評価は構造一級が事実上必須級",
     "木/S/RC", "j-eri.co.jp/corporate/corp_recruit_outsrc.html",
     "公式に『PC上で設計性能評価、自宅・事務所で実施可・導入研修有』と明示。つくば/大阪/京都/長野で急募。最優先。"],
    ["2", "ビューローベリタスジャパン", "住宅性能評価員 業務委託(意匠/構造 設計図面評価)", "○",
     "件数払い。『副業として収入アップ可』と明記", "評価員講習修了/一級建築士。構造は構造一級歓迎",
     "木/S/RC", "bvjc.com/careers/recruit.html", "設計図面評価業務は実質在宅。現場検査は直行直帰。全国受入。構造設計一級と強くマッチ。"],
    ["3", "住宅あんしん保証", "住宅性能評価員(業務委託)", "△",
     "案件毎報酬(非公開)", "評価員講習修了。木造構造設計・審査経験者を優遇(RC/S造は要相談)",
     "木 中心(S/RC応相談)", "j-anshin.co.jp/company/recruit/seinouhyoka.php", "設計性能評価・長期優良・BELS審査は在宅PCの可能性大。RC/S対応可否は要確認。"],
    ["4", "JIO(日本住宅保証検査機構)", "委託検査員/評価員", "△",
     "出来高制。木造戸建 7,500〜12,000円/件[公式]。評価員(正)は月給20〜40万", "一級/二級建築士 or 建築基準適合判定資格者",
     "木/S/RC", "jio-kensa.co.jp/recruit/info/evaluation-judge.html", "委託検査は現場主体だが報告書作成は在宅。設計評価員枠は在宅運用余地。単価が業界唯一公開。"],
    ["5", "ハウスプラス確認検査", "委託検査員/構造審査/高層評定/省エネ評価", "△",
     "件数払い(非公開、面談調整)", "一級建築士。構造分野は構造一級歓迎",
     "木/S/RC", "houseplus.co.jp/hpj/recruit/partner.html", "一部リモート相談可の記載。構造審査業務あり。要問合せ。"],
    ["6", "東日本住宅評価センター", "委託評価員", "△",
     "募集要項参照(非公開)", "評価員講習修了/建築士",
     "木/S/RC", "e-hyoka.co.jp/outsourcing/", "委託募集を常時掲載。在宅可否は要確認。"],
    ["7", "国際確認検査センター(c-IAS)", "住宅性能評価員(業務委託)/構造審査担当", "○(性能評価)",
     "公募要項記載(非公開)", "一級建築士。構造一級・適判資格者優遇",
     "木/S/RC", "c-ias.jp/page0116.html", "性能評価の業務委託枠は在宅可。構造審査の正社員枠もあり。"],
    ["8", "ジェイ・イー・サポート(JES)", "住宅性能評価 現場検査 業務委託(契約社員)", "×",
     "件数払い(非公開)", "建築士+評価員講習修了",
     "木/S/RC", "jesupport.jp/recruit/index.html", "現場検査前提(直行直帰)。九州・沖縄・山口西部エリア。在宅希望には不向き。"],
    ["9", "ハウスジーメン", "瑕疵保険・性能評価・フラット35 現場検査員(業務委託)", "×",
     "件数払い(非公開)", "建築士。フルタイム不要・兼業可",
     "木/S/RC 戸建・共同・非住宅", "house-gmen.com/corporate/recruit/", "現場検査前提。兼業歓迎だが在宅は不可。"],
    ["10", "東京建築検査機構(TBTC)", "構造判定員・補助員/住宅性能評価員/BELS・CASBEE評価員", "△(要交渉)",
     "非公開。65歳以降は嘱託・週4日勤務可", "構造一級・適判資格者を優遇",
     "S/RC 大規模中心+木", "tokyo-btc.com/company/saiyoujyouhou", "RC/S大規模に強い。構造一級は最強カード。業務委託・在宅可否は直接問合せ推奨。"],
    ["11", "日本建築検査協会(JCIA)", "構造判定技術者(中途)", "-",
     "非公開", "一級建築士、構造一級・適判資格者",
     "S/RC", "jcia.co.jp/recruit/application-guidelines-mid-career/1021/", "構造判定技術者を常設募集。即戦力扱い。雇用前提・在宅明示なし。"],
    ["12", "グッド・アイズ建築検査機構", "確認/検査/性能評価の補助員(意匠/構造/設備/検査)", "-",
     "非公開", "建築士。構造審査担当ポジションあり",
     "木/S/RC", "good-eyes.co.jp / 03-3362-0475", "構造審査の補助員枠あり。業務委託・在宅条件は要問合せ。"],
    ["13", "確認サービス", "確認検査/性能評価/構造計算適合性判定 担当", "-",
     "非公開", "建築士。構造判定経験者歓迎",
     "木/S/RC", "kakunin-s.com/com/boshu/", "カジュアル面談から。在宅・委託・稼働時間は応相談。"],
    ["14", "UDI確認検査", "構造適合判定担当(中途)/検査補助員", "×",
     "月給40万円〜", "一級建築士、構造計算経験",
     "S/RC", "udi-co.jp/recruit/career_05/", "正社員前提。業務委託・在宅の公開なし。"],
    ["15", "日本建築センター(BCJ)", "構造判定部アルバイト(若干名)/確認検査員(構造)正規・嘱託", "×(原則出社)",
     "時給制(非公開)", "一級建築士・構造一級・適判資格者優遇",
     "S/RC 大規模", "bcj.or.jp/guidance/recruit/", "適判の最大手。アルバイト/嘱託枠で実績を積む受け皿。完全在宅は不可。"],
    ["16", "日本建築総合試験所(GBRC)", "確認検査課 審査職員(構造含む)", "△",
     "月給制(年収非公開)", "建築士歓迎、構造設計実務者歓迎",
     "S/RC", "gbrc.or.jp/adoption/", "dodaに『リモート勤務可・残業20-30h』の記載。ただし正社員中途。適判書類はBox共有で電子化済。"],
    ["17", "都道府県センター系(東京都防災まちづくり/神奈川県建築安全協会/大阪建築防災センター 等)", "確認検査員・性能評価員・構造審査(正規/嘱託)", "-",
     "神奈川:月26〜38万。他非公開", "一級建築士。構造一級は構造審査枠で優遇",
     "S/RC 中心", "各センター採用ページ(en-gage等)", "公的色の強い判定機関。出社前提が基本。公募が出れば外部判定員(非常勤)登録の可能性。"],
]
hr = 4
style_header(ws1, hr, len(cols1))
put_rows(ws1, hr, data1, [4, 22, 30, 9, 26, 30, 14, 34, 40])
ws1.row_dimensions[hr].height = 30
for r in range(hr + 1, hr + len(data1)):
    ws1.row_dimensions[r].height = 70
# 在宅◎○を緑、推奨上位(1,2,3,4行=ERI/BV/あんしん/JIO)を強調
zaitaku_col = 4
for i, row in enumerate(data1[1:], start=hr + 1):
    v = ws1.cell(row=i, column=zaitaku_col).value
    if v in ("◎", "○", "○(性能評価)"):
        ws1.cell(row=i, column=zaitaku_col).fill = GREEN_FILL
        ws1.cell(row=i, column=zaitaku_col).font = BOLD
# 最優先3社の機関名セルをハイライト
for i in (hr + 1, hr + 2, hr + 3):
    ws1.cell(row=i, column=2).fill = HL_FILL
    ws1.cell(row=i, column=2).font = BOLD

# ============================================================
# シート2: 収入シミュレーション
# ============================================================
ws2 = wb.create_sheet("2_収入シミュレーション")
ws2.sheet_view.showGridLines = False
ws2["A1"] = "収入シミュレーション（時間別・業務別）"
ws2["A1"].font = TITLE_FONT
ws2["A2"] = "源泉徴収10.21%は機関側で控除(個人受領時)。消費税は課税売上1,000万円超で課税事業者(インボイス登録は実務上ほぼ必須)。"
ws2["A2"].font = SUB_FONT

# 単価表
ws2["A4"] = "■ 業務別 単価・所要時間の目安"
ws2["A4"].font = BOLD
uc = ["業務種別", "構造種別", "委託員報酬/件", "所要時間/件", "区分", "出典・根拠"]
udata = [
    uc,
    ["住宅性能評価(設計) 図面・計算書審査", "木造戸建", "10,000〜20,000円", "1.5〜3h", "業界相場", "Yahoo!しごとカタログ等 口コミ"],
    ["住宅性能評価(設計) 図面・計算書審査", "S造/RC造 共同住宅", "20,000〜40,000円", "3〜6h", "推測", "戸数×単価+基本料。構造一級は高単価帯"],
    ["住宅性能評価(建設) 現場検査", "全構造", "数千〜10,000円/回", "半日(出向)", "業界相場", "完全在宅不可。木造は標準4回検査"],
    ["瑕疵保険 現場検査(JIO)", "木造戸建", "7,500〜12,000円", "半日(出向)", "公式", "JIO委託検査員 募集要項"],
    ["長期優良住宅 技術的審査", "木造戸建", "機関手数料55,000円の一部配分", "1〜2h", "公式(手数料)", "ハウスプラス55,000円/件(税込)"],
    ["フラット35 適合証明", "木造戸建", "機関手数料5〜10万の一部", "1〜2h", "業界相場", "日本ERI/JIO 料金規程"],
    ["BELS/省エネ適判(構造関連)", "戸建〜中規模", "—", "1〜3h", "参考", "戸建3〜8万/件の機関手数料"],
    ["構造計算適合性判定(適判)", "小規模S造", "約20,000円", "2〜4h", "推測(口コミ)", "機関手数料の15〜30%が判定員配分の業界慣行"],
    ["構造計算適合性判定(適判)", "中規模RC造", "30,000〜50,000円", "4〜8h", "推測(口コミ)", "同上。延床1,000㎡で手数料20〜25万"],
    ["構造計算適合性判定(適判)", "大規模・高難度", "80,000〜150,000円", "1〜3日", "推測(口コミ)", "完全在宅不可(集合判定)。中長期目標"],
    ["(参考)国交省 設計業務委託 技術者単価", "主任技師日額", "66,900円/日 ≒時給8,600円", "—", "公式", "令和7年3月適用。構造一級相当の公的目安"],
]
hr2 = 5
style_header(ws2, hr2, len(uc))
put_rows(ws2, hr2, udata, [34, 18, 22, 12, 12, 34])
ws2.row_dimensions[hr2].height = 28
for r in range(hr2 + 1, hr2 + len(udata)):
    ws2.row_dimensions[r].height = 32

# 月収レンジ表
base = hr2 + len(udata) + 2
ws2.cell(row=base, column=1, value="■ 月稼働時間別 収入レンジ（性能評価＋適判 混合想定）")
ws2.cell(row=base, column=1).font = BOLD
mc = ["月稼働", "件数目安", "月売上(額面)", "源泉後手取り", "中心シナリオ", "想定内訳"]
mdata = [
    mc,
    ["10時間", "4〜6件", "6〜18万円", "5.4〜16.2万円", "約8〜12万円", "性能評価の設計図面審査が主体"],
    ["20時間", "8〜12件", "12〜36万円", "10.8〜32.3万円", "約15〜25万円", "性能評価＋適判/長期優良の混合"],
    ["30時間", "12〜18件", "18〜54万円", "16.2〜48.5万円", "約25〜40万円", "適判・長期優良の比率を上げる"],
    ["60時間(本業化)", "24〜36件", "36〜120万円", "32.3〜107.8万円", "約50〜80万円", "高難度RC・S造適判中心+複数機関登録"],
]
hr3 = base + 1
style_header(ws2, hr3, len(mc))
put_rows(ws2, hr3, mdata, [16, 12, 16, 18, 16, 40])
ws2.row_dimensions[hr3].height = 28
for r in range(hr3 + 1, hr3 + len(mdata)):
    ws2.row_dimensions[r].height = 30
    for c in range(1, len(mc) + 1):
        ws2.cell(row=r, column=c).fill = GREY_FILL if (r - hr3) % 2 == 0 else PatternFill()

note = base + len(mdata) + 3
notes2 = [
    "【保守的試算】性能評価・現場検査中心(1件1万円換算)：月20hで月12〜15万円 / 年144〜180万円",
    "【強気試算】適判主体(1件3〜5万円換算)：月30hで月36〜54万円 / 年430〜650万円",
    "構造一級＋適判登録は希少資格で機関からの引合いが多く、月10〜30hでも年+100〜400万円が射程圏内(複数副業ブログ・struct-lab実例レンジ)。",
    "源泉:建築士業務は所得税法204条で10.21%(100万円超部分20.42%)。確定申告で精算。副業所得20万円超は申告必須。",
]
for i, t in enumerate(notes2):
    cell = ws2.cell(row=note + i, column=1, value=t)
    cell.font = CELL_FONT
    ws2.merge_cells(start_row=note + i, start_column=1, end_row=note + i, end_column=6)

# ============================================================
# シート3: 始め方・実務メモ
# ============================================================
ws3 = wb.create_sheet("3_始め方と実務")
ws3.sheet_view.showGridLines = False
ws3["A1"] = "始め方ガイド・資格・契約・在宅実務"
ws3["A1"].font = TITLE_FONT

sc = ["項目", "内容", "出典・根拠"]
sdata = [
    sc,
    ["最短ルート(性能評価員)",
     "①本業の就業規則で副業可否確認 → ②住宅性能評価員講習(品確法13条の法定講習・約4日/約10万円/日建学院等)受講・修了考査合格 → ③開業届(任意) → ④評価機関の業務委託に応募・修了証提示・契約 → ⑤設計性能評価案件を在宅受託開始。講習修了から即受託可。",
     "国交省品確法/日建学院 評価員講習/CHORD"],
    ["住宅性能評価員講習",
     "受講要件は一級/二級/木造建築士 or 建築基準適合判定資格者。構造一級は当然受講可。約4日間+修了考査。受講料≒98,800円(税込)。年複数回・主要都市開催。H18で旧登録制度は廃止、現在は『修了証＋機関の選任』で業務可(大臣登録不要)。",
     "日建学院/CHORD(評価員ページ)"],
    ["適判員の資格(別物・注意)",
     "構造設計一級建築士＝適判員ではない。別途【構造計算適合判定資格者検定】(考査A択一+考査B記述、年1回程度)に合格し大臣登録が必要。免除なし。受験資格は一級+実務5年で構造一級なら通常クリア。合格後は各機関の判定員名簿に登録。3年ごと定期講習。",
     "国交省 適判検定案内/防災協会"],
    ["契約形態(副業最適=業務委託)",
     "業務委託:雇用関係なし・社保自己負担・事業所得・最も柔軟(◎)。嘱託:有期雇用・社保加入要・給与所得(△二重加入)。アルバイト:給与所得(△)。大手評価機関はほぼ全社が業務委託枠を常時募集。",
     "日本ERI/JIO/東日本評価/あんしん保証 各募集要項"],
    ["開業届・事務所登録",
     "年20万円超見込なら開業届を1ヶ月以内に提出(建前)。評価員業務“単独”なら建築士事務所登録は不要。ただし副業で設計・工事監理を受託するなら事務所登録要(管理建築士の専任要件が本業所属と抵触しうる)。",
     "スモビバ/東京都建築士事務所協会"],
    ["在宅実務のネック",
     "設計性能評価=書面審査でほぼ在宅可。建設性能評価=現場検査(基礎配筋・躯体・防水・完了 最大4回)は出向必須→在宅希望者は“設計評価”に絞る。適判は集合判定が建付けで完全在宅不可。図書授受はBCJ=DirectCloud/GBRC=Box/大阪=NICEで電子化進む。評価書は機関代表者印で発行のため個人押印不要。",
     "BCJ/GBRC電子申請/建築基準法18条の2"],
    ["セキュリティ",
     "大手はVPN/専用PC支給or指定クラウドが標準。中小は自前PC+NDA運用も。守秘義務違反は機関の登録取消リスクのため厳格。",
     "業界一般(推測)"],
    ["利益相反の禁止(重要)",
     "品確法体系(平成18年告示304号)で、評価員が設計・監理に関与した物件の評価業務への従事は禁止。委託契約に『自身が関与した案件は審査担当から除外』の自己申告条項が入る。本業がゼネコン/組織事務所なら自社受注物件への関与は事前許可必須。",
     "国交省品確法/告示304号"],
    ["木造を学ぶ意味とリソース",
     "国内の性能評価・構造審査は木造が最大ボリューム(新築の大半が戸建木造)。RC/S得意でも木造(軸組・許容応力度・品確法構造)を覚えると案件枠が大きく広がる。HOWTEC『入門 木造の許容応力度計算』、日経BP『木造住宅の許容応力度計算 初級編』、BCJ講習(各2〜6万円台)、無料の『学ぼう!ホームズ君』。1〜2案件で受講費回収可。",
     "HOWTEC/日経BP/BCJ/ホームズ君"],
]
hr4 = 3
style_header(ws3, hr4, len(sc))
put_rows(ws3, hr4, sdata, [22, 88, 30])
ws3.row_dimensions[hr4].height = 26
for r in range(hr4 + 1, hr4 + len(sdata)):
    ws3.row_dimensions[r].height = 90

# ============================================================
# シート4: 市況・需要動向
# ============================================================
ws4 = wb.create_sheet("4_市況と需要動向")
ws4.sheet_view.showGridLines = False
ws4["A1"] = "市況・需要動向（2025〜2026）"
ws4["A1"].font = TITLE_FONT

mc4 = ["テーマ", "ポイント", "数値・出典"]
mdata4 = [
    mc4,
    ["4号特例の縮小(2025年4月)",
     "改正建築基準法で木造2階建て・延床200㎡超の平屋が『新2号』に。確認申請時の構造・省エネ図書提出が義務化、従来省略できた構造審査が原則審査対象に。構造計算が必要な延床基準も500㎡超→300㎡超に縮小し適判対象が急増。審査滞留・着工遅延が課題=判定人材需要増。",
     "国交省/ビューローベリタス/サクミル/CFL"],
    ["性能評価の交付件数",
     "2024年度の設計住宅性能評価は279,010戸(前年比+6.3%)で9年連続増。新設着工に占める取得割合34.2%(過去最高)=新築の約3戸に1戸。木造比率が高く、設計評価>建設評価で推移。",
     "住宅産業新聞/住宅性能評価・表示協会 統計"],
    ["構造設計一級の需給",
     "構造設計一級建築士は累計約11,069人(2022年1月)・毎年合格率約30%。一級建築士総数約38万人に対し極小。日経クロステックは『構造1級・設備1級は引く手あまたのレア資格』と評価。2025年法改正で不足感が一層顕在化。",
     "JSCA/STUDYing/日経クロステック"],
    ["在宅・委託のトレンド",
     "コロナ後、図書ベースの審査はリモート・在宅判定が定着。ERI/東日本評価/JIO/ビューロー/あんしん保証等が評価員・適判員の業務委託を常時掲載。JIOは月給20〜40万・職務経験不問の正社員採用も。1件数万円〜の在宅副業環境が整備。",
     "各機関募集要項/シニアジョブ/クラウドワークス"],
    ["長期優良・ZEH・省エネの波及",
     "2022年法改正で性能評価機関が長期使用構造等の確認を一元化、長期優良案件が機関ワークフローに集約。新築戸建の約4割が長期優良化。等級7/8新設+耐震等級審査が連動し構造作業増。2025年4月の省エネ適判全面義務化で断熱・設備の重量増→構造側の波及需要も拡大。",
     "住宅性能評価・表示協会/いえーる/環境省エネ計算センター"],
    ["木造学習の費用対効果",
     "案件量は木造が最大。HOWTEC/日経BP/BCJの数万円講座1〜2本で品確法構造・許容応力度設計まで実務適用可。1〜2案件で投資回収。長期優良・ZEH連動の品確法構造案件は10年単位で増勢見通し=投資対効果良好。",
     "HOWTEC/日経BP/BCJ"],
    ["総合市況評価",
     "明確に売り手市場。構造一級は希少で、適判・性能評価・長期優良・省エネ判定が同時拡大。機関は委託・嘱託で人員確保に走る。RC/S寄りでも木造を覚えれば最大ボリュームを取り込め、副業需要は構造的に強含み。",
     "上記総合"],
]
hr5 = 3
style_header(ws4, hr5, len(mc4))
put_rows(ws4, hr5, mdata4, [24, 90, 30])
ws4.row_dimensions[hr5].height = 26
for r in range(hr5 + 1, hr5 + len(mdata4)):
    ws4.row_dimensions[r].height = 95
# 最終行(総合評価)を強調
for c in range(1, 4):
    ws4.cell(row=hr5 + len(mdata4) - 1, column=c).fill = HL_FILL

# ============================================================
# シート5: 出典一覧
# ============================================================
ws5 = wb.create_sheet("5_出典リンク")
ws5.sheet_view.showGridLines = False
ws5["A1"] = "主な出典URL"
ws5["A1"].font = TITLE_FONT
sc5 = ["カテゴリ", "名称", "URL"]
links = [
    sc5,
    ["募集", "日本ERI 業務委託", "https://www.j-eri.co.jp/corporate/corp_recruit_outsrc.html"],
    ["募集", "ビューローベリタス 採用", "https://www.bvjc.com/careers/recruit.html"],
    ["募集", "住宅あんしん保証 性能評価員業務委託", "https://www.j-anshin.co.jp/company/recruit/seinouhyoka.php"],
    ["募集", "JIO 委託検査員(単価公開)", "https://www.jio-kensa.co.jp/recruit/info/commissioned-inspector.html"],
    ["募集", "JIO 評価員", "https://www.jio-kensa.co.jp/recruit/info/evaluation-judge.html"],
    ["募集", "ハウスプラス 委託検査員", "https://www.houseplus.co.jp/hpj/recruit/partner.html"],
    ["募集", "東日本住宅評価センター 委託", "https://www.e-hyoka.co.jp/outsourcing/"],
    ["募集", "国際確認検査センター 求人", "https://www.c-ias.jp/page0116.html"],
    ["募集", "東京建築検査機構 採用", "https://www.tokyo-btc.com/company/saiyoujyouhou"],
    ["募集", "日本建築検査協会 構造判定技術者", "https://jcia.co.jp/recruit/application-guidelines-mid-career/1021/"],
    ["募集(適判)", "BCJ 採用一覧", "https://www.bcj.or.jp/guidance/recruit/"],
    ["募集(適判)", "BCJ 構造判定部アルバイト", "https://www.bcj.or.jp/form/soumu02job10/"],
    ["募集(適判)", "GBRC 採用情報", "https://www.gbrc.or.jp/adoption/"],
    ["募集(適判)", "大阪建築防災センター 採用", "https://en-gage.net/okbc_saiyo/"],
    ["募集(適判)", "神奈川県建築安全協会 職員募集", "https://kkak.jp/pages/358/"],
    ["資格・講習", "日建学院 住宅性能評価員講習", "https://www.nik-g.com/lessonlist/hyoukain/"],
    ["資格・講習", "国交省 構造計算適合判定資格者検定", "https://www.mlit.go.jp/jutakukentiku/build/jutakukentiku_house_fr_000075.html"],
    ["資格・講習", "CHORD 評価員", "https://www.chord.or.jp/course/evaluator/index.html"],
    ["資格・講習", "HOWTEC 木造許容応力度計算 講習", "https://www.howtec.or.jp/publics/index/1/detail=1/b_id=738/r_id=0/"],
    ["資格・講習", "学ぼう!ホームズ君(無料)", "https://manabou.homeskun.com/kouzou/kanren/hinkaku-hikaku/"],
    ["手数料", "日本ERI 新築住宅性能評価 手数料", "https://www.j-eri.co.jp/gyoumu/jutakuseinohyoka/tesuryo_shinchikujutaku.html"],
    ["手数料", "JIO 性能評価料金", "https://www.jio-kensa.co.jp/inspection/performance/performance03_0926.html"],
    ["手数料", "BCJ 評価評定手数料", "https://www.bcj.or.jp/rating/charge/"],
    ["手数料", "GBRC 構造適判手数料PDF", "https://www.gbrc.or.jp/assets/documents/center/judgment/jud_doc13.pdf"],
    ["手数料", "ハウスプラス 長期優良(55,000円)", "https://www.houseplus.co.jp/hpj/service/chouki_yuryou/index.html"],
    ["単価/市況", "国交省 R7設計業務委託 技術者単価", "https://www.mlit.go.jp/report/press/kanbo08_hh_001176.html"],
    ["単価/市況", "struct-lab 構造副業", "https://struct-lab.jp/sidejob/"],
    ["市況", "日経クロステック 構造1級レア資格", "https://xtech.nikkei.com/atcl/nxt/column/18/02070/051700014/"],
    ["市況", "住宅産業新聞 24年度性能表示28万戸", "https://www.housenews.jp/research/32205"],
    ["市況", "住宅性能評価・表示協会 統計", "https://www.hyoukakyoukai.or.jp/download/stat/seino_shintiku.html"],
    ["税務", "国税庁 No.2792 源泉対象", "https://www.nta.go.jp/taxes/shiraberu/taxanswer/gensen/2792_qa.htm"],
]
hr6 = 3
style_header(ws5, hr6, 3)
put_rows(ws5, hr6, links, [14, 42, 80])
ws5.row_dimensions[hr6].height = 24
for r in range(hr6 + 1, hr6 + len(links)):
    ws5.row_dimensions[r].height = 18
    url = ws5.cell(row=r, column=3).value
    if url and url.startswith("http"):
        ws5.cell(row=r, column=3).hyperlink = url
        ws5.cell(row=r, column=3).font = Font(name="Meiryo", size=10, color="0563C1", underline="single")

# 全シート A1 freeze + タブカラー
for s, color in [(ws, "1F4E78"), (ws1, "C00000"), (ws2, "548235"), (ws3, "BF8F00"), (ws4, "7030A0"), (ws5, "808080")]:
    s.sheet_properties.tabColor = color

out = "/home/user/-/住宅性能評価_副業委託_調査まとめ.xlsx"
wb.save(out)
print("SAVED:", out)
print("Sheets:", wb.sheetnames)
