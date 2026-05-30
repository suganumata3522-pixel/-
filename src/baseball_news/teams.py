"""NPB 12球団のテーマカラーと、台本から主役球団を推定する関数。

色はテキストとして公開されている各球団のブランドカラー (頭の中の HEX 値)。
ロゴ画像は著作物のため同梱しない。ユーザーが
  assets/manual/logos/<key>.png
に手動配置した場合だけサムネ/スライドに重ねる (※利用規約を確認のこと)。
"""

from __future__ import annotations

from dataclasses import dataclass


RGB = tuple[int, int, int]


@dataclass(frozen=True)
class TeamPalette:
    key: str
    name: str                # 表示用フル名
    aliases: tuple[str, ...] # 台本テキスト内の検出用語
    primary: RGB             # 上部/下部の主要ボックス背景
    on_primary: RGB          # 上記の上にのる文字色
    accent: RGB              # 派手な強調アクセント (サムネのメインキャッチ等)
    on_accent: RGB           # 上記の上にのる文字色 (大抵 outline 用に白か黒)
    highlight_blue: RGB      # 本文中の事実ハイライト (低下/数値変化など)
    highlight_red: RGB       # 本文中の重要転換ハイライト (離脱/復帰など)
    text: RGB                # 半透明白ボックス上の本文色
    logo_filename: str       # assets/manual/logos/ 直下のファイル名


# 公開されている球団テーマカラーの代表値 (近似)。
# ※ ロゴ・標章そのものは含まない。
TEAM_PALETTES: dict[str, TeamPalette] = {
    "hanshin": TeamPalette(
        key="hanshin",
        name="阪神タイガース",
        aliases=("阪神", "タイガース", "Tigers", "甲子園"),
        primary=(254, 251, 0),       # tigers yellow
        on_primary=(0, 0, 0),
        accent=(232, 24, 24),        # red 派手強調
        on_accent=(0, 0, 0),
        highlight_blue=(20, 80, 200),
        highlight_red=(220, 0, 0),
        text=(20, 20, 20),
        logo_filename="hanshin.png",
    ),
    "giants": TeamPalette(
        key="giants",
        name="読売ジャイアンツ",
        aliases=("巨人", "ジャイアンツ", "Giants", "読売", "東京ドーム"),
        primary=(249, 119, 9),
        on_primary=(255, 255, 255),
        accent=(220, 30, 30),
        on_accent=(0, 0, 0),
        highlight_blue=(20, 80, 200),
        highlight_red=(220, 0, 0),
        text=(20, 20, 20),
        logo_filename="giants.png",
    ),
    "dragons": TeamPalette(
        key="dragons",
        name="中日ドラゴンズ",
        aliases=("中日", "ドラゴンズ", "Dragons", "バンテリンドーム", "ナゴヤ"),
        primary=(0, 37, 105),
        on_primary=(255, 255, 255),
        accent=(232, 24, 24),
        on_accent=(255, 255, 255),
        highlight_blue=(20, 120, 220),
        highlight_red=(220, 0, 0),
        text=(20, 20, 20),
        logo_filename="dragons.png",
    ),
    "baystars": TeamPalette(
        key="baystars",
        name="横浜DeNAベイスターズ",
        aliases=("DeNA", "ベイスターズ", "BayStars", "横浜", "ハマスタ"),
        primary=(0, 120, 181),
        on_primary=(255, 255, 255),
        # primary 青に対し、矢印は明るい水色寄りの青で対比
        accent=(40, 160, 235),
        on_accent=(255, 255, 255),
        highlight_blue=(20, 100, 220),
        highlight_red=(220, 0, 0),
        text=(20, 20, 20),
        logo_filename="baystars.png",
    ),
    "carp": TeamPalette(
        key="carp",
        name="広島東洋カープ",
        aliases=("広島", "カープ", "Carp", "マツダスタジアム"),
        primary=(225, 0, 0),
        on_primary=(255, 255, 255),
        # primary が赤なので、矢印・コールアウトのアクセントは対比の青で
        accent=(30, 120, 220),
        on_accent=(255, 255, 255),
        highlight_blue=(20, 80, 200),
        highlight_red=(180, 0, 0),
        text=(20, 20, 20),
        logo_filename="carp.png",
    ),
    "swallows": TeamPalette(
        key="swallows",
        name="東京ヤクルトスワローズ",
        aliases=("ヤクルト", "スワローズ", "Swallows", "神宮"),
        primary=(0, 104, 60),
        on_primary=(255, 255, 255),
        accent=(220, 0, 16),
        on_accent=(255, 255, 255),
        highlight_blue=(20, 80, 200),
        highlight_red=(220, 0, 16),
        text=(20, 20, 20),
        logo_filename="swallows.png",
    ),
    "hawks": TeamPalette(
        key="hawks",
        name="福岡ソフトバンクホークス",
        aliases=("ソフトバンク", "ホークス", "Hawks", "PayPayドーム", "福岡"),
        primary=(252, 200, 0),
        on_primary=(0, 0, 0),
        # primary 黄が強烈なので、矢印・アクセントも黄色で揃える (リファレンス参照)
        # 矢印は stroke (黒縁) があるので黄でも視認できる
        accent=(252, 200, 0),
        on_accent=(0, 0, 0),
        highlight_blue=(20, 80, 200),
        highlight_red=(220, 0, 0),
        text=(20, 20, 20),
        logo_filename="hawks.png",
    ),
    "marines": TeamPalette(
        key="marines",
        name="千葉ロッテマリーンズ",
        aliases=("ロッテ", "マリーンズ", "Marines", "ZOZOマリン"),
        primary=(0, 0, 0),
        on_primary=(255, 255, 255),
        accent=(232, 24, 24),
        on_accent=(255, 255, 255),
        highlight_blue=(20, 80, 200),
        highlight_red=(220, 0, 0),
        text=(20, 20, 20),
        logo_filename="marines.png",
    ),
    "fighters": TeamPalette(
        key="fighters",
        name="北海道日本ハムファイターズ",
        aliases=("日本ハム", "日ハム", "ファイターズ", "Fighters", "エスコン"),
        primary=(0, 55, 139),
        on_primary=(255, 255, 255),
        accent=(220, 30, 30),
        on_accent=(255, 255, 255),
        highlight_blue=(20, 80, 220),
        highlight_red=(220, 0, 0),
        text=(20, 20, 20),
        logo_filename="fighters.png",
    ),
    "buffaloes": TeamPalette(
        key="buffaloes",
        name="オリックス・バファローズ",
        aliases=("オリックス", "バファローズ", "Buffaloes", "京セラドーム"),
        primary=(29, 45, 90),
        on_primary=(255, 255, 255),
        # primary が紺で highlight_red と対比が弱いため、矢印・アクセントは青系に
        accent=(30, 120, 220),
        on_accent=(255, 255, 255),
        highlight_blue=(20, 80, 200),
        highlight_red=(220, 0, 0),
        text=(20, 20, 20),
        logo_filename="buffaloes.png",
    ),
    "eagles": TeamPalette(
        key="eagles",
        name="東北楽天ゴールデンイーグルス",
        aliases=("楽天", "イーグルス", "Eagles", "仙台", "楽天モバイル"),
        primary=(135, 0, 16),
        on_primary=(255, 255, 255),
        # primary 暗赤に対し、矢印・アクセントは明るい赤で目立たせる (リファレンス参照)
        accent=(220, 30, 30),
        on_accent=(255, 255, 255),
        highlight_blue=(20, 80, 200),
        highlight_red=(220, 0, 0),
        text=(20, 20, 20),
        logo_filename="eagles.png",
    ),
    "lions": TeamPalette(
        key="lions",
        name="埼玉西武ライオンズ",
        aliases=("西武", "ライオンズ", "Lions", "ベルーナドーム"),
        primary=(16, 35, 65),
        on_primary=(255, 255, 255),
        accent=(0, 156, 222),
        on_accent=(0, 0, 0),
        highlight_blue=(20, 120, 220),
        highlight_red=(220, 0, 0),
        text=(20, 20, 20),
        logo_filename="lions.png",
    ),
}


