#!/usr/bin/env python3
"""L型RC擁壁の応力図(曲げモーメント)をmatplotlibで生成。"""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib import rcParams
import numpy as np

rcParams["font.family"] = "IPAGothic"
rcParams["axes.unicode_minus"] = False

fig = plt.figure(figsize=(14, 11))

# ============== ① 構造図 (左上) ==============
ax1 = fig.add_subplot(2, 2, 1)
ax1.set_title("① L型擁壁の構造と作用荷重", fontsize=14, fontweight="bold", color="#0d47a1")

# 竪壁(左寄りに配置)
WALL_X = 0.6
ax1.add_patch(mpatches.Rectangle((WALL_X, 0.4), 0.3, 4.0, facecolor="#cfd8dc",
                                  edgecolor="#37474f", linewidth=1.5))
# 底版(かかと側のみ、つま先版なし)
ax1.add_patch(mpatches.Rectangle((WALL_X, 0.0), 2.4, 0.4, facecolor="#cfd8dc",
                                  edgecolor="#37474f", linewidth=1.5))
# 背面盛土
ax1.add_patch(mpatches.Polygon([[WALL_X + 0.3, 0.4], [3.0, 0.4],
                                [3.0, 4.4], [WALL_X + 0.3, 4.4]],
                                facecolor="#d7ccc8", edgecolor="#5d4037"))
# 土圧三角形
ax1.add_patch(mpatches.Polygon([[WALL_X + 0.3, 0.4], [WALL_X + 0.3, 4.4],
                                [WALL_X + 0.3 + 0.9, 0.4]],
                                facecolor="#90caf9", alpha=0.6,
                                edgecolor="#1565c0"))
for y in [3.6, 2.6, 1.6, 0.7]:
    px = (WALL_X + 0.3) + (4.4 - y) * 0.9 / 4.0
    ax1.annotate("", xy=(WALL_X + 0.31, y), xytext=(px, y),
                 arrowprops=dict(arrowstyle="->", color="#1565c0", lw=1.4))
ax1.text(2.05, 2.6, "主働土圧 P", color="#0d47a1", fontsize=10)
ax1.text(2.05, 2.4, "(三角形分布)", color="#0d47a1", fontsize=10)

# 上載土の重量(かかと版上)
for x in np.linspace(1.0, 2.85, 6):
    ax1.annotate("", xy=(x, 0.45), xytext=(x, 1.0),
                 arrowprops=dict(arrowstyle="->", color="#6d4c41", lw=1.3))
ax1.text(2.0, 1.15, "↓ 上載土+自重 W", color="#6d4c41", fontsize=10, ha="center")

# 地盤反力(かかと版底面のみ、偏り台形)
for x in np.linspace(0.7, 2.9, 7):
    # かかと側ほど大きい台形
    t = (x - 0.7) / 2.2
    q = 0.25 + t * 0.35
    ax1.annotate("", xy=(x, 0.0), xytext=(x, -q),
                 arrowprops=dict(arrowstyle="->", color="#2e7d32", lw=1.3))
ax1.text(1.7, -0.95, "↑ 地盤反力 q (偏り台形)", color="#1b5e20", fontsize=10, ha="center")

# 「つま先版なし」表示
ax1.add_patch(mpatches.Rectangle((-0.05, 0.0), WALL_X + 0.05, 0.4,
                                  facecolor="none", edgecolor="#c62828",
                                  linestyle="--", linewidth=1.5))
ax1.text(0.27, -0.3, "つま先版なし", color="#c62828", fontsize=10,
         ha="center", fontweight="bold")

ax1.text(1.7, 0.18, "かかと版", fontsize=10, ha="center")
ax1.text(WALL_X + 0.15, 2.3, "竪壁", fontsize=11, rotation=90, ha="center")

ax1.set_xlim(-0.4, 3.4)
ax1.set_ylim(-1.3, 5.0)
ax1.set_aspect("equal")
ax1.axis("off")

# ============== ② 竪壁のM図 (右上) ==============
ax2 = fig.add_subplot(2, 2, 2)
ax2.set_title("② 竪壁のM図 (深さの3次関数)", fontsize=14, fontweight="bold", color="#b71c1c")

ax2.plot([0, 0], [0, 4.0], "k-", lw=2)
ax2.add_patch(mpatches.Rectangle((-0.08, 0), 0.16, 4.0, facecolor="#eceff1",
                                  edgecolor="#90a4ae"))
H = 4.0
Mmax = 1.8
y = np.linspace(0, H, 100)
M = (y / H) ** 3 * Mmax
poly_x = np.concatenate([[0], M, [0]])
poly_y = np.concatenate([[0], y, [H]])
ax2.fill(poly_x, poly_y, color="#ef9a9a", alpha=0.85, edgecolor="#b71c1c", lw=2)

ax2.plot(Mmax, H, "ko", markersize=8)
ax2.annotate("M_max\n(付け根)", xy=(Mmax, H), xytext=(Mmax + 0.3, H - 0.3),
             fontsize=11, color="#b71c1c", fontweight="bold",
             arrowprops=dict(arrowstyle="->", color="#b71c1c"))
