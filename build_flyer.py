# -*- coding: utf-8 -*-
"""
ナガシマスパーランド ジャンボ海水プール お誘いチラシ（ポケモン風デザイン）
PIL で A4 縦のチラシ画像 / PDF を生成する。
"""
import os, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter

BASE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(BASE, "assets")

# ---- 解像度 (A4 縦 @200dpi を 2x スーパーサンプリング) ----
SS = 2
FW, FH = 1654, 2339          # 最終
W, H = FW * SS, FH * SS       # 作業用

# ---- カラーパレット (ポケモン / でんきタイプ風) ----
YELLOW   = (255, 203, 5)      # ピカチュウイエロー
YELLOW_D = (245, 170, 0)
RED      = (238, 21, 21)      # モンスターボール赤
BLUE     = (49, 110, 200)     # ポケモンブルー
BLUE_D   = (24, 60, 130)
NAVY     = (20, 38, 80)       # 文字濃紺
SKY1     = (208, 240, 255)
SKY2     = (255, 252, 235)
WHITE    = (255, 255, 255)
INK      = (40, 46, 70)
CHEEK    = (232, 65, 42)

def F(weight, size):
    f = {
        "black": "MPLUSRounded-Black.ttf",
        "ebold": "MPLUSRounded-ExtraBold.ttf",
        "bold":  "MPLUSRounded-Bold.ttf",
        "med":   "MPLUSRounded-Medium.ttf",
    }[weight]
    return ImageFont.truetype(os.path.join(ASSETS, f), int(size * SS))

# ====================================================================
# 背景
# ====================================================================
img = Image.new("RGB", (W, H), WHITE)
px = img.load()
for y in range(H):
    t = y / H
    r = int(SKY1[0] + (SKY2[0]-SKY1[0])*t)
    g = int(SKY1[1] + (SKY2[1]-SKY1[1])*t)
    b = int(SKY1[2] + (SKY2[2]-SKY1[2])*t)
    for x in range(W):
        px[x, y] = (r, g, b)
draw = ImageDraw.Draw(img, "RGBA")

