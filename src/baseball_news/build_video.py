"""script.json を読んで TTS → 画像 → 動画を組み立てるオーケストレータ。"""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from pathlib import Path

from .image_sources import ImageRequest, build_dispatcher
from .subtitles import SubtitleSegment, chapter_segments, write_srt
from .tts import VoicevoxClient
from .video import ChapterVideoPart, build_video


@dataclass
class ChapterPlan:
    idx: int
    title: str
    narration: str
    image_keywords: list[str]


def _load_chapters(script: dict) -> list[ChapterPlan]:
    chapters = script.get("chapters") or []
    plans: list[ChapterPlan] = []
    for i, ch in enumerate(chapters):
        narration = ch.get("narration") or ""
        if not narration.strip():
            print(f"  [warn] チャプター {i} に narration がありません: {ch.get('title')}", file=sys.stderr)
            continue
        plans.append(ChapterPlan(
            idx=i,
            title=ch.get("title", f"chapter_{i}"),
            narration=narration.strip(),
            image_keywords=ch.get("image_keywords") or [ch.get("title", "baseball")],
        ))
    return plans


def build_from_script(
    script_path: Path,
    work_root: Path,
    cfg: dict,
) -> Path:
    script = json.loads(script_path.read_text(encoding="utf-8"))
    plans = _load_chapters(script)
    if not plans:
        raise RuntimeError("ナレーション付きのチャプターがありません。script_generator の出力を確認してください。")

    work_root.mkdir(parents=True, exist_ok=True)
    audio_dir = work_root / "audio"
    images_dir = work_root / "images"
    audio_dir.mkdir(exist_ok=True)
    images_dir.mkdir(exist_ok=True)

    tts_cfg = (cfg.get("tts") or {}).get("voicevox") or {}
    print(f"[TTS] VOICEVOX 接続: {tts_cfg.get('base_url', 'http://127.0.0.1:50021')}", file=sys.stderr)
    with VoicevoxClient(
        base_url=tts_cfg.get("base_url", "http://127.0.0.1:50021"),
        speaker=int(tts_cfg.get("speaker", 3)),
        speed=float(tts_cfg.get("speed", 1.0)),
        pitch=float(tts_cfg.get("pitch", 0.0)),
        intonation=float(tts_cfg.get("intonation", 1.0)),
    ) as tts:
        if not tts.ping():
            raise RuntimeError(
                "VOICEVOX に接続できません。VOICEVOX Engine を起動してください。"
            )
        tts_results = []
        for p in plans:
            print(f"  [tts] ch{p.idx:02d} {p.title}", file=sys.stderr)
            res = tts.synth(p.narration, audio_dir / f"ch{p.idx:02d}.wav")
            tts_results.append(res)

    assets_dir = Path(cfg.get("assets_dir") or "assets")
    dispatcher = build_dispatcher(cfg, assets_dir=assets_dir)

    parts: list[ChapterVideoPart] = []
    all_segments: list[SubtitleSegment] = []
    cursor = 0.0
    for p, res in zip(plans, tts_results):
        # 6秒に1枚を目安に枚数を決める
        need = max(2, min(8, int(res.duration_sec // 6) + 1))
        ch_img_dir = images_dir / f"ch{p.idx:02d}"
        fetched = dispatcher.collect(
            ImageRequest(
                chapter_idx=p.idx,
                chapter_title=p.title,
                keywords=p.image_keywords,
                need_count=need,
            ),
            out_dir=ch_img_dir,
        )
        if not fetched:
            raise RuntimeError(
                f"チャプター {p.idx} ({p.title}) の画像が1枚も取れませんでした。"
                f"  assets/manual/<タイトル>/ に画像を入れるか、Pexels/AI画像のAPIキーを設定してください。"
            )
        parts.append(ChapterVideoPart(
            wav_path=res.wav_path,
            duration=res.duration_sec,
            images=[f.path for f in fetched],
        ))
        all_segments.extend(chapter_segments(p.narration, cursor, res.duration_sec))
        cursor += res.duration_sec

    srt_path = work_root / "subtitles.srt"
    write_srt(all_segments, srt_path)
    print(f"[字幕] {srt_path} ({len(all_segments)} 区間)", file=sys.stderr)

    video_cfg = cfg.get("video") or {}
    out_path = work_root / "video.mp4"
    print(f"[ffmpeg] 動画組み立て: {out_path}", file=sys.stderr)
    build_video(
        parts=parts,
        srt_path=srt_path,
        out_path=out_path,
        work_dir=work_root / "ffmpeg_work",
        resolution=video_cfg.get("resolution", "1920x1080"),
        fps=int(video_cfg.get("fps", 30)),
    )
    print(f"[完了] {out_path}", file=sys.stderr)
    return out_path
