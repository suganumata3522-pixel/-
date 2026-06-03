#!/usr/bin/env python3
"""逆T式RC擁壁の応力図(曲げモーメント)をmatplotlibで生成。"""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib import rcParams
import numpy as np

# 日本語フォント
rcParams["font.family"] = "IPAGothic"
rcParams["axes.unicode_minus"] = False

fig = plt.figure(figsize=(14, 11))

# ============== ① 構造図 (左上) ==============
ax1 = fig.add_subplot(2, 2, 1)
ax1.set_title("① 構造と作用荷重", fontsize=14, fontweight="bold", color="#0d47a1")

# 竪壁
ax1.add_patch(mpatches.Rectangle((1.0, 0.4), 0.3, 4.0, facecolor="#cfd8dc",
                                  edgecolor="#37474f", linewidth=1.5))
# 底版
ax1.add_patch(mpatches.Rectangle((0.0, 0.0), 3.0, 0.4, facecolor="#cfd8dc",
                                  edgecolor="#37474f", linewidth=1.5))
# 背面盛土
ax1.add_patch(mpatches.Polygon([[1.3, 0.4], [3.0, 0.4], [3.0, 4.4], [1.3, 4.4]],
                                facecolor="#d7ccc8", edgecolor="#5d4037"))
# 土圧三角形
ax1.add_patch(mpatches.Polygon([[1.3, 0.4], [1.3, 4.4], [2.2, 0.4]],
                                facecolor="#90caf9", alpha=0.6,
                                edgecolor="#1565c0"))
# 土圧矢印
for y in [3.6, 2.6, 1.6, 0.7]:
    px = 1.3 + (4.4 - y) * 0.9 / 4.0
    ax1.annotate("", xy=(1.32, y), xytext=(px, y),
                 arrowprops=dict(arrowstyle="->", color="#1565c0", lw=1.4))
ax1.text(2.5, 2.5, "主働土圧 P\n(三角形分布)", color="#0d47a1", fontsize=10)
# 地盤反力
for x in np.linspace(0.15, 2.85, 8):
    q = 0.55 - (x / 3.0) * 0.25  # 台形
    ax1.annotate("", xy=(x, 0.0), xytext=(x, -q),
                 arrowprops=dict(arrowstyle="->", color="#2e7d32", lw=1.3))
ax1.text(1.0, -0.85, "↑ 地盤反力 q (台形分布)", color="#1b5e20", fontsize=10)
ax1.text(0.4, 0.18, "つま先", fontsize=10)
ax1.text(2.0, 0.18, "かかと", fontsize=10)
ax1.text(1.15, 2.3, "竪壁", fontsize=11, rotation=90)

ax1.set_xlim(-0.3, 3.4)
ax1.set_ylim(-1.1, 5.0)
ax1.set_aspect("equal")
ax1.axis("off")

# ============== ② 竪壁の曲げモーメント図 (右上) ==============
ax2 = fig.add_subplot(2, 2, 2)
ax2.set_title("② 竪壁のM図 (深さの3次関数)", fontsize=14, fontweight="bold", color="#b71c1c")

# 中心軸(竪壁)
ax2.plot([0, 0], [0, 4.0], "k-", lw=2)
# 竪壁本体(薄く)
ax2.add_patch(mpatches.Rectangle((-0.08, 0), 0.16, 4.0, facecolor="#eceff1",
                                  edgecolor="#90a4ae"))
# M分布: M ∝ (H-y)^3 / H^3 * Mmax (y=0が天端、y=H=4が付け根)
H = 4.0
Mmax = 1.8
y = np.linspace(0, H, 100)
M = (y / H) ** 3 * Mmax  # 付け根でMmax
# 引張側=背面(右)に膨らむ
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

ax2.set_xlim(-1.0, 2.8)
ax2.set_ylim(-0.3, 4.3)
ax2.invert_yaxis()
ax2.axis("off")

# ============== ③ 底版の曲げモーメント図 (下段全幅) ==============
ax3 = fig.add_subplot(2, 1, 2)
ax3.set_title("③ 底版(つま先版+かかと版)のM図", fontsize=14, fontweight="bold",
              color="#1b5e20")

