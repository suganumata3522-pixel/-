"""話題 + 関連話題から Claude で台本テキストを生成する。

Claude が話題に登場した選手のプロフィールを必要に応じて引けるよう、
look_up_player ツールを提供する (tool use ループ)。
"""
from __future__ import annotations

import json
import sys
from typing import Iterable

from anthropic import Anthropic

from .collectors.base import TopicItem
from .players import PlayerLookup, PlayerProfile

SYSTEM_PROMPT = """\
あなたはプロ野球の最新話題を解説する YouTube 動画の台本ライターです。
渡された 1 件のメイン話題と関連話題、収集された出典 URL をもとに、
日本の野球ファン向けの台本テキスト (ナレーション) を JSON で出力します。

# 必須ルール
- 客観的で落ち着いた解説調。煽り (「炎上」「干された」「電撃」など断定的表現) や
  未確認の噂は禁止。出典のある事実だけを書く。
- 選手名が登場したら必ず look_up_player ツールで実在性とプロフィールを確認してから
  本文に書く。通算成績などの数字は look_up_player で取得できた値のみ使い、
  取れていない数字は書かない (捏造禁止)。
- 出典 URL は cuts[*].sources に必ず含める。

# 出力 JSON スキーマ (これ以外のキーは入れない)
{
  "topic_id": "渡された topic の id をそのまま",
  "title": "動画タイトル (40 文字以内)",
  "lead": "30 秒分のリード (200-300 文字)",
  "cuts": [
    {
      "heading": "見出し",
      "narration": "本編ナレーション (400-800 文字)",
      "sources": ["url1", "url2"]
    }
  ],
  "closing": "100-150 文字のまとめ",
  "thumbnail_captions": ["案1 (15 文字以内)", "案2", "案3"],
  "players_used": ["look_up_player で確認した選手名のリスト"]
}

target_minutes 分の尺になるよう cuts の本数と各 narration の長さを調整する
(1 分 ≒ 300 文字目安)。JSON のみを返す。前後の説明文や ```json は不要。
"""

TOOLS = [
    {
        "name": "look_up_player",
        "description": (
            "NPB 選手のプロフィール (略歴・通算成績) を取得する。"
            "選手名がトピックに登場したら必ずこのツールで確認してから台本に書くこと。"
            "存在しない / データが取れない場合は found=false が返るので、"
            "その選手については数字を書かない判断をする。"
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "選手のフルネーム (例: '岡本和真')。漢字フルネームを推奨。",
                }
            },
            "required": ["name"],
        },
    }
]


def _format_topic(t: TopicItem, related: Iterable[TopicItem]) -> str:
    lines = [
        "# メイン話題",
        f"- id: {t.id}",
        f"- title: {t.title}",
        f"- source: {t.source}",
        f"- url: {t.url}",
        f"- published_at: {t.published_at.isoformat() if t.published_at else '(不明)'}",
        f"- summary: {t.summary or '(なし)'}",
        f"- score: {t.score}",
    ]
    related_list = list(related)
    if related_list:
        lines.append("")
        lines.append("# 関連話題 (同じ事象や近い話題の可能性)")
        for r in related_list[:10]:
            lines.append(f"- [{r.source}] {r.title}")
            lines.append(f"  url: {r.url}")
            if r.summary:
                lines.append(f"  summary: {r.summary[:200]}")
    return "\n".join(lines)


def _extract_text(content_blocks) -> str:
    parts: list[str] = []
    for b in content_blocks:
        if getattr(b, "type", None) == "text":
            parts.append(b.text)
    return "".join(parts)


def generate_script(
    topic: TopicItem,
    related: Iterable[TopicItem],
    cfg: dict,
    lookup: PlayerLookup | None = None,
) -> dict:
    """台本 dict を返す。Claude 応答が JSON パースできなければ {_raw: ..., _parse_error: ...}。"""
    owns_lookup = lookup is None
    if lookup is None:
        lookup = PlayerLookup(cfg.get("players") or {})

    try:
        client = Anthropic()
        script_cfg = cfg["script"]
        model = script_cfg["model"]
        target_minutes = script_cfg["target_minutes"]
        audience = script_cfg["audience"]
        tone = script_cfg["tone"]
        thumb_tone = script_cfg.get("thumbnail_tone", "")

        user_msg = (
            f"target_minutes: {target_minutes}\n"
            f"audience: {audience}\n"
            f"tone: {tone}\n"
            f"thumbnail_tone: {thumb_tone}\n\n"
            + _format_topic(topic, related)
        )

        messages: list[dict] = [{"role": "user", "content": user_msg}]
        looked_up: dict[str, PlayerProfile] = {}

        for _ in range(20):  # tool ループ上限
            resp = client.messages.create(
                model=model,
                max_tokens=8000,
                system=SYSTEM_PROMPT,
                tools=TOOLS,
                messages=messages,
            )
            if resp.stop_reason != "tool_use":
                text = _extract_text(resp.content)
                try:
                    result = json.loads(text)
                except json.JSONDecodeError as e:
                    return {"_raw": text, "_parse_error": str(e)}
                # players_used が無ければ補完
                if "players_used" not in result:
                    result["players_used"] = list(looked_up.keys())
                return result

            # tool_use 応答を処理
            messages.append({"role": "assistant", "content": resp.content})
            tool_results = []
            for block in resp.content:
                if getattr(block, "type", None) != "tool_use":
                    continue
                if block.name != "look_up_player":
                    tool_results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": block.id,
                            "content": json.dumps({"error": f"unknown tool: {block.name}"}),
                            "is_error": True,
                        }
                    )
                    continue
                name = ((block.input or {}).get("name") or "").strip()
                if not name:
                    payload: dict = {"found": False, "reason": "empty name"}
                else:
                    prof = lookup.find(name)
                    looked_up[name] = prof
                    payload = prof.to_dict() if prof.found else {"name": name, "found": False}
                print(
                    f"[script_generator] look_up_player({name!r}) -> found={payload.get('found', False)}",
                    file=sys.stderr,
                )
                tool_results.append(
                    {
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(payload, ensure_ascii=False),
                    }
                )
            messages.append({"role": "user", "content": tool_results})

        return {"_error": "tool loop exceeded (20)"}
    finally:
        if owns_lookup:
            lookup.close()
