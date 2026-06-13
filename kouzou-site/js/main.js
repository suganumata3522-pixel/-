// モバイルメニューの開閉
document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.global-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      nav.classList.toggle('open');
      toggle.classList.toggle('open');
    });
  }

  // 現在ページのナビ項目をハイライト
  var path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.global-nav a').forEach(function (a) {
    var href = a.getAttribute('href').split('/').pop();
    if (href === path) a.classList.add('active');
  });

  // サイト内検索(トップページのみ)
  // 記事を追加したら、この一覧に {title, url, keywords} を1行追加してください
  var ARTICLES = [
    { title: '応力とは？軸力・せん断力・曲げモーメントの違いをわかりやすく解説', url: 'articles/ouryoku.html', keywords: '応力 軸力 せん断力 曲げモーメント N Q M 内力 応力度' },
    { title: '応力度とひずみ度とは？ヤング係数と応力ひずみ曲線をわかりやすく解説', url: 'articles/oryokudo-hizumi.html', keywords: '応力度 ひずみ ひずみ度 ヤング係数 弾性係数 フックの法則 応力ひずみ曲線 降伏点 引張強さ E' },
    { title: '断面二次モーメントとは？意味と計算方法を図解でわかりやすく解説', url: 'articles/danmen-niji-moment.html', keywords: '断面二次モーメント 断面係数 bh3/12 曲げにくさ 断面性能 I Z' },
    { title: 'せん断力図（Q図）と曲げモーメント図（M図）の描き方', url: 'articles/qm-zu.html', keywords: 'Q図 M図 せん断力図 曲げモーメント図 応力図 PL/4 wL2/8 反力 描き方' },
    { title: '断面係数とは？曲げ応力度の計算方法をわかりやすく解説', url: 'articles/danmen-keisu.html', keywords: '断面係数 Z 曲げ応力度 M/Z bh2/6 縁応力度 塑性断面係数 断面検定' },
    { title: '梁のたわみの計算方法｜公式一覧と覚え方のコツ', url: 'articles/tawami.html', keywords: 'たわみ 変形 公式 単純梁 片持ち梁 等分布荷重 5wL4/384EI' },
    { title: 'ラーメン構造とブレース構造の違いとは？特徴と使い分けを解説', url: 'articles/rahmen-brace.html', keywords: 'ラーメン構造 ブレース構造 筋かい 剛接合 ピン接合 水平力 構造形式' },
    { title: '許容応力度計算とは？構造計算ルートの全体像をやさしく解説', url: 'articles/kyoyo-oryokudo.html', keywords: '許容応力度 構造計算 ルート1 ルート2 ルート3 一次設計 二次設計 保有水平耐力 剛性率 偏心率' },
    { title: '反力の求め方｜つり合い式の立て方を例題でわかりやすく解説', url: 'articles/hanryoku.html', keywords: '反力 支点 ローラー ピン 固定 つり合い ΣM=0 モーメント 例題' },
    { title: '座屈とは？オイラーの公式と座屈長さをわかりやすく解説', url: 'articles/zakutsu.html', keywords: '座屈 オイラー 座屈長さ 座屈荷重 細長比 圧縮 λ 断面二次半径' },
    { title: '不静定構造とは？静定・不静定の判別式をわかりやすく解説', url: 'articles/fuseitei.html', keywords: '不静定 静定 不安定 判別式 不静定次数 m=n+s+r-2k 冗長性' },
    { title: '固有周期と共振とは？建物の揺れの基礎をわかりやすく解説', url: 'articles/koyu-shuki.html', keywords: '固有周期 共振 振動 長周期地震動 卓越周期 減衰 T=2π√(m/k)' },
    { title: 'RC造・S造・SRC造・木造の違いとは？特徴と使い分けを徹底比較', url: 'articles/kouzou-shurui.html', keywords: 'RC造 S造 SRC造 木造 鉄筋コンクリート 鉄骨 構造種別 比較 使い分け' },
    { title: '耐震・制震・免震の違いとは？仕組みとコストを比較して解説', url: 'articles/taishin-menshin.html', keywords: '耐震 制震 制振 免震 ダンパー 積層ゴム アイソレータ 地震対策' },
    { title: '固定荷重・積載荷重の拾い方｜荷重の種類と組み合わせ', url: 'articles/kajuu.html', keywords: '固定荷重 積載荷重 荷重拾い 床用 架構用 地震用 荷重の組み合わせ 長期 短期' },
    { title: '地震力の計算方法｜Ai分布・Z・Rt・Coをわかりやすく解説', url: 'articles/jishin-ryoku.html', keywords: '地震力 層せん断力 Ai分布 地域係数 Z Rt Co ベースシア Qi=CiWi' },
    { title: '層間変形角・剛性率・偏心率とは？ルート2の検討項目', url: 'articles/sokan-henkei.html', keywords: '層間変形角 剛性率 偏心率 1/200 ピロティ ねじれ 重心 剛心 ルート2' },
    { title: '耐力壁とは？役割と配置のポイント', url: 'articles/tairyoku-heki.html', keywords: '耐力壁 耐震壁 壁倍率 壁量計算 筋かい 構造用合板 直下率 非耐力壁' },
    { title: '構造設計一級建築士とは？なり方・難易度・できること', url: 'articles/kouzou-ikkyu.html', keywords: '構造設計一級建築士 資格 なり方 難易度 合格率 講習 修了考査 適合性判定 キャリア' },
    { title: '構造設計者の年収はいくら？働き方と年収を上げる方法', url: 'articles/nenshu.html', keywords: '構造設計 年収 給料 収入 転職 独立 ゼネコン 組織設計事務所 働き方 キャリア' },
    { title: '一級建築士「構造」の勉強法とおすすめ問題集', url: 'articles/benkyo-hou.html', keywords: '一級建築士 構造 勉強法 過去問 問題集 独学 試験 対策 力学' },
    { title: '鉄骨造（S造）とは？特徴・構造形式・接合・耐火被覆', url: 'articles/s-zou.html', keywords: 'S造 鉄骨造 重量鉄骨 軽量鉄骨 トラス 高力ボルト 溶接 耐火被覆 座屈 鋼材' },
    { title: '鉄骨造の基礎用語まとめ｜H形鋼・ダイアフラム・デッキなど', url: 'articles/s-yougo.html', keywords: '鉄骨造 用語 H形鋼 フランジ ウェブ ダイアフラム ガセット ベースプレート デッキプレート 母屋 胴縁 スタッド' },
    { title: '鉄骨の材料｜鋼材の性質・種類（SS400・SN材）と耐火被覆', url: 'articles/s-zairyo.html', keywords: '鉄骨 材料 鋼材 SS400 SN材 SN490 STKR 高張力鋼 耐火被覆 耐火鋼 防錆 ロックウール' },
    { title: '鉄骨造（S造）のメリット・デメリット（RC造との違い）', url: 'articles/s-merit.html', keywords: '鉄骨造 メリット デメリット 長所 短所 S造 RC造 違い 比較 大スパン 耐火' },
    { title: '折板屋根とは？意味・特徴・建築例・メリット', url: 'articles/seppan-yane.html', keywords: '折板屋根 せっぱん 折板 金属屋根 工場 倉庫 体育館 カーポート 母屋 軽量' },
    { title: '鉄筋コンクリート造（RC造）とは？鉄筋とコンクリートの役割分担', url: 'articles/rc-zou.html', keywords: 'RC造 鉄筋コンクリート 壁式構造 ラーメン かぶり厚さ 中性化 付着 Fc コンクリート 鉄筋' },
    { title: '木造（W造）とは？在来軸組工法と枠組壁工法・耐震のポイント', url: 'articles/w-zou.html', keywords: '木造 W造 在来軸組 2×4 枠組壁工法 壁量計算 四分割法 N値計算 壁倍率 CLT 接合金物' },
    { title: '基礎構造とは？直接基礎と杭基礎の違い・地盤との関係', url: 'articles/kiso-kouzou.html', keywords: '基礎 基礎構造 直接基礎 独立基礎 布基礎 べた基礎 杭基礎 支持杭 摩擦杭 地盤 支持力 不同沈下 液状化' },
    { title: '断面性能計算ツール（長方形・円形断面）', url: 'tools/section-calculator.html', keywords: '計算ツール 断面積 断面二次モーメント 断面係数 断面二次半径 無料' }
  ];

  var input = document.getElementById('site-search');
  var resultsBox = document.getElementById('search-results');
  if (input && resultsBox) {
    var render = function () {
      var q = input.value.trim().toLowerCase();
      if (!q) { resultsBox.style.display = 'none'; resultsBox.innerHTML = ''; return; }
      var hits = ARTICLES.filter(function (a) {
        return (a.title + ' ' + a.keywords).toLowerCase().indexOf(q) !== -1;
      });
      resultsBox.innerHTML = hits.length
        ? hits.map(function (a) { return '<a href="' + a.url + '">' + a.title + '</a>'; }).join('')
        : '<div class="nohit">「' + input.value + '」に一致する記事は見つかりませんでした</div>';
      resultsBox.style.display = 'block';
    };
    input.addEventListener('input', render);
    input.addEventListener('focus', render);
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.search-wrap')) resultsBox.style.display = 'none';
    });
  }
});