# 底版輪郭(参考)
ax3.add_patch(mpatches.Rectangle((-1.5, -0.15), 4.5, 0.15, facecolor="#eceff1",
                                  edgecolor="#90a4ae"))
# 竪壁位置
ax3.add_patch(mpatches.Rectangle((-0.15, -0.15), 0.3, 0.6, facecolor="#cfd8dc",
                                  edgecolor="#37474f", lw=1.5))
ax3.text(0, 0.35, "竪壁", ha="center", fontsize=10)

# 基準軸(M=0)
ax3.axhline(0, color="black", lw=1.6, zorder=3)

# ----- つま先版のM(竪壁前面で最大、つま先端でM=0、上面引張→上に凸) -----
# 危険断面 x=-0.15(竪壁前面), 端 x=-1.5
L_toe = 1.35  # つま先版長
x_toe = np.linspace(-1.5, -0.15, 50)
# 等分布上向き荷重として M = q*(L_toe^2 - (x-toe端からの距離)^2)*0.5 → 放物線
xi = (x_toe - (-1.5)) / L_toe  # 0(端) → 1(危険断面)
M_toe = xi ** 2 * 1.0  # 危険断面でmax=1.0(上方向に正)
ax3.fill_between(x_toe, 0, M_toe, color="#ffcc80", alpha=0.9,
                 edgecolor="#e65100", lw=2)
ax3.plot(-0.15, 1.0, "ko", markersize=8)
ax3.annotate("M_max(竪壁前面)\n= 危険断面", xy=(-0.15, 1.0), xytext=(-0.95, 1.5),
             fontsize=11, color="#e65100", fontweight="bold",
             arrowprops=dict(arrowstyle="->", color="#e65100"))
ax3.text(-1.0, 0.35, "つま先版\n上面引張", fontsize=12, color="#e65100",
         fontweight="bold", ha="center")
ax3.text(-1.5, -0.35, "M=0\n(つま先端)", fontsize=9, color="#e65100", ha="center")

# ----- かかと版のM(竪壁背面で最大、かかと端でM=0、下面引張→下に凸) -----
L_heel = 1.85  # かかと版長
x_heel = np.linspace(0.15, 2.0, 50)
xi2 = (2.0 - x_heel) / L_heel  # 1(危険断面) → 0(端)
M_heel = -(xi2 ** 2) * 1.6  # 危険断面でmax=-1.6(下方向)
ax3.fill_between(x_heel, 0, M_heel, color="#a5d6a7", alpha=0.9,
                 edgecolor="#1b5e20", lw=2)
ax3.plot(0.15, -1.6, "ko", markersize=8)
ax3.annotate("M_max(竪壁背面)\n= 危険断面", xy=(0.15, -1.6), xytext=(0.9, -2.1),
             fontsize=11, color="#1b5e20", fontweight="bold",
             arrowprops=dict(arrowstyle="->", color="#1b5e20"))
ax3.text(1.2, -0.7, "かかと版\n下面引張", fontsize=12, color="#1b5e20",
         fontweight="bold", ha="center")
ax3.text(2.0, 0.25, "M=0\n(かかと端)", fontsize=9, color="#1b5e20", ha="center")

# 軸ラベル
ax3.text(3.05, 0, "M=0軸", fontsize=10, va="center")
ax3.text(-1.5, 2.3, "↑ +M (上に凸 = 上面引張)", fontsize=10, color="#e65100")
ax3.text(-1.5, -2.6, "↓ −M (下に凸 = 下面引張)", fontsize=10, color="#1b5e20")

ax3.set_xlim(-2.0, 3.2)
ax3.set_ylim(-3.0, 2.6)
ax3.axis("off")

plt.suptitle("逆T式RC擁壁の応力図(曲げモーメント)", fontsize=18, fontweight="bold", y=0.995)
plt.tight_layout()
plt.savefig("/home/user/-/retaining_wall_BMD.png", dpi=140, bbox_inches="tight",
            facecolor="white")
print("saved")
