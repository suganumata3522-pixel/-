"""ナレーションテキストと音声尺から SRT 字幕を生成する。"""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path


@dataclass
class SubtitleSegment:
    start: float
    end: float
    text: str


_SENT_END = re.compile(r"(?<=[。．！？\?\!])\s*")


def split_sentences(text: str) -> list[str]:
    text = text.strip()
    if not text:
        return []
    parts = [p.strip() for p in _SENT_END.split(text) if p.strip()]
    return parts or [text]


def chapter_segments(
    text: str,
    start_offset: float,
    duration: float,
    max_chars_per_seg: int = 30,
) -> list[SubtitleSegment]:
    """1チャプター分のナレーションを字幕区間に分割。

    1文を更に max_chars_per_seg で改行レベルに分け、各セグメントの長さは
    全体の文字数比で按分する。
    """
    sentences = split_sentences(text)
    if not sentences:
        return []

    chunks: list[str] = []
    for sent in sentences:
        for i in range(0, len(sent), max_chars_per_seg):
            chunks.append(sent[i : i + max_chars_per_seg])

    total_chars = sum(len(c) for c in chunks)
    if total_chars == 0:
        return []

    segments: list[SubtitleSegment] = []
    cursor = start_offset
    for c in chunks:
        seg_dur = duration * (len(c) / total_chars)
        segments.append(SubtitleSegment(start=cursor, end=cursor + seg_dur, text=c))
        cursor += seg_dur
    if segments:
        segments[-1].end = start_offset + duration
    return segments


def _fmt_time(t: float) -> str:
    if t < 0:
        t = 0
    h = int(t // 3600)
    m = int((t % 3600) // 60)
    s = int(t % 60)
    ms = int(round((t - int(t)) * 1000))
    if ms == 1000:
        ms = 0
        s += 1
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def write_srt(segments: list[SubtitleSegment], out_path: Path) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    lines: list[str] = []
    for i, seg in enumerate(segments, 1):
        lines.append(str(i))
        lines.append(f"{_fmt_time(seg.start)} --> {_fmt_time(seg.end)}")
        lines.append(seg.text)
        lines.append("")
    out_path.write_text("\n".join(lines), encoding="utf-8")
