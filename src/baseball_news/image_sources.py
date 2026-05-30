"""画像を取得するバックエンド群とディスパッチャ。

優先順位 (config.images.sources の順):
  1. local   : assets/manual/<chapter_slug>/ のファイルをそのまま使う
  2. pexels  : Pexels API で野球関連の写真を検索
  3. ai_gen  : Nano Banana (Gemini) もしくは OpenAI gpt-image-1 で生成
"""

from __future__ import annotations

import base64
import os
import re
import sys
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path

import httpx


VALID_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


@dataclass
class ImageRequest:
    chapter_idx: int
    chapter_title: str
    keywords: list[str]
    need_count: int


@dataclass
class FetchedImage:
    path: Path
    source: str
    keyword: str


def slugify(title: str) -> str:
    s = re.sub(r"[\s/\\:*?\"<>|]+", "_", title).strip("_")
    return s[:40] or "chapter"


class ImageSource(ABC):
    name: str = "base"

    @abstractmethod
    def fetch(self, req: ImageRequest, out_dir: Path, remaining: int) -> list[FetchedImage]:
        ...


class LocalSource(ImageSource):
    name = "local"

    def __init__(self, base_dir: Path):
        self.base_dir = base_dir

    def fetch(self, req: ImageRequest, out_dir: Path, remaining: int) -> list[FetchedImage]:
        slug = slugify(req.chapter_title)
        candidates: list[Path] = []
        for d in (self.base_dir / slug, self.base_dir / f"{req.chapter_idx:02d}_{slug}"):
            if d.is_dir():
                for p in sorted(d.iterdir()):
                    if p.suffix.lower() in VALID_EXTS:
                        candidates.append(p)
        return [
            FetchedImage(path=p, source="local", keyword=p.name)
            for p in candidates[:remaining]
        ]


class PexelsSource(ImageSource):
    name = "pexels"

    def __init__(self, api_key: str, per_keyword: int = 2):
        self.api_key = api_key
        self.per_keyword = per_keyword
        self.client = httpx.Client(
            timeout=30.0,
            headers={"Authorization": api_key},
        )

    def fetch(self, req: ImageRequest, out_dir: Path, remaining: int) -> list[FetchedImage]:
        results: list[FetchedImage] = []
        out_dir.mkdir(parents=True, exist_ok=True)
        for kw in req.keywords:
            if len(results) >= remaining:
                break
            query = f"{kw} baseball"
            try:
                r = self.client.get(
                    "https://api.pexels.com/v1/search",
                    params={"query": query, "per_page": self.per_keyword, "orientation": "landscape"},
                )
                r.raise_for_status()
                photos = r.json().get("photos", [])
            except httpx.HTTPError as e:
                print(f"  [pexels] {kw} 検索失敗: {e}", file=sys.stderr)
                continue
            for photo in photos:
                if len(results) >= remaining:
                    break
                url = photo.get("src", {}).get("large2x") or photo.get("src", {}).get("large")
                if not url:
                    continue
                ext = ".jpg"
                fname = f"pexels_{photo['id']}{ext}"
                fpath = out_dir / fname
                try:
                    img = self.client.get(url, timeout=60.0)
                    img.raise_for_status()
                    fpath.write_bytes(img.content)
                    results.append(FetchedImage(path=fpath, source="pexels", keyword=kw))
                except httpx.HTTPError as e:
                    print(f"  [pexels] DL失敗 {url}: {e}", file=sys.stderr)
        return results


class NanoBananaSource(ImageSource):
    """Google Gemini (Nano Banana = gemini-2.5-flash-image) で画像生成。"""

    name = "ai_gen:nano_banana"

    def __init__(self, api_key: str, model: str = "gemini-2.5-flash-image"):
        self.api_key = api_key
        self.model = model

    def fetch(self, req: ImageRequest, out_dir: Path, remaining: int) -> list[FetchedImage]:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=self.api_key)
        out_dir.mkdir(parents=True, exist_ok=True)
        results: list[FetchedImage] = []
        for kw in req.keywords:
            if len(results) >= remaining:
                break
            prompt = self._build_prompt(req.chapter_title, kw)
            try:
                resp = client.models.generate_content(
                    model=self.model,
                    contents=[prompt],
                    config=types.GenerateContentConfig(response_modalities=["IMAGE"]),
                )
            except Exception as e:
                print(f"  [nano_banana] {kw} 生成失敗: {e}", file=sys.stderr)
                continue
            blob = self._extract_image_bytes(resp)
            if not blob:
                continue
            fname = f"nano_{req.chapter_idx:02d}_{slugify(kw)}.png"
            fpath = out_dir / fname
            fpath.write_bytes(blob)
            results.append(FetchedImage(path=fpath, source=self.name, keyword=kw))
        return results

    @staticmethod
    def _build_prompt(chapter_title: str, kw: str) -> str:
        return (
            "Photorealistic landscape image, 16:9, no text or logos. "
            f"Subject: {kw}. Context: Japanese professional baseball news segment about "
            f"'{chapter_title}'. Cinematic lighting, sports broadcast style."
        )

    @staticmethod
    def _extract_image_bytes(resp) -> bytes | None:
        for cand in getattr(resp, "candidates", []) or []:
            content = getattr(cand, "content", None)
            if not content:
                continue
            for part in getattr(content, "parts", []) or []:
                inline = getattr(part, "inline_data", None)
                if inline and getattr(inline, "data", None):
                    data = inline.data
                    if isinstance(data, str):
                        return base64.b64decode(data)
                    return data
        return None


