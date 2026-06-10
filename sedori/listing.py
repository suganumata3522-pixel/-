"""出品情報の自動生成。

販路ごとの慣習(文字数・絵文字・ハッシュタグ・注意書き)に合わせて、
商品名・説明文・タグ・推奨価格を自動生成する。Anthropic APIキーが設定されて
いれば、Claudeで文面をより自然に磨き上げることもできる。
"""
import json
import math
import re

CONDITIONS = [
    "新品・未開封",
    "新品",
    "未使用に近い",
    "目立った傷や汚れなし",
    "やや傷や汚れあり",
    "中古",
]

AI_MODELS = ["claude-opus-4-8", "claude-sonnet-4-6", "claude-haiku-4-5"]


class ListingAIError(Exception):
    pass


def channel_kind(channel_name):
    """販路名からテンプレート種別を判定する。"""
    name = channel_name.lower()
    if "amazon" in name or "アマゾン" in name:
        return "amazon"
    if "メルカリ" in name:
        return "mercari"
    if "ヤフオク" in name or "オークション" in name:
        return "auction"
    if "ラクマ" in name:
        return "rakuma"
    if "フリマ" in name or "paypay" in name:
        return "flea"
    return "generic"


def extract_keywords(name, limit=10):
    """商品名から検索タグ用キーワードを抽出する。"""
    cleaned = re.sub(r"[【】\[\]()()「」#・/,、。!!??]", " ", name)
    words, seen = [], set()
    for w in cleaned.split():
        w = w.strip()
        if len(w) >= 2 and w not in seen and not w.isdigit():
            seen.add(w)
            words.append(w)
    return words[:limit]


def recommend_price(cost, points, channel, amazon_price=0, min_profit=500, min_rate=10.0):
    """推奨販売価格と損益分岐価格(これ未満は赤字)を計算する。

    Amazon相場があればそれをアンカーに、なければ「実質仕入額+目標利益」から逆算。
    手数料は販売価格に対してかかるため (1 - 手数料率) で割り戻す。
    """
    effective_cost = max(0, int(cost) - int(points))
    base_cost = effective_cost + channel["shipping_cost"] + channel["fixed_fee"]
    fee = float(channel["fee_rate"]) / 100
    keep = max(0.01, 1 - fee)

    floor = int(math.ceil(base_cost / keep / 10) * 10)
    target_profit = max(int(min_profit), int(round(effective_cost * float(min_rate) / 100)))
    target = (base_cost + target_profit) / keep
    if amazon_price:
        target = max(float(amazon_price), float(floor))
    # 心理的価格(〇〇80円)に切り上げ調整
    price = int(math.ceil(target / 100) * 100) - 20
    if price < target:
        price = int(math.ceil(target / 100) * 100) + 80
    price = max(price, floor)
    return price, floor, target_profit


def _hashtags(keywords):
    return " ".join(f"#{w}" for w in keywords)


def generate(name, condition, channel, price, floor, accessories="", notes="", signature=""):
    """販路に合わせた出品ドラフト(title / description / tags)を生成する。"""
    kind = channel_kind(channel["name"])
    keywords = extract_keywords(name)
    acc = accessories.strip() or "写真に写っているものが全てです"
    extra = f"\n{notes.strip()}\n" if notes.strip() else ""
    sig = f"\n{signature.strip()}" if signature.strip() else ""

    if kind == "amazon":
        title = f"{name} {condition}".strip()[:100]
        description = (
            f"■商品説明\n{name}\n\n"
            f"■商品の状態\n{condition}\n\n"
            f"■付属品\n{acc}\n"
            f"{extra}"
            f"\n■発送について\n入金確認後、1〜2営業日以内に丁寧に梱包して発送いたします。{sig}"
        )
        tags = ", ".join(keywords)  # 出品時の「検索キーワード」欄用
    elif kind == "auction":
        title = f"{condition} {name} 即決".strip()[:65]
        description = (
            f"ご覧いただきありがとうございます。\n\n"
            f"【商品名】\n{name}\n\n"
            f"【状態】\n{condition}\n\n"
            f"【付属品】\n{acc}\n"
            f"{extra}\n"
            f"【発送】\n入金確認後、1〜2日以内に発送いたします。\n\n"
            f"【注意事項】\n・中古品にご理解のある方のみご入札ください。\n"
            f"・ノークレーム・ノーリターンでお願いいたします。\n"
            f"・即決価格でのご入札ですぐに落札いただけます。{sig}"
        )
        tags = ", ".join(keywords)
    elif kind in ("mercari", "rakuma", "flea"):
        title = f"【{condition}】{name}".strip()[:40]
        description = (
            f"ご覧いただきありがとうございます😊\n\n"
            f"【商品名】\n{name}\n\n"
            f"【状態】\n{condition}\n\n"
            f"【付属品】\n{acc}\n"
            f"{extra}\n"
            f"【発送】\n・即購入OK!\n・1〜2日以内に匿名配送で発送します\n"
            f"・丁寧に梱包してお届けします\n\n"
            f"{_hashtags(keywords)}{sig}"
        )
        tags = _hashtags(keywords)
    else:
        title = f"{name}({condition})"[:60]
        description = (
            f"【商品名】\n{name}\n\n【状態】\n{condition}\n\n【付属品】\n{acc}\n"
            f"{extra}\n【発送】\n1〜2日以内に発送いたします。{sig}"
        )
        tags = ", ".join(keywords)

    return {
        "title": title,
        "description": description,
        "tags": tags,
        "price": price,
        "price_floor": floor,
    }


