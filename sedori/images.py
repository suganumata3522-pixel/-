"""出品画像の販路別自動整形。

手持ちの商品写真を、各販路の推奨仕様(正方形・白背景・規定サイズ)に
自動変換する。AIによる商品写真の「生成」は、実物と異なる画像の出品が
各モールの規約違反・購入者トラブルにつながるため行わない。
"""
import os
import time

from PIL import Image, ImageOps

# 販路ごとの画像仕様: (一辺px, 余白率, 説明)
PRESETS = {
    "amazon": (2000, 0.04, "Amazon主画像向け: 白背景・正方形2000px(ズーム対応)"),
    "mercari": (1080, 0.06, "メルカリ向け: 正方形1080px"),
    "auction": (1200, 0.06, "ヤフオク!向け: 正方形1200px"),
    "rakuma": (1080, 0.06, "ラクマ / Yahoo!フリマ向け: 正方形1080px"),
}

ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}


def output_dir():
    d = os.path.join(os.path.dirname(__file__), "static", "processed")
    os.makedirs(d, exist_ok=True)
    return d


def process(file_storage, preset_keys):
    """アップロード画像を各プリセットに整形して保存する。

    戻り値: [{key, filename, label, size}] (static/processed/ 配下のファイル名)
    """
    ext = os.path.splitext(file_storage.filename or "")[1].lower()
    if ext not in ALLOWED_EXT:
        raise ValueError(f"対応していない画像形式です: {ext or '不明'}")

    img = Image.open(file_storage.stream)
    img = ImageOps.exif_transpose(img)  # スマホ写真の回転情報を反映
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")

    stamp = time.strftime("%Y%m%d_%H%M%S")
    results = []
    for key in preset_keys:
        if key not in PRESETS:
            continue
        side, margin, label = PRESETS[key]
        inner = int(side * (1 - margin * 2))
        fitted = ImageOps.contain(img, (inner, inner), Image.LANCZOS)
        canvas = Image.new("RGB", (side, side), (255, 255, 255))
        canvas.paste(
            fitted,
            ((side - fitted.width) // 2, (side - fitted.height) // 2),
        )
        filename = f"{stamp}_{key}.jpg"
        canvas.save(os.path.join(output_dir(), filename), "JPEG",
                    quality=90, optimize=True)
        results.append({"key": key, "filename": filename, "label": label, "size": side})
    return results
