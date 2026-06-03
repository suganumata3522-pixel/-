#!/usr/bin/env python3
"""擁壁タイプ別 曲げモーメント図(BMD)の比較 — matplotlib版。
各パネル: 壁断面の輪郭 + 竪壁/底版のBMDを直接重ねて表示。
"""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib import rcParams
import numpy as np

rcParams["font.family"] = "IPAGothic"
rcParams["axes.unicode_minus"] = False

# 色
C_WALL = "#cfd8dc"; C_WEDGE = "#37474f"
C_STEM = "#ef9a9a"; C_STEM_E = "#b71c1c"   # 竪壁M(背面引張)
C_TOE = "#ffcc80";  C_TOE_E = "#e65100"     # つま先M(上面引張)
C_HEEL = "#a5d6a7"; C_HEEL_E = "#1b5e20"    # かかとM(下面引張)
C_SOIL = "#d7ccc8"

def stem_bmd(ax, x0, y_base, y_top, scale, side=+1):
    """竪壁BMD: 付け根(y_base)で最大、天端(y_top)で0。3次曲線。
    side=+1 で背面(右)側に膨らむ。"""
    H = y_base - y_top  # 正
    yy = np.linspace(y_top, y_base, 60)
    # 付け根で最大 → (depth/H)^3
    depth = yy - y_top
    M = (depth / H) ** 3 * scale * side
    px = np.concatenate([[x0], x0 + M, [x0]])
    py = np.concatenate([[y_top], yy, [y_base]])
    ax.fill(px, py, color=C_STEM, alpha=0.85, edgecolor=C_STEM_E, lw=1.8)
    ax.plot(x0 + scale * side, y_base, "ko", ms=6)
    return x0 + scale * side, y_base

def toe_bmd(ax, x_crit, x_end, y0, scale):
    """つま先版BMD: 危険断面(x_crit=竪壁前面)で最大、端(x_end)で0。
    上面引張 → 上(+)に凸。x_end < x_crit。"""
    xx = np.linspace(x_end, x_crit, 50)
    L = x_crit - x_end
    M = ((xx - x_end) / L) ** 2 * scale
    ax.fill_between(xx, y0, y0 + M, color=C_TOE, alpha=0.9, edgecolor=C_TOE_E, lw=1.8)
    ax.plot(x_crit, y0 + scale, "ko", ms=6)

def heel_bmd(ax, x_crit, x_end, y0, scale):
    """かかと版BMD: 危険断面(x_crit=竪壁背面)で最大、端(x_end)で0。
    下面引張 → 下(−)に凸。x_end > x_crit。"""
    xx = np.linspace(x_crit, x_end, 50)
    L = x_end - x_crit
    M = ((x_end - xx) / L) ** 2 * scale
    ax.fill_between(xx, y0, y0 - M, color=C_HEEL, alpha=0.9, edgecolor=C_HEEL_E, lw=1.8)
    ax.plot(x_crit, y0 - scale, "ko", ms=6)

def base_setup(ax, title):
    ax.set_title(title, fontsize=13, fontweight="bold", color="#0d47a1")
    ax.set_xlim(-3.2, 3.6); ax.set_ylim(-3.0, 4.6)
    ax.set_aspect("equal"); ax.axis("off")

# ======================= 図の作成 =======================
fig, axes = plt.subplots(2, 3, figsize=(16, 11))

# ---------- ① 逆T式 ----------
ax = axes[0, 0]; base_setup(ax, "① 逆T式(片持ばり式)")
ax.add_patch(mpatches.Rectangle((-0.15, 0), 0.3, 3.2, fc=C_WALL, ec=C_WEDGE))  # 竪壁
ax.add_patch(mpatches.Rectangle((-1.5, -0.3), 3.6, 0.3, fc=C_WALL, ec=C_WEDGE)) # 底版
ax.add_patch(mpatches.Polygon([[0.15,0],[2.1,0],[2.1,3.2],[0.15,3.2]], fc=C_SOIL, ec="#5d4037", alpha=0.6))
stem_bmd(ax, 0.15, 3.2, 0.15, 1.4, side=+1)   # 竪壁M(背面右)
toe_bmd(ax, -0.15, -1.5, 0.0, 0.9)            # つま先(左、上面引張)
heel_bmd(ax, 0.15, 2.1, -0.3, 1.3)            # かかと(右、下面引張)
ax.text(0, -0.7, "つま先", ha="center", fontsize=9, color=C_TOE_E)
ax.text(1.3, -0.7, "かかと", ha="center", fontsize=9, color=C_HEEL_E)
ax.text(1.6, 2.3, "M∝y³", fontsize=10, color=C_STEM_E)