def ai_polish(listing, channel_name, settings):
    """Claudeで出品文を磨き上げる。戻り値: {title, description, tags}"""
    api_key = settings.get("anthropic_api_key", "").strip()
    if not api_key:
        raise ListingAIError("Anthropic APIキーが未設定です(設定画面で登録してください)")

    import anthropic

    model = settings.get("listing_model", "").strip() or "claude-opus-4-8"
    kind = channel_kind(channel_name)
    rules = {
        "amazon": "Amazonの出品。タイトルは検索キーワードを含め簡潔に(全角50文字以内)。説明は箇条書き中心で事実ベース。絵文字・ハッシュタグ禁止。",
        "mercari": "メルカリの出品。タイトル40文字以内で【】の目を引く接頭辞。説明は親しみやすく、最後にハッシュタグを8〜10個。",
        "rakuma": "楽天ラクマの出品。メルカリと同様のフリマ向けトーン。タイトル40文字以内。",
        "flea": "Yahoo!フリマの出品。フリマ向けの親しみやすいトーン。タイトル40文字以内。",
        "auction": "ヤフオク!の出品。タイトル65文字以内で検索キーワードを多く含める。説明は丁寧語で、注意事項(ノークレーム・ノーリターン等)を含める。",
        "generic": "ECサイトの出品。簡潔で信頼感のある文面。",
    }[kind]

    schema = {
        "type": "object",
        "properties": {
            "title": {"type": "string", "description": "出品タイトル"},
            "description": {"type": "string", "description": "出品説明文(改行を含む)"},
            "tags": {"type": "string", "description": "タグまたは検索キーワード(元の形式を踏襲)"},
        },
        "required": ["title", "description", "tags"],
        "additionalProperties": False,
    }

    client = anthropic.Anthropic(api_key=api_key)
    try:
        response = client.messages.create(
            model=model,
            max_tokens=2048,
            system=(
                "あなたは日本のEC・フリマ出品文のプロのライターです。"
                "渡されたドラフトを、購入率が上がる自然で信頼感のある文面に改善してください。"
                "事実(商品名・状態・付属品)は変えず、誇大表現や虚偽は禁止。"
                f"販路ルール: {rules}"
            ),
            messages=[{
                "role": "user",
                "content": (
                    f"次の出品ドラフトを改善してください。\n\n"
                    f"タイトル: {listing['title']}\n\n"
                    f"説明文:\n{listing['description']}\n\n"
                    f"タグ: {listing['tags']}"
                ),
            }],
            output_config={"format": {"type": "json_schema", "schema": schema}},
        )
    except anthropic.AuthenticationError:
        raise ListingAIError("Anthropic APIキーが無効です")
    except anthropic.RateLimitError:
        raise ListingAIError("Claude APIのレート制限中です。少し待って再実行してください")
    except anthropic.APIStatusError as e:
        raise ListingAIError(f"Claude APIエラー({e.status_code})")
    except anthropic.APIConnectionError:
        raise ListingAIError("Claude APIに接続できません(ネットワークを確認してください)")

    if response.stop_reason == "refusal":
        raise ListingAIError("Claudeが生成を辞退しました。文面を変えて再実行してください")
    text = next((b.text for b in response.content if b.type == "text"), "")
    try:
        return json.loads(text)
    except ValueError:
        raise ListingAIError("Claudeの応答を解析できませんでした")
