from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Optional


@dataclass
class NewsItem:
    title: str
    url: str
    source: str
    published_at: Optional[datetime]
    summary: str = ""
    body: str = ""
    score: float = 0.0
    duplicates: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        d = asdict(self)
        d["published_at"] = self.published_at.isoformat() if self.published_at else None
        return d
