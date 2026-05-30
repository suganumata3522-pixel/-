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
    # サムネのメインキャッチの「ベース文字色」。マークアップで色指定の無い部分に使われる。
    # 通常球団: 赤 (派手定番)、Eagles / 非依存ニュース: 白 (黒太縁で白抜き) または黒
    thumb_caption_base: RGB = (230, 30, 30)
    # サムネのキャッチに付く縁取り色。通常球団: 黒、default パレット: 白
    thumb_caption_outline: RGB = (0, 0, 0)
    # サムネ下半分を palette.primary (= 大体黄色) で塗りつぶすか
    # 球団非依存ニュースで True にして「全画面黄色キャッチ」風にする
    thumb_full_band: bool = False


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
        # サムネ下部キャッチは白文字+黒縁ベース、強調語のみ赤
        thumb_caption_base=(255, 255, 255),
        thumb_caption_outline=(0, 0, 0),
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
# 「球団に依存しないニュース」用のテーマで、下半分黄色塗り + 黒文字白縁 (一部赤強調)
DEFAULT_PALETTE = TeamPalette(
    key="default",
    name="プロ野球",
    aliases=(),
    primary=(255, 225, 0),       # 全画面黄色キャッチ用の黄色
    on_primary=(0, 0, 0),
    accent=(220, 30, 30),
    on_accent=(255, 255, 255),
    highlight_blue=(20, 80, 200),
    highlight_red=(220, 0, 0),
    text=(20, 20, 20),
    logo_filename="default.png",
    # 黄色背景の上に黒文字 + 白縁で派手キャッチ。マークアップ赤指定で部分的に accent (赤)
    thumb_caption_base=(20, 20, 20),
    thumb_caption_outline=(255, 255, 255),
    thumb_full_band=True,
)


def detect_team(script: dict) -> TeamPalette:
    """script から主役球団のパレットを推定。

    優先順:
      1. script.thumbnail.team が "default" または NPB 球団キーならそれ
      2. titles / chapters の全テキストから alias の出現を数えて
         最多球団のスコアが 2 位の 1.6 倍以上なら最多球団
         拮抗 (複数球団を扱う比較ネタなど) なら DEFAULT_PALETTE
      3. ヒットなしなら DEFAULT_PALETTE
    """
    thumb = script.get("thumbnail") or {}
    hint = thumb.get("team")
    if isinstance(hint, str):
        if hint == "default":
            return DEFAULT_PALETTE
        if hint in TEAM_PALETTES:
            return TEAM_PALETTES[hint]

    parts: list[str] = []
    parts.extend(script.get("titles") or [])
    for ch in script.get("chapters") or []:
        parts.append(ch.get("title") or "")
        parts.append(ch.get("narration") or "")
        slide = ch.get("slide") or {}
        for b in slide.get("bullets") or []:
            if isinstance(b, str):
                parts.append(b)
        hl = slide.get("highlight") or {}
        if isinstance(hl.get("text"), str):
            parts.append(hl["text"])
        # ranking スライドも拾う
        rk = slide.get("ranking") or {}
        for row in rk.get("rows") or []:
            if isinstance(row, dict):
                parts.append(str(row.get("name") or ""))
                parts.append(str(row.get("team") or ""))
    text = " ".join(parts)

    scores = []
    for p in TEAM_PALETTES.values():
        s = sum(text.count(a) for a in p.aliases)
        if s > 0:
            scores.append((s, p))
    if not scores:
        return DEFAULT_PALETTE
    scores.sort(key=lambda x: x[0], reverse=True)
    top = scores[0]
    if len(scores) >= 2:
        second = scores[1]
        # 上位2チームが拮抗 (1位 < 2位 * 1.6) なら球団非依存とみなす
        if top[0] < second[0] * 1.6:
            return DEFAULT_PALETTE
    return top[1]


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
