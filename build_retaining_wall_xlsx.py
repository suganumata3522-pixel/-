# -*- coding: utf-8 -*-
"""擁壁の設計 問題集（図つき）Excel 生成スクリプト。
出力: docs/retaining_wall/擁壁設計問題集.xlsx
1 種類と構造特性 / 2 土圧の選別 / 3 安定計算(滑動・転倒・支持力)
4 竪壁・底版の応力算定 / 5 必要鉄筋量・配筋 / 6 排水処理と水圧非考慮の規定
手計算での応力解析・断面算定を目標。数値は build 時に検算済み。
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

OUT = "docs/retaining_wall"
FIG = os.path.join(OUT, "figures")
os.makedirs(FIG, exist_ok=True)


def save(fig, name):
    p = os.path.join(FIG, name)
    fig.savefig(p, dpi=130, bbox_inches="tight")
    plt.close(fig)
    return p


# ===========================================================================
# 図 1: 擁壁の種類
# ===========================================================================
def fig_types():
    fig, axes = plt.subplots(1, 4, figsize=(14.5, 4.4))
    # (a) 重力式
    ax = axes[0]
    ax.add_patch(mpatches.Polygon([(0, 0), (2.4, 0), (1.7, 4.0), (1.1, 4.0)],
                                   closed=True, fc="#c9c9c9", ec="k", lw=1.2))
    ax.fill_between([1.7, 3.2], [0, 0], [4.0, 4.0], color="#e8d8b0",
                    alpha=0.6, zorder=0)
    ax.text(1.2, -0.6, "重力式\n（無筋・自重で抵抗）", fontproperties=jp,
            ha="center", fontsize=9, color="#444")
    ax.set_xlim(-0.5, 3.4); ax.set_ylim(-1.4, 4.6)
    # (b) L型
    ax = axes[1]
    ax.add_patch(mpatches.Rectangle((0, 0), 2.6, 0.5, fc="#bcd2ea",
                                     ec="k", lw=1.2))
    ax.add_patch(mpatches.Rectangle((0, 0.5), 0.45, 3.5, fc="#bcd2ea",
                                     ec="k", lw=1.2))
    ax.fill_between([0.45, 2.6], [0.5, 0.5], [4.0, 4.0], color="#e8d8b0",
                    alpha=0.6, zorder=0)
    ax.text(1.3, -0.6, "L 型（片持ち梁式）\n竪壁が前端", fontproperties=jp,
            ha="center", fontsize=9, color="#444")
    ax.set_xlim(-0.5, 3.0); ax.set_ylim(-1.4, 4.6)
    # (c) 逆T型
    ax = axes[2]
    ax.add_patch(mpatches.Rectangle((0, 0), 3.0, 0.5, fc="#bcd2ea",
                                     ec="k", lw=1.2))
    ax.add_patch(mpatches.Rectangle((1.0, 0.5), 0.45, 3.5, fc="#bcd2ea",
                                     ec="k", lw=1.2))
    ax.fill_between([1.45, 3.0], [0.5, 0.5], [4.0, 4.0], color="#e8d8b0",
                    alpha=0.6, zorder=0)
    ax.text(0.5, 0.9, "つま先版", fontproperties=jp, fontsize=7, color="#c00")
    ax.text(2.2, 0.9, "かかと版", fontproperties=jp, fontsize=7, color="#c00")
    ax.text(1.5, -0.6, "逆 T 型（片持ち梁式）\nつま先版＋かかと版",
            fontproperties=jp, ha="center", fontsize=9, color="#444")
    ax.set_xlim(-0.5, 3.4); ax.set_ylim(-1.4, 4.6)
    # (d) 控え壁式
    ax = axes[3]
    ax.add_patch(mpatches.Rectangle((0, 0), 3.0, 0.5, fc="#bcd2ea",
                                     ec="k", lw=1.2))
    ax.add_patch(mpatches.Rectangle((1.0, 0.5), 0.3, 3.5, fc="#bcd2ea",
                                     ec="k", lw=1.2))
    ax.add_patch(mpatches.Polygon([(1.3, 0.5), (1.3, 3.8), (2.3, 0.5)],
                                   closed=True, fc="#9ec6e8", ec="k", lw=1.0))
    ax.fill_between([1.3, 3.0], [0.5, 0.5], [4.0, 4.0], color="#e8d8b0",
                    alpha=0.4, zorder=0)
    ax.text(1.9, 2.0, "控え壁", fontproperties=jp, fontsize=7, color="#1f4e79")
    ax.text(1.5, -0.6, "控え壁式（バットレス）\n高い擁壁（6m 超）向き",
            fontproperties=jp, ha="center", fontsize=9, color="#444")
    ax.set_xlim(-0.5, 3.4); ax.set_ylim(-1.4, 4.6)
    for ax in axes:
        ax.set_aspect("equal"); ax.axis("off")
    fig.suptitle("図 1  擁壁の種類と構造特性",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig1_types.png")


# ===========================================================================
# 図 2: 土圧の選別（変位と土圧・仮想背面）
# ===========================================================================
def fig_earth_pressure():
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 5.0))
    # (a) 変位-土圧
    ax = axes[0]
    d = np.linspace(-1.2, 1.2, 400)
    K0, Ka, Kp = 0.5, 0.33, 3.0
    K = np.where(d >= 0, Ka + (K0 - Ka) * np.exp(-d / 0.05),
                 K0 + (Kp - K0) * (1 - np.exp(d / 0.45)))
    ax.plot(d, K, lw=2.2, color="#1f4e79")
    ax.axvline(0, color="gray", ls="--", lw=1)
    for y, t, c in [(K0, "静止 K0（動かない壁）", "#444"),
                    (Ka, "主働 Ka（前に倒れる壁）", "#c00000"),
                    (Kp, "受働 Kp（押し込む側）", "#1f7a1f")]:
        ax.axhline(y, color=c, ls=":", lw=1)
        ax.text(1.24, y, f" {t}", va="center", fontproperties=jp, color=c,
                fontsize=9)
    ax.set_xlabel("壁の変位（+ 前に倒れる ／ − 押し込む）", fontproperties=jp)
    ax.set_ylabel("土圧係数 K", fontproperties=jp)
    ax.set_xlim(-1.2, 2.4); ax.set_ylim(0, 3.3)
    ax.grid(alpha=0.25)
    ax.set_title("(a) 壁の変位と土圧 ── 擁壁の種類で使い分け",
                 fontproperties=jp, fontsize=11, fontweight="bold")

    # (b) 仮想背面法
    ax = axes[1]
    B, tw, tf, Bt, H = 3.2, 0.5, 0.5, 1.0, 5.0
    hw = H - tf
    ax.add_patch(mpatches.Rectangle((0, 0), B, tf, fc="#bcd2ea", ec="k",
                                     lw=1.0))
    ax.add_patch(mpatches.Rectangle((Bt, tf), tw, hw, fc="#bcd2ea", ec="k",
                                     lw=1.0))
    back = Bt + tw
    ax.fill_between([back, B], [tf, tf], [H, H], color="#e8d8b0",
                    alpha=0.6, zorder=0)
    # 仮想背面（かかと版後端の鉛直線）
    ax.plot([B, B], [0, H], color="#c00000", lw=2, ls="--")
    ax.text(B + 0.08, H / 2, "仮想背面\n（かかと後端の\n鉛直面）",
            fontproperties=jp, fontsize=8.5, color="#c00000", va="center")
    # 土圧三角形
    ax.fill([B, B + 1.0, B], [H, 0, 0], color="#c00000", alpha=0.2)
    ax.annotate("", xy=(B + 1.0, H / 3), xytext=(B, H / 3),
                arrowprops=dict(arrowstyle="<|-", color="#c00000", lw=2))
    ax.text(B + 1.05, H / 3, "Pa", fontproperties=jp, fontsize=10,
            color="#c00000")
    # かかと上の土がウェイトとして働く
    ax.annotate("この土は擁壁の\n重量として働く\n（安定に有利）",
                xy=((back + B) / 2, (tf + H) / 2), xytext=(0.2, H + 0.4),
                fontproperties=jp, fontsize=8.5, color="#1f7a1f",
                arrowprops=dict(arrowstyle="->", color="#1f7a1f"))
    ax.text(B / 2, -0.9,
            "片持ち梁式（L・逆T）は、かかと上の土ごと動くので\n"
            "『仮想背面』に主働土圧 Ka を作用させる（ランキン）",
            fontproperties=jp, ha="center", fontsize=9, color="#444")
    ax.set_xlim(-0.5, B + 2.2); ax.set_ylim(-1.6, H + 1.2)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(b) 仮想背面法（片持ち梁式擁壁）",
                 fontproperties=jp, fontsize=11, fontweight="bold")
    fig.suptitle("図 2  擁壁の種類に応じた土圧の選別",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig2_earth_pressure.png")


# ===========================================================================
# 図 3: 逆T型の安定計算（寸法・荷重・土圧）
# ===========================================================================
def fig_stability():
    fig, axes = plt.subplots(1, 2, figsize=(14, 6.0),
                              gridspec_kw={"width_ratios": [1.1, 1.0]})
    B, tw, tf, Bt, H, q = 3.2, 0.5, 0.5, 1.0, 5.0, 10.0
    hw = H - tf
    back = Bt + tw
    Hk = B - Bt - tw

    # (a) 寸法図
    ax = axes[0]
    ax.add_patch(mpatches.Rectangle((0, 0), B, tf, fc="#bcd2ea", ec="k",
                                     lw=1.2))
    ax.add_patch(mpatches.Rectangle((Bt, tf), tw, hw, fc="#bcd2ea", ec="k",
                                     lw=1.2))
    ax.fill_between([back, B], [tf, tf], [H, H], color="#e8d8b0",
                    alpha=0.6, zorder=0)
    # 上載
    for x in np.linspace(back + 0.1, B - 0.1, 5):
        ax.annotate("", xy=(x, H), xytext=(x, H + 0.5),
                    arrowprops=dict(arrowstyle="-|>", color="#1f7a1f", lw=1.2))
    ax.text((back + B) / 2, H + 0.65, "上載 q=10 kN/m²", fontproperties=jp,
            ha="center", fontsize=8.5, color="#1f7a1f")
    # 寸法
    def dim(x1, x2, y, txt, c="#1f4e79"):
        ax.annotate("", xy=(x1, y), xytext=(x2, y),
                    arrowprops=dict(arrowstyle="<|-|>", color=c, lw=1))
        ax.text((x1 + x2) / 2, y - 0.28, txt, fontproperties=jp,
                ha="center", fontsize=8, color=c)
    dim(0, B, -0.5, "B = 3.2 m")
    dim(0, Bt, -1.1, "つま先 1.0")
    dim(back, B, -1.1, "かかと 1.7")
    ax.annotate("", xy=(B + 0.4, 0), xytext=(B + 0.4, H),
                arrowprops=dict(arrowstyle="<|-|>", color="#1f4e79", lw=1))
    ax.text(B + 0.55, H / 2, "H = 5.0 m", fontproperties=jp, rotation=90,
            va="center", fontsize=8, color="#1f4e79")
    ax.text(Bt + tw / 2, tf + hw / 2, "竪壁\n0.5", fontproperties=jp,
            ha="center", va="center", fontsize=8)
    ax.text(B / 2, tf / 2, "底版 0.5", fontproperties=jp, ha="center",
            va="center", fontsize=8)
    ax.set_xlim(-0.6, B + 1.4); ax.set_ylim(-1.7, H + 1.2)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(a) 逆T型擁壁の寸法（Fc21・SD295 想定）",
                 fontproperties=jp, fontsize=11, fontweight="bold")

    # (b) 荷重図（鉛直重量と土圧、つま先まわり）
    ax = axes[1]
    ax.add_patch(mpatches.Rectangle((0, 0), B, tf, fc="#eee", ec="k", lw=1.0))
    ax.add_patch(mpatches.Rectangle((Bt, tf), tw, hw, fc="#eee", ec="k",
                                     lw=1.0))
    ax.plot([B, B], [0, H], color="#c00000", lw=1.5, ls="--")
    # 鉛直重量矢印
    for label, x, w in [("W1", Bt + tw / 2, "54"), ("W3", back + Hk / 2, "138")]:
        ax.annotate("", xy=(x, tf + 0.2), xytext=(x, tf + 1.2),
                    arrowprops=dict(arrowstyle="-|>", color="#1f4e79", lw=2))
        ax.text(x, tf + 1.35, f"{label}", fontproperties=jp, ha="center",
                fontsize=8, color="#1f4e79")
    # 土圧三角形
    ax.fill([B, B + 1.2, B], [H, 0, 0], color="#c00000", alpha=0.25)
    ax.annotate("", xy=(B + 1.2, H / 3), xytext=(B, H / 3),
                arrowprops=dict(arrowstyle="<|-", color="#c00000", lw=2.5))
    ax.text(B + 0.5, H / 3 + 0.3, "Pa=91.7 kN", fontproperties=jp,
            fontsize=9, color="#c00000")
    # つま先（回転中心）
    ax.plot(0, 0, "o", color="k", ms=8, zorder=6)
    ax.text(-0.15, -0.55, "つま先 O\n（転倒の回転中心）", fontproperties=jp,
            ha="center", fontsize=8, color="#444")
    ax.text(B / 2, -1.6,
            "つま先 O まわりで\n抵抗M（鉛直重量）と 転倒M（土圧）を比較",
            fontproperties=jp, ha="center", fontsize=9, color="#1f4e79")
    ax.set_xlim(-0.8, B + 2.0); ax.set_ylim(-2.1, H + 1.0)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(b) 安定計算の荷重（滑動・転倒・支持力）",
                 fontproperties=jp, fontsize=11, fontweight="bold")
    fig.suptitle("図 3  逆T型擁壁の安定計算",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig3_stability.png")


# ===========================================================================
# 図 4: 竪壁・底版の応力（片持ち梁モデル）
# ===========================================================================
def fig_member():
    fig, axes = plt.subplots(1, 3, figsize=(15, 5.2))
    # (a) 竪壁＝片持ち梁
    ax = axes[0]
    hw = 4.5
    ax.add_patch(mpatches.Rectangle((0, 0), 0.5, hw, fc="#bcd2ea", ec="k",
                                     lw=1.2))
    ax.add_patch(mpatches.Rectangle((-1.2, -0.5), 2.5, 0.5, fc="#c9c9c9",
                                     ec="k", lw=1.0))
    # 三角形土圧（左向き、下ほど大）
    for i, yy in enumerate(np.linspace(0.2, hw - 0.2, 8)):
        ln = 0.3 + 1.3 * (1 - yy / hw)
        ax.annotate("", xy=(0, yy), xytext=(ln, yy),
                    arrowprops=dict(arrowstyle="-|>", color="#c00000",
                                    lw=1.2))
    ax.text(1.7, hw / 2, "土圧\n（三角形＋\n上載矩形）", fontproperties=jp,
            fontsize=8.5, color="#c00000", va="center")
    ax.annotate("付け根（固定端）\nM=124.9 kN·m/m", xy=(0.25, 0.1),
                xytext=(0.9, -1.3), fontproperties=jp, fontsize=8.5,
                color="#1f4e79",
                arrowprops=dict(arrowstyle="->", color="#1f4e79"))
    ax.set_xlim(-1.4, 3.0); ax.set_ylim(-1.8, hw + 0.5)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(a) 竪壁＝縦向き片持ち梁", fontproperties=jp,
                 fontsize=11, fontweight="bold")

    # (b) 竪壁のモーメント図
    ax = axes[1]
    y = np.linspace(0, hw, 100)
    # M(z) = Ka*gamma*z^3/6 + Ka*q*z^2/2 (z=天端からの深さ)
    Ka, g, q = 0.333, 18, 10
    z = hw - y
    M = Ka * g * z**3 / 6 + Ka * q * z**2 / 2
    ax.plot(M, y, color="#c00000", lw=2)
    ax.fill_betweenx(y, 0, M, color="#c00000", alpha=0.15)
    ax.plot([0, 0], [0, hw], color="k", lw=1)
    ax.text(M.max() * 0.5, 0.3, f"最大 {M.max():.0f}\nkN·m/m（付け根）",
            fontproperties=jp, fontsize=8.5, color="#c00000")
    ax.set_xlabel("曲げモーメント (kN·m/m)", fontproperties=jp)
    ax.set_ylabel("天端からの高さ (m)", fontproperties=jp)
    ax.set_title("(b) 竪壁の曲げモーメント分布", fontproperties=jp,
                 fontsize=11, fontweight="bold")
    ax.grid(alpha=0.25)

    # (c) 底版＝片持ち梁（つま先・かかと）
    ax = axes[2]
    B, Bt, tw, tf = 3.2, 1.0, 0.5, 0.5
    back = Bt + tw
    ax.add_patch(mpatches.Rectangle((0, 0), B, tf, fc="#bcd2ea", ec="k",
                                     lw=1.2))
    ax.add_patch(mpatches.Rectangle((Bt, tf), tw, 1.2, fc="#c9c9c9", ec="k",
                                     lw=1.0))
    # 上向き接地圧（つま先側大）
    for i, xx in enumerate(np.linspace(0.1, Bt - 0.05, 4)):
        ln = 0.9 * (1 - xx / B) + 0.3
        ax.annotate("", xy=(xx, 0), xytext=(xx, -ln),
                    arrowprops=dict(arrowstyle="-|>", color="#1f7a1f",
                                    lw=1.2))
    ax.text(Bt / 2, -1.3, "つま先版\n接地圧↑\nM=46.6", fontproperties=jp,
            ha="center", fontsize=7.5, color="#1f7a1f")
    # かかと側：下向き土＋自重
    for xx in np.linspace(back + 0.1, B - 0.1, 4):
        ax.annotate("", xy=(xx, tf), xytext=(xx, tf + 0.9),
                    arrowprops=dict(arrowstyle="-|>", color="#c00000",
                                    lw=1.2))
    ax.text((back + B) / 2, tf + 1.15, "かかと版\n土荷重↓\nM=64.9",
            fontproperties=jp, ha="center", fontsize=7.5, color="#c00000")
    ax.set_xlim(-0.4, B + 0.4); ax.set_ylim(-2.0, tf + 1.6)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("(c) 底版＝横向き片持ち梁", fontproperties=jp,
                 fontsize=11, fontweight="bold")
    fig.suptitle("図 4  竪壁・底版の応力算定（片持ち梁モデル）",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "fig4_member.png")


# ===========================================================================
# 図 6: 排水処理
# ===========================================================================
def fig_drainage():
    fig, ax = plt.subplots(figsize=(9.5, 5.6))
    B, tw, tf, Bt, H = 3.2, 0.5, 0.5, 1.0, 5.0
    hw = H - tf
    back = Bt + tw
    ax.add_patch(mpatches.Rectangle((0, 0), B, tf, fc="#bcd2ea", ec="k",
                                     lw=1.2))
    ax.add_patch(mpatches.Rectangle((Bt, tf), tw, hw, fc="#bcd2ea", ec="k",
                                     lw=1.2))
    ax.fill_between([back, B + 1.5], [tf, tf], [H, H], color="#e8d8b0",
                    alpha=0.6, zorder=0)
    # 裏込め砕石（竪壁背面）
    ax.add_patch(mpatches.Rectangle((back, tf), 0.35, hw, fc="#9ec6e8",
                                     ec="#1f4e79", lw=0.8, hatch="oo",
                                     alpha=0.8, zorder=2))
    ax.text(back + 0.55, H - 0.5, "裏込め\n砕石\n（透水層）", fontproperties=jp,
            fontsize=8, color="#1f4e79")
    # 水抜き穴（φ75@内法面積3m2に1箇所 等）
    for yy in [tf + 0.4, tf + 1.8, tf + 3.2]:
        ax.annotate("", xy=(-0.5, yy), xytext=(back, yy),
                    arrowprops=dict(arrowstyle="-|>", color="#2a78d6",
                                    lw=1.5))
        ax.add_patch(plt.Circle((0.1, yy), 0.08, fc="white", ec="#2a78d6",
                                 lw=1.2, zorder=5))
    ax.text(-1.4, tf + 1.8, "水抜き穴\nφ75 以上\n3 m² に 1 個\n以上",
            fontproperties=jp, fontsize=8, color="#2a78d6", va="center")
    # 底版排水管
    ax.add_patch(plt.Circle((back + 0.15, tf + 0.15), 0.12, fc="white",
                             ec="#1f7a1f", lw=1.2, zorder=5))
    ax.text(back + 0.4, tf + 0.15, "暗渠管（底部集水）", fontproperties=jp,
            fontsize=7.5, color="#1f7a1f", va="center")
    ax.text(B / 2, -1.0,
            "背面排水（透水層＋水抜き）で地下水位を上げない\n"
            "→ 水圧を非考慮にでき、土圧のみで設計できる",
            fontproperties=jp, ha="center", fontsize=9.5, color="#c00000")
    ax.set_xlim(-2.2, B + 2.0); ax.set_ylim(-1.8, H + 0.8)
    ax.set_aspect("equal"); ax.axis("off")
    ax.set_title("図 6  排水処理と水圧の非考慮",
                 fontproperties=jp, fontsize=12, fontweight="bold")
    return save(fig, "fig6_drainage.png")


figs = {
    "types": fig_types(),
    "ep": fig_earth_pressure(),
    "stab": fig_stability(),
    "member": fig_member(),
    "drain": fig_drainage(),
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
title_row(ws, 1, "擁壁の設計 問題集（構造設計部・新人向け）", span=4)
body(ws, 2,
     "RC 擁壁の応力解析・断面算定を手計算できることを目標とする。種類の理解から、"
     "土圧の選別、安定計算（滑動・転倒・支持力）、竪壁・底版の応力と配筋、排水規定までを"
     "1 つの逆T型モデル（H=5m）で一貫して解く。宅地造成・道路土工の擁壁を想定。",
     span=4, h=44)
r = table(ws, 4,
          ["No.", "シート", "到達目標", "図"],
          [["1", "1 種類と特性", "擁壁の種類と構造特性を理解している", "種類4種"],
           ["2", "2 土圧の選別", "種類に応じた土圧を選別できる", "変位-土圧・仮想背面"],
           ["3", "3 安定計算", "滑動・転倒・支持力の計算ができる", "安定計算図"],
           ["4", "4 竪壁・底版応力", "竪壁・底版の応力を算定できる", "片持ち梁モデル"],
           ["5", "5 必要鉄筋・配筋", "必要鉄筋量・配筋計画ができる", "（4 の続き）"],
           ["6", "6 排水と水圧非考慮", "水圧非考慮の排水規定を理解している", "排水処理"]])
body(ws, r + 2,
     "共通モデル：逆T型、全高 H=5.0m、底版幅 B=3.2m（つま先 1.0＋竪壁 0.5＋かかと 1.7）、"
     "底版厚 0.5m、竪壁厚 0.5m。裏込め γ=18 kN/m³・φ=30°（Ka=0.333）、上載 q=10 kN/m²、"
     "底面摩擦係数 μ=0.6、許容支持力 qa=200 kN/m²、Fc21・SD295。水圧は排水良好で非考慮。",
     span=4, h=58)

# ---- 1 種類と特性 ----
ws = wb.create_sheet("1 種類と特性")
setup(ws, [8, 18, 20, 16, 12, 12])
title_row(ws, 1, "1  擁壁の種類と構造特性")
head(ws, 3, "■ 図 1  擁壁の種類")
put_img(ws, figs["types"], "A4", w=820)
head(ws, 26, "■ 問題 1  種類と特性の対応")
r = table(ws, 27,
          ["種類", "抵抗の仕組み（記入）", "適用高さの目安（記入）", "配筋（記入）"],
          [["重力式", "", "", ""],
           ["もたれ式", "", "", ""],
           ["L 型（片持ち梁式）", "", "", ""],
           ["逆 T 型（片持ち梁式）", "", "", ""],
           ["控え壁式", "", "", ""]])
body(ws, r + 2, "選択肢（抵抗）：自重で抵抗／自重＋背面土の重量／竪壁・底版の曲げ抵抗。"
                "選択肢（高さ）：〜2m／〜3m／3〜6m／6m 超。", h=32)
head(ws, r + 4, "■ 問題 2  逆T型の各部名称")
body(ws, r + 5, "逆T型擁壁の次の部位の名称と役割を答えよ："
                "(1) 竪壁 (2) つま先版（前趾） (3) かかと版（後趾） (4) 底版。", h=32)
head(ws, r + 7, "■ 問題 3  L型 vs 逆T型")
body(ws, r + 8, "L型と逆T型の違い（つま先版の有無）と、それぞれが有利になる条件を述べよ"
                "（敷地境界が擁壁前面ぎりぎり／背面に十分な余裕がある 等）。", h=44)
head(ws, r + 10, "■ 問題 4  安定の 3 本柱")
body(ws, r + 11, "擁壁が安全であるために確認する 3 つの安定（外的安定）と、"
                 "部材が壊れないための検討（内的安定）を挙げよ。", h=32)

# ---- 2 土圧の選別 ----
ws = wb.create_sheet("2 土圧の選別")
setup(ws, [8, 18, 20, 16, 12, 12])
title_row(ws, 1, "2  擁壁の種類に応じた土圧の選別")
head(ws, 3, "■ 図 2  変位と土圧・仮想背面法")
put_img(ws, figs["ep"], "A4", w=820)
head(ws, 30, "■ 問題 1  土圧の選別")
r = table(ws, 31,
          ["擁壁・条件", "用いる土圧（記入）", "理由（記入）"],
          [["自立して前に微小変位する擁壁（一般の擁壁）", "", ""],
           ["ほとんど変位しない剛な地下外壁・ボックス", "", ""],
           ["擁壁前面の根入れ部分の抵抗", "", ""]])
body(ws, r + 2, "選択肢：主働土圧 Ka／静止土圧 K0／受働土圧 Kp。"
                "一般の擁壁がわずかに前傾して主働状態になる理由も 1 行で。", h=40)
head(ws, r + 4, "■ 問題 2  仮想背面法")
body(ws, r + 5, "(1) 片持ち梁式（L・逆T）で『仮想背面』に土圧を作用させる理由を、"
                "かかと版上の土の挙動から説明せよ。", h=40)
body(ws, r + 6, "(2) 仮想背面に作用させる土圧の合力 Pa を求めよ。"
                "Ka=0.333、γ=18、H=5.0、上載 q=10。"
                "自重分 ½KaγH² と 上載分 KaqH を分けて計算し、作用高さも求めよ。", h=44)
head(ws, r + 8, "■ 問題 3  かかと上の土の二面性")
body(ws, r + 9, "かかと版上の背面土は、(a) 転倒・滑動を促す『土圧』の源であると同時に、"
                "(b) 擁壁を安定させる『重量』としても働く。この二面性を 2 行で説明せよ。",
     h=40)
head(ws, r + 11, "■ 問題 4  Ka の計算")
body(ws, r + 12, "ランキンの主働土圧係数 Ka = tan²(45°−φ/2)。"
                 "φ=30°・35°・40° の Ka を計算し、良質な裏込め材（φ大）ほど土圧が"
                 "小さくなることを確認せよ。", h=40)

# ---- 3 安定計算 ----
ws = wb.create_sheet("3 安定計算")
setup(ws, [8, 18, 16, 14, 14, 12, 12])
title_row(ws, 1, "3  安定計算（滑動・転倒・支持力）")
head(ws, 3, "■ 図 3  逆T型擁壁の寸法と荷重")
put_img(ws, figs["stab"], "A4", w=820)
head(ws, 32, "■ 手順 1  鉛直重量とつま先まわりモーメント")
body(ws, 33, "各重量とつま先 O からの距離を計算し、抵抗モーメント Mr を求めよ"
             "（γ_c=24、γ=18、q=10）。", h=32)
r = table(ws, 35,
          ["記号", "内容", "重量 W (kN)（記入）", "腕 x (m)（記入）", "W·x（記入）"],
          [["W1", "竪壁 0.5×4.5×24", "", "", ""],
           ["W2", "底版 3.2×0.5×24", "", "", ""],
           ["W3", "かかと上の土 1.7×4.5×18", "", "", ""],
           ["W4", "上載 1.7×10", "", "", ""],
           ["計", "ΣW ／ ΣW·x", "", "—", ""]])
head(ws, r + 2, "■ 手順 2  土圧（仮想背面・全高 H）")
r = table(ws, r + 4,
          ["成分", "式", "合力 (kN)（記入）", "作用高 (m)（記入）"],
          [["自重土圧", "½·Ka·γ·H²", "", "H/3="],
           ["上載土圧", "Ka·q·H", "", "H/2="],
           ["計 Pa", "—", "", "加重平均"]])
head(ws, r + 2, "■ 手順 3  3 つの安定検定")
r = table(ws, r + 4,
          ["検定", "式", "計算（記入）", "安全率（記入）", "判定 Fs≧1.5"],
          [["転倒", "Mr / Mo", "", "", ""],
           ["滑動", "μ·ΣW / Pa", "", "", ""],
           ["支持力", "e=B/2−(Mr−Mo)/ΣW、qmax", "", "", ""]])
body(ws, r + 2, "支持力は、偏心 e が B/6 以内（接地圧が負にならない）を確認し、"
                "qmax=ΣW/B·(1+6e/B) ≦ 許容支持力 qa=200 を照査する。", h=32)
head(ws, r + 4, "■ 問題 4  NG 時の対策")
body(ws, r + 5, "(1) 滑動が NG のとき有効な対策を 2 つ（底版幅拡大・つま先突起（せん断キー）"
                "・基礎の粗面化）。(2) 転倒が NG のとき（かかと版を伸ばす＝背面土重量を増やす）。"
                "(3) 支持力が NG のとき（底版幅拡大・地盤改良・杭基礎）。", h=58)

# ---- 4 竪壁・底版応力 ----
ws = wb.create_sheet("4 竪壁・底版応力")
setup(ws, [8, 18, 16, 14, 14, 12, 12])
title_row(ws, 1, "4  竪壁・底版の応力算定")
head(ws, 3, "■ 図 4  片持ち梁モデル")
put_img(ws, figs["member"], "A4", w=820)
head(ws, 30, "■ 問題 1  竪壁の応力（付け根）")
body(ws, 31, "竪壁を『縦向きの片持ち梁』とみなす。竪壁背面（高さ hw=4.5m）に作用する"
             "主働土圧により、付け根の曲げモーメント M と せん断力 V を求めよ。"
             "（Ka=0.333、γ=18、q=10、上載も考慮）", h=44)
r = table(ws, 34,
          ["成分", "式", "値（記入）"],
          [["自重土圧合力", "½·Ka·γ·hw²", ""],
           ["上載土圧合力", "Ka·q·hw", ""],
           ["付け根 M", "自重分×hw/3 + 上載分×hw/2", ""],
           ["付け根 V", "自重分 + 上載分", ""]])
head(ws, r + 2, "■ 問題 2  かかと版の応力")
body(ws, r + 3, "かかと版を『横向きの片持ち梁』とみなす。上から（背面土＋上載＋版自重）が"
                "下向き、下から接地圧が上向きに働く。正味の下向き荷重による付け根 M を求めよ"
                "（かかと張出し 1.7m、下向き w、接地圧の平均を差し引く）。", h=44)
head(ws, r + 5, "■ 問題 3  つま先版の応力")
body(ws, r + 6, "つま先版は『上向きの接地圧』が支配する片持ち梁。"
                "つま先張出し 1.0m の付け根 M を求めよ（接地圧の平均 − 版自重）。", h=32)
head(ws, r + 8, "■ 問題 4  どこが一番危険か")
body(ws, r + 9, "竪壁付け根・かかと版付け根・つま先版付け根の M を比較し、"
                "最も断面・配筋が厳しくなる部位を答えよ。"
                "また、それぞれ引張が生じる側（竪壁は背面側／かかと版は上側／"
                "つま先版は下側）を答え、主筋の配置位置を示せ。", h=58)

# ---- 5 必要鉄筋・配筋 ----
ws = wb.create_sheet("5 必要鉄筋・配筋")
setup(ws, [8, 18, 16, 14, 14, 12, 12])
title_row(ws, 1, "5  必要鉄筋量の計算と配筋計画")
head(ws, 3, "■ 許容応力度設計による必要鉄筋量")
body(ws, 4, "必要鉄筋量 As = M / (ft·j)。ft＝鉄筋の許容引張応力度（SD295 長期 195 N/mm²）、"
            "j＝応力中心間距離 ≒ (7/8)·d、d＝有効せい（＝部材厚 − かぶり）。"
            "曲げのみで略算（せん断はコンクリートで処理できるか別途確認）。", span=7, h=44)
head(ws, 7, "■ 問題 1  竪壁の必要鉄筋")
body(ws, 8, "竪壁付け根 M=124.9 kN·m/m、部材厚 500mm、かぶり 70mm（d=430mm）。"
            "As を計算し、下表から配筋を選べ（As≧必要量）。", span=7, h=32)
r = table(ws, 11,
          ["項目", "値（記入）"],
          [["d = 500 − 70 (mm)", ""],
           ["j = 7/8·d (mm)", ""],
           ["As = M/(ft·j) (mm²/m)", ""],
           ["採用配筋（D19@150 等）", ""]])
body(ws, r + 2, "参考：D19@150=1910、D22@200=1936、D19@125=2292 mm²/m。", span=7, h=20)
head(ws, r + 4, "■ 問題 2  かかと版の必要鉄筋")
body(ws, r + 5, "かかと版付け根 M=64.9 kN·m/m、部材厚 500mm、かぶり 90mm（d=410mm、上側引張）。"
                "As を計算し配筋を選べ。参考：D16@200=993、D16@150=1324、D19@200=1432。",
     span=7, h=32)
r = table(ws, r + 8,
          ["項目", "値（記入）"],
          [["d (mm)", ""],
           ["As = M/(ft·j) (mm²/m)", ""],
           ["採用配筋", ""]])
head(ws, r + 2, "■ 問題 3  配筋計画のルール")
body(ws, r + 3, "(1) 竪壁主筋は背面側・前面側どちらに配すか（引張側）。"
                "(2) 竪壁主筋は上部で応力が小さくなるので、途中でカットオフ（半分に）"
                "できる。定着・継手（No.6・7 教材）との関係を 1 行で。"
                "(3) 配力筋（水平筋）・最小鉄筋比（0.2% 程度）・かぶり（土に接する面は"
                "大きめ）にも触れよ。", span=7, h=58)
head(ws, r + 5, "■ 問題 4  配筋図の作成")
body(ws, r + 6, "竪壁・つま先版・かかと版の主筋の配置（引張側）を 1 枚の断面図に"
                "手描きせよ。L 型に鉄筋が回る『出隅・入隅の定着』に注意"
                "（かかと版上端筋 → 竪壁背面筋への連続）。", span=7, h=44)

# ---- 6 排水と水圧非考慮 ----
ws = wb.create_sheet("6 排水と水圧非考慮")
setup(ws, [8, 18, 20, 16, 12, 12])
title_row(ws, 1, "6  排水処理と水圧を非考慮とできる規定")
head(ws, 3, "■ 図 6  排水処理")
put_img(ws, figs["drain"], "A4", w=640)
head(ws, 30, "■ 問題 1  なぜ排水が重要か")
body(ws, 31, "背面に地下水が溜まると、土圧に加えて【 ① 】が作用する。"
             "水位が上がると全側圧は大きく増える（土圧は水中重量で減るが水圧が加算され"
             "正味で増加）。さらに凍結や【 ② 】のリスクもある。"
             "排水で地下水位を上げないことが擁壁の鉄則。", h=44)
head(ws, 33, "■ 問題 2  水圧を非考慮にできる条件")
body(ws, 34, "宅地造成等の基準では、擁壁背面に一定の排水措置を講じれば水圧を"
             "考慮しなくてよい。次の排水措置の要点を埋めよ。", h=32)
r = table(ws, 36,
          ["措置", "規定の目安（記入）"],
          [["水抜き穴", "内径 φ__mm 以上、壁面 __m² に 1 個以上"],
           ["裏込め（透水層）", "水抜き穴の裏に__を設置（砕石・砂利）"],
           ["地表面の処理", "背面地表を__して雨水浸透を抑える"]])
body(ws, r + 2, "※ 具体の数値（φ75mm 以上・3m² に 1 個以上 等）は宅地造成等規制法"
                "施行令・各自治体の基準で確認すること。", h=32)
head(ws, r + 4, "■ 問題 3  排水しない場合の影響")
body(ws, r + 5, "排水を怠り地下水位が地表まで上がった場合、側圧はおよそ何倍になるか"
                "（土圧教材 No. 地下水位ケースを参照：土圧＋水圧で約 1.4 倍）。"
                "擁壁が転倒・崩壊した実例が多いことにも触れよ。", h=44)
head(ws, r + 7, "■ 問題 4  実務チェック")
body(ws, r + 8, "擁壁の排水ディテールで確認する項目を 3 つ挙げよ"
                "（水抜き穴の位置・数／裏込め透水層＋フィルター（目詰まり防止）／"
                "底部の集水暗渠／天端の水仕舞い）。", h=44)

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


ah("1  種類と構造特性")
an("問1：重力式＝自重で抵抗／〜2m／無筋。もたれ式＝自重＋背面もたれ／〜3〜5m／"
   "無筋〜軽微。L型＝竪壁・底版の曲げ抵抗／〜3m／鉄筋。逆T型＝曲げ抵抗＋背面土重量／"
   "3〜6m／鉄筋。控え壁式＝控え壁で竪壁を支持／6m 超／鉄筋。", h=58)
an("問2：(1)竪壁＝背面土を直接受け止める壁（縦向き片持ち梁）。"
   "(2)つま先版＝擁壁前面側の底版張出し。接地圧で上向きに曲げられる。"
   "(3)かかと版＝背面側の底版張出し。上の土＋自重で下向きに曲げられ、"
   "背面土の重量を擁壁の安定に取り込む。(4)底版＝地盤に力を伝え、竪壁を固定する基礎。",
   h=72)
an("問3：L型はつま先版がなく竪壁が前端に立つ→敷地境界が擁壁前面ぎりぎりで"
   "つま先を出せない時に有利。逆T型はつま先版で接地面を広げ支持・転倒に有利、"
   "背面に余裕がある一般の造成で標準。", h=58)
an("問4：外的安定＝①滑動 ②転倒 ③支持力（地盤の支持）。"
   "内的安定＝竪壁・底版の部材が曲げ・せん断で壊れないこと（断面算定・配筋）。", h=44)

ah("2  土圧の選別")
an("問1：一般の擁壁＝主働土圧 Ka（擁壁がわずかに前傾して主働状態になる）。"
   "剛な地下外壁・ボックス＝静止土圧 K0（変位しないため）。"
   "根入れ前面＝受働土圧 Kp（擁壁が前に押す側）。"
   "一般の擁壁は基礎の弾性変形等で数 mm 前傾し、背面土が主働状態に緩むため Ka を用いる。",
   h=58)
an("問2：(1)片持ち梁式ではかかと版上の土が擁壁と一体で動くため、土のブロックの"
   "背面（かかと後端の鉛直＝仮想背面）で土塊を切り、そこに Ka を作用させる。"
   "(2)自重分 Pa1=½×0.333×18×5²=74.9≒75kN（作用高 H/3=1.67m）、"
   "上載分 Pa2=0.333×10×5=16.7kN（H/2=2.5m）。"
   "合計 Pa=91.7kN、作用高 y=(75×1.67+16.7×2.5)/91.7≒1.82m。", h=72)
an("問3：かかと上の土は、仮想背面に水平主働土圧を生む『土圧の源』であると同時に、"
   "その鉛直重量が底版を通じて擁壁を地盤に押さえつけ、転倒・滑動に抵抗する"
   "『安定重量』として働く。逆T型がかかと版を長く取るのはこの重量を活かすため。",
   h=58)
an("問4：Ka=tan²(45−φ/2)。φ30°→0.333、φ35°→0.271、φ40°→0.217。"
   "φが大きい良質な砕石・砂利ほど Ka が小さく土圧が減る→裏込め材の選定が重要。",
   h=44)

ah("3  安定計算")
an("手順1：W1=0.5×4.5×24=54.0kN@1.25→67.5。W2=3.2×0.5×24=38.4@1.60→61.4。"
   "W3=1.7×4.5×18=137.7@2.35→323.6。W4=1.7×10=17.0@2.35→40.0。"
   "ΣW=247.1kN、ΣW·x（抵抗M Mr）=492.5 kN·m。", h=58)
an("手順2：自重土圧=½×0.333×18×5²=75.0kN@1.67m。上載土圧=0.333×10×5=16.7kN@2.5m。"
   "Pa=91.7kN。転倒モーメント Mo=75×1.67+16.7×2.5=166.7 kN·m。", h=44)
an("手順3：【転倒】Fs=Mr/Mo=492.5/166.7=2.95 ≧1.5 OK。"
   "【滑動】Fs=μΣW/Pa=0.6×247.1/91.7=1.62 ≧1.5 OK。"
   "【支持力】d=(Mr−Mo)/ΣW=(492.5−166.7)/247.1=1.319m、e=B/2−d=1.6−1.319=0.281m。"
   "B/6=0.533>e OK（接地圧が正）。qmax=247.1/3.2×(1+6×0.281/3.2)=77.2×1.527="
   "118.0 kN/m² ≦200 OK。qmin=36.5 kN/m²。全項目 OK。", h=86)
an("問4：(1)滑動 NG→底版幅拡大／つま先突起（せん断キー）で受働抵抗を足す／"
   "基礎底面を粗にして μ を上げる。(2)転倒 NG→かかと版を伸ばし背面土重量（W3）を増やす／"
   "底版幅拡大。(3)支持力 NG→底版幅拡大で接地圧を下げる／地盤改良／杭基礎。", h=58)

ah("4  竪壁・底版応力")
an("問1：自重土圧=½×0.333×18×4.5²=60.7kN、上載=0.333×10×4.5=15.0kN。"
   "M=60.7×(4.5/3)+15.0×(4.5/2)=91.0+33.7=124.9 kN·m/m。"
   "V=60.7+15.0=75.8 kN/m。", h=44)
an("問2：下向き w=（背面土 4.5×18=81）＋（上載 10）＋（版自重 0.5×24=12）=103 kN/m²。"
   "接地圧はかかと側で qA≒79.8、後端 qB=36.5、平均≒58.2 kN/m²（上向き）。"
   "正味 w_net≒103−58.2=44.8 kN/m²（下向き）。"
   "M=w_net×1.7²/2=44.8×1.445=64.9 kN·m/m（上側引張）。", h=58)
an("問3：つま先版は接地圧 上向きが支配。つま先 qmax=118、竪壁前面 qC≒92.5、"
   "平均≒105、版自重 12 を引いて正味≒93 kN/m²（上向き）。"
   "M=93×1.0²/2=46.6 kN·m/m（下側引張）。", h=44)
an("問4：M は 竪壁付け根 124.9 ＞ かかと版 64.9 ＞ つま先版 46.6。"
   "竪壁付け根が最も厳しい。引張側：竪壁＝背面（土側）、かかと版＝上側、"
   "つま先版＝下側。主筋は各引張側に配置する。", h=58)

ah("5  必要鉄筋・配筋")
an("問1：d=500−70=430mm。j=7/8×430=376mm。"
   "As=124.9×10⁶/(195×376)=1,702 mm²/m。"
   "→ D19@150（1,910）または D22@200（1,936）で OK。", h=44)
an("問2：d=500−90=410mm。j=359mm。As=64.9×10⁶/(195×359)=927 mm²/m。"
   "→ D16@200（993）で OK（余裕小なら D16@150）。", h=44)
an("問3：(1)竪壁主筋は背面（土側＝引張側）に配す。(2)上部は M が 3 乗で小さくなるので、"
   "中間高さで主筋を半分にカットオフできる（カットオフ点＋定着長を確保、"
   "No.6・7 教材参照）。(3)配力筋を主筋直交方向に、最小鉄筋比 0.2% 程度を確保、"
   "土に接する面のかぶりは大きめ（70mm 程度）にする。", h=72)
an("問4：竪壁背面筋 → かかと版上端筋へ L 字に連続させ、入隅で定着を確保する"
   "（曲げ内側に鉄筋が来るよう配筋）。つま先版は下端筋を竪壁前面下部に定着。"
   "出隅・入隅の定着不良は擁壁の典型的な不具合なので、標準配筋図で確認する。",
   h=58)

ah("6  排水と水圧非考慮")
an("問1：①水圧（静水圧） ②凍上（凍結融解）。"
   "水位上昇で全側圧が大きく増え、擁壁の転倒・滑動リスクが急増する。", h=44)
an("問2：水抜き穴＝内径 φ75mm 以上、壁面 3m² に 1 個以上（宅地造成等の基準）。"
   "裏込め＝水抜き穴の裏に砕石・砂利等の透水層（＋フィルター）。"
   "地表面＝不透水材で覆う・勾配をつけるなどして雨水の浸透を抑える。"
   "※数値は法令・自治体基準で要確認。", h=58)
an("問3：地下水位が地表まで上がると、土圧＋水圧で全側圧は約 1.4 倍（土圧教材の"
   "地下水位ケース）。擁壁の崩壊事例の多くが排水不良（水抜き穴の目詰まり等）に"
   "起因する。排水は『設計より施工・維持管理』で効くディテール。", h=58)
an("問4：①水抜き穴の位置・数（最下段は底版付近に）②裏込め透水層＋フィルター"
   "（不織布で目詰まり防止）③底部集水の暗渠管 ④天端の水仕舞い（笠木・勾配）"
   "から 3 つ。", h=58)

XLSX = os.path.join(OUT, "擁壁設計問題集.xlsx")
wb.save(XLSX)
print("saved:", XLSX)
