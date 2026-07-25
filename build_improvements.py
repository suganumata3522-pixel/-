# -*- coding: utf-8 -*-
"""既存問題集の改良：図解のない11シートに図を追加する。
対象9冊11シートを検出済みの位置に、内容に対応した図を生成して末尾に挿入する。
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


def save(fig, topic, name):
    d = os.path.join("docs", topic, "figures"); os.makedirs(d, exist_ok=True)
    p = os.path.join(d, name); fig.savefig(p, dpi=130, bbox_inches="tight"); plt.close(fig)
    return p


# ---------- 1. bond_design / 8-3 付着設計法 ----------
def f_bond():
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 5.0), gridspec_kw={"width_ratios": [1.15, 1.0]})
    ax = axes[0]
    stages = [("使用性（長期）", "常時荷重", "τ <= 長期 fa", "#dbe5f1"),
              ("損傷制御（短期）", "中地震", "τ <= 短期 fa", "#dce9d4"),
              ("安全性（大地震）", "大地震", "1.1σy に対し K・fb", "#f6dcdc")]
    for i, (nm, load, chk, c) in enumerate(stages):
        y = 0.72 - i * 0.23
        ax.add_patch(mpatches.FancyBboxPatch((0.05, y), 0.9, 0.18, boxstyle="round,pad=0.008",
                     transform=ax.transAxes, fc=c, ec="#2e5b8a", lw=1.2))
        ax.text(0.09, y + 0.125, nm, transform=ax.transAxes, fontproperties=jp,
                fontsize=10, fontweight="bold", color="#1f3a5f")
        ax.text(0.09, y + 0.05, f"対象：{load}", transform=ax.transAxes,
                fontproperties=jp, fontsize=8.5, color="#444")
        ax.text(0.92, y + 0.09, chk, transform=ax.transAxes, ha="right",
                fontproperties=jp, fontsize=9.5, color="#c00000")
    ax.text(0.5, 0.05, "3段階すべてで『存在付着応力度 <= 許容/強度』を確認",
            transform=ax.transAxes, ha="center", fontproperties=jp, fontsize=9, color="#1f4e79")
    ax.axis("off")
    ax.set_title("(a) RC規準の3段階設計", fontproperties=jp, fontsize=10, fontweight="bold")
    # (b) 検定式の図解
    ax = axes[1]
    ax.add_patch(mpatches.Rectangle((0.5, 2.2), 6.5, 1.1, fc="#e8e0d0", ec="k", lw=1))
    ax.plot([0.2, 7.3], [2.75, 2.75], color="#c00000", lw=4)
    ax.annotate("", xy=(7.9, 2.75), xytext=(7.3, 2.75),
                arrowprops=dict(arrowstyle="-|>", color="#c00000", lw=3))
    ax.text(8.0, 2.75, "T = σt・(π db²/4)", fontproperties=jp, fontsize=9,
            color="#c00000", va="center")
    for x in np.linspace(1.0, 6.6, 9):
        ax.annotate("", xy=(x, 2.66), xytext=(x - 0.35, 2.4),
                    arrowprops=dict(arrowstyle="->", color="#548235", lw=1.2))
    ax.text(3.7, 2.05, "付着応力 τ（周面 π db・ld で伝達）", ha="center",
            fontproperties=jp, fontsize=9, color="#548235")
    ax.annotate("", xy=(0.5, 3.6), xytext=(7.0, 3.6),
                arrowprops=dict(arrowstyle="<->", color="#333"))
    ax.text(3.75, 3.7, "定着・付着長さ ld", ha="center", fontproperties=jp, fontsize=9)
    ax.text(4.0, 1.1, "τ = σt・db / (4・ld)  <=  fa（または K・fb）",
            ha="center", fontproperties=jp, fontsize=11, fontweight="bold", color="#1f4e79")
    ax.text(4.0, 0.45, "大地震時はテンションシフトで有効長さを差し引く",
            ha="center", fontproperties=jp, fontsize=8.5, color="#833c00")
    ax.set_xlim(-0.3, 11.5); ax.set_ylim(0, 4.3); ax.axis("off")
    ax.set_title("(b) 検定式の意味（力のつり合い）", fontproperties=jp, fontsize=10, fontweight="bold")
    fig.suptitle("補足図  付着設計法（3段階設計と検定式）", fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "bond_design", "fig_add_design.png")


# ---------- 2. collapse / 4 目標耐震性能の差 ----------
def f_collapse():
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 5.0))
    ax = axes[0]
    d = np.linspace(0, 10, 200)
    ductile = np.where(d < 2.0, d * 0.5, 1.0)
    brittle = np.where(d < 1.6, d * 1.0, np.maximum(1.6 - (d - 1.6) * 1.3, 0))
    ax.plot(d, ductile, color="#2a78d6", lw=2.5, label="靭性型（全体崩壊・曲げ降伏）")
    ax.plot(d, brittle, color="#c00000", lw=2.5, label="強度型/脆性（せん断破壊）")
    ax.fill_between(d, 0, ductile, color="#cfe0f0", alpha=0.45)
    ax.axhline(1.0, color="#2a78d6", ls=":", lw=1)
    ax.axhline(1.6, color="#c00000", ls=":", lw=1)
    ax.text(6.4, 1.06, "Ds 小 → 必要保有耐力 小", fontproperties=jp, fontsize=8.5, color="#2a78d6")
    ax.text(3.4, 1.66, "Ds 大 → 必要保有耐力 大", fontproperties=jp, fontsize=8.5, color="#c00000")
    ax.annotate("粘って\nエネルギー吸収", xy=(7.0, 0.6), xytext=(5.2, 0.28),
                fontproperties=jp, fontsize=8.5, color="#2a78d6",
                arrowprops=dict(arrowstyle="->", color="#2a78d6"))
    ax.annotate("急激に耐力低下", xy=(3.2, 0.5), xytext=(3.6, 0.05),
                fontproperties=jp, fontsize=8.5, color="#c00000",
                arrowprops=dict(arrowstyle="->", color="#c00000"))
    ax.set_xlabel("変形 δ", fontproperties=jp, fontsize=9)
    ax.set_ylabel("水平耐力 Q", fontproperties=jp, fontsize=9)
    ax.set_xlim(0, 10); ax.set_ylim(0, 2.0); ax.grid(alpha=0.3)
    ax.legend(prop=jp, fontsize=8.5, loc="upper right")
    ax.set_title("(a) 崩壊形による Q-δ の違い", fontproperties=jp, fontsize=10, fontweight="bold")
    ax = axes[1]
    names = ["全体崩壊\n（靭性型）", "部分崩壊", "せん断・局部\n（脆性）"]
    ds = [0.30, 0.40, 0.50]
    cols = ["#2a78d6", "#c8952a", "#c00000"]
    x = np.arange(3)
    ax.bar(x, ds, 0.5, color=cols, ec="k")
    for i, v in enumerate(ds):
        ax.text(i, v + 0.012, f"Ds={v:.2f}", ha="center", fontproperties=jp, fontsize=9.5)
    ax.set_xticks(x); ax.set_xticklabels(names, fontproperties=jp, fontsize=9)
    ax.set_ylabel("構造特性係数 Ds", fontproperties=jp, fontsize=9)
    ax.set_ylim(0, 0.62); ax.grid(alpha=0.3, axis="y")
    ax.text(1.0, 0.575, "Qun = Ds・Fes・Qud → Ds が小さいほど有利", ha="center",
            fontproperties=jp, fontsize=9.5, color="#1f4e79")
    ax.set_title("(b) 崩壊形と Ds・必要保有水平耐力", fontproperties=jp, fontsize=10, fontweight="bold")
    fig.suptitle("補足図  崩壊形に応じた目標耐震性能の差", fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "collapse", "fig_add_target.png")


# ---------- 3. rc_basics / No.1-2 長所・短所 ----------
def f_rcbasics():
    fig = plt.figure(figsize=(13.5, 5.2))
    ax = fig.add_subplot(1, 2, 1, projection="polar")
    labels = ["耐火性", "自重の軽さ", "大スパン", "工期", "遮音性", "剛性"]
    rc = [5, 1.5, 2, 2, 5, 5]
    s = [2, 4.5, 5, 4.5, 2.5, 3]
    wood = [1.5, 5, 1.5, 5, 1.5, 2]
    ang = np.linspace(0, 2 * np.pi, len(labels), endpoint=False).tolist()
    ang += ang[:1]
    for vals, nm, c in [(rc, "RC造", "#2a78d6"), (s, "S造", "#c00000"), (wood, "木造", "#548235")]:
        v = vals + vals[:1]
        ax.plot(ang, v, color=c, lw=2, label=nm)
        ax.fill(ang, v, color=c, alpha=0.12)
    ax.set_xticks(ang[:-1]); ax.set_xticklabels(labels, fontproperties=jp, fontsize=9)
    ax.set_yticks([1, 2, 3, 4, 5]); ax.set_yticklabels(["1", "2", "3", "4", "5"], fontsize=7)
    ax.set_ylim(0, 5.4)
    ax.legend(prop=jp, fontsize=8.5, loc="lower center", bbox_to_anchor=(0.5, -0.24), ncol=3)
    ax.set_title("(a) RC造・S造・木造の相対比較（5段階）", fontproperties=jp, fontsize=10,
                 fontweight="bold", pad=26)
    ax = fig.add_subplot(1, 2, 2)
    ax.add_patch(mpatches.FancyBboxPatch((0.03, 0.52), 0.94, 0.36, boxstyle="round,pad=0.01",
                 transform=ax.transAxes, fc="#dce9d4", ec="#548235", lw=1.2))
    ax.text(0.06, 0.83, "長所", transform=ax.transAxes, fontproperties=jp,
            fontsize=11, fontweight="bold", color="#2d5016")
    ax.text(0.06, 0.77, "・耐火性に優れる　・遮音性/遮熱性が高い\n"
            "・自由な形状（型枠次第）　・耐久性が高い\n・剛性が高く揺れにくい（居住性良）",
            transform=ax.transAxes, fontproperties=jp, fontsize=9, va="top")
    ax.add_patch(mpatches.FancyBboxPatch((0.03, 0.08), 0.94, 0.36, boxstyle="round,pad=0.01",
                 transform=ax.transAxes, fc="#f6dcdc", ec="#c00000", lw=1.2))
    ax.text(0.06, 0.39, "短所", transform=ax.transAxes, fontproperties=jp,
            fontsize=11, fontweight="bold", color="#8b1a1a")
    ax.text(0.06, 0.33, "・自重が重い（地震力が大きい）　・ひび割れ\n"
            "・工期が長い（養生）　・解体/改修が難しい\n・品質が施工/養生に左右される",
            transform=ax.transAxes, fontproperties=jp, fontsize=9, va="top")
    ax.axis("off")
    ax.set_title("(b) RC造の長所・短所", fontproperties=jp, fontsize=10, fontweight="bold", pad=26)
    fig.suptitle("補足図  RC造の長所・短所と他構造との比較", fontproperties=jp,
                 fontsize=13, fontweight="bold", y=0.99)
    fig.subplots_adjust(top=0.80, wspace=0.30)
    return save(fig, "rc_basics", "fig_add_proscons.png")


# ---------- 4. rc_joint / 9-5 せん断終局強度 ----------
def f_joint():
    fig, ax = plt.subplots(figsize=(12.5, 5.4))
    steps = [
        (0.06, "手順1  設計せん断力 Vj", "T1 = at1・σy\nT2 = at2・σy\nVj = T1 + T2 − Vc", "#dbe5f1", "#2e5b8a"),
        (0.37, "手順2  強度の諸元", "κ（形状）・φ（直交梁）\nFj = 0.8・Fc^0.7\nbj = bb + 2・bai,  Dj", "#dce9d4", "#548235"),
        (0.68, "手順3  Vju と判定", "Vju = κ・φ・Fj・bj・Dj\n判定：Vj <= Vju\n（余裕率 Vju/Vj）", "#f6dcdc", "#c00000"),
    ]
    for x, t, d, fc, ec in steps:
        ax.add_patch(mpatches.FancyBboxPatch((x, 0.30), 0.26, 0.42, boxstyle="round,pad=0.012",
                     transform=ax.transAxes, fc=fc, ec=ec, lw=1.4))
        ax.text(x + 0.13, 0.655, t, transform=ax.transAxes, ha="center",
                fontproperties=jp, fontsize=10, fontweight="bold", color=ec)
        ax.text(x + 0.13, 0.47, d, transform=ax.transAxes, ha="center", va="center",
                fontproperties=jp, fontsize=9)
    for x in [0.325, 0.635]:
        ax.annotate("", xy=(x + 0.04, 0.51), xytext=(x, 0.51), xycoords="axes fraction",
                    arrowprops=dict(arrowstyle="-|>", color="#666", lw=2))
    ax.text(0.5, 0.20, "接合部は『壊してはいけない』部位。Vj <= Vju を確認し、"
            "満たさなければ柱せい・Fc・梁配筋を見直す",
            transform=ax.transAxes, ha="center", fontproperties=jp, fontsize=9.5, color="#c00000")
    ax.text(0.5, 0.08, "κ：十字1.0／ト形・T形0.7／L形0.4　　φ：両側直交梁1.0／その他0.85　"
            "　bai = min(bi/2, Dj/4)",
            transform=ax.transAxes, ha="center", fontproperties=jp, fontsize=8.5, color="#444")
    ax.axis("off")
    ax.set_title("補足図  接合部せん断終局強度 Vju の算定フロー",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "rc_joint", "fig_add_vju_flow.png")


# ---------- 5/7. 定着長・継手長グラフ ----------
FCL = ["18", "21", "24〜27", "30〜36", "39〜45"]
L2_295 = [40, 35, 30, 30, 25]; L2_345 = [40, 40, 35, 30, 30]
L2H_295 = [30, 25, 20, 20, 15]; L2H_345 = [30, 30, 25, 20, 20]


def f_l2():
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 4.8))
    x = np.arange(len(FCL)); w = 0.2
    ax = axes[0]
    ax.bar(x - 1.5 * w, L2_295, w, label="SD295 L2", color="#2a78d6", ec="k")
    ax.bar(x - 0.5 * w, L2H_295, w, label="SD295 L2h", color="#9dc3e6", ec="k")
    ax.bar(x + 0.5 * w, L2_345, w, label="SD345 L2", color="#c00000", ec="k")
    ax.bar(x + 1.5 * w, L2H_345, w, label="SD345 L2h", color="#f4a6a6", ec="k")
    ax.set_xticks(x); ax.set_xticklabels(FCL, fontproperties=jp, fontsize=9)
    ax.set_xlabel("Fc (N/mm²)", fontproperties=jp, fontsize=9)
    ax.set_ylabel("定着長（db の倍数）", fontproperties=jp, fontsize=9)
    ax.legend(prop=jp, fontsize=8); ax.grid(alpha=0.3, axis="y"); ax.set_ylim(0, 48)
    ax.set_title("(a) Fc が高いほど定着長は短い", fontproperties=jp, fontsize=10, fontweight="bold")
    ax = axes[1]
    ax.text(0.5, 0.93, "覚え方のポイント", transform=ax.transAxes, ha="center",
            fontproperties=jp, fontsize=11, fontweight="bold", color="#1f4e79")
    ax.text(0.05, 0.78,
            "① Fc が高い → 付着が強い → 定着長は短い\n\n"
            "② フック付き L2h は直線 L2 より約 10db 短い\n"
            "   （フックの機械的な引っ掛かりが効く）\n\n"
            "③ 鉄筋が強い（SD345 > SD295）→ 伝える力が\n"
            "   大きい → 定着長は長い\n\n"
            "④ 継手長 L1 = 定着長 L2 + 5db\n"
            "   （重ね継手は 2 本の乗り換えロス分）\n\n"
            "基準の覚え方：Fc24・SD345 → L2=35db, L2h=25db",
            transform=ax.transAxes, fontproperties=jp, fontsize=9.3, va="top")
    ax.text(0.05, 0.05, "※ 目安値。実設計は規準・自社標準図で確認要。",
            transform=ax.transAxes, fontproperties=jp, fontsize=8, color="#833c00")
    ax.axis("off")
    ax.set_title("(b) 暗記のコツ", fontproperties=jp, fontsize=10, fontweight="bold")
    fig.suptitle("補足図  定着長 L2・L2h の傾向と覚え方", fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "rebar_anchorage", "fig_add_l2chart.png")


def f_l1():
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 4.8))
    x = np.arange(len(FCL)); w = 0.34
    L1_345 = [v + 5 for v in L2_345]
    ax = axes[0]
    ax.bar(x - w / 2, L2_345, w, label="定着 L2（SD345）", color="#9dc3e6", ec="k")
    ax.bar(x + w / 2, L1_345, w, label="継手 L1（SD345）", color="#c00000", ec="k")
    for i, (a, b) in enumerate(zip(L2_345, L1_345)):
        ax.text(i + w / 2, b + 0.6, f"+5db", ha="center", fontproperties=jp, fontsize=8, color="#c00000")
    ax.set_xticks(x); ax.set_xticklabels(FCL, fontproperties=jp, fontsize=9)
    ax.set_xlabel("Fc (N/mm²)", fontproperties=jp, fontsize=9)
    ax.set_ylabel("長さ（db の倍数）", fontproperties=jp, fontsize=9)
    ax.legend(prop=jp, fontsize=8.5); ax.grid(alpha=0.3, axis="y"); ax.set_ylim(0, 55)
    ax.set_title("(a) 継手長 L1 = 定着長 L2 + 5db", fontproperties=jp, fontsize=10, fontweight="bold")
    ax = axes[1]
    ax.text(0.5, 0.93, "なぜ継手は定着より長いか", transform=ax.transAxes, ha="center",
            fontproperties=jp, fontsize=11, fontweight="bold", color="#1f4e79")
    # 定着（1本→コンクリート）
    ax.plot([0.08, 0.45], [0.72, 0.72], color="#2a78d6", lw=4, transform=ax.transAxes)
    ax.text(0.265, 0.78, "定着：鉄筋→コンクリート（1回）", transform=ax.transAxes,
            ha="center", fontproperties=jp, fontsize=8.5, color="#2a78d6")
    # 継手（2本の重ね）
    ax.plot([0.08, 0.42], [0.52, 0.52], color="#c00000", lw=4, transform=ax.transAxes)
    ax.plot([0.28, 0.62], [0.46, 0.46], color="#c00000", lw=4, transform=ax.transAxes)
    ax.annotate("", xy=(0.28, 0.40), xytext=(0.42, 0.40), xycoords="axes fraction",
                arrowprops=dict(arrowstyle="<->", color="#333"))
    ax.text(0.35, 0.34, "重ね L1", transform=ax.transAxes, ha="center",
            fontproperties=jp, fontsize=8.5)
    ax.text(0.66, 0.49, "継手：鉄筋→コンクリート→鉄筋\n（乗り換えが2回＝ロス）",
            transform=ax.transAxes, fontproperties=jp, fontsize=8.5, color="#c00000", va="center")
    ax.text(0.05, 0.22, "→ 同じ力を伝えるのに継手のほうが長さが必要\n"
            "→ 目安として L1 = L2 + 5db と覚える",
            transform=ax.transAxes, fontproperties=jp, fontsize=9.3, va="top")
    ax.text(0.05, 0.04, "※ 目安値。実設計は規準・自社標準図で確認要。",
            transform=ax.transAxes, fontproperties=jp, fontsize=8, color="#833c00")
    ax.axis("off")
    ax.set_title("(b) 定着と継手の違い", fontproperties=jp, fontsize=10, fontweight="bold")
    fig.suptitle("補足図  継手長 L1・L1h と定着長の関係", fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "rebar_splice", "fig_add_l1chart.png")


# ---------- 6. rebar_anchorage / 6-4 計算仮定条件 ----------
def f_assump():
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 5.0))
    ax = axes[0]
    ax.add_patch(mpatches.Rectangle((0, 0), 6, 4.2, fc="#e8e0d0", ec="k", lw=1.2))
    ax.plot([0, 6], [4.2, 4.2], color="#666", lw=2)
    ax.text(3.0, 4.45, "コンクリート打設面", ha="center", fontproperties=jp, fontsize=8.5, color="#666")
    for x in np.linspace(0.5, 5.5, 9):
        ax.annotate("", xy=(x, 4.1), xytext=(x, 3.0),
                    arrowprops=dict(arrowstyle="->", color="#4a90d9", lw=1.1))
    ax.text(3.0, 2.62, "ブリーディング水が上昇", ha="center", fontproperties=jp,
            fontsize=8.5, color="#1f77b4")
    ax.plot([0.4, 5.6], [3.55, 3.55], color="#c00000", lw=5)
    ax.text(6.15, 3.55, "上端筋\n下に水膜 → 付着低下\n→ 定着長を割増し", fontproperties=jp,
            fontsize=8.5, color="#c00000", va="center")
    ax.plot([0.4, 5.6], [0.6, 0.6], color="#548235", lw=5)
    ax.text(6.15, 0.6, "下端筋・その他\n付着は良好", fontproperties=jp,
            fontsize=8.5, color="#548235", va="center")
    ax.annotate("", xy=(0.15, 3.55), xytext=(0.15, 4.2),
                arrowprops=dict(arrowstyle="<->", color="#333"))
    ax.text(-0.15, 3.9, "300mm\n以上", ha="right", va="center", fontproperties=jp, fontsize=7.5)
    ax.set_xlim(-1.4, 10.6); ax.set_ylim(-0.4, 5.0); ax.axis("off")
    ax.set_title("(a) 上端筋を割増しする理由", fontproperties=jp, fontsize=10, fontweight="bold")
    ax = axes[1]
    ax.text(0.5, 0.95, "一覧表が前提とする標準条件", transform=ax.transAxes, ha="center",
            fontproperties=jp, fontsize=11, fontweight="bold", color="#1f4e79")
    items = [("鉄筋の引張応力度 σt", "全強（許容引張/降伏）を見込む"),
             ("許容付着応力度 fb", "Fc と鉄筋位置で決まる規準値"),
             ("鉄筋位置", "上端筋 と 下端筋・その他 で区別"),
             ("フック", "標準フック（90/135/180°）"),
             ("かぶり・あき", "標準的なかぶり厚・鉄筋あき"),
             ("横補強筋", "標準的な配置")]
    for i, (k, v) in enumerate(items):
        y = 0.80 - i * 0.115
        ax.add_patch(mpatches.Rectangle((0.04, y - 0.02), 0.92, 0.09, transform=ax.transAxes,
                     fc="#f2f7fc" if i % 2 == 0 else "#ffffff", ec="#bfbfbf", lw=0.7))
        ax.text(0.07, y + 0.025, k, transform=ax.transAxes, fontproperties=jp,
                fontsize=8.8, fontweight="bold", color="#1f3a5f")
        ax.text(0.42, y + 0.025, v, transform=ax.transAxes, fontproperties=jp,
                fontsize=8.5, color="#333")
    ax.text(0.05, 0.06, "この標準条件から外れる場合（かぶり小・軽量コンクリート・\n"
            "あき小・エポキシ塗装等）は割増し等の検討が必要",
            transform=ax.transAxes, fontproperties=jp, fontsize=9, color="#c00000", va="bottom")
    ax.axis("off")
    ax.set_title("(b) 仮定条件の一覧", fontproperties=jp, fontsize=10, fontweight="bold")
    fig.suptitle("補足図  定着長一覧表の計算仮定条件", fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "rebar_anchorage", "fig_add_assump.png")


# ---------- 8. rebar_splice / 7-4 計算仮定条件（千鳥） ----------
def f_stagger():
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 4.8))
    ax = axes[0]
    # NG: 同一断面に集中
    for i, y in enumerate([3.3, 2.8, 2.3, 1.8]):
        ax.plot([0.3, 3.2], [y, y], color="#c00000", lw=3)
        ax.plot([2.6, 5.6], [y, y], color="#c00000", lw=3)
    ax.add_patch(mpatches.Rectangle((2.55, 1.6), 0.75, 1.9, fill=False, ec="#c00000", lw=1.8, ls="--"))
    ax.text(2.93, 3.75, "同一断面に集中 → NG", ha="center", fontproperties=jp,
            fontsize=9, color="#c00000", fontweight="bold")
    ax.text(2.93, 1.3, "断面の弱点が集中し割裂ひび割れの恐れ", ha="center",
            fontproperties=jp, fontsize=8, color="#c00000")
    # OK: 千鳥
    for i, y in enumerate([0.6, 0.1, -0.4, -0.9]):
        off = 0.0 if i % 2 == 0 else 1.5
        ax.plot([0.3 + off, 3.2 + off], [y, y], color="#548235", lw=3)
        ax.plot([2.6 + off, 5.6 + off], [y, y], color="#548235", lw=3)
    ax.annotate("", xy=(2.6, -1.35), xytext=(4.1, -1.35),
                arrowprops=dict(arrowstyle="<->", color="#333"))
    ax.text(3.35, -1.75, "0.5・L1 以上ずらす", ha="center", fontproperties=jp, fontsize=8.5)
    ax.text(3.4, 1.0, "千鳥配置 → OK", ha="center", fontproperties=jp,
            fontsize=9, color="#548235", fontweight="bold")
    ax.set_xlim(0, 7.3); ax.set_ylim(-2.1, 4.1); ax.axis("off")
    ax.set_title("(a) 継手の千鳥配置（ずらし）", fontproperties=jp, fontsize=10, fontweight="bold")
    ax = axes[1]
    ax.text(0.5, 0.95, "継手長一覧表が前提とする条件", transform=ax.transAxes, ha="center",
            fontproperties=jp, fontsize=11, fontweight="bold", color="#1f4e79")
    items = [("鉄筋の応力度", "許容引張（全強）を伝達できること"),
             ("継手位置", "応力の小さい位置に設ける"),
             ("隣接継手のずらし", "0.5・L1 以上（千鳥配置）"),
             ("鉄筋位置", "上端筋は付着低下を考慮し割増し"),
             ("かぶり・あき", "標準的なかぶり厚・鉄筋あき"),
             ("適用径", "太径（D35 以上）は重ね継手不可")]
    for i, (k, v) in enumerate(items):
        y = 0.80 - i * 0.115
        ax.add_patch(mpatches.Rectangle((0.04, y - 0.02), 0.92, 0.09, transform=ax.transAxes,
                     fc="#f2f7fc" if i % 2 == 0 else "#ffffff", ec="#bfbfbf", lw=0.7))
        ax.text(0.07, y + 0.025, k, transform=ax.transAxes, fontproperties=jp,
                fontsize=8.8, fontweight="bold", color="#1f3a5f")
        ax.text(0.42, y + 0.025, v, transform=ax.transAxes, fontproperties=jp,
                fontsize=8.5, color="#333")
    ax.text(0.05, 0.06, "『表の数字』だけでなく、継手位置・千鳥・太径不可の\n"
            "3つの前提を必ずセットで確認する",
            transform=ax.transAxes, fontproperties=jp, fontsize=9, color="#c00000", va="bottom")
    ax.axis("off")
    ax.set_title("(b) 仮定条件の一覧", fontproperties=jp, fontsize=10, fontweight="bold")
    fig.suptitle("補足図  継手長一覧表の計算仮定条件と千鳥配置",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "rebar_splice", "fig_add_stagger.png")


# ---------- 9. retaining_wall / 5 必要鉄筋・配筋 ----------
def f_wall():
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 5.4), gridspec_kw={"width_ratios": [1.15, 1.0]})
    ax = axes[0]
    # 擁壁断面（L型）
    ax.add_patch(mpatches.Polygon([[2.0, 0.8], [2.5, 0.8], [2.5, 6.0], [2.0, 6.0]],
                 fc="#d9d9d9", ec="k", lw=1.2))
    ax.add_patch(mpatches.Rectangle((0.6, 0.3), 3.6, 0.5, fc="#d9d9d9", ec="k", lw=1.2))
    ax.add_patch(mpatches.Polygon([[2.5, 0.8], [4.2, 0.8], [4.2, 6.0], [2.5, 6.0]],
                 fc="#f0e6d2", ec="none"))
    # 主筋（引張側）
    ax.plot([2.42, 2.42], [0.9, 5.9], color="#c00000", lw=3)
    ax.plot([2.42, 3.9], [0.9, 0.9], color="#c00000", lw=3)  # かかと側へ定着
    ax.text(4.35, 3.4, "竪壁主筋\n（背面＝引張側）", fontproperties=jp, fontsize=8.5,
            color="#c00000", va="center")
    ax.plot([2.6, 4.1], [0.72, 0.72], color="#1f7a1f", lw=3)
    ax.annotate("かかと版主筋（上側＝引張）", xy=(3.5, 0.72), xytext=(4.9, -0.55),
                fontproperties=jp, fontsize=8, color="#1f7a1f",
                arrowprops=dict(arrowstyle="->", color="#1f7a1f"))
    ax.plot([0.7, 2.1], [0.38, 0.38], color="#2a78d6", lw=3)
    ax.annotate("つま先版主筋（下側＝引張）", xy=(1.3, 0.38), xytext=(-0.35, -1.15),
                fontproperties=jp, fontsize=8, color="#2a78d6",
                arrowprops=dict(arrowstyle="->", color="#2a78d6"))
    ax.annotate("出隅・入隅の定着に注意\n（L 型に鉄筋を回す）", xy=(2.6, 1.0), xytext=(4.7, 1.5),
                fontproperties=jp, fontsize=8.5, color="#833c00",
                arrowprops=dict(arrowstyle="->", color="#833c00"))
    # 上部カットオフ
    ax.plot([2.42, 2.42], [4.2, 5.9], color="#c00000", lw=6, alpha=0.25)
    ax.annotate("上部は応力小\n→ カットオフ可", xy=(2.36, 5.2), xytext=(1.75, 5.9),
                ha="right", fontproperties=jp, fontsize=8, color="#777",
                arrowprops=dict(arrowstyle="->", color="#999"))
    ax.set_xlim(-0.9, 8.4); ax.set_ylim(-1.7, 6.6); ax.axis("off")
    ax.set_title("(a) 擁壁の配筋（引張側に主筋）", fontproperties=jp, fontsize=10, fontweight="bold")
    ax = axes[1]
    ax.text(0.5, 0.95, "必要鉄筋量の算定", transform=ax.transAxes, ha="center",
            fontproperties=jp, fontsize=11, fontweight="bold", color="#1f4e79")
    ax.text(0.05, 0.80,
            "As = M / (ft・j)\n\n"
            "  ft：鉄筋の許容引張応力度\n"
            "      （SD295 長期 195 N/mm²）\n"
            "  j ：応力中心間距離 = 7/8・d\n"
            "  d ：有効せい = 部材厚 − かぶり\n\n"
            "【竪壁の例】M=124.9 kN・m/m, 厚500, かぶり70\n"
            "  d = 500 − 70 = 430mm\n"
            "  j = 7/8 × 430 = 376mm\n"
            "  As = 124.9×10^6 /(195×376) ≒ 1703 mm²/m\n"
            "  → D19@150（1910 mm²/m）で OK",
            transform=ax.transAxes, fontproperties=jp, fontsize=9, va="top")
    ax.text(0.05, 0.05, "※ 許容応力度・かぶりは規準で確認要。",
            transform=ax.transAxes, fontproperties=jp, fontsize=8, color="#833c00")
    ax.axis("off")
    ax.set_title("(b) As = M/(ft・j) の計算", fontproperties=jp, fontsize=10, fontweight="bold")
    fig.suptitle("補足図  擁壁の必要鉄筋量と配筋計画", fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "retaining_wall", "fig_add_rebar.png")


# ---------- 10. special_slab / 6 施工方法・留意点 ----------
def f_slab():
    fig, axes = plt.subplots(1, 2, figsize=(13.5, 5.0))
    ax = axes[0]
    # ハーフPCa + トッピング + 支保工
    ax.add_patch(mpatches.Rectangle((0.5, 2.2), 6.0, 0.55, fc="#c8c8c8", ec="k", lw=1.2))
    ax.text(3.5, 2.45, "ハーフPCa 板", ha="center", fontproperties=jp, fontsize=8.5)
    ax.add_patch(mpatches.Rectangle((0.5, 2.75), 6.0, 0.65, fc="#e8e0d0", ec="k", lw=1.2))
    ax.text(3.5, 3.05, "トッピングコンクリート（現場打ち）", ha="center",
            fontproperties=jp, fontsize=8.5)
    # トラス筋
    xs = np.linspace(0.9, 6.1, 11)
    ax.plot(xs, 2.75 + 0.5 * (np.arange(11) % 2), color="#c00000", lw=1.4)
    ax.text(6.7, 3.3, "トラス筋\n（一体化）", fontproperties=jp, fontsize=8, color="#c00000")
    # 支保工
    for x in [1.6, 3.5, 5.4]:
        ax.plot([x, x], [0.4, 2.2], color="#548235", lw=3)
        ax.plot([x - 0.25, x + 0.25], [0.4, 0.4], color="#548235", lw=3)
    ax.text(3.5, 0.05, "支保工：施工時応力の低減・たわみ管理", ha="center",
            fontproperties=jp, fontsize=8.5, color="#548235")
    ax.text(3.5, 3.85, "接合面の目荒し → 合成の成立", ha="center",
            fontproperties=jp, fontsize=8.5, color="#833c00")
    ax.set_xlim(0, 8.6); ax.set_ylim(-0.3, 4.2); ax.axis("off")
    ax.set_title("(a) ハーフPCa・支保工・トッピング", fontproperties=jp, fontsize=10, fontweight="bold")
    ax = axes[1]
    # ボイドスラブ
    ax.add_patch(mpatches.Rectangle((0.5, 1.6), 7.0, 1.5, fc="#e8e0d0", ec="k", lw=1.2))
    for cx in [1.6, 3.1, 4.6, 6.1]:
        ax.add_patch(mpatches.Ellipse((cx, 2.35), 1.1, 0.85, fc="white", ec="k", lw=1))
    ax.text(4.0, 3.35, "ボイドスラブ断面", ha="center", fontproperties=jp, fontsize=9)
    for cx in [1.6, 3.1, 4.6, 6.1]:
        ax.annotate("", xy=(cx, 3.0), xytext=(cx, 2.5),
                    arrowprops=dict(arrowstyle="-|>", color="#1f77b4", lw=1.6))
    ax.text(0.2, 0.95, "打設時の浮力でボイド管が浮くと\nかぶり・断面性能が狂う → 固定金具で浮上り防止",
            fontproperties=jp, fontsize=8.5, color="#c00000")
    ax.text(0.2, 0.25, "品質管理：PCa製作精度／目荒し／トッピング強度／\n"
            "ボイド管の固定・かぶり／トラス筋の定着・継手",
            fontproperties=jp, fontsize=8.5, color="#1f4e79")
    ax.set_xlim(0, 8.2); ax.set_ylim(-0.2, 3.8); ax.axis("off")
    ax.set_title("(b) ボイド管の浮上り防止と品質管理", fontproperties=jp, fontsize=10, fontweight="bold")
    fig.suptitle("補足図  特殊スラブの施工方法と構造的留意点",
                 fontproperties=jp, fontsize=13, fontweight="bold")
    return save(fig, "special_slab", "fig_add_construction.png")


# ---------- 11. steel_ratio / 上限下限値早見表 ----------
def f_ratio():
    fig, ax = plt.subplots(figsize=(12.5, 5.6))
    items = [("pg（柱主筋比）", 0.8, 4.0, 6.0, "#2a78d6"),
             ("pt（梁引張鉄筋比）", 0.4, 1.8, None, "#c00000"),
             ("pw（柱帯筋）", 0.2, 1.2, None, "#548235"),
             ("pw（梁あばら筋）", 0.2, 1.2, None, "#c8952a"),
             ("ps（壁筋）", 0.25, 1.2, None, "#7a4fa3")]
    y = np.arange(len(items))[::-1]
    for i, (nm, lo, hi, hi2, c) in enumerate(items):
        yy = y[i]
        ax.barh(yy, hi - lo, left=lo, height=0.42, color=c, alpha=0.55, ec="k")
        if hi2:
            ax.barh(yy, hi2 - hi, left=hi, height=0.42, color=c, alpha=0.22, ec="k", ls="--")
            ax.text(hi2 + 0.08, yy, f"{hi2}%（短柱・最下層）", va="center",
                    fontproperties=jp, fontsize=8, color=c)
        ax.text(lo - 0.08, yy, f"{lo}%", ha="right", va="center",
                fontproperties=jp, fontsize=8.5, color="#c00000")
        ax.text(hi + 0.06 if not hi2 else hi + 0.02, yy + 0.32, f"{hi}%",
                va="center", fontproperties=jp, fontsize=8.5, color=c)
    ax.set_yticks(y)
    ax.set_yticklabels([it[0] for it in items], fontproperties=jp, fontsize=9.5)
    ax.set_xlabel("鉄筋比 (%)", fontproperties=jp, fontsize=9.5)
    ax.set_xlim(-0.75, 7.6); ax.set_ylim(-0.75, 4.6); ax.grid(alpha=0.3, axis="x")
    ax.text(2.75, 3.05, "下限：鉄筋として有効に働く最低量\n上限：配筋過密・靭性確保の限界",
            fontproperties=jp, fontsize=9, color="#1f4e79", va="center",
            bbox=dict(boxstyle="round", fc="#eaf1fb", ec="#2e75b6"))
    ax.text(2.75, 1.25, "覚え方\n pg：最低0.8・最大4（短柱6）\n pt：下限0.4・上限は 0.75・pb 程度\n"
            " pw・ps：下限0.2〜0.25（法令）",
            fontproperties=jp, fontsize=8.8, color="#333", va="center",
            bbox=dict(boxstyle="round", fc="#fdf6e3", ec="#c8952a"))
    ax.set_title("補足図  鉄筋比の上限・下限 早見チャート",
                 fontproperties=jp, fontsize=13, fontweight="bold", pad=14)
    return save(fig, "steel_ratio", "fig_add_range.png")


# ===== 生成 =====
JOBS = [
    ("bond_design", "付着設計問題集.xlsx", "8-3 付着設計法", f_bond, 860),
    ("collapse", "崩壊形問題集.xlsx", "4 目標耐震性能の差", f_collapse, 860),
    ("rc_basics", "RC造基礎問題集.xlsx", "No.1-2 長所・短所", f_rcbasics, 860),
    ("rc_joint", "柱梁接合部問題集.xlsx", "9-5 せん断終局強度", f_joint, 820),
    ("rebar_anchorage", "鉄筋定着問題集.xlsx", "6-3 L2・L2h 暗記", f_l2, 860),
    ("rebar_anchorage", "鉄筋定着問題集.xlsx", "6-4 計算仮定条件", f_assump, 860),
    ("rebar_splice", "鉄筋継手問題集.xlsx", "7-3 L1・L1h 暗記", f_l1, 860),
    ("rebar_splice", "鉄筋継手問題集.xlsx", "7-4 計算仮定条件", f_stagger, 860),
    ("retaining_wall", "擁壁設計問題集.xlsx", "5 必要鉄筋・配筋", f_wall, 860),
    ("special_slab", "特殊スラブ問題集.xlsx", "6 施工方法・留意点", f_slab, 860),
    ("steel_ratio", "鉄筋比問題集.xlsx", "上限下限値早見表", f_ratio, 800),
]

from openpyxl import load_workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.drawing.image import Image as XLImage
C_HEAD = "2E75B6"
f_head = Font(name="MS PGothic", size=11, bold=True, color="FFFFFF")

# 図を生成
paths = {}
for topic, fname, sheet, fn, w in JOBS:
    if (topic, sheet) not in paths:
        paths[(topic, sheet)] = fn()
        print("fig:", paths[(topic, sheet)])

# ブック単位で挿入（同一ブックの複数シートに対応）
from collections import defaultdict
byfile = defaultdict(list)
for topic, fname, sheet, fn, w in JOBS:
    byfile[(topic, fname)].append((sheet, paths[(topic, sheet)], w))

for (topic, fname), items in byfile.items():
    p = os.path.join("docs", topic, fname)
    wb = load_workbook(p)
    for sheet, imgpath, w in items:
        ws = wb[sheet]
        r = ws.max_row + 2
        ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=8)
        c = ws.cell(r, 1, "■ 補足図（理解の整理）")
        c.font = f_head; c.fill = PatternFill("solid", fgColor=C_HEAD)
        c.alignment = Alignment(vertical="center", horizontal="left", indent=1)
        ws.row_dimensions[r].height = 22
        img = XLImage(imgpath)
        ratio = w / img.width; img.width = w; img.height = int(img.height * ratio)
        ws.add_image(img, f"A{r + 1}")
    wb.save(p)
    print("updated:", p, [s for s, _, _ in items])
print("done")
