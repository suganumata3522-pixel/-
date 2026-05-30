import json
import os
import re
from typing import Any

from anthropic import Anthropic

from .models import NewsItem


SYSTEM_PROMPT = """あなたは日本のプロ野球を扱うYouTubeチャンネルの放送作家です。
渡された複数のニュース記事をもとに、ナレーション台本と動画メタデータを作ります。

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

# トーン
{tone}

# 目標尺
約 {target_minutes} 分 (日本語300字/分 換算で約 {target_chars} 字)

# 取り上げる候補ニュース ({n}本)
※ 同一トピックの重複や、プロ野球と関係の薄いものは捨て、最終的に {final_n} 本以内に絞ってください。
{articles}

# 出力 (JSON, 余計な文字を入れない)
{{
  "titles": ["案1", "案2", "案3"],
  "description": "YouTube説明文 (300-500字)。ハッシュタグと出典URLを末尾に並べる。",
  "tags": ["タグ1", "タグ2", ...],
  "chapters": [
    {{
      "title": "オープニング",
      "narration": "このチャプターで読み上げる本文だけを入れる。見出しや記号は不要。",
      "image_keywords": ["スタジアム 客席", "電光掲示板"]
    }},
    {{
      "title": "話題1: 〇〇選手 移籍合意",
      "narration": "...",
      "image_keywords": ["〇〇 選手", "△△ 球場", "ユニフォーム"]
    }}
  ],
  "script": "全チャプターのナレーションを連結した全文。チャプター見出しは含めない。",
  "sources": [
    {{"title": "...", "source": "...", "url": "..."}}
  ]
}}

# image_keywords のルール
- 各チャプターに 3〜6 個。動画に挿し込む画像検索/生成のヒントになる短い日本語フレーズ。
- 選手名・球団名・球場名・場面 (例: 「ホームラン」「監督インタビュー」) を中心に。
- ロゴ・商標・特定の個人写真の権利物を直接指定しない (例: 「球団ロゴ」ではなく「ユニフォーム」など)。
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
    final_n: int,
) -> dict[str, Any]:
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise RuntimeError("ANTHROPIC_API_KEY が設定されていません。")

    client = Anthropic()
    user_msg = USER_TEMPLATE.format(
        audience=audience,
        tone=tone,
        target_minutes=target_minutes,
        target_chars=target_minutes * 300,
        n=len(items),
        final_n=final_n,
        articles=_format_articles(items),
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
