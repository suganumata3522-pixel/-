"""利益計算エンジン。

販路の手数料体系とポイント還元を加味して、利益額・利益率・ROIを算出する。
"""


def calc(sell_price, cost, fee_rate=10.0, fixed_fee=0, shipping=0, other=0, point_rate=0.0):
    """1個あたりの利益指標を計算する。

    sell_price: 販売価格(円)
    cost:       仕入価格(円)
    fee_rate:   販売手数料率(%)
    fixed_fee:  固定手数料(円)
    shipping:   送料(円)
    other:      その他経費(円)
    point_rate: 仕入時ポイント還元率(%) — 実質仕入額を引き下げる
    """
    sell_price = int(sell_price or 0)
    cost = int(cost or 0)
    fees = int(round(sell_price * float(fee_rate) / 100)) + int(fixed_fee or 0)
    point_back = int(round(cost * float(point_rate) / 100))
    effective_cost = cost - point_back
    profit = sell_price - fees - int(shipping or 0) - int(other or 0) - effective_cost
    profit_rate = (profit / sell_price * 100) if sell_price else 0.0
    roi = (profit / effective_cost * 100) if effective_cost > 0 else 0.0
    return {
        "sell_price": sell_price,
        "cost": cost,
        "fees": fees,
        "point_back": point_back,
        "effective_cost": effective_cost,
        "profit": profit,
        "profit_rate": round(profit_rate, 1),
        "roi": round(roi, 1),
    }


def calc_with_channel(sell_price, cost, channel, shipping=None, other=0, point_rate=0.0):
    """channels テーブルの行を使って計算する。shipping未指定なら販路の標準送料。"""
    return calc(
        sell_price,
        cost,
        fee_rate=channel["fee_rate"],
        fixed_fee=channel["fixed_fee"],
        shipping=channel["shipping_cost"] if shipping is None else shipping,
        other=other,
        point_rate=point_rate,
    )