# --------------------------------------------------------------------
# 部品: モンスターボール (回転対応タイル)
# --------------------------------------------------------------------
def make_pokeball(d, angle=0, alpha=255, flat=False):
    s = d * 3
    tile = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    dr = ImageDraw.Draw(tile)
    cx = cy = s // 2
    r = d * 3 // 2 - 6
    line = max(4, r // 9)
    red = RED if not flat else (255, 120, 120)
    # 下半分 白
    dr.ellipse([cx-r, cy-r, cx+r, cy+r], fill=(255,255,255,alpha))
    # 上半分 赤
    dr.pieslice([cx-r, cy-r, cx+r, cy+r], 180, 360, fill=red+(alpha,))
    # 外枠
    dr.ellipse([cx-r, cy-r, cx+r, cy+r], outline=(25,25,40,alpha), width=line)
    # 中央バンド
    dr.rectangle([cx-r, cy-line, cx+r, cy+line], fill=(25,25,40,alpha))
    # 中央ボタン
    br = r // 3
    dr.ellipse([cx-br, cy-br, cx+br, cy+br], fill=(25,25,40,alpha))
    dr.ellipse([cx-br+line, cy-br+line, cx+br-line, cy+br-line], fill=(255,255,255,alpha))
    bi = br // 2
    dr.ellipse([cx-bi, cy-bi, cx+bi, cy+bi], fill=(235,235,245,alpha), outline=(25,25,40,alpha), width=max(2,line//2))
    tile = tile.rotate(angle, resample=Image.BICUBIC, expand=False)
    tile = tile.resize((d, d), Image.LANCZOS)
    return tile

def paste_pokeball(cx, cy, d, angle=0, alpha=255, flat=False):
    t = make_pokeball(d, angle, alpha, flat)
    img.paste(t, (int(cx-d/2), int(cy-d/2)), t)

# --------------------------------------------------------------------
# 部品: いなずまマーク
# --------------------------------------------------------------------
def bolt(cx, cy, h, fill=YELLOW, outline=NAVY, ow=6):
    u = h / 10.0
    pts = [(0,-5),(-2.2,0.3),(-0.2,0.3),(-2.6,5),(3.0,-1.2),(0.4,-1.2),(2.4,-5)]
    poly = [(cx+x*u, cy+y*u) for x,y in pts]
    if outline:
        draw.polygon(poly, fill=fill, outline=outline, width=int(ow*SS/2))
    else:
        draw.polygon(poly, fill=fill)

def sparkle(cx, cy, r, fill=WHITE):
    pts = []
    for i in range(8):
        ang = math.pi/4*i
        rr = r if i % 2 == 0 else r*0.34
        pts.append((cx+math.cos(ang)*rr, cy+math.sin(ang)*rr))
    draw.polygon(pts, fill=fill)

# --------------------------------------------------------------------
# 部品: ピカチュウ風マスコット
# --------------------------------------------------------------------
def pikachu(hx, hy, R):
    DARK = (60, 42, 26)
    ow = max(3, int(R*0.05))
    halo = int(R*0.16)  # 白いステッカー縁
    tu = R/10.0
    tp = [(1.0,0.2),(2.6,-0.5),(2.1,0.4),(3.6,-0.2),(2.4,1.6),(2.9,1.0),(1.6,2.4)]
    tail = [(hx+x*tu*1.4, hy+y*tu*1.4) for x,y in tp]
    def ear_pts(sign):
        return [(hx+sign*0.10*R, hy-0.70*R),
                (hx+sign*0.55*R, hy-0.55*R),
                (hx+sign*1.05*R, hy-1.95*R)]
    # --- 白いステッカー縁 (背面) ---
    draw.polygon(tail, fill=WHITE, outline=WHITE, width=halo)
    for s in (-1, 1):
        draw.polygon(ear_pts(s), fill=WHITE, outline=WHITE, width=halo)
    draw.ellipse([hx-R-halo, hy-0.82*R-halo, hx+R+halo, hy+0.98*R+halo], fill=WHITE)
    # --- 本体 ---
    draw.polygon(tail, fill=YELLOW, outline=DARK, width=ow)
    def ear(sign):
        base1 = (hx+sign*0.10*R, hy-0.70*R)
        base2 = (hx+sign*0.55*R, hy-0.55*R)
        tip   = (hx+sign*1.05*R, hy-1.95*R)
        draw.polygon([base1, base2, tip], fill=YELLOW, outline=DARK, width=ow)
        # 黒い耳先
        mid1 = (base1[0]*0.45+tip[0]*0.55, base1[1]*0.45+tip[1]*0.55)
        mid2 = (base2[0]*0.45+tip[0]*0.55, base2[1]*0.45+tip[1]*0.55)
        draw.polygon([mid1, mid2, tip], fill=DARK)
    ear(-1); ear(1)
    # 顔
    draw.ellipse([hx-R, hy-0.82*R, hx+R, hy+0.98*R], fill=YELLOW, outline=DARK, width=ow)
    # ほっぺ
    cr = 0.30*R
    for s in (-1, 1):
        draw.ellipse([hx+s*0.66*R-cr, hy+0.20*R-cr, hx+s*0.66*R+cr, hy+0.20*R+cr], fill=CHEEK)
    # 目
    er = 0.20*R
    for s in (-1, 1):
        ex, ey = hx+s*0.40*R, hy-0.10*R
        draw.ellipse([ex-er, ey-er*1.15, ex+er, ey+er*1.15], fill=DARK)
        draw.ellipse([ex-er*0.30, ey-er*0.55, ex+er*0.30, ey+er*0.05], fill=WHITE)
    # 鼻
    draw.ellipse([hx-0.05*R, hy+0.10*R, hx+0.05*R, hy+0.18*R], fill=DARK)
    # 口 (にっこり)
    draw.arc([hx-0.34*R, hy+0.10*R, hx-0.0*R, hy+0.45*R], 10, 150, fill=DARK, width=ow)
    draw.arc([hx+0.0*R, hy+0.10*R, hx+0.34*R, hy+0.45*R], 30, 170, fill=DARK, width=ow)

# --------------------------------------------------------------------
# 部品: 角丸カード
# --------------------------------------------------------------------
def card(x0, y0, x1, y1, radius, fill=WHITE, border=None, bw=0, shadow=True):
    if shadow:
        sh = Image.new("RGBA", (W, H), (0,0,0,0))
        sd = ImageDraw.Draw(sh)
        off = 10*SS
        sd.rounded_rectangle([x0+off, y0+off, x1+off, y1+off], radius=radius,
                             fill=(20,40,80,70))
        sh = sh.filter(ImageFilter.GaussianBlur(8*SS))
        img.paste(sh, (0,0), sh)
    draw.rounded_rectangle([x0,y0,x1,y1], radius=radius, fill=fill,
                           outline=border, width=int(bw*SS) if border else 0)

# --------------------------------------------------------------------
# テキストヘルパ
# --------------------------------------------------------------------
def text_w(s, font):
    b = draw.textbbox((0,0), s, font=font)
    return b[2]-b[0]

def text_c(cx, y, s, font, fill, stroke=0, sfill=NAVY, anchor_mid=True):
    w = text_w(s, font)
    x = cx - w/2 if anchor_mid else cx
    draw.text((x, y), s, font=font, fill=fill,
              stroke_width=int(stroke*SS), stroke_fill=sfill)
    return w

def text_l(x, y, s, font, fill, stroke=0, sfill=NAVY):
    draw.text((x, y), s, font=font, fill=fill,
              stroke_width=int(stroke*SS), stroke_fill=sfill)

def text_pop(cx, y, s, font, fill=YELLOW, sfill=NAVY, stroke=8, shadow=(255,255,255)):
    # 影
    w = text_w(s, font)
    x = cx - w/2
    if shadow:
        draw.text((x+5*SS, y+6*SS), s, font=font, fill=(20,40,80,120),
                  stroke_width=int(stroke*SS), stroke_fill=(20,40,80,120))
    draw.text((x, y), s, font=font, fill=fill,
              stroke_width=int(stroke*SS), stroke_fill=sfill)
    return w

M = 95 * SS  # 余白

# ====================================================================
# 背景デコレーション (うすいモンスターボール)
# ====================================================================
for (cx, cy, d, a) in [(W-150, 470*SS, 230, 38), (140, 1180*SS, 200, 32),
                        (W-90, 1620*SS, 180, 30), (130, 2030*SS, 160, 34)]:
    paste_pokeball(cx, cy, d, angle=20, alpha=a, flat=True)

# ====================================================================
# 1) ヘッダー帯
# ====================================================================
hh = 212 * SS
draw.rectangle([0, 0, W, hh], fill=BLUE)
# 帯の下にギザギザ(いなずま風ボーダー)
zig = 28*SS
pts = [(0, hh)]
x = 0
up = True
while x < W:
    pts.append((x, hh - (zig if up else 0)))
    x += 40*SS
    up = not up
pts += [(W, hh), (W, hh-zig*2), (0, hh-zig*2)]
draw.polygon([(0,hh),(W,hh),(W,hh+zig*1.4)], fill=BLUE)
# 帯の縁(黄色ライン)
draw.rectangle([0, hh, W, hh+12*SS], fill=YELLOW)

paste_pokeball(85*SS, 78*SS, 110*SS, angle=15)
paste_pokeball(W-85*SS, 78*SS, 110*SS, angle=-25)
text_c(W/2, 30*SS, "☀ 夏休み わくわく特別企画 ☀", F("ebold", 28), WHITE)
text_c(W/2, 84*SS, "いっしょに プールへ いこう！", F("black", 56), YELLOW, stroke=3, sfill=NAVY)
text_c(W/2, 158*SS, "〜 GET だぜ！ 夏のおもいで 〜", F("bold", 24), WHITE)

# ====================================================================
# 2) ヒーロー (タイトル + プール写真 + ピカチュウ)
# ====================================================================
y = hh + 32*SS
text_pop(W/2, y, "ナガシマスパーランド", F("black", 52), fill=YELLOW, sfill=NAVY, stroke=8)
y += 80*SS
text_pop(W/2, y, "ジャンボ海水プール", F("black", 62), fill=RED, sfill=WHITE, stroke=8)
y += 100*SS

# プール写真 (角丸 + 枠)
pool = Image.open(os.path.join(ASSETS, "pool.jpg")).convert("RGB")
pw = W - 2*M
ph = int(pw * pool.height / pool.width)
ph = min(ph, 262*SS)
pw2 = int(ph * pool.width / pool.height)
pool = pool.resize((pw2, ph), Image.LANCZOS)
# センタークロップ to pw
if pw2 > pw:
    left = (pw2 - pw)//2
    pool = pool.crop((left, 0, left+pw, ph))
pwf = pool.width
mask = Image.new("L", pool.size, 0)
ImageDraw.Draw(mask).rounded_rectangle([0,0,pool.width,pool.height], radius=40*SS, fill=255)
px0 = (W - pwf)//2
# 枠(白)
card(px0-10*SS, y-10*SS, px0+pwf+10*SS, y+ph+10*SS, 48*SS, fill=WHITE, shadow=True)
img.paste(pool, (px0, y), mask)
draw.rounded_rectangle([px0, y, px0+pwf, y+ph], radius=40*SS, outline=BLUE, width=6*SS)
y += ph + 18*SS

# ====================================================================
# 3) キャッチコピー リボン
# ====================================================================
rb_h = 106*SS
card(M, y, W-M, y+rb_h, 30*SS, fill=YELLOW, border=NAVY, bw=4, shadow=True)
text_c(W/2, y+12*SS, "子どもだけで行こう！夏のおもいでをつくろう！", F("ebold", 31), NAVY)
text_c(W/2, y+58*SS, "（子ども４人 ＋ 引率者１人）", F("bold", 24), BLUE_D)
# ピカチュウを右下に飛び出し
pikachu(W-175*SS, y+6*SS, 74*SS)
sparkle(W-290*SS, y-26*SS, 20*SS, YELLOW)
sparkle(M+60*SS, y+18*SS, 16*SS, WHITE)
y += rb_h + 28*SS

# ====================================================================
# 4) 開催候補日 (チェック欄)
# ====================================================================
def section_head(y, label, color=RED):
    bh = 64*SS
    draw.rounded_rectangle([M, y, W-M, y+bh], radius=18*SS, fill=color)
    bolt(M+45*SS, y+bh/2, 50*SS, fill=YELLOW, outline=WHITE, ow=5)
    text_l(M+90*SS, y+10*SS, label, F("ebold", 33), WHITE)
    return y + bh + 18*SS

y = section_head(y, "【 開催候補日 】 行ける日を ぜんぶ えらんでね！")
# 説明
CARD_CD = 398*SS
card(M, y, W-M, y+CARD_CD, 28*SS, fill=WHITE, border=YELLOW, bw=5, shadow=True)
inner = y
text_c(W/2, y+18*SS, "参加できる日 ぜんぶに 〇 をつけて LINE で教えてね！", F("bold", 26), BLUE_D)
y += 72*SS
dates = [("7/21","火"),("7/22","水"),("7/23","木"),("7/24","金"),
         ("7/27","月"),("7/28","火"),("7/29","水"),("7/30","木"),("7/31","金"),
         ("8/3","月"),("8/4","火"),("8/5","水"),("8/6","木"),("8/7","金")]
cols = 5
gx0 = M + 40*SS
gx1 = W - M - 40*SS
cellw = (gx1 - gx0) / cols
cellh = 96*SS
for i, (dt, wd) in enumerate(dates):
    r = i // cols
    c = i % cols
    cx = gx0 + cellw*c + cellw/2
    cy = y + r*cellh
    box = 54*SS
    # チェックボックス
    draw.rounded_rectangle([cx-cellw/2+20*SS, cy, cx-cellw/2+20*SS+box, cy+box],
                           radius=12*SS, fill=WHITE, outline=BLUE, width=5*SS)
    # 日付
    weekend = wd in ("土","日")
    col = RED if weekend else NAVY
    tx = cx-cellw/2+20*SS+box+14*SS
    text_l(tx, cy-8*SS, dt, F("ebold", 27), col)
    text_l(tx, cy+32*SS, f"({wd})", F("bold", 18), BLUE_D)
y += 3*cellh + 10*SS
text_c(W/2, y, "※ 平日のみ・1日だけの開催です（みんなの都合で1日を決めます）", F("med", 20), INK)
y = inner + CARD_CD + 18*SS

# ====================================================================
# 5) 2カラム: タイムスケジュール / 参加費
# ====================================================================
colgap = 36*SS
cw = (W - 2*M - colgap)/2
lx0, lx1 = M, M+cw
rx0, rx1 = M+cw+colgap, W-M
col_top = y
col_h = 590*SS

# --- 左: タイムスケジュール ---
card(lx0, y, lx1, y+col_h, 26*SS, fill=WHITE, border=BLUE, bw=5, shadow=True)
draw.rounded_rectangle([lx0, y, lx1, y+60*SS], radius=26*SS, fill=BLUE)
draw.rectangle([lx0, y+34*SS, lx1, y+60*SS], fill=BLUE)
text_c((lx0+lx1)/2, y+10*SS, "タイムスケジュール", F("ebold", 30), WHITE)
sched = [("7:30〜7:45","ご自宅へお迎え"),
         ("8:30","ナガシマ着"),
         ("9:30〜12:00","プール(1h毎に休憩)"),
         ("12:00〜13:00","昼食"),
         ("13:00〜15:30","プール(1h毎に休憩)"),
         ("16:00","ナガシマ発"),
         ("16:30〜16:45","ご自宅へお送り")]
sy = y + 72*SS
for tm, what in sched:
    bolt(lx0+38*SS, sy+20*SS, 30*SS, fill=YELLOW, outline=NAVY, ow=4)
    text_l(lx0+68*SS, sy, tm, F("ebold", 23), BLUE_D)
    text_l(lx0+68*SS, sy+34*SS, what, F("med", 21), INK)
    sy += 70*SS

# --- 右: 参加費 ---
card(rx0, y, rx1, y+col_h, 26*SS, fill=WHITE, border=RED, bw=5, shadow=True)
draw.rounded_rectangle([rx0, y, rx1, y+60*SS], radius=26*SS, fill=RED)
draw.rectangle([rx0, y+34*SS, rx1, y+60*SS], fill=RED)
text_c((rx0+rx1)/2, y+10*SS, "参加費・もちもの", F("ebold", 30), WHITE)
ry = y + 74*SS
# 参加費 大
draw.rounded_rectangle([rx0+30*SS, ry, rx1-30*SS, ry+82*SS], radius=18*SS, fill=YELLOW)
text_c((rx0+rx1)/2, ry+6*SS, "参加費  4,200円 ※", F("black", 32), NAVY)
text_c((rx0+rx1)/2, ry+52*SS, "(昼食を持参なら もっとお得！)", F("bold", 18), BLUE_D)
ry += 98*SS
text_l(rx0+34*SS, ry, "▼ 内訳", F("ebold", 21), RED); ry += 36*SS
breakdown = ["・入園料 3,500円→1,200円(社割)",
             "・ライフジャケット 1,000円",
             "  (超激流プール利用時)",
             "・昼食等 2,000円 ※"]
for b in breakdown:
    text_l(rx0+34*SS, ry, b, F("med", 20), INK); ry += 33*SS
ry += 6*SS
text_l(rx0+34*SS, ry, "▼ 持ち物", F("ebold", 21), RED); ry += 36*SS
items = ["・水着 ・タオル ・浮き輪",
         "・日除けの帽子 ・水筒",
         "・飲み物 / おやつ / 昼食"]
for it in items:
    text_l(rx0+34*SS, ry, it, F("med", 20), INK); ry += 33*SS
text_l(rx0+34*SS, ry, "※クーラーBOXを持参します。", F("med", 17), INK); ry += 28*SS
text_l(rx0+34*SS, ry, "  ペットボトル・おにぎりOK！", F("med", 17), INK)

y = col_top + col_h + 20*SS

# ====================================================================
# 6) 連絡先 / 引率 / QR
# ====================================================================
foot_h = 286*SS
card(M, y, W-M, y+foot_h, 26*SS, fill=BLUE, shadow=True)
# QR
qr = Image.open(os.path.join(ASSETS, "line_qr.jpg")).convert("RGB")
qrs = 200*SS
qr = qr.resize((qrs, qrs), Image.NEAREST)
qx = W - M - qrs - 40*SS
qy = y + (foot_h-qrs)/2
draw.rounded_rectangle([qx-14*SS, qy-14*SS, qx+qrs+14*SS, qy+qrs+14*SS], radius=18*SS, fill=WHITE)
img.paste(qr, (int(qx), int(qy)))
text_c(qx+qrs/2, qy+qrs+18*SS, "LINEで参加日を送ってね", F("bold", 20), WHITE)

tx = M + 50*SS
ty = y + 32*SS
text_l(tx, ty, "お申し込み・お問い合わせ", F("ebold", 27), YELLOW); ty += 54*SS
text_l(tx, ty, "引率： 菅沼田 直人 （穂果の父）", F("bold", 27), WHITE); ty += 52*SS
text_l(tx, ty, "TEL： 080-3655-7796", F("ebold", 29), WHITE); ty += 54*SS
text_l(tx, ty, "当日はグループLINEを作って連絡します。", F("med", 21), (220,235,255)); ty += 36*SS
text_l(tx, ty, "参加できる日を右のQRからLINEしてね！", F("med", 21), (220,235,255))
y += foot_h + 18*SS

# ====================================================================
# 7) 注意書き
# ====================================================================
notes = [
 "※ スケジュールは仮のため、前後する可能性があります。",
 "※ 送迎の時間等、都合が悪い場合は遠慮なくご要望をお伝えください。",
]
for n in notes:
    text_c(W/2, y, n, F("med", 21), INK); y += 34*SS

# 飾り
paste_pokeball(70*SS, H-70*SS, 90*SS, angle=10)
paste_pokeball(W-70*SS, H-70*SS, 90*SS, angle=-15)

# ====================================================================
# 出力
# ====================================================================
print(f"content bottom y = {y}  page H = {H}  margin = {(H-y)/SS:.1f} final px")
final = img.resize((FW, FH), Image.LANCZOS)
final.save(os.path.join(BASE, "flyer.png"), "PNG")
final.convert("RGB").save(os.path.join(BASE, "flyer.pdf"), "PDF", resolution=200.0)
print("saved flyer.png / flyer.pdf", final.size)
