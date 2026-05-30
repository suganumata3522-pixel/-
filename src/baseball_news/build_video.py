"""script.json を読んで TTS → 背景画像 → スライド合成 → ffmpeg で動画を組み立てる。

ステップ:
  1. VOICEVOX でチャプターごとに WAV を作る
  2. 球団パレットを推定 (script.thumbnail.team or テキスト走査)
  3. サムネ thumbnail.jpg を生成
  4. 各チャプターについて
       a) 背景写真を1枚取得 (Local/Pexels/AI生成)
       b) Pillow で情報スライド slide_chXX.png を合成
  5. オープニング (idx=0) のスライドはサムネ画像で代用
  6. ffmpeg で audio + slides を結合
"""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from pathlib import Path

from .image_sources import build_dispatcher
from .slide_renderer import find_font, load_fonts
from .subtitles import SubtitleSegment, chapter_segments, write_srt
from .teams import detect_team
from .thumbnail import generate_chapter_slide, generate_thumbnail
from .tts import VoicevoxClient
from .video import ChapterVideoPart, build_video


@dataclass
class ChapterPlan:
    idx: int
    title: str
    narration: str
    image_keywords: list[str]
    slide: dict


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
            slide=ch.get("slide") or {},
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
    bg_dir = work_root / "backgrounds"
    slides_dir = work_root / "slides"
    audio_dir.mkdir(exist_ok=True)
    bg_dir.mkdir(exist_ok=True)
    slides_dir.mkdir(exist_ok=True)

    # --- 1. TTS --------------------------------------------------------
    tts_cfg = (cfg.get("tts") or {}).get("voicevox") or {}
    print(f"[TTS] VOICEVOX 接続: {tts_cfg.get('base_url', 'http://127.0.0.1:50021')}", file=sys.stderr)
    with VoicevoxClient(
        base_url=tts_cfg.get("base_url", "http://127.0.0.1:50021"),
        speaker=int(tts_cfg.get("speaker", 2)),
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

    # --- 2. パレット推定 + フォント / dispatcher --------------------------
    palette = detect_team(script)
    print(f"[palette] team={palette.key} ({palette.name})", file=sys.stderr)

    thumb_cfg = cfg.get("thumbnail") or {}
    font_path = find_font(thumb_cfg.get("font_file") or None)
    print(f"[font] {font_path}", file=sys.stderr)
    fonts = load_fonts(font_path)

    assets_dir = Path(cfg.get("assets_dir") or "assets")
    dispatcher = build_dispatcher(cfg, assets_dir=assets_dir)
    video_cfg = cfg.get("video") or {}
    resolution = video_cfg.get("resolution", "1920x1080")

    # --- 3. サムネ生成 -------------------------------------------------
    thumb_path = work_root / "thumbnail.jpg"
    print(f"[サムネ] 生成: {thumb_path}", file=sys.stderr)
    thumb_result = generate_thumbnail(
        script=script,
        out_path=thumb_path,
        work_dir=work_root / "thumbnail_work",
        dispatcher=dispatcher,
        resolution=resolution,
        palette=palette,
        fonts=fonts,
        assets_dir=assets_dir,
    )
    if thumb_result:
        print(f"[サムネ] 完了 {thumb_result}", file=sys.stderr)
    else:
        print("[サムネ] スキップ (背景画像が取れなかった可能性あり)", file=sys.stderr)

    # --- 4. チャプター毎にスライド合成 ----------------------------------
    parts: list[ChapterVideoPart] = []
    all_segments: list[SubtitleSegment] = []
    cursor = 0.0
    for p, res in zip(plans, tts_results):
        slide_path = slides_dir / f"slide_ch{p.idx:02d}.png"
        # オープニング (idx=0) はサムネを流用 (なければ通常合成)
        if p.idx == 0 and thumb_result is not None:
            slide_image = thumb_result
            print(f"  [slide] ch00 にサムネ画像を流用: {slide_image}", file=sys.stderr)
        else:
            generated = generate_chapter_slide(
                chapter_idx=p.idx,
                chapter_title=p.title,
                slide=p.slide,
                image_keywords=p.image_keywords,
                out_path=slide_path,
                bg_dir=bg_dir / f"ch{p.idx:02d}",
                dispatcher=dispatcher,
                resolution=resolution,
                palette=palette,
                fonts=fonts,
                assets_dir=assets_dir,
            )
            if not generated:
                raise RuntimeError(
                    f"チャプター {p.idx} ({p.title}) のスライドが生成できませんでした。"
                    f" assets/manual/ に画像を入れるか、Pexels/AI画像のAPIキーを設定してください。"
                )
            slide_image = generated

        parts.append(ChapterVideoPart(
            wav_path=res.wav_path,
            duration=res.duration_sec,
            images=[slide_image],
        ))
        all_segments.extend(chapter_segments(p.narration, cursor, res.duration_sec))
        cursor += res.duration_sec

    # --- 5. 字幕 (任意) + 動画 ----------------------------------------
    use_subtitles = bool(video_cfg.get("subtitles", False))
    if use_subtitles:
        srt_path = work_root / "subtitles.srt"
        write_srt(all_segments, srt_path)
        print(f"[字幕] {srt_path} ({len(all_segments)} 区間)", file=sys.stderr)
    else:
        srt_path = None
        print("[字幕] スライドに情報を焼き込んでいるため SRT 重ねはオフ", file=sys.stderr)

    out_path = work_root / "video.mp4"
    print(f"[ffmpeg] 動画組み立て: {out_path}", file=sys.stderr)
    build_video(
        parts=parts,
        srt_path=srt_path,
        out_path=out_path,
        work_dir=work_root / "ffmpeg_work",
        resolution=resolution,
        fps=int(video_cfg.get("fps", 30)),
    )
    print(f"[完了] {out_path}", file=sys.stderr)
    return out_path
