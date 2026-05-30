"""ffmpeg を呼んでナレーション音声 + 画像スライドショー + 字幕で動画を組み立てる。"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path


@dataclass
class ChapterVideoPart:
    wav_path: Path
    duration: float
    images: list[Path]  # 1チャプターに割り当てる画像 (>=1)


def _ffmpeg_bin() -> str:
    return os.environ.get("FFMPEG_BIN") or "ffmpeg"


def _check_ffmpeg() -> None:
    if not shutil.which(_ffmpeg_bin()):
        raise RuntimeError(
            "ffmpeg が見つかりません。"
            "Windows なら gyan.dev の full build を入れて PATH を通すか、"
            "環境変数 FFMPEG_BIN にパスを設定してください。"
        )


def _run(cmd: list[str]) -> None:
    print(f"  $ {' '.join(cmd)}", file=sys.stderr)
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        sys.stderr.write(proc.stderr)
        raise RuntimeError(f"ffmpeg 失敗 (exit={proc.returncode})")


def _concat_wavs(wavs: list[Path], out_wav: Path, work_dir: Path) -> None:
    listfile = work_dir / "audio_list.txt"
    listfile.write_text(
        "\n".join(f"file '{p.as_posix()}'" for p in wavs),
        encoding="utf-8",
    )
    _run([
        _ffmpeg_bin(), "-y",
        "-f", "concat", "-safe", "0",
        "-i", str(listfile),
        "-c", "copy",
        str(out_wav),
    ])


def _build_image_concat(parts: list[ChapterVideoPart], list_path: Path) -> None:
    lines: list[str] = []
    last_img: Path | None = None
    for part in parts:
        if not part.images:
            continue
        per = part.duration / len(part.images)
        for img in part.images:
            lines.append(f"file '{img.as_posix()}'")
            lines.append(f"duration {per:.3f}")
            last_img = img
    if last_img is not None:
        # concat demuxer は最終要素の duration を無視するので、もう一度ファイル名だけ書く
        lines.append(f"file '{last_img.as_posix()}'")
    list_path.write_text("\n".join(lines), encoding="utf-8")


def build_video(
    parts: list[ChapterVideoPart],
    srt_path: Path | None,
    out_path: Path,
    work_dir: Path,
    resolution: str = "1920x1080",
    fps: int = 30,
) -> Path:
    _check_ffmpeg()
    work_dir.mkdir(parents=True, exist_ok=True)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    if not parts:
        raise ValueError("チャプターがありません")

    narration_wav = work_dir / "narration.wav"
    _concat_wavs([p.wav_path for p in parts], narration_wav, work_dir)

    img_list = work_dir / "images.txt"
    _build_image_concat(parts, img_list)

    width, height = resolution.split("x")
    vf_parts = [
        f"scale={width}:{height}:force_original_aspect_ratio=decrease",
        f"pad={width}:{height}:(ow-iw)/2:(oh-ih)/2:black",
        "setsar=1",
    ]
    if srt_path is not None:
        # ffmpeg の subtitles フィルタはカンマやコロンを嫌うので、相対パス化する
        srt_for_filter = srt_path.name
        work_srt = work_dir / srt_for_filter
        if srt_path.resolve() != work_srt.resolve():
            work_srt.write_text(srt_path.read_text(encoding="utf-8"), encoding="utf-8")
        vf_parts.append(
            f"subtitles={srt_for_filter}:force_style='FontName=Noto Sans CJK JP,FontSize=24,OutlineColour=&H80000000,BorderStyle=3'"
        )
    vf = ",".join(vf_parts)

    cmd = [
        _ffmpeg_bin(), "-y",
        "-f", "concat", "-safe", "0",
        "-i", str(img_list.name),
        "-i", str(narration_wav.resolve()),
        "-vf", vf,
        "-r", str(fps),
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "20",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest",
        str(out_path.resolve()),
    ]
    # cwd を work_dir にして相対パスで動かす (subtitles フィルタ対策)
    print(f"  $ (cd {work_dir}) {' '.join(cmd)}", file=sys.stderr)
    proc = subprocess.run(cmd, capture_output=True, text=True, cwd=str(work_dir))
    if proc.returncode != 0:
        sys.stderr.write(proc.stderr)
        raise RuntimeError(f"ffmpeg 失敗 (exit={proc.returncode})")
    return out_path
