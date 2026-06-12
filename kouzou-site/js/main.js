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
