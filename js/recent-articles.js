/* 新着記事の自動表示
   ──────────────────────────────────────────────
   ▼新しい記事を公開したら、この RECENT_ARTICLES の先頭に1件追加してください。
     date（YYYY-MM-DD）の新しい順に自動で並び替え、トップページに最新6件を表示します。
     thumb は thumb-blue / thumb-teal / thumb-orange / thumb-purple から選択。
   ────────────────────────────────────────────── */
window.RECENT_ARTICLES = [
  { url: 'articles/chikara.html', cat: '構造力学の基礎', icon: '💪', thumb: 'thumb-blue', short: '力とは？図解7枚', title: '力とは？移動・回転・変形を起こす作用をわかりやすく解説【構造力学の基礎】', date: '2026-07-03', read: '約12分' },
  { url: 'articles/rc-keisan-route.html', cat: '構造計算の実務', icon: '🧭', thumb: 'thumb-teal', short: 'RC造の計算ルート', title: 'RC造の構造計算ルートとは？ルート1・2・3の違いと判定をわかりやすく解説', date: '2026-07-06', read: '約10分' },
  { url: 'articles/tekkin-shurui.html', cat: 'RC造', icon: '🔩', thumb: 'thumb-orange', short: '鉄筋の種類 SR・SD', title: '鉄筋の種類とは？丸鋼・異形棒鋼（SR・SD）と呼び名・圧延マークを解説', date: '2026-07-03', read: '約9分' },
  { url: 'articles/rc-zou.html', cat: 'RC造', icon: '🏢', thumb: 'thumb-teal', short: 'RC造の原理', title: '鉄筋コンクリート造（RC造）とは？鉄筋とコンクリートの役割分担を解説', date: '2026-07-03', read: '約10分' },
  { url: 'articles/tosshutsubu-shindo.html', cat: '構造計算の実務', icon: '📐', thumb: 'thumb-purple', short: '突出部の水平震度', title: '突出部の水平震度とは？1G・塔屋・地震力の計算方法と検討の無料Excel', date: '2026-07-06', read: '約8分' },
  { url: 'articles/strut-tie.html', cat: '構造計算の実務', icon: '🌉', thumb: 'thumb-blue', short: 'ストラット・タイ', title: 'ストラット・タイモデルとは？考え方と基礎梁への適用・無料Excel', date: '2026-07-06', read: '約9分' },
  { url: 'articles/kyoyo-oryokudo.html', cat: '構造計算の実務', icon: '🧮', thumb: 'thumb-teal', short: '許容応力度計算', title: '許容応力度計算とは？構造計算ルートの全体像をやさしく解説', date: '2026-07-03', read: '約9分' },
  { url: 'articles/osusume-books.html', cat: '試験・キャリア', icon: '📚', thumb: 'thumb-purple', short: 'おすすめ実務書7選', title: '若手構造設計者におすすめの実務書7選｜現役構造一級が厳選', date: '2026-07-06', read: '約9分' }
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
