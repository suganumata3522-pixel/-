import httpx
import trafilatura

USER_AGENT = (
    "Mozilla/5.0 (compatible; baseball-news-bot/0.1; "
    "+https://example.com/bot)"
)


def fetch_article_body(url: str, max_chars: int = 4000) -> str:
    """記事本文を抽出。失敗時は空文字。"""
    try:
        resp = httpx.get(
            url,
            headers={"User-Agent": USER_AGENT},
            timeout=20.0,
            follow_redirects=True,
        )
        resp.raise_for_status()
    except httpx.HTTPError:
        return ""

    extracted = trafilatura.extract(
        resp.text,
        include_comments=False,
        include_tables=False,
        favor_recall=True,
    )
    if not extracted:
        return ""
    return extracted.strip()[:max_chars]
