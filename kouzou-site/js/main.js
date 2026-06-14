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
    { title: '鋼構造設計規準とは？内容・実務での使い方', url: 'articles/koukouzou-kijun.html', keywords: '鋼構造設計規準 こうこうぞうせっけいきじゅん 日本建築学会 許容応力度設計法 AIJ 規準 鉄骨 S造 部材 座屈 接合部' },
    { title: '鋼構造接合部設計指針とは？内容・目次・柱脚', url: 'articles/setsugoubu-shishin.html', keywords: '鋼構造接合部設計指針 接合部 設計指針 日本建築学会 保有耐力接合 柱脚 露出柱脚 根巻き柱脚 埋込み柱脚 柱梁接合部 パネルゾーン 高力ボルト 溶接 継手 目次' },
    { title: '冷間成形角形鋼管設計施工マニュアル（BCR・BCP）', url: 'articles/reikan-kakukei.html', keywords: '冷間成形角形鋼管 れいかんせいけい 角形鋼管 コラム BCR BCP BCR295 BCP235 BCP325 ロール成形 プレス成形 応力割増し 設計根拠 マニュアル 目次' },
    { title: '梁継手・接合部標準図集とは？SCSS-H97の活用', url: 'articles/scss.html', keywords: 'SCSS-H97 SCSS 梁継手 接合部 標準図集 H形鋼 標準ディテール 標準接合部 鉄骨 設計実務 図面 1997' },
    { title: 'JASS6とは？建築工事標準仕様書 鉄骨工事', url: 'articles/jass6.html', keywords: 'JASS6 JASS 建築工事標準仕様書 鉄骨工事 日本建築学会 溶接 高力ボルト 建方 検査 工作 ファブ 製作' },
    { title: '鋼材ハンドブックとは？メーカー資料の使い方', url: 'articles/koukou-handbook.html', keywords: '鋼材ハンドブック こうざい ハンドブック 日本製鉄 新日鉄住金 JFE スチール 形鋼 鋼板 断面性能 規格寸法 単位質量 SN材 SS400 構造設計' },
    { title: '鋼材の種類とは？記号（SS・SN・SM材）の違い', url: 'articles/kouzai-shurui.html', keywords: '鋼材 種類 こうざい SS SN SM SS400 SN400 SN490 SM490 記号 違い 一般構造用 建築構造用 溶接構造用 圧延鋼材 用途 材質' },
    { title: '構造用鋼材とは？種類・規格とSTKRの意味', url: 'articles/kouzouyou-kouzai.html', keywords: '構造用鋼材 こうぞうようこうざい STKR STK 角形鋼管 鋼管 一般構造用角形鋼管 BCR BCP 規格 SS SN SM 種類' },
    { title: '普通鋼とは？意味・種類と特殊鋼との違い', url: 'articles/futsuukou.html', keywords: '普通鋼 ふつうこう 炭素鋼 SS400 特殊鋼 違い 合金鋼 ステンレス鋼 関係 種類 意味 鋼 分類' },
    { title: '特殊鋼とは？普通鋼との違いと耐火鋼・高張力鋼', url: 'articles/tokushukou.html', keywords: '特殊鋼 とくしゅこう 合金鋼 普通鋼 違い 耐火鋼 FR鋼 高張力鋼 ステンレス鋼 工具鋼 性質' },
    { title: '軟鋼とは？硬鋼との違い・炭素量と引張強さ', url: 'articles/nankou.html', keywords: '軟鋼 なんこう 硬鋼 炭素量 低炭素鋼 引張強さ 490 延性 粘り SS400 SN400 溶接性 違い' },
    { title: '高張力鋼（ハイテン）とは？許容応力度と使い分け', url: 'articles/kouchouryokukou.html', keywords: '高張力鋼 こうちょうりょくこう ハイテン HT 高強度鋼 引張強さ 490 570 590 780 規格 許容応力度 基準強度 F 軟鋼 使い分け ヤング係数 剛性' },
    { title: 'ステンレス鋼とは？線膨張係数・降伏点・引張強度', url: 'articles/stainless.html', keywords: 'ステンレス鋼 すてんれす SUS304 クロム 耐食性 線膨張係数 ヤング係数 降伏点 引張強度 0.2%耐力 合金鋼 錆 特徴' },
    { title: 'FR鋼（耐火鋼）とは？耐火被覆省略の条件', url: 'articles/fr-kou.html', keywords: 'FR鋼 耐火鋼 たいかこう Fire Resistant モリブデン 高温 600度 耐火被覆 省略 低減 建築基準法 耐火性能検証 大臣認定 鉄骨あらわし' },
    { title: 'TMCP鋼とは？板厚40mm超でも降伏点を維持', url: 'articles/tmcp-kou.html', keywords: 'TMCP鋼 熱加工制御 Thermo-Mechanical 制御圧延 加速冷却 板厚 40mm 降伏点 基準強度 炭素当量 溶接性 大臣認定 SA440 超高層 厚板' },
    { title: '高炉材とは？電炉材との違い・メーカー3社', url: 'articles/kouro-zai.html', keywords: '高炉材 こうろざい 高炉 電炉材 電炉 鉄鉱石 スクラップ 転炉 銑鉄 日本製鉄 JFE 神戸製鋼 コベルコ ミルシート 製鉄' },
    { title: 'JIS鋼材とは？主要鋼材の規格記号と特性一覧', url: 'articles/jis-kouzai.html', keywords: 'JIS鋼材 JIS 日本産業規格 規格記号 規格番号 G3101 G3106 G3136 G3444 G3466 SS400 SN SM STK STKR SSC 基準強度 F ミルシート 一覧' },
    { title: '鉄筋コンクリート造（RC造）とは？鉄筋とコンクリートの役割分担', url: 'articles/rc-zou.html', keywords: 'RC造 鉄筋コンクリート 壁式構造 ラーメン かぶり厚さ 中性化 付着 Fc コンクリート 鉄筋' },
    { title: 'RCとは何の略？RC造の意味・特徴とS造との違い', url: 'articles/rc-toha.html', keywords: 'RC とは 何の略 Reinforced Concrete 鉄筋コンクリート 意味 特徴 S造 違い 比較' },
    { title: 'RC造の耐震性と特徴｜なぜ地震に強いのか', url: 'articles/rc-taishin.html', keywords: 'RC造 耐震性 地震 剛性 じん性 粘り 耐震壁 あばら筋 帯筋 フープ せん断破壊 曲げ先行' },
    { title: 'コンクリートの弱点とは？引張の弱さ・劣化とひび割れの種類・対策', url: 'articles/concrete-jakuten.html', keywords: 'コンクリート 弱点 引張 劣化 中性化 塩害 凍害 アルカリ骨材反応 ひび割れ 乾燥収縮 水セメント比 かぶり厚さ' },
    { title: 'コンクリートと鉄筋の関係｜互いの弱点を補う仕組み', url: 'articles/rc-tetsu-kankei.html', keywords: 'コンクリート 鉄筋 関係 仕組み 圧縮 引張 役割分担 熱膨張率 付着 アルカリ 異形鉄筋 RC' },
    { title: '木造（W造）とは？在来軸組工法と枠組壁工法・耐震のポイント', url: 'articles/w-zou.html', keywords: '木造 W造 在来軸組 2×4 枠組壁工法 壁量計算 四分割法 N値計算 壁倍率 CLT 接合金物' },
    { title: '在来工法とは？概要・耐震性・伝統工法との違い', url: 'articles/zairai-kouhou.html', keywords: '在来工法 在来軸組工法 木造 伝統工法 伝統構法 耐震性 筋かい 石場建て 違い' },
    { title: '在来軸組工法とは？部材の種類と役割・枠組壁工法との違い', url: 'articles/jikugumi-kouhou.html', keywords: '在来軸組工法 部材 土台 柱 通し柱 管柱 梁 桁 胴差 筋かい 火打ち 母屋 2×4 枠組壁工法' },
    { title: '軸組と枠組の違い・耐力壁の役割と軸組図の読み方', url: 'articles/jiku-waku.html', keywords: '軸組 枠組 違い 耐力壁 軸組図 読み方 たすき掛け 筋かい 2×4 木造' },
    { title: '四分割法とは？壁充足率・壁率比の計算と偏心の確認方法', url: 'articles/yonbunkatsu.html', keywords: '四分割法 壁充足率 壁率比 偏心 配置バランス 側端部分 必要壁量 存在壁量 木造' },
    { title: '壁倍率とは？筋かい・石膏ボードの値一覧と必要壁量の計算', url: 'articles/kabebairitsu.html', keywords: '壁倍率 筋かい 石膏ボード 構造用合板 値 一覧 必要壁量 存在壁量 壁量計算 たすき掛け ホールダウン' },
    { title: '基礎構造とは？直接基礎と杭基礎の違い・地盤との関係', url: 'articles/kiso-kouzou.html', keywords: '基礎 基礎構造 直接基礎 独立基礎 布基礎 べた基礎 杭基礎 支持杭 摩擦杭 地盤 支持力 不同沈下 液状化' },
    { title: '基礎とは？べた基礎・布基礎・独立基礎の意味と種類', url: 'articles/chokusetsu-kiso.html', keywords: '基礎 べた基礎 布基礎 独立基礎 直接基礎 種類 意味 フーチング 不同沈下 木造' },
    { title: '基礎構造と耐震性｜直接基礎・杭基礎の選び方と設計の関係', url: 'articles/kiso-taishin.html', keywords: '基礎構造 耐震性 設計 直接基礎 杭基礎 不同沈下 液状化 地中梁 地盤改良 支持力' },
    { title: 'N値と支持層とは？ボーリング調査（標準貫入試験）の読み方', url: 'articles/n-chi.html', keywords: 'N値 支持層 ボーリング 標準貫入試験 地盤調査 柱状図 砂質 粘性土 SWS 基礎' },
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