# 球団が特定できなかった (複数球団 or MLB 等) ときのフォールバック。
DEFAULT_PALETTE = TeamPalette(
    key="default",
    name="プロ野球",
    aliases=(),
    primary=(255, 215, 0),
    on_primary=(0, 0, 0),
    accent=(232, 24, 24),
    on_accent=(255, 255, 255),
    highlight_blue=(20, 80, 200),
    highlight_red=(220, 0, 0),
    text=(20, 20, 20),
    logo_filename="default.png",
)


def detect_team(script: dict) -> TeamPalette:
    """script から主役球団のパレットを推定。

    優先順:
      1. script.thumbnail.team が NPB 球団キーならそれ
      2. titles / chapters の全テキストから alias の出現を数えて最多のチーム
      3. それでもゼロなら DEFAULT_PALETTE
    """
    thumb = script.get("thumbnail") or {}
    hint = thumb.get("team")
    if isinstance(hint, str) and hint in TEAM_PALETTES:
        return TEAM_PALETTES[hint]

    parts: list[str] = []
    parts.extend(script.get("titles") or [])
    for ch in script.get("chapters") or []:
        parts.append(ch.get("title") or "")
        parts.append(ch.get("narration") or "")
        slide = ch.get("slide") or {}
        # スライドからもヒントを拾う
        for b in slide.get("bullets") or []:
            if isinstance(b, str):
                parts.append(b)
        hl = slide.get("highlight") or {}
        if isinstance(hl.get("text"), str):
            parts.append(hl["text"])
    text = " ".join(parts)

    best: tuple[int, TeamPalette] | None = None
    for p in TEAM_PALETTES.values():
        score = sum(text.count(a) for a in p.aliases)
        if score <= 0:
            continue
        if best is None or score > best[0]:
            best = (score, p)
    return best[1] if best else DEFAULT_PALETTE


def palette_color(palette: TeamPalette, name: str) -> RGB:
    """マークアップで使う色名 (青/赤/黄/白/黒) を RGB に解決。"""
    name = (name or "").strip().lower()
    table = {
        "青": palette.highlight_blue, "blue": palette.highlight_blue,
        "赤": palette.highlight_red,  "red": palette.highlight_red,
        "黄": palette.primary,         "yellow": palette.primary,
        "白": (255, 255, 255),         "white": (255, 255, 255),
        "黒": (0, 0, 0),               "black": (0, 0, 0),
        "default": palette.text, "": palette.text,
    }
    return table.get(name, palette.text)
