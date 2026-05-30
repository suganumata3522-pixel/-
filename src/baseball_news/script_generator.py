import json
import os
import re
from typing import Any

from anthropic import Anthropic

from .models import NewsItem
from .teams import TEAM_PALETTES


SYSTEM_PROMPT = """あなたは日本のプロ野球を扱うYouTubeチャンネルの放送作家です。
渡された複数のニュース記事をもとに、ナレーション台本・サムネ・本編スライドのメタデータを作ります。

守ること:
- 事実は記事に書かれている範囲だけ。推測や創作は禁止。記事に無い数字・発言を書かない。
- 各話題で必ず情報源(媒体名)に触れる。例: 「日刊スポーツの報道によると」「球団公式の発表では」。
- 著作権に配慮し、記事本文の引用は短く要点のみ。長文の丸写しはしない。
- 煽り・断定・選手や球団への侮辱表現は避ける。客観的な解説調。
- YouTubeコミュニティガイドラインに反する表現(個人攻撃・差別・誤情報)は出さない。
- 出力は必ず指定されたJSON 1個のみ。前後に説明文を付けない。
"""


USER_TEMPLATE = """以下の条件で台本を作ってください。

# 視聴者像
{audience}

# 本編 (ナレーション) のトーン
{tone}

# サムネ + 本編スライド上のテロップのトーン
{thumbnail_tone}
※ 本編「ナレーション (読み上げ)」は落ち着き、本編「画面のテロップ」とサムネだけ派手、という二段構えです。
※ ナレーション本文 (chapters[].narration) に派手な煽り表現は入れないでください。

# 目標尺
約 {target_minutes} 分 (日本語300字/分 換算で約 {target_chars} 字)
{length_hint}

# 取り上げる候補ニュース ({n}本)
※ 同一トピックの重複や、プロ野球と関係の薄いものは捨て、最終的に {final_n} 本以内に絞ってください。
{articles}

# 出力 (JSON, 余計な文字を入れない)
{{
  "titles": ["案1", "案2", "案3"],
  "description": "YouTube説明文 (300-500字)。ハッシュタグと出典URLを末尾に並べる。",
  "tags": ["タグ1", "タグ2", ...],
  "thumbnail": {{
    "team": "主役球団のキー (下の一覧から1つ)。複数球団にまたがる場合は『主役』を1つ選ぶ。該当なしなら null。",
    "headline": "サムネ最上部の黄色ボックスに入る短い予告 (全角6〜14文字)。例: 『特大の朗報が4本!!』",
    "main": "サムネ下半分のメインキャッチ1行目 (全角6〜14文字, 派手調)",
    "sub": "メインキャッチ2行目 (全角6〜14文字, 省略可能なら空文字)",
    "keywords": ["サムネ背景写真を検索/生成する短い日本語フレーズ", "..."]
  }},
  "chapters": [
    {{
      "title": "オープニング",
      "narration": "このチャプターで読み上げる本文だけを入れる。見出しや記号は不要。",
      "image_keywords": ["スタジアム 客席", "電光掲示板"],
      "slide": {{
        "subtitle": "",
        "bullets": ["今日のトピック1本目: ...", "今日のトピック2本目: ..."],
        "right_box": null,
        "highlight": null,
        "footer": "最後までご覧ください!"
      }}
    }},
    {{
      "title": "話題1: 〇〇選手 復帰へ",
      "narration": "...",
      "image_keywords": ["〇〇 球場", "ピッチャー マウンド"],
      "slide": {{
        "subtitle": "30歳・6年目",
        "bullets": [
          "○年連続で2桁勝利と入団から好成績",
          "昨年は終盤に崩れ、防御率[4.62|青]",
          "平均球速も[142キロ|青]から[139キロ|青]に低下",
          "今年は開幕ローテも、3回途中で[左太もも負傷|赤]"
        ],
        "right_box": {{
          "title": "今季 成績",
          "rows": [["1試合", ""], ["2.1回", "防御率11.57"], ["与四球1", "奪三振1"], ["被打率.500", "WHIP3.00"]]
        }},
        "highlight": {{
          "text": "5/17にライブBPで登板。\\nこれから2軍戦に登板予定。\\n[6月中の1軍復帰|赤]となるか。",
          "with_arrow": true
        }},
        "footer": "NEXT➡あの若手が2軍で覚醒中…!!"
      }}
    }}
  ],
  "script": "全チャプターのナレーションを連結した全文。チャプター見出しは含めない。",
  "sources": [
    {{"title": "...", "source": "...", "url": "..."}}
  ]
}}

# thumbnail のルール
- team は次のキー一覧から最も話題の中心になっている球団を選ぶ。複数なら最も主役になる1つ。MLB日本人や複数球団にまたがる総まとめなら null:
{team_keys_block}
- headline は『特大の朗報が4本!!』『驚愕の登板!』のような短い予告。記事に書かれた本数や主旨をベースに。
- main / sub は短いほど効く (全角14文字以内厳守)。
- 派手OKだが事実無視の断定 (『干された』『炎上』など) は禁止。

# 本編スライド (chapters[].slide) のルール
- subtitle: 右上に小さく出すサブ情報 (省略可)。例: 年齢/年目/在籍年。短く全角14文字以内。
- bullets: 最大5項目。各項目は1行に収まる短い箇条書き。
- right_box: 数値や成績表を出すとき。title + rows(2列, 文字列ペア)。不要なら null。
- highlight: 中央に大きく出すコールアウト (転換点・最新の動き)。with_arrow=true で上から黄色矢印が降りる。不要なら null。
- footer: 黒バーで画面下に焼き付ける一言。次チャプター予告 (『NEXT➡…』) や締めに使う。不要なら空文字。

# 強調マークアップ (bullets, highlight.text)
[文字列|青] / [文字列|赤] / [文字列|黄] / [文字列|黒] / [文字列|白] の形で書く。
- 青: 球速低下・防御率悪化・年齢・継続事項など『事実値』を目立たせる
- 赤: 復帰・離脱・抹消・移籍・劇的変化など『重要な転換点』
- 1行に2〜3箇所まで。乱用しない。

# image_keywords のルール
- 各チャプターに 2〜4 個。スライド背景に使う写真の検索/生成ヒント。
- 「ナイター 球場 客席」「ピッチャー マウンド」のような汎用フレーズで、特定選手の権利物 (報道写真の構図) を狙わない。
"""


