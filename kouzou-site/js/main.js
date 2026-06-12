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
    { title: '梁のたわみの計算方法｜公式一覧と覚え方のコツ', url: 'articles/tawami.html', keywords: 'たわみ 変形 公式 単純梁 片持ち梁 等分布荷重 5wL4/384EI' },
    { title: 'ラーメン構造とブレース構造の違いとは？特徴と使い分けを解説', url: 'articles/rahmen-brace.html', keywords: 'ラーメン構造 ブレース構造 筋かい 剛接合 ピン接合 水平力 構造形式' },
    { title: '許容応力度計算とは？構造計算ルートの全体像をやさしく解説', url: 'articles/kyoyo-oryokudo.html', keywords: '許容応力度 構造計算 ルート1 ルート2 ルート3 一次設計 二次設計 保有水平耐力 剛性率 偏心率' },
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
