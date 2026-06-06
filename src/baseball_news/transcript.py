"""YouTube動画の字幕(キャプション)を取得してテキストとして保存する。

APIキー不要。youtube-transcript-api が内部で YouTube に直接アクセスする。
"""
from __future__ import annotations

import re
from dataclasses import dataclass

_ID_RE = re.compile(r"(?:v=|youtu\.be/|/embed/|/shorts/|/live/)([A-Za-z0-9_-]{11})")


def extract_video_id(url_or_id: str) -> str:
    s = url_or_id.strip()
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", s):
        return s
    m = _ID_RE.search(s)
    if not m:
        raise ValueError(f"YouTube video ID を URL から抽出できない: {url_or_id}")
    return m.group(1)


@dataclass
class TranscriptResult:
    video_id: str
    language: str
    is_generated: bool
    full_text: str
    segments: list[dict]


def fetch_transcript(
    url_or_id: str, languages: list[str] | None = None
) -> TranscriptResult:
    from youtube_transcript_api import YouTubeTranscriptApi

    video_id = extract_video_id(url_or_id)
    languages = languages or ["ja", "en"]
    tlist = YouTubeTranscriptApi().list(video_id)

    transcript = None
    try:
        transcript = tlist.find_manually_created_transcript(languages)
    except Exception:
        pass
    if transcript is None:
        try:
            transcript = tlist.find_generated_transcript(languages)
        except Exception:
            pass
    if transcript is None:
        for t in tlist:
            transcript = t
            break
    if transcript is None:
        raise RuntimeError(f"動画 {video_id} に利用可能な字幕がありません")

    fetched = transcript.fetch()
    segments = [
        {"text": s.text, "start": s.start, "duration": s.duration} for s in fetched
    ]
    full_text = "\n".join(s["text"] for s in segments)
    return TranscriptResult(
        video_id=video_id,
        language=transcript.language_code,
        is_generated=transcript.is_generated,
        full_text=full_text,
        segments=segments,
    )


def format_transcript_readable(result: TranscriptResult) -> str:
    bar = "=" * 70
    sep = "-" * 70
    lines: list[str] = [
        bar,
        "YouTube 動画 字幕",
        f"video_id : {result.video_id}",
        f"URL      : https://www.youtube.com/watch?v={result.video_id}",
        f"言語     : {result.language}",
        f"種類     : {'自動生成字幕' if result.is_generated else '手動字幕'}",
        f"行数     : {len(result.segments)} セグメント",
        bar,
        "",
        "▼ 全文 ▼",
        "",
        result.full_text,
        "",
        sep,
        "",
        "▼ タイムコード付き ▼",
        "",
    ]
    for s in result.segments:
        mm = int(s["start"]) // 60
        ss = int(s["start"]) % 60
        lines.append(f"[{mm:>3d}:{ss:02d}] {s['text']}")
    return "\n".join(lines)