def _format_articles(items: list[NewsItem]) -> str:
    blocks = []
    for i, item in enumerate(items, 1):
        sources_line = item.source
        if item.duplicates:
            sources_line += f" (ほか {len(item.duplicates)} 媒体が報道)"
        body = item.body or item.summary or "(本文取得失敗)"
        blocks.append(
            f"## 記事{i}\n"
            f"- タイトル: {item.title}\n"
            f"- 出典: {sources_line}\n"
            f"- URL: {item.url}\n"
            f"- 公開: {item.published_at.isoformat() if item.published_at else '不明'}\n"
            f"- 本文抜粋:\n{body}\n"
        )
    return "\n".join(blocks)


def _team_keys_block() -> str:
    lines = []
    for p in TEAM_PALETTES.values():
        lines.append(f"  - {p.key}: {p.name}")
    return "\n".join(lines)


def _extract_json(text: str) -> dict[str, Any]:
    # Claudeが万一前後に説明文を付けた場合の保険
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise ValueError(f"JSON が見つかりませんでした: {text[:200]}")
    return json.loads(match.group(0))


def generate_script(
    items: list[NewsItem],
    *,
    model: str,
    target_minutes: int,
    audience: str,
    tone: str,
    thumbnail_tone: str,
    final_n: int,
) -> dict[str, Any]:
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise RuntimeError("ANTHROPIC_API_KEY が設定されていません。")

    # ショート (5分以下) の場合は構成密度のヒントを足す
    if target_minutes <= 5:
        length_hint = (
            "※ ショート尺なので、オープニング+本題2〜3本+クロージング、"
            "の合計 4〜5 チャプター以内で密度高くまとめる。1チャプター 200〜400 字目安。"
        )
    else:
        length_hint = ""

    client = Anthropic()
    user_msg = USER_TEMPLATE.format(
        audience=audience,
        tone=tone,
        thumbnail_tone=thumbnail_tone,
        target_minutes=target_minutes,
        target_chars=target_minutes * 300,
        length_hint=length_hint,
        n=len(items),
        final_n=final_n,
        articles=_format_articles(items),
        team_keys_block=_team_keys_block(),
    )

    response = client.messages.create(
        model=model,
        max_tokens=16000,
        system=[
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=[{"role": "user", "content": user_msg}],
    )

    text = "".join(b.text for b in response.content if b.type == "text")
    return _extract_json(text)
