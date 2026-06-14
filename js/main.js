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
    { title: '形鋼とは？意味・読み方・種類とI形鋼の用途', url: 'articles/katakou.html', keywords: '形鋼 かたこう 意味 読み方 種類 規格 H形鋼 I形鋼 溝形鋼 山形鋼 G3192 アイ形鋼 クレーン 用途' },
    { title: '形鋼の読み方｜H形鋼・山形鋼・C形鋼の表記', url: 'articles/katakou-yomikata.html', keywords: '形鋼 読み方 H形鋼 エイチ 山形鋼 やまがた アングル C形鋼 溝形鋼 みぞがた チャンネル 寸法 表記 せい 幅 ウェブ フランジ 規格 一覧' },
    { title: '軽量形鋼とは？種類・規格とCチャンとの違い', url: 'articles/keiryou-katakou.html', keywords: '軽量形鋼 けいりょうかたこう リップ溝形鋼 Cチャン C形鋼 冷間成形 薄板 溶接性 母屋 胴縁 SSC400 G3350 種類 規格' },
    { title: '一般構造用軽量形鋼（SSC400）とは？', url: 'articles/ssc400.html', keywords: 'SSC400 一般構造用軽量形鋼 G3350 SS400 違い 冷間成形 薄板 胴縁 どうぶち 母屋 間柱 二次部材 規格' },
    { title: '開断面とは？閉断面との違い・ねじれ・座屈', url: 'articles/kai-danmen.html', keywords: '開断面 かいだんめん 意味 読み方 閉断面 違い ねじれ ねじり剛性 横座屈 H形鋼 溝形鋼 山形鋼 横補剛' },
    { title: '閉断面とは？開断面との違い・座屈抵抗性', url: 'articles/hei-danmen.html', keywords: '閉断面 へいだんめん 開断面 違い ねじり剛性 座屈 角形鋼管 円形鋼管 箱形断面 柱 中空' },
    { title: '箱型断面とは？断面係数・断面二次モーメント', url: 'articles/hakogata-danmen.html', keywords: '箱型断面 箱形断面 ボックス断面 はこがた 断面係数 断面二次モーメント 計算 BH3 角形鋼管 BCR BCP 柱 閉断面' },
    { title: '中空断面とは？断面性能の計算と座屈への影響', url: 'articles/chuukuu-danmen.html', keywords: '中空断面 ちゅうくう 断面係数 断面二次モーメント 計算 鋼管 円形 角形 座屈 断面二次半径 局部座屈 中実 比較' },
    { title: '充腹形とは？非充腹形・鉄骨との関係', url: 'articles/juufukukei.html', keywords: '充腹形 じゅうふくけい 非充腹形 ウェブ 腹板 トラス梁 ラチス H形鋼 充腹梁 鉄骨 充腹でない' },
    { title: '中実材とは？中空材との違いと断面二次モーメント', url: 'articles/chuujitsu-zai.html', keywords: '中実材 ちゅうじつざい 読み方 中空材 違い 丸鋼 平鋼 角鋼 断面二次モーメント 比較 鋼管 効率' },
    { title: '薄肉とは？厚み1.6〜3.2mmと軽量鉄骨', url: 'articles/hakuniku.html', keywords: '薄肉 はくにく 読み方 板厚 1.6 3.2 軽量鉄骨 軽量形鋼 薄肉断面 種類 局部座屈 リップ 重量鉄骨 6mm デッキプレート' },
    { title: '梁の寸法とは？RC・S造の標準寸法とH形鋼表記', url: 'articles/hari-sunpou.html', keywords: '梁の寸法 梁せい 梁幅 RC造 S造 標準寸法 スパン 1/10 1/15 H形鋼 表記 読み方 断面係数 目安' },
    { title: 'H形鋼（H鋼）とは？規格・寸法・材質・用途', url: 'articles/h-katako.html', keywords: 'H形鋼 H鋼 エイチ 規格 寸法 材質 用途 G3192 フランジ ウェブ 細幅 中幅 広幅 SS400 SN材 柱 梁' },
    { title: 'H形鋼の読み方・寸法表記の読み方', url: 'articles/h-katako-yomikata.html', keywords: 'H形鋼 読み方 寸法表記 せい 幅 ウェブ厚 フランジ厚 呼称寸法 実寸法 H-400×200×8×13 図面' },
    { title: 'H鋼の断面性能・単位重量一覧（早見表）', url: 'articles/h-danmenseinou.html', keywords: 'H形鋼 H鋼 断面性能 単位重量 一覧 早見表 重量 kg/m 断面積 断面二次モーメント 断面係数 Ix Iy Zx Zy 細幅 広幅' },
    { title: 'H形鋼の重量の計算方法', url: 'articles/h-juuryou-keisan.html', keywords: 'H形鋼 重量 計算方法 単位重量 kg/m 断面積 密度 7.85 0.785 積算 自重 求め方 フィレット' },
    { title: 'H形鋼の断面係数とは？公式・計算方法', url: 'articles/h-danmen-keisu.html', keywords: 'H形鋼 断面係数 Z Zx Zy 公式 計算方法 規格 強軸 弱軸 曲げ応力度 M/Z 求め方' },
    { title: 'H形鋼の断面二次モーメント｜強軸と弱軸', url: 'articles/h-danmen-moment.html', keywords: 'H形鋼 断面二次モーメント I Ix Iy 強軸 弱軸 違い 求め方 公式 一覧 曲げ剛性 横座屈' },
    { title: 'H形鋼の広幅・中幅・細幅とは？違いと使い方', url: 'articles/h-haba.html', keywords: 'H形鋼 広幅 中幅 細幅 ひろはば なかはば ほそはば 違い 特徴 使い方 柱 梁 せい 幅 比率 断面性能 HW HM HN' },
    { title: 'H形鋼の寸法とは？値・規格・長さ・表記とJIS', url: 'articles/h-sunpou.html', keywords: 'H形鋼 寸法 値 規格 長さ 定尺 6m 12m 表記 方法 JIS G3192 許容差 呼称寸法 実寸法' },
    { title: 'H形鋼の幅厚比とは？制限値と基準強度の関係', url: 'articles/h-habaatsuhi.html', keywords: 'H形鋼 幅厚比 はばあつひ フランジ ウェブ 制限値 基準強度 F 局部座屈 235/F 部材ランク FA FB FC FD' },
    { title: 'H形鋼のフランジとウェブ｜厚み・表記・覚え方', url: 'articles/h-flange-web.html', keywords: 'H形鋼 フランジ ウェブ flange web 厚み t1 t2 サイズ表記 覚え方 曲げ せん断 役割 違い' },
    { title: 'H形鋼のウェブとは？せん断力を負担する役割', url: 'articles/h-web.html', keywords: 'H形鋼 ウェブ 腹板 サイズ 見方 t1 せん断力 せん断応力度 Q/Aw 座屈 スチフナ 補剛材' },
    { title: 'H形鋼の強度とは？強度計算の公式と許容応力度', url: 'articles/h-kyoudo.html', keywords: 'H形鋼 強度 強度計算 公式 許容応力度 fb fs 曲げ せん断 断面係数 Ma Qa 計算例 F' },
    { title: 'H形鋼の強軸・弱軸｜縦使い・横使いの関係', url: 'articles/h-jiku.html', keywords: 'H形鋼 強軸 弱軸 きょうじく じゃくじく 縦使い 横使い 断面二次モーメント Ix Iy 違い 梁 向き 横座屈' },
    { title: 'I形鋼とは？規格・断面係数とH形鋼との違い', url: 'articles/i-katako.html', keywords: 'I形鋼 アイ形鋼 規格 G3192 断面係数 H形鋼 違い フランジ 勾配 テーパー クレーン 走行梁 横座屈' },
    { title: 'CT形鋼とは？意味・用途・断面性能・規格', url: 'articles/ct-katako.html', keywords: 'CT形鋼 カットティー Cut Tee 意味 用途 断面性能 規格 H形鋼 切断 トラス 弦材 中立軸 偏心 T字' },
    { title: 'ビルドH鋼とは？意味・規格・重量・溶接', url: 'articles/build-h.html', keywords: 'ビルドH鋼 ビルドアップ BH 溶接組立H形鋼 意味 規格 重量 溶接 隅肉溶接 鋼板 自由 寸法 ロールH 大型 特殊断面' },
    { title: '外法一定H形鋼とは？JIS H形鋼との違い・規格', url: 'articles/sotonori-ittei.html', keywords: '外法一定H形鋼 そとのりいってい 外法 スーパーハイスレンド SuperHISLEND 日本製鉄 新日鉄住金 JIS H形鋼 違い 規格 納まり 梁天端 板厚' },
    { title: 'T形鋼とは？意味・用途・規格と寸法・断面係数', url: 'articles/t-katako.html', keywords: 'T形鋼 ティー形鋼 意味 用途 規格 寸法 断面係数 CT形鋼 圧延T形鋼 トラス 弦材 中立軸 偏心 T字' },
    { title: '鉄筋コンクリート造（RC造）とは？鉄筋とコンクリートの役割分担', url: 'articles/rc-zou.html', keywords: 'RC造 鉄筋コンクリート 壁式構造 ラーメン かぶり厚さ 中性化 付着 Fc コンクリート 鉄筋' },
    { title: 'RCとは何の略？RC造の意味・特徴とS造との違い', url: 'articles/rc-toha.html', keywords: 'RC とは 何の略 Reinforced Concrete 鉄筋コンクリート 意味 特徴 S造 違い 比較' },
    { title: 'RC造の耐震性と特徴｜なぜ地震に強いのか', url: 'articles/rc-taishin.html', keywords: 'RC造 耐震性 地震 剛性 じん性 粘り 耐震壁 あばら筋 帯筋 フープ せん断破壊 曲げ先行' },
    { title: 'コンクリートの弱点とは？引張の弱さ・劣化とひび割れの種類・対策', url: 'articles/concrete-jakuten.html', keywords: 'コンクリート 弱点 引張 劣化 中性化 塩害 凍害 アルカリ骨材反応 ひび割れ 乾燥収縮 水セメント比 かぶり厚さ' },
    { title: 'コンクリートと鉄筋の関係｜互いの弱点を補う仕組み', url: 'articles/rc-tetsu-kankei.html', keywords: 'コンクリート 鉄筋 関係 仕組み 圧縮 引張 役割分担 熱膨張率 付着 アルカリ 異形鉄筋 RC' },
    { title: 'コンクリートの種類7選｜用途別の特性', url: 'articles/concrete-shurui.html', keywords: 'コンクリート 種類 7選 普通 軽量 重量 高強度 高流動 マス 水密 流動化 用途別 特性 一覧' },
    { title: '普通コンクリートとは？空気量・セメント量の規格', url: 'articles/futsuu-concrete.html', keywords: '普通コンクリート 意味 特徴 空気量 4.5% セメント量 単位セメント量 単位水量 270 185 普通骨材 JASS5 単位容積質量' },
    { title: '軽量コンクリートとは？普通との違い', url: 'articles/keiryou-concrete.html', keywords: '軽量コンクリート 軽量骨材 人工軽量骨材 特徴 普通コンクリート 違い 使用箇所 床 屋根 自重 ヤング係数 乾燥収縮 1種 2種' },
    { title: '高強度コンクリートとは？呼び強度・水セメント比', url: 'articles/koukyoudo-concrete.html', keywords: '高強度コンクリート 意味 呼び強度 JIS A5308 水セメント比 W/C 設計基準強度 Fc 36 60 超高層 柱' },
    { title: '高流動コンクリートと高性能AE減水材', url: 'articles/kouryuudou-concrete.html', keywords: '高流動コンクリート 自己充填 締固め 高性能AE減水材 減水材 スランプフロー 過密配筋 単位水量 混和剤' },
    { title: 'マスコンクリートとは？温度ひび割れと対策', url: 'articles/mass-concrete.html', keywords: 'マスコンクリート JASS5 定義 水和熱 内部温度上昇 温度ひび割れ 温度応力 低発熱セメント 中庸熱 低熱 パイプクーリング 誘発目地' },
    { title: '水密コンクリートとは？W/C50%以下の特徴', url: 'articles/suimitsu-concrete.html', keywords: '水密コンクリート 水セメント比 50% 単位粗骨材量 緻密 ブリーディング 水槽 地下 水路 防水 ペースト' },
    { title: '寒中コンクリートとは？温度・養生・空気量', url: 'articles/kanchuu-concrete.html', keywords: '寒中コンクリート 意味 日平均気温 4℃ 初期凍害 水セメント比 60% 打込み温度 加熱 保温養生 給熱養生 空気量 5N' },
    { title: '暑中コンクリートとは？意味と対策', url: 'articles/shochuu-concrete.html', keywords: '暑中コンクリート 意味 日平均気温 25℃ スランプ低下 コールドジョイント ひび割れ 打込み温度 35℃ 湿潤養生 遅延剤 加水' },
    { title: '早強コンクリートとは？記号H・養生期間', url: 'articles/soukyou-concrete.html', keywords: '早強コンクリート 早強ポルトランドセメント 記号H 初期強度 設計基準強度 養生期間 材齢3日 工期短縮 冬期 寒中 夏期 暑中 N M L' },
    { title: '無筋コンクリートとは？使える場所とRCの違い', url: 'articles/mukin-concrete.html', keywords: '無筋コンクリート 特徴 使える場所 捨てコン 均しコン 土間コンクリート 重力式擁壁 鉄筋コンクリート 違い 引張 圧縮' },
    { title: '打ち放しコンクリートとは？仕上がりの基準', url: 'articles/uchihanashi-concrete.html', keywords: '打ち放しコンクリート 打放し 意味 外壁 床 天井 仕上がり 基準 種別 JASS5 豆板 ジャンカ 型枠 撥水材 意匠' },
    { title: '流動化コンクリートとは？高流動との違い', url: 'articles/ryuudouka-concrete.html', keywords: '流動化コンクリート 流動化剤 後添加 ベースコンクリート スランプ 増大 高流動コンクリート 違い 施工特性 ポンプ圧送 材料分離' },
    { title: 'セメントの種類と特徴｜主要7種類', url: 'articles/cement-shurui.html', keywords: 'セメント 種類 特徴 7種類 普通 早強 中庸熱 低熱 耐硫酸塩 高炉 フライアッシュ ポルトランド 混合セメント 記号' },
    { title: 'セメントとコンクリートの違い', url: 'articles/cement-concrete.html', keywords: 'セメント コンクリート 違い 使い方 強度 作り方 結合材 骨材 水セメント比 水和 クリンカ' },
    { title: 'セメント・モルタル・コンクリートの違い', url: 'articles/cement-mortar-concrete.html', keywords: 'セメント モルタル コンクリート 違い 構成 用途 強度 比較 細骨材 粗骨材 砂 砂利 ペースト' },
    { title: 'モルタルとコンクリートの違い・見分け方', url: 'articles/mortar-concrete.html', keywords: 'モルタル コンクリート 違い 強度 配合 調合 用途 見分け方 粗骨材 砂利 乾燥収縮' },
    { title: 'モルタルとグラウトの違い', url: 'articles/mortar-grout.html', keywords: 'モルタル グラウト 違い 無収縮モルタル 無収縮グラウト まんじゅう 饅頭 露出柱脚 ベースプレート 充填 流動性' },
    { title: 'セメントペーストとは？水セメント比', url: 'articles/cement-paste.html', keywords: 'セメントペースト ノロ 水セメント比 W/C モルタル 違い タイル 接着 ノロ引き 結合材' },
    { title: 'ポルトランドセメントとは？6種類の特徴', url: 'articles/portland-cement.html', keywords: 'ポルトランドセメント 6種類 普通 早強 超早強 中庸熱 低熱 耐硫酸塩 N H UH M L SR 成分 クリンカ エーライト ビーライト JIS R5210' },
    { title: '普通ポルトランドセメント（記号N）', url: 'articles/portland-n.html', keywords: '普通ポルトランドセメント 記号N Normal 強度 使い方 規格 JIS R5210 材齢28日 一般 汎用' },
    { title: '早強ポルトランドセメント（記号H）', url: 'articles/portland-h.html', keywords: '早強ポルトランドセメント そうきょう 記号H 初期強度 強度発現 材齢3日 寒中 工期短縮 プレキャスト 水和熱' },
    { title: '中庸熱ポルトランドセメント（記号M）', url: 'articles/portland-m.html', keywords: '中庸熱ポルトランドセメント ちゅうようねつ 記号M 水和熱 強度発現 養生期間 マスコンクリート 長期強度' },
    { title: '低熱ポルトランドセメント（記号L）', url: 'articles/portland-l.html', keywords: '低熱ポルトランドセメント 記号L Low heat 水和熱 初期強度 長期強度 ビーライト マスコン 高強度 高流動 比較' },
    { title: '混合セメントとは？A種・B種・C種', url: 'articles/kongou-cement.html', keywords: '混合セメント A種 B種 C種 高炉スラグ フライアッシュ シリカ 混合率 メリット デメリット 低発熱 長期強度 耐久性' },
    { title: '高炉セメントとは？特徴・用途', url: 'articles/kouro-cement.html', keywords: '高炉セメント 高炉スラグ 特徴 用途 ポルトランドセメント 違い 長期強度 水和熱 水密性 化学抵抗 アルカリシリカ反応 JIS R5211' },
    { title: '高炉セメントA種とは？B・C種との違い', url: 'articles/kouro-cement-a.html', keywords: '高炉セメントA種 スラグ 5 30% B種 C種 違い デメリット 使い分け ポルトランド 中途半端' },
    { title: '高炉セメントB種とは？記号BB・混合率', url: 'articles/kouro-cement-b.html', keywords: '高炉セメントB種 記号BB 混合率 30 60% 特徴 JIS R5211 一般的 長期強度 低発熱 耐久性 バランス' },
    { title: '高炉セメントC種とは？スラグ60%超', url: 'articles/kouro-cement-c.html', keywords: '高炉セメントC種 記号BC 高炉スラグ 60% 70% 特徴 低発熱 耐久性 デメリット 初期強度 養生 中性化' },
    { title: 'フライアッシュセメントとは？特徴・種類', url: 'articles/flyash-cement.html', keywords: 'フライアッシュセメント 石炭灰 特徴 種類 A種 B種 C種 ワーカビリティ ボールベアリング ポゾラン 長期強度 水和熱 高炉セメント 違い JIS R5213' },
    { title: 'フライアッシュセメントB種とは？', url: 'articles/flyash-cement-b.html', keywords: 'フライアッシュセメントB種 混合率 10 20% 特徴 デメリット マスコンクリート 低発熱 ワーカビリティ 長期強度 中性化' },
    { title: 'エコセメントとは？意味・用途・JIS・強度', url: 'articles/eco-cement.html', keywords: 'エコセメント 意味 用途 JIS R5214 強度 都市ごみ 焼却灰 下水汚泥 普通エコセメント 速硬エコセメント 塩化物イオン リサイクル 環境' },
    { title: 'セメントの硬化時間｜温度・夏冬の違い', url: 'articles/cement-kouka-jikan.html', keywords: 'セメント 硬化時間 凝結 始発 終結 硬化 温度 夏 冬 違い 早める 早強 促進剤 養生 コールドジョイント' },
    { title: 'アルカリ骨材反応の対策｜意味・種類と3方法', url: 'articles/alkali-kotsuzai.html', keywords: 'アルカリ骨材反応 アルカリシリカ反応 ASR 対策 意味 種類 抑制 高炉セメント フライアッシュ アルカリ総量 3.0kg 無害 骨材 ひび割れ 膨張' },
    { title: '比表面積とは？公式・単位とセメント一覧', url: 'articles/hihyoumenseki.html', keywords: '比表面積 ひひょうめんせき 粉末度 ブレーン値 公式 単位 cm2/g 粒子 細かい 表面積 初期強度 水和 セメント 一覧 早強 普通' },
    { title: '骨材とは？粗骨材と細骨材の違い・品質基準', url: 'articles/kotsuzai.html', keywords: '骨材 こつざい 粗骨材 細骨材 違い 5mm ふるい 配合 割合 品質基準 粒度 密度 吸水率 砂 砂利 砕石 JIS A5005' },
    { title: '粗骨材とは？意味・定義・読み方と最大寸法', url: 'articles/sokotsuzai.html', keywords: '粗骨材 そこつざい 意味 定義 読み方 5mm ふるい 砂利 砕石 最大寸法 関係' },
    { title: '粗骨材の最大寸法｜25mmの根拠とかぶり', url: 'articles/sokotsuzai-saidai.html', keywords: '粗骨材 最大寸法 Gmax 25mm 20mm 40mm 根拠 求め方 ふるい かぶり厚さ 鉄筋 あき 部材寸法 充填 ジャンカ' },
    { title: '細骨材とは？粗骨材との違いと配合での役割', url: 'articles/saikotsuzai.html', keywords: '細骨材 さいこつざい 意味 読み方 砂 粗骨材 違い 配合 役割 細骨材率 s/a 計算 スランプ ワーカビリティ' },
    { title: '絶対容積とは？計算と骨材の割合・空気量', url: 'articles/zettai-youseki.html', keywords: '絶対容積 ぜったいようせき 意味 計算 質量 密度 骨材 割合 空気量 1m3 1000L 配合設計' },
    { title: '普通骨材とは？読み方・品質とコンクリート', url: 'articles/futsuu-kotsuzai.html', keywords: '普通骨材 ふつうこつざい 読み方 品質 密度 2.5 普通コンクリート 砂 砂利 砕石 軽量骨材 重量骨材' },
    { title: '軽量骨材とは？種類・密度とJISとの関係', url: 'articles/keiryou-kotsuzai.html', keywords: '軽量骨材 けいりょうこつざい 意味 種類 人工軽量骨材 単位体積重量 密度 軽量コンクリート JIS A5002 膨張頁岩 吸水' },
    { title: '再生骨材とは？種類・JISと再生骨材H', url: 'articles/saisei-kotsuzai.html', keywords: '再生骨材 さいせいこつざい 意味 種類 JIS A5021 A5022 A5023 再生骨材H M L 解体コンクリート 再利用 高品質' },
    { title: '砕石とコンクリートの関係｜種類・サイズ', url: 'articles/saiseki.html', keywords: '砕石 さいせき コンクリート 粗骨材 種類 サイズ 呼び 2005 2505 川砂利 違い 使う理由 JIS A5005 付着 角張り' },
    { title: 'フレッシュコンクリートとは？性質・品質管理', url: 'articles/fresh-concrete.html', keywords: 'フレッシュコンクリート 生コン 性質 ワーカビリティ コンシステンシー 材料分離 スランプ試験 品質管理 空気量 塩化物' },
    { title: '富配合・富調合とは？貧配合との違い', url: 'articles/tomi-haigou.html', keywords: '富配合 富調合 ふはいごう ふちょうごう 貧配合 貧調合 違い セメント量 モルタル 調合 強度 乾燥収縮' },
    { title: 'ワーカビリティとは？スランプとの関係', url: 'articles/workability.html', keywords: 'ワーカビリティ workability スランプ 関係 コンシステンシー 違い AE減水剤 施工性 材料分離 フィニッシャビリティ' },
    { title: 'ブリーディングとは？原因とレイタンス', url: 'articles/bleeding.html', keywords: 'ブリーディング bleeding 原因 試験方法 JIS A1123 レイタンス 違い 単位水量 材料分離 打ち継ぎ' },
    { title: '混和材料とは？AE剤・減水剤・フライアッシュ', url: 'articles/konwazai.html', keywords: '混和材料 混和剤 混和材 AE剤 減水剤 AE減水剤 フライアッシュ 高炉スラグ 膨張材 シリカフューム 目的 使い分け' },
    { title: 'AE剤とは？効果・添加量と減水剤との違い', url: 'articles/ae-zai.html', keywords: 'AE剤 エーイー剤 空気連行剤 効果 添加量 減水剤 違い ワーカビリティ 凍結融解 エントレインドエア 空気量 強度' },
    { title: 'スランプ試験とは？スランプコーンとFc', url: 'articles/slump-shiken.html', keywords: 'スランプ試験 スランプコーン 方法 JIS A1101 スランプ値 25回 3層 Fc 設計基準強度 呼び強度 軟らかさ' },
    { title: 'コンクリートのスランプ値｜18cmの根拠', url: 'articles/slump-chi.html', keywords: 'スランプ値 コンクリート 18cm 根拠 許容値 許容差 ±2.5 8 18 21 規定 JIS A5308 JASS5 範囲' },
    { title: 'スランプフローとは？スランプとの違い', url: 'articles/slump-flow.html', keywords: 'スランプフロー スランプ 違い 許容値 測定方法 広がり 直径 50 60 65 高流動 高強度 コーン 2方向' },
    { title: 'コンクリートの空気量｜許容値4〜6%', url: 'articles/kuukiryou.html', keywords: '空気量 コンクリート 規格 許容値 4 6% 4.5% ±1.5 計算 AE剤 エントレインドエア 強度 圧力法 JIS A1128 凍結融解' },
    { title: '水セメント比とは？計算と60%以下の根拠', url: 'articles/mizu-cement-hi.html', keywords: '水セメント比 W/C 計算方法 60% 65% 50% 根拠 単位水量 単位セメント量 強度 耐久性 中性化 JASS5' },
    { title: '単位水量とは？185kg/m³以下の規準', url: 'articles/tani-suiryou.html', keywords: '単位水量 185 kg/m3 規準 JASS5 水セメント比 スランプ 関係 乾燥収縮 ブリーディング 上限' },
    { title: '単位セメント量とは？求め方と最小値', url: 'articles/tani-cement-ryou.html', keywords: '単位セメント量 意味 求め方 計算 最小値 270 kg/m3 ワーカビリティ 水セメント比 単位水量 富配合 耐久性' },
    { title: 'コンクリートの養生とは？日数・温度・湿潤', url: 'articles/yojou.html', keywords: '養生 ようじょう コンクリート 意味 養生日数 温度管理 湿潤養生 強度発現 ひび割れ 耐久性 散水 シート' },
    { title: '湿潤養生とは？期間・シートのやり方', url: 'articles/shitsujun-yojou.html', keywords: '湿潤養生 しつじゅんようじょう 期間 シート 養生マット 膜養生剤 散水 やり方 水和 乾燥 コンクリート 日数' },
    { title: '標準水中養生とは？現場水中・封かんとの違い', url: 'articles/suichuu-yojou.html', keywords: '標準水中養生 現場水中養生 封かん養生 違い 供試体 テストピース 20度 強度試験 判定 構造体強度' },
    { title: '養生期間とは？日数・早強・冬の規定', url: 'articles/yojou-kikan.html', keywords: '養生期間 日数 早強 普通 高炉 3日 5日 7日 気温 冬 寒中 規定 凍結 5N JASS5' },
    { title: '材齢とは？読み方・数え方と28日強度', url: 'articles/zairei.html', keywords: '材齢 ざいれい 読み方 数え方 28日 強度 設計基準強度 打込み 経過日数 養生 関係 早強 3日 7日' },
    { title: 'コンクリートの硬化時間｜固まるまでと養生', url: 'articles/concrete-kouka-jikan.html', keywords: 'コンクリート 硬化時間 固まるまで 凝結 始発 終結 硬化 温度 影響 養生期間 型枠 材齢 夏 冬' },
    { title: 'コンクリートの硬化を早めるには？', url: 'articles/kouka-hayameru.html', keywords: 'コンクリート 硬化 早める 早強セメント 硬化促進剤 促進剤 加温養生 給熱 蒸気養生 水セメント比 夏 冬 寒中' },
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
