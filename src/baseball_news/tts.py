"""VOICEVOX 経由で台本を WAV 化するモジュール。

VOICEVOX Engine をローカル起動 (既定 http://127.0.0.1:50021) しておくこと。
"""

from __future__ import annotations

import json
import wave
from dataclasses import dataclass
from pathlib import Path

import httpx


@dataclass
class TTSResult:
    wav_path: Path
    duration_sec: float
    text: str
    audio_query: dict


class VoicevoxClient:
    def __init__(
        self,
        base_url: str = "http://127.0.0.1:50021",
        speaker: int = 3,
        speed: float = 1.0,
        pitch: float = 0.0,
        intonation: float = 1.0,
        timeout: float = 120.0,
    ):
        self.base_url = base_url.rstrip("/")
        self.speaker = speaker
        self.speed = speed
        self.pitch = pitch
        self.intonation = intonation
        self.client = httpx.Client(timeout=timeout)

    def synth(self, text: str, out_path: Path) -> TTSResult:
        out_path.parent.mkdir(parents=True, exist_ok=True)

        q = self.client.post(
            f"{self.base_url}/audio_query",
            params={"text": text, "speaker": self.speaker},
        )
        q.raise_for_status()
        audio_query = q.json()
        audio_query["speedScale"] = self.speed
        audio_query["pitchScale"] = self.pitch
        audio_query["intonationScale"] = self.intonation
        audio_query["outputSamplingRate"] = 24000
        audio_query["outputStereo"] = False

        s = self.client.post(
            f"{self.base_url}/synthesis",
            params={"speaker": self.speaker},
            content=json.dumps(audio_query),
            headers={"Content-Type": "application/json"},
        )
        s.raise_for_status()
        out_path.write_bytes(s.content)

        with wave.open(str(out_path), "rb") as w:
            duration = w.getnframes() / float(w.getframerate())

        return TTSResult(
            wav_path=out_path,
            duration_sec=duration,
            text=text,
            audio_query=audio_query,
        )

    def ping(self) -> bool:
        try:
            r = self.client.get(f"{self.base_url}/version", timeout=5.0)
            return r.status_code == 200
        except httpx.HTTPError:
            return False

    def close(self) -> None:
        self.client.close()

    def __enter__(self) -> "VoicevoxClient":
        return self

    def __exit__(self, *exc) -> None:
        self.close()
