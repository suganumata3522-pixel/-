"""話題収集 collector パッケージ。

各 collector は base.Collector を継承し、fetch(cfg) -> list[TopicItem] を返す。
"""
from .base import Collector, TopicItem, USER_AGENT  # noqa: F401
from .bluesky import BlueskyCollector
from .google_trends import GoogleTrendsCollector
from .npb_official import NpbOfficialCollector
from .rss_5ch_matome import FiveChMatomeCollector
from .rss_google_news import GoogleNewsCollector
from .rss_hatena import HatenaBookmarkCollector
from .rss_specialty import SpecialtyMediaCollector
from .rss_sports_papers import SportsPapersCollector
from .rss_yahoo import YahooNewsCollector
from .x_twitter import XTwitterCollector
from .yahoo_realtime import YahooRealtimeCollector
from .youtube_data import YouTubeDataCollector

# config.yaml の collectors[<key>] と対応する。
# main.py から for c in ALL_COLLECTORS: items += c.safe_fetch(cfg.get(c.name, {})) する。
ALL_COLLECTORS: list[Collector] = [
    YahooNewsCollector(),         # 1
    GoogleNewsCollector(),        # 2
    SportsPapersCollector(),      # 3
    SpecialtyMediaCollector(),    # 4
    HatenaBookmarkCollector(),    # 5
    FiveChMatomeCollector(),      # 6
    GoogleTrendsCollector(),      # 7
    YouTubeDataCollector(),       # 8
    NpbOfficialCollector(),       # 9
    XTwitterCollector(),          # 10
    YahooRealtimeCollector(),     # 11
    BlueskyCollector(),           # 12
]
