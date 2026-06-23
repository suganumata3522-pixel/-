/* 新着記事の自動表示
   ──────────────────────────────────────────────
   ▼新しい記事を公開したら、この RECENT_ARTICLES の先頭に1件追加してください。
     date（YYYY-MM-DD）の新しい順に自動で並び替え、トップページに最新6件を表示します。
     thumb は thumb-blue / thumb-teal / thumb-orange / thumb-purple から選択。
   ────────────────────────────────────────────── */
window.RECENT_ARTICLES = [
  { url: 'articles/ikkyu-torikata.html', cat: '試験・キャリア', icon: '🔥', thumb: 'thumb-orange', short: '絶対取る！3選', title: '一級建築士を取得するには？絶対取る！と決めた日から始めること3選', date: '2026-06-18', read: '約7分' },
  { url: 'articles/osusume-books.html', cat: '試験・キャリア', icon: '📚', thumb: 'thumb-purple', short: 'おすすめ実務書7選', title: '若手構造設計者におすすめの実務書7選｜現役構造一級が厳選', date: '2026-06-17', read: '約9分' },
  { url: 'articles/kouzou-ikkyu.html', cat: '試験・キャリア', icon: '🎓', thumb: 'thumb-purple', short: '構造設計一級建築士', title: '構造設計一級建築士とは？なり方・難易度・できることを解説', date: '2026-06-17', read: '約8分' },
  { url: 'articles/sougou-shikaku.html', cat: '試験・キャリア', icon: '🏫', thumb: 'thumb-orange', short: '総合資格学院', title: '【経験者が解説】最短で一級建築士に合格したい人が総合資格学院を選ぶべき理由', date: '2026-06-16', read: '約8分' },
  { url: 'articles/benkyo-hou.html', cat: '試験・キャリア', icon: '✍️', thumb: 'thumb-orange', short: '「構造」の勉強法', title: '一級建築士「構造」の勉強法とおすすめ問題集', date: '2026-06-13', read: '約8分' },
  { url: 'articles/ouryoku.html', cat: '構造力学の基礎', icon: '⚖️', thumb: 'thumb-blue', short: '応力 N・Q・M', title: '応力とは？軸力・せん断力・曲げモーメントの違いをわかりやすく解説', date: '2026-06-12', read: '約8分' },
  { url: 'articles/qm-zu.html', cat: '構造力学の基礎', icon: '📉', thumb: 'thumb-purple', short: 'Q図・M図', title: 'せん断力図（Q図）と曲げモーメント図（M図）の描き方', date: '2026-06-12', read: '約9分' }
];

(function () {
  var grid = document.getElementById('recent-grid');
  if (!grid || !window.RECENT_ARTICLES) return;
  var list = window.RECENT_ARTICLES.slice().sort(function (a, b) {
    return (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
  }).slice(0, 6);
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  var html = list.map(function (a) {
    var d = esc(a.date).replace(/-/g, '.');
    return '<a href="' + esc(a.url) + '" class="article-card">' +
      '<div class="thumb ' + esc(a.thumb) + '"><span class="t-cat">' + esc(a.cat) + '</span>' +
      '<span class="t-icon">' + a.icon + '</span><span class="t-title">' + esc(a.short) + '</span></div>' +
      '<div class="body"><h3>' + esc(a.title) + '</h3>' +
      '<div class="meta"><span>📅 ' + d + '</span><span>📖 ' + esc(a.read) + '</span></div></div></a>';
  }).join('');
  grid.innerHTML = html;
})();