class OpenAIImageSource(ImageSource):
    name = "ai_gen:openai"

    def __init__(self, api_key: str, model: str = "gpt-image-1", size: str = "1536x1024"):
        self.api_key = api_key
        self.model = model
        self.size = size

    def fetch(self, req: ImageRequest, out_dir: Path, remaining: int) -> list[FetchedImage]:
        from openai import OpenAI

        client = OpenAI(api_key=self.api_key)
        out_dir.mkdir(parents=True, exist_ok=True)
        results: list[FetchedImage] = []
        for kw in req.keywords:
            if len(results) >= remaining:
                break
            prompt = (
                "Photorealistic landscape sports broadcast image, no text or logos. "
                f"Subject: {kw}. Japanese professional baseball news segment about "
                f"'{req.chapter_title}'."
            )
            try:
                r = client.images.generate(
                    model=self.model,
                    prompt=prompt,
                    size=self.size,
                    n=1,
                )
                b64 = r.data[0].b64_json
            except Exception as e:
                print(f"  [openai_image] {kw} 生成失敗: {e}", file=sys.stderr)
                continue
            if not b64:
                continue
            fname = f"openai_{req.chapter_idx:02d}_{slugify(kw)}.png"
            fpath = out_dir / fname
            fpath.write_bytes(base64.b64decode(b64))
            results.append(FetchedImage(path=fpath, source=self.name, keyword=kw))
        return results


class ImageDispatcher:
    def __init__(self, sources: list[ImageSource], min_per_chapter: int, max_per_chapter: int):
        self.sources = sources
        self.min_per_chapter = min_per_chapter
        self.max_per_chapter = max_per_chapter

    def collect(self, req: ImageRequest, out_dir: Path) -> list[FetchedImage]:
        target = max(self.min_per_chapter, min(self.max_per_chapter, req.need_count))
        collected: list[FetchedImage] = []
        for src in self.sources:
            if len(collected) >= target:
                break
            need = target - len(collected)
            try:
                got = src.fetch(req, out_dir, need)
            except Exception as e:
                print(f"  [{src.name}] エラー: {e}", file=sys.stderr)
                got = []
            for g in got:
                print(f"  [{src.name}] {g.path.name} ({g.keyword})", file=sys.stderr)
            collected.extend(got)
        return collected[:target]


def build_dispatcher(cfg: dict, assets_dir: Path) -> ImageDispatcher:
    """config.yaml の images セクションから ImageDispatcher を組み立てる。"""
    img_cfg = cfg.get("images", {}) or {}
    order = img_cfg.get("sources") or ["local", "pexels", "ai_gen"]
    sources: list[ImageSource] = []
    for name in order:
        if name == "local":
            sources.append(LocalSource(base_dir=assets_dir / "manual"))
        elif name == "pexels":
            if not (img_cfg.get("pexels") or {}).get("enabled", True):
                continue
            key = os.environ.get("PEXELS_API_KEY")
            if not key:
                print("  [config] PEXELS_API_KEY 未設定: pexels をスキップ", file=sys.stderr)
                continue
            sources.append(PexelsSource(api_key=key))
        elif name == "ai_gen":
            ai_cfg = img_cfg.get("ai_gen") or {}
            if not ai_cfg.get("enabled", True):
                continue
            provider = ai_cfg.get("provider", "nano_banana")
            if provider == "nano_banana":
                key = os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
                if not key:
                    print("  [config] GOOGLE_API_KEY 未設定: nano_banana をスキップ", file=sys.stderr)
                    continue
                nb_cfg = ai_cfg.get("nano_banana") or {}
                sources.append(NanoBananaSource(api_key=key, model=nb_cfg.get("model", "gemini-2.5-flash-image")))
            elif provider == "openai":
                key = os.environ.get("OPENAI_API_KEY")
                if not key:
                    print("  [config] OPENAI_API_KEY 未設定: openai 画像をスキップ", file=sys.stderr)
                    continue
                oa_cfg = ai_cfg.get("openai") or {}
                sources.append(OpenAIImageSource(
                    api_key=key,
                    model=oa_cfg.get("model", "gpt-image-1"),
                    size=oa_cfg.get("size", "1536x1024"),
                ))
            else:
                print(f"  [config] 未知のAI画像プロバイダ: {provider}", file=sys.stderr)
        else:
            print(f"  [config] 未知のimage source: {name}", file=sys.stderr)

    return ImageDispatcher(
        sources=sources,
        min_per_chapter=int(img_cfg.get("per_chapter_min", 3)),
        max_per_chapter=int(img_cfg.get("per_chapter_max", 8)),
    )