# ---------- ② L型(かかと版のみ) ----------
ax = axes[0, 1]; base_setup(ax, "② L型(かかと版のみ)")
ax.add_patch(mpatches.Rectangle((-0.15, 0), 0.3, 3.2, fc=C_WALL, ec=C_WEDGE))
ax.add_patch(mpatches.Rectangle((-0.15, -0.3), 2.25, 0.3, fc=C_WALL, ec=C_WEDGE)) # かかと側のみ
ax.add_patch(mpatches.Polygon([[0.15,0],[2.1,0],[2.1,3.2],[0.15,3.2]], fc=C_SOIL, ec="#5d4037", alpha=0.6))
stem_bmd(ax, 0.15, 3.2, 0.15, 1.4, side=+1)
heel_bmd(ax, 0.15, 2.1, -0.3, 1.5)
ax.plot([-1.5, -0.15], [-0.15, -0.15], color="#c62828", ls="--", lw=1.5)
ax.text(-0.8, -0.6, "つま先版なし", ha="center", fontsize=9, color="#c62828", fontweight="bold")
ax.text(1.3, -0.7, "かかと(下面引張)", ha="center", fontsize=8.5, color=C_HEEL_E)
ax.text(1.6, 2.3, "M∝y³", fontsize=10, color=C_STEM_E)

# ---------- ③ 逆L型(つま先版のみ) ----------
ax = axes[0, 2]; base_setup(ax, "③ 逆L型(つま先版のみ)")
ax.add_patch(mpatches.Rectangle((-0.15, 0), 0.3, 3.2, fc=C_WALL, ec=C_WEDGE))
ax.add_patch(mpatches.Rectangle((-2.1, -0.3), 2.25, 0.3, fc=C_WALL, ec=C_WEDGE)) # つま先側のみ
ax.add_patch(mpatches.Polygon([[0.15,0],[2.1,0],[2.1,3.2],[0.15,3.2]], fc=C_SOIL, ec="#5d4037", alpha=0.6))
stem_bmd(ax, 0.15, 3.2, 0.15, 1.4, side=+1)
toe_bmd(ax, -0.15, -2.0, 0.0, 1.3)
ax.plot([0.15, 1.5], [-0.15, -0.15], color="#c62828", ls="--", lw=1.5)
ax.text(0.85, -0.6, "かかと版なし", ha="center", fontsize=9, color="#c62828", fontweight="bold")
ax.text(-1.2, -0.7, "つま先(上面引張)", ha="center", fontsize=8.5, color=C_TOE_E)
ax.text(1.6, 2.3, "M∝y³", fontsize=10, color=C_STEM_E)

# ---------- ④ 重力式 ----------
ax = axes[1, 0]; base_setup(ax, "④ 重力式(無筋)")
ax.add_patch(mpatches.Polygon([[-0.55,0],[0.0,3.0],[0.5,3.0],[1.1,0]], fc=C_WALL, ec=C_WEDGE))
ax.add_patch(mpatches.Polygon([[0.5,0],[2.2,0],[2.2,3.0],[0.5,3.0]], fc=C_SOIL, ec="#5d4037", alpha=0.6))
# 小さいBMD(引張を出さない)
yy = np.linspace(0, 3.0, 50)
M = (1 - yy/3.0)  # 付け根で最大の小さいM(参考)
ax.fill(np.concatenate([[0.0], 0.0 + ((3.0-yy)/3.0)**2*0.6, [0.0]]),
        np.concatenate([[3.0], yy, [0]]), color=C_STEM, alpha=0.6, edgecolor=C_STEM_E, lw=1.5)