ax2.text(0.7, 2.0, "M ∝ y³\n背面側引張", fontsize=12, color="#b71c1c", fontweight="bold")
ax2.text(-0.9, 3.9, "天端", fontsize=10)
ax2.text(-0.9, 0.05, "付け根", fontsize=10)
ax2.text(0.4, 4.45, "※ 逆T式と同形", fontsize=9, color="#555")

ax2.set_xlim(-1.0, 2.8)
ax2.set_ylim(-0.3, 4.5)
ax2.invert_yaxis()
ax2.axis("off")

# ============== ③ 底版(かかと版のみ)のM図 (下段全幅) ==============
ax3 = fig.add_subplot(2, 1, 2)
ax3.set_title("③ 底版(かかと版)のM図 — つま先版がないので片側だけ",
              fontsize=14, fontweight="bold", color="#1b5e20")

# 底版輪郭(参考)
WALL_LEFT = -0.15
WALL_RIGHT = 0.15
HEEL_END = 3.0
ax3.add_patch(mpatches.Rectangle((WALL_LEFT, -0.15), HEEL_END - WALL_LEFT, 0.15,
                                  facecolor="#eceff1", edgecolor="#90a4ae"))
# 竪壁
ax3.add_patch(mpatches.Rectangle((WALL_LEFT, -0.15), 0.3, 0.6,
                                  facecolor="#cfd8dc", edgecolor="#37474f", lw=1.5))
ax3.text(0, 0.35, "竪壁", ha="center", fontsize=10)

# 「つま先版なし」表示
ax3.add_patch(mpatches.Rectangle((-1.5, -0.15), 1.35, 0.15,
                                  facecolor="none", edgecolor="#c62828",
                                  linestyle="--", linewidth=1.5))
ax3.text(-0.8, -0.45, "つま先版なし(M=0)", color="#c62828",
         fontsize=11, ha="center", fontweight="bold")

# 基準軸(M=0)
ax3.axhline(0, color="black", lw=1.6, zorder=3)

# ----- かかと版のM(竪壁背面で最大、かかと端でM=0、下面引張→下に凸) -----
L_heel = HEEL_END - WALL_RIGHT
x_heel = np.linspace(WALL_RIGHT, HEEL_END, 60)
xi = (HEEL_END - x_heel) / L_heel  # 1(危険断面) → 0(端)
M_heel = -(xi ** 2) * 2.0
ax3.fill_between(x_heel, 0, M_heel, color="#a5d6a7", alpha=0.9,
                 edgecolor="#1b5e20", lw=2)
ax3.plot(WALL_RIGHT, -2.0, "ko", markersize=8)
ax3.annotate("M_max(竪壁背面)\n= 危険断面", xy=(WALL_RIGHT, -2.0),
             xytext=(1.0, -2.5), fontsize=11, color="#1b5e20", fontweight="bold",
             arrowprops=dict(arrowstyle="->", color="#1b5e20"))
ax3.text(1.6, -0.7, "かかと版\n下面引張", fontsize=13, color="#1b5e20",
         fontweight="bold", ha="center")
ax3.text(HEEL_END, 0.25, "M=0\n(かかと端)", fontsize=10, color="#1b5e20", ha="center")

# 軸ラベル
ax3.text(3.1, 0, "M=0軸", fontsize=10, va="center")
ax3.text(-1.5, 0.6, "↑ +M (上面引張)", fontsize=10, color="#e65100")
ax3.text(-1.5, -3.0, "↓ −M (下面引張)", fontsize=10, color="#1b5e20")

# L型vs逆Tの比較メモ
note = (
    "【L型擁壁の特徴】\n"
    "・つま先版がない → 用地境界が前面側にある(道路境界など)場合に採用\n"
    "・地盤反力はかかと側に偏る台形分布(底版回転 → 反力分布が片寄り)\n"
    "・逆T式より転倒・滑動に弱く、適用高さは概ねH=3m程度以下に制限\n"
    "・竪壁のM_max ≒ 逆T式と同等(竪壁の力学は同じ)\n"
    "・底版はかかと版のみで設計 → 主鉄筋は上面側ではなく\n"
    "  『下面側(下面引張)』に配置"
)
ax3.text(-1.5, -1.5, note, fontsize=10, color="#333",
         bbox=dict(boxstyle="round,pad=0.5", facecolor="#fff9c4",
                   edgecolor="#f9a825"))

ax3.set_xlim(-2.0, 3.3)
ax3.set_ylim(-3.3, 1.0)
ax3.axis("off")

plt.suptitle("L型RC擁壁の応力図(曲げモーメント)",
             fontsize=18, fontweight="bold", y=0.995)
plt.tight_layout()
plt.savefig("/home/user/-/L_wall_BMD.png", dpi=140, bbox_inches="tight",
            facecolor="white")
print("saved")