ax.plot(0.6, 0, "ko", ms=6)
ax.text(-2.9, 1.6, "合力を断面中央\n1/3(核)内に収め\n引張を生じさせ\nない設計\n→ 鉄筋不要", fontsize=9.5,
        bbox=dict(boxstyle="round,pad=0.4", fc="#fff9c4", ec="#f9a825"))

# ---------- ⑤ もたれ式 ----------
ax = axes[1, 1]; base_setup(ax, "⑤ もたれ式(寄りかかり式)")
# 斜面にもたれる
ax.add_patch(mpatches.Polygon([[2.0,-0.3],[3.0,3.2],[2.4,3.2],[1.4,-0.3]], fc=C_SOIL, ec="#5d4037", alpha=0.6))
ax.add_patch(mpatches.Polygon([[0.6,-0.3],[1.8,3.0],[2.3,3.0],[1.3,-0.3]], fc=C_WALL, ec=C_WEDGE))
ax.add_patch(mpatches.Rectangle((-0.0, -0.6), 2.0, 0.3, fc=C_WALL, ec=C_WEDGE))
ax.text(-2.9, 1.4, "背面地山に\nもたれて安定\n→ 壁体の曲げは\n小さい\n(主に圧縮)\n比較的急勾配", fontsize=9.5,
        bbox=dict(boxstyle="round,pad=0.4", fc="#fff9c4", ec="#f9a825"))

# ---------- ⑥ 控え壁式 ----------
ax = axes[1, 2]; base_setup(ax, "⑥ 控え壁(バットレス)式")
ax.set_ylim(-3.0, 4.6)
# 平面図的: 竪壁を上から見る
ax.plot([-2.0, 2.5], [2.8, 2.8], "k-", lw=2)
for cx in [-1.5, 0.0, 1.5]:
    ax.add_patch(mpatches.Rectangle((cx-0.08, 2.0), 0.16, 0.8, fc=C_WEDGE))
    ax.text(cx, 1.85, "控え壁", ha="center", fontsize=7.5)
# 水平連続版のBMD(支点で負・中央で正)
xs = np.linspace(-1.5, 1.5, 200)
# 連続梁: cos的に支点(-1.5,0,1.5)で負、中央(-0.75,0.75)で正
Mh = -0.6*np.cos((xs+1.5)/1.5*np.pi)
ax.fill_between(xs, 0.5, 0.5 + Mh*0.7, color=C_STEM, alpha=0.7, edgecolor=C_STEM_E, lw=1.5)
ax.axhline(0.5, color="k", lw=1, xmin=0.1, xmax=0.92)
ax.text(-2.9, -1.2, "竪壁=控え壁を支点\nとする水平連続版\n→支点(控え壁)で負M\n 中央で正M\n+鉛直方向の曲げ\n大型擁壁向き(H大)", fontsize=9,
        bbox=dict(boxstyle="round,pad=0.4", fc="#fff9c4", ec="#f9a825"))

# 凡例(figure全体)
handles = [
    mpatches.Patch(fc=C_STEM, ec=C_STEM_E, label="竪壁M(背面引張)/連続版M"),
    mpatches.Patch(fc=C_TOE, ec=C_TOE_E, label="つま先版M(上面引張)"),
    mpatches.Patch(fc=C_HEEL, ec=C_HEEL_E, label="かかと版M(下面引張)"),
    plt.Line2D([0],[0], marker="o", color="w", markerfacecolor="k", markersize=8, label="M_max(危険断面)"),
]
fig.legend(handles=handles, loc="lower center", ncol=4, fontsize=11,
           frameon=True, bbox_to_anchor=(0.5, 0.005))

plt.suptitle("擁壁タイプ別 曲げモーメント図(BMD)の比較",
             fontsize=19, fontweight="bold", y=0.99)
plt.tight_layout(rect=[0, 0.045, 1, 0.97])
plt.savefig("/home/user/-/retaining_wall_BMD_patterns.png", dpi=135,
            bbox_inches="tight", facecolor="white")
print("saved")
