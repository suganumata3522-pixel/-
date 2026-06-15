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

  // 別ページから #カテゴリ で来たときは「瞬時」に移動（待ち時間をなくす）。
  // フォント読み込み等によるズレを次フレームで補正する。
  if (location.hash.length > 1) {
    var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) {
      requestAnimationFrame(function () { target.scrollIntoView(); });
    }
  }
  // ページ内リンク（チップナビ等）はなめらかにスクロール
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var hash = a.getAttribute('href');
      if (hash.length > 1) {
        var el = document.getElementById(hash.slice(1));
        if (el) {
          e.preventDefault();
          el.scrollIntoView({ behavior: 'smooth' });
          if (history.replaceState) history.replaceState(null, '', hash);
        }
      }
    });
  });

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
    { title: 'はりの公式一覧｜反力・せん断力・曲げモーメント・たわみ', url: 'articles/hari-koushiki.html', keywords: 'はり 梁 公式 一覧 反力 せん断力 曲げモーメント たわみ 片持ち梁 単純梁 両端固定 一端ピン他端固定 はね出し 集中荷重 等分布荷重 三角形分布 偏心 PL/4 wL2/8 PL3/48EI 早見表 構造モデル' },
    { title: 'ラーメン構造とブレース構造の違いとは？特徴と使い分けを解説', url: 'articles/rahmen-brace.html', keywords: 'ラーメン構造 ブレース構造 筋かい 剛接合 ピン接合 水平力 構造形式' },
    { title: '許容応力度計算とは？構造計算ルートの全体像をやさしく解説', url: 'articles/kyoyo-oryokudo.html', keywords: '許容応力度 構造計算 ルート1 ルート2 ルート3 一次設計 二次設計 保有水平耐力 剛性率 偏心率' },
    { title: '反力の求め方｜つり合い式の立て方を例題でわかりやすく解説', url: 'articles/hanryoku.html', keywords: '反力 支点 ローラー ピン 固定 つり合い ΣM=0 モーメント 例題' },
    { title: '座屈とは？オイラーの公式と座屈長さをわかりやすく解説', url: 'articles/zakutsu.html', keywords: '座屈 オイラー 座屈長さ 座屈荷重 細長比 圧縮 λ 断面二次半径' },
    { title: '不静定構造とは？静定・不静定の判別式をわかりやすく解説', url: 'articles/fuseitei.html', keywords: '不静定 静定 不安定 判別式 不静定次数 m=n+s+r-2k 冗長性' },
    { title: '固有周期と共振とは？建物の揺れの基礎をわかりやすく解説', url: 'articles/koyu-shuki.html', keywords: '固有周期 共振 振動 長周期地震動 卓越周期 減衰 T=2π√(m/k)' },
    { title: '力とは？移動・回転・変形を起こす作用', url: 'articles/chikara.html', keywords: '力 ちから 移動 回転 変形 作用 構造力学 単位 ニュートン N 荷重 外力 内力' },
    { title: '力の3要素｜大きさ・向き・作用点', url: 'articles/chikara-3youso.html', keywords: '力の3要素 大きさ 向き 方向 作用点 作用線 ベクトル 構造力学' },
    { title: '力の合成｜平行四辺形と計算', url: 'articles/chikara-gousei.html', keywords: '力の合成 合力 平行四辺形 ベクトル 計算 余弦定理 成分' },
    { title: '3つの力の合力の求め方・作図', url: 'articles/mittsu-gouryoku.html', keywords: '3つの力 合力 求め方 作図 示力図 力の多角形 平行四辺形 成分計算' },
    { title: '力の分解｜計算とピタゴラスの定理', url: 'articles/chikara-bunkai.html', keywords: '力の分解 分力 計算 ピタゴラスの定理 直交 成分 cos sin 合力' },
    { title: '合力とは？求め方と角度計算', url: 'articles/gouryoku.html', keywords: '合力 ごうりょく 読み方 求め方 角度 分力 余弦定理 ベクトル' },
    { title: '力の平行四辺形｜書き方', url: 'articles/heikoushihenkei.html', keywords: '力の平行四辺形 書き方 合力 分解 対角線 作図 ベクトル' },
    { title: '平行四辺形の法則｜計算・証明', url: 'articles/heikoushihenkei-housoku.html', keywords: '平行四辺形の法則 計算 証明 角度 余弦定理 ベクトル 合成' },
    { title: '作用力｜作用・反作用の法則', url: 'articles/sayouryoku.html', keywords: '作用力 反作用力 作用反作用 ニュートン 第3法則 つり合い 違い 反力' },
    { title: '外力とは？内力・反力との違い', url: 'articles/gairyoku.html', keywords: '外力 がいりょく 内力 反力 違い 荷重 摩擦力 応力' },
    { title: '偶力とは？意味とモーメント公式', url: 'articles/guuryoku.html', keywords: '偶力 ぐうりょく 意味 モーメント 公式 求め方 合力 回転 F×d' },
    { title: '偶力のモーメント｜公式・正負', url: 'articles/guuryoku-moment.html', keywords: '偶力のモーメント 公式 正負 力のモーメント 違い F×d 中心 一定' },
    { title: '力のモーメント｜意味・計算と応用', url: 'articles/moment.html', keywords: '力のモーメント 意味 計算 M=F×L 腕の長さ 回転 建築 反力 曲げモーメント 単位 N・m' },
    { title: '力のモーメントの単位｜N・m・kN・m', url: 'articles/moment-tani.html', keywords: 'モーメント 単位 N・m kN・m N・mm モーメント荷重 曲げモーメント 読み方' },
    { title: 'モーメントの向き・見分け方', url: 'articles/moment-muki.html', keywords: 'モーメント 向き 見分け方 時計回り 反時計回り 正 負 符号' },
    { title: 'モーメントの正負｜公式と例題', url: 'articles/moment-seifu.html', keywords: 'モーメント 正負 符号 意味 公式 例題 和 ΣM 時計回り 反時計回り' },
    { title: 'モーメントの腕の長さ', url: 'articles/moment-ude.html', keywords: 'モーメント 腕の長さ 求め方 作用点 違い 垂直距離 作用線 r sinθ' },
    { title: '回転方向の覚え方と正負', url: 'articles/kaiten-houkou.html', keywords: '回転方向 右回り 左回り 覚え方 時計回り 反時計回り モーメント 正負' },
    { title: 'モーメントのつり合い｜ΣM＝0', url: 'articles/moment-tsuriai.html', keywords: 'モーメントのつり合い ΣM=0 意味 計算 重心 求め方 反力 つり合い3条件' },
    { title: 'つり合いから重心を求める', url: 'articles/juushin-moment.html', keywords: 'モーメント つり合い 重心 求め方 計算方法 例題 図心 Σ(W×x)/ΣW' },
    { title: 'モーメントの単位換算｜N・m・kN・m・N・mm', url: 'articles/moment-tani-kansan.html', keywords: 'モーメント 単位 換算 N・m kN・m N・mm 読み方 1000 構造計算' },
    { title: '曲げモーメントの単位換算｜kNm・Nm・Nmm', url: 'articles/bending-tani-kansan.html', keywords: '曲げモーメント 単位 換算 kNm Nm Nmm 変換 構造設計 使い分け 応力度 N/mm2' },
    { title: 'RC造・S造・SRC造・木造の違いとは？特徴と使い分けを徹底比較', url: 'articles/kouzou-shurui.html', keywords: 'RC造 S造 SRC造 木造 鉄筋コンクリート 鉄骨 構造種別 比較 使い分け' },
    { title: '耐震・制震・免震の違いとは？仕組みとコストを比較して解説', url: 'articles/taishin-menshin.html', keywords: '耐震 制震 制振 免震 ダンパー 積層ゴム アイソレータ 地震対策' },
    { title: '超高層建築物とは？高さ60m超の定義と大臣認定', url: 'articles/choukousou.html', keywords: '超高層建築物 高さ 60m 定義 大臣認定 時刻歴応答解析 構造形式 制震 免震 長周期地震動 建築基準法20条' },
    { title: '4号特例の廃止と新2号・新3号建物', url: 'articles/yongou-tokurei.html', keywords: '4号特例 廃止 縮小 新2号建築物 新3号建築物 2025年 令和7年 改正 木造2階建て 構造審査 壁量計算 200㎡' },
    { title: '頑丈な建物とは？構造種別と災害時の選択', url: 'articles/ganjou-tatemono.html', keywords: '頑丈な建物 構造種別 RC SRC 鉄骨 木造 災害 地震 火災 台風 水害 耐震等級 選び方' },
    { title: '構造材料の種類と特徴｜木材・RC・鉄骨の比較', url: 'articles/kouzou-zairyou.html', keywords: '構造材料 種類 特徴 木材 コンクリート RC 鉄骨 鋼材 比較 使い分け 強度 ヤング係数 密度 耐火 SRC' },
    { title: '固定荷重・積載荷重の拾い方｜荷重の種類と組み合わせ', url: 'articles/kajuu.html', keywords: '固定荷重 積載荷重 荷重拾い 床用 架構用 地震用 荷重の組み合わせ 長期 短期' },
    { title: '地震力の計算方法｜Ai分布・Z・Rt・Coをわかりやすく解説', url: 'articles/jishin-ryoku.html', keywords: '地震力 層せん断力 Ai分布 地域係数 Z Rt Co ベースシア Qi=CiWi' },
    { title: '層間変形角・剛性率・偏心率とは？ルート2の検討項目', url: 'articles/sokan-henkei.html', keywords: '層間変形角 剛性率 偏心率 1/200 ピロティ ねじれ 重心 剛心 ルート2' },
    { title: '基本設計とは？実施設計との違いと構造での役割', url: 'articles/kihon-sekkei.html', keywords: '基本設計 実施設計 違い 成果物 構造設計 役割 構造種別 架構 基礎方針 概算' },
    { title: '実施設計とは？基本設計との違いと設計料の比率', url: 'articles/jisshi-sekkei.html', keywords: '実施設計 基本設計 違い 詳細設計 設計料 比率 構造図 構造計算書 配筋図 業務報酬' },
    { title: '一次設計とは？震度との関係と二次設計との違い', url: 'articles/ichiji-sekkei.html', keywords: '一次設計 意味 震度 中地震 5強 許容応力度設計 C0 0.2 二次設計 違い' },
    { title: '二次設計とは？保有水平耐力計算の流れ', url: 'articles/niji-sekkei.html', keywords: '二次設計 一次設計 違い 対象建物 保有水平耐力計算 Qu Qun Ds Fes ルート3 大地震 6強 7' },
    { title: '構造設計の原則とは？施行令36条の3', url: 'articles/kouzou-gensoku.html', keywords: '構造設計の原則 施行令36条の3 構造耐力上主要な部分 釣合い 一体性 バランス 偏心率 剛性率' },
    { title: '耐震構造とは？制震・免震との仕組みの違い', url: 'articles/taishin-kouzou.html', keywords: '耐震構造 制震構造 免震構造 違い 仕組み 靱性 ダンパー 免震層 耐える 吸収 伝えない' },
    { title: '仕様規定とは？鉄骨造の例と性能規定との関係', url: 'articles/shiyou-kitei.html', keywords: '仕様規定 意味 鉄骨造 幅厚比 構造計算 性能規定 違い 施行令 壁量 かぶり厚さ' },
    { title: '耐久性等関係規定とは？施行令36条', url: 'articles/taikyuusei-kitei.html', keywords: '耐久性等関係規定 施行令36条 仕様規定 違い 計算ルート かぶり厚さ コンクリート強度 防腐防錆' },
    { title: '構造強度とは？建築基準法施行令との関係', url: 'articles/kouzou-kyoudo.html', keywords: '構造強度 建築基準法 施行令 第3章 法20条 構造耐力 仕様規定 構造計算' },
    { title: '構造耐力上主要な部分とは？主要構造部との違い', url: 'articles/kouzou-tairyoku.html', keywords: '構造耐力上主要な部分 施行令1条3号 主要構造部 法2条5号 違い 基礎 柱 梁 土台 斜材 床版 防火' },
    { title: '安全上等重要である建築物の部分とは？', url: 'articles/anzenjou-juuyou.html', keywords: '安全上 防火上 衛生上 重要 建築物の部分 主要構造部 構造耐力上主要な部分 違い' },
    { title: '使用上の支障とは？たわみの制限と告示', url: 'articles/shiyoujou-shishou.html', keywords: '使用上の支障 たわみ 制限 1/250 変形増大係数 告示 平12建告1459 スラブ 施行令82条' },
    { title: '既存不適格とは？遡及の緩和と増築での扱い', url: 'articles/kizon-futekikaku.html', keywords: '既存不適格 遡及 緩和 増築 大規模修繕 違法建築 違い 法3条2項 耐震改修' },
    { title: '構造安全証明書とは？書き方・記入例と条件', url: 'articles/kouzou-anzen-shoumei.html', keywords: '構造安全証明書 書き方 記入例 必要な建築物 条件 建築士法 構造計算 構造設計一級建築士' },
    { title: '特定天井とは？定義・適用条件と対策ルート', url: 'articles/tokutei-tenjou.html', keywords: '特定天井 定義 高さ6m 200㎡ 2kg/㎡ 吊り天井 脱落 告示771 仕様ルート 計算ルート 大臣認定' },
    { title: '別棟とは？建築基準法と渡り廊下・Exp.J', url: 'articles/bettou.html', keywords: '別棟 べつむね 建築基準法 渡り廊下 エキスパンションジョイント Exp.J 構造的分離 既存不適格 増築' },
    { title: '耐力壁とは？役割と配置のポイント', url: 'articles/tairyoku-heki.html', keywords: '耐力壁 耐震壁 壁倍率 壁量計算 筋かい 構造用合板 直下率 非耐力壁' },
    { title: '構造設計一級建築士とは？なり方・難易度・できること', url: 'articles/kouzou-ikkyu.html', keywords: '構造設計一級建築士 資格 なり方 難易度 合格率 講習 修了考査 適合性判定 キャリア' },
    { title: '構造設計者の年収はいくら？働き方と年収を上げる方法', url: 'articles/nenshu.html', keywords: '構造設計 年収 給料 収入 転職 独立 ゼネコン 組織設計事務所 働き方 キャリア' },
    { title: '一級建築士「構造」の勉強法とおすすめ問題集', url: 'articles/benkyo-hou.html', keywords: '一級建築士 構造 勉強法 過去問 問題集 独学 試験 対策 力学' },
    { title: '設計とは？意味・設計図の種類・仕事内容', url: 'articles/sekkei.html', keywords: '設計 意味 設計図 種類 仕事内容 向き不向き 意匠 構造 設備 基本設計 実施設計' },
    { title: '建築設計とは？意匠・構造・設備の違いと資格', url: 'articles/kenchiku-sekkei.html', keywords: '建築設計 意匠設計 構造設計 設備設計 違い 資格 一級建築士 構造設計一級建築士 設備設計一級建築士' },
    { title: '構造設計とは？業務内容と役割', url: 'articles/kouzou-sekkei.html', keywords: '構造設計 業務内容 役割 荷重 地震力 架構 部材設計 構造図 構造計算書 工事監理 安全' },
    { title: '構造設計に資格は必要？一級建築士・構造設計一級建築士の違い', url: 'articles/kouzou-shikaku.html', keywords: '構造設計 資格 必要 一級建築士 構造設計一級建築士 違い 無資格 業務範囲 補助 受験資格 取得 JSCA建築構造士 構造計算適合性判定 年収 キャリア' },
    { title: '構造設計への転職ガイド｜年収・必須資格・キャリアパス', url: 'articles/kouzou-tenshoku.html', keywords: '構造設計 転職 年収 必須資格 キャリアパス 求人 構造計算 転職 売り手市場 BIM AI 構造解析ソフト 2024年問題 適合性判定 ゼネコン 組織設計事務所 独立' },
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
    { title: '躯体工事とは？種類・基礎・鉄骨工事との関係', url: 'articles/kutai-kouji.html', keywords: '躯体工事 くたい 種類 基礎工事 鉄筋工事 型枠工事 コンクリート工事 鉄骨工事 構造体 仕上げ' },
    { title: 'コンクリートの運搬｜90分・120分の時間規定', url: 'articles/concrete-unpan.html', keywords: 'コンクリート 運搬 90分 120分 時間規定 アジテータ車 生コン車 トラックアジテータ ポンプ車 車種 練混ぜ 打込み' },
    { title: 'スラッジ水とは？濃度・上澄み水', url: 'articles/sludge-sui.html', keywords: 'スラッジ水 回収水 上澄み水 濃度 スラッジ固形分率 3% 高強度コンクリート 練混ぜ水 生コン' },
    { title: 'コンクリートの打ち込み｜時間規定・打ち重ね時間', url: 'articles/uchikomi.html', keywords: 'コンクリート 打ち込み 打設 時間規定 打ち重ね時間 自由落下 材料分離 横流し 締固め 注意点' },
    { title: 'コンクリートの温度管理｜打込み温度', url: 'articles/concrete-ondo.html', keywords: 'コンクリート 温度管理 打込み温度 35度 暑中 寒中 マスコン 水和熱 凍結 基準' },
    { title: 'コンクリートの締固め｜挿入間隔・留意点', url: 'articles/shimekatame.html', keywords: 'コンクリート 締固め しめがため バイブレーター 棒形振動機 挿入間隔 60cm 加振時間 ジャンカ 豆板 品質管理 材料分離' },
    { title: '打ち重ねと打ち継ぎの違い', url: 'articles/uchikasane-uchitsugi.html', keywords: '打ち重ね 打ち継ぎ 違い 水平打ち継ぎ 鉛直打ち継ぎ 時間規定 許容打重ね時間 レイタンス コールドジョイント 位置' },
    { title: 'コールドジョイントとは？見分け方・防止策', url: 'articles/cold-joint.html', keywords: 'コールドジョイント 見分け方 打ち継ぎ 違い 問題点 防止策 打ち重ね時間 施工不良 強度 水密性 漏水' },
    { title: '型枠とは？種類・セパレーターと支保工', url: 'articles/katawaku.html', keywords: '型枠 かたわく 意味 種類 せき板 セパレーター フォームタイ Pコン 支保工 木製 鋼製 システム型枠' },
    { title: '捨て型枠とは？フラットデッキ・ラス型枠', url: 'articles/sute-katawaku.html', keywords: '捨て型枠 埋設型枠 フラットデッキ デッキプレート ラス型枠 リブラス 基礎 スラブ 脱型不要 工期短縮' },
    { title: '型枠の取り外し｜存置期間・支柱の除去', url: 'articles/katawaku-torihazushi.html', keywords: '型枠 取り外し 存置期間 脱枠 支柱 支保工 除去 規定 圧縮強度 5N 12N 材齢 気温' },
    { title: 'せき板とは？型枠との違い・存置期間', url: 'articles/sekiita.html', keywords: 'せき板 型枠 違い 種類 合板 コンパネ 鋼製 存置期間 5N 圧縮強度' },
    { title: '敷モルタルとは？厚さ・目的・配合', url: 'articles/shiki-mortar.html', keywords: '敷モルタル しきモルタル 意味 厚さ 目的 施工方法 配合 1:3 レベル調整 据付け 先付けモルタル まんじゅう' },
    { title: '構造体コンクリートとは？強度・受入検査', url: 'articles/kouzoutai-concrete.html', keywords: '構造体コンクリート 意味 強度 構造体コンクリート強度 標準養生 受入検査 供試体 割増し 補正' },
    { title: 'テストピースとは？サイズ・本数・養生', url: 'articles/test-piece.html', keywords: 'テストピース 供試体 サイズ φ100×200 本数 3本 150m3 養生方法 標準水中養生 圧縮強度試験' },
    { title: '供試体とは？試験体との違い・寸法・養生', url: 'articles/kyoushitai.html', keywords: '供試体 きょうしたい 試験体 違い 寸法 φ100×200 養生方法 圧縮強度 円柱 テストピース' },
    { title: '供試体型枠（モールド）とは？供試体作成', url: 'articles/mold.html', keywords: 'モールド 供試体型枠 円筒 φ100×200 圧縮強度試験 供試体 作成 突き棒 脱型 JIS A1132 キャッピング' },
    { title: 'コンクリートの強度の単位｜N/mm²・Fc', url: 'articles/kyoudo-tani.html', keywords: 'コンクリート 強度 単位 N/mm2 MPa Fc 読み方 ニュートン 換算 kgf/cm2 設計基準強度' },
    { title: '生コンの強度｜Fc21の意味・単位・冬の強度', url: 'articles/namacon-kyoudo.html', keywords: '生コン 強度 Fc21 呼び強度 意味 単位 N/mm2 日数 材齢28日 冬 寒中 温度補正' },
    { title: '圧縮強度と水セメント比の関係｜計算式', url: 'articles/asshuku-wc.html', keywords: '圧縮強度 水セメント比 W/C 関係 計算式 セメント水比 C/W 直線 設計基準強度 配合' },
    { title: 'コンクリートの引張強度｜基準・計算式と試験', url: 'articles/inchou-kyoudo.html', keywords: 'コンクリート 引張強度 基準 計算式 1/10 割裂引張試験 曲げ 圧縮強度 鉄筋' },
    { title: '圧縮強度と引張強度の関係｜試験方法と出題', url: 'articles/asshuku-inchou.html', keywords: '圧縮強度 引張強度 関係 1/10 試験方法 割裂 建築士 出題 RC 鉄筋' },
    { title: 'コンクリートの寸法効果｜試験での影響と補正', url: 'articles/sunpou-kouka.html', keywords: 'コンクリート 寸法効果 すんぽうこうか 圧縮強度試験 供試体 大きい 強度 補正 φ100 φ150 欠陥' },
    { title: '計画供用期間とは？区分・年数と強度', url: 'articles/keikaku-kyouyou.html', keywords: '計画供用期間 計画共用期間 けいかくきょうよう 読み方 耐用年数 短期 標準 長期 超長期 30 65 100 200年 強度 耐久' },
    { title: '設計基準強度と品質基準強度の違い', url: 'articles/sekkei-hinshitsu-kijun.html', keywords: '設計基準強度 Fc 品質基準強度 Fq 耐久設計基準強度 Fd 違い 意味 大きい方 max' },
    { title: '耐久設計基準強度とは？設計基準強度との違い', url: 'articles/taikyuu-kijun.html', keywords: '耐久設計基準強度 Fd 設計基準強度 Fc 違い 18 24 30 36 計画供用期間 品質基準強度 耐久性' },
    { title: '構造体強度補正値｜3N・6Nの使い分け', url: 'articles/kyoudo-hosei.html', keywords: '構造体強度補正値 mSn 3N 6N 使い分け 温度 予想平均気温 調合管理強度 品質基準強度 供試体 構造体' },
    { title: '土間コンクリートの設計基準強度｜厚さ・鉄筋', url: 'articles/doma-concrete.html', keywords: '土間コンクリート 設計基準強度 18 厚さ 100 150 鉄筋 ピッチ ワイヤーメッシュ 溶接金網 D6 150 ひび割れ' },
    { title: 'コンクリートの許容応力度｜長期・短期', url: 'articles/concrete-kyoyo.html', keywords: 'コンクリート 許容応力度 長期 短期 Fc/3 2Fc/3 圧縮 せん断 計算 違い' },
    { title: 'コンクリートの許容圧縮応力度｜Fcと長期・短期', url: 'articles/kyoyo-asshuku.html', keywords: 'コンクリート 許容圧縮応力度 Fc 長期 Fc/3 短期 2Fc/3 使い分け 計算' },
    { title: 'コンクリートの耐久性と耐久年数｜劣化機構', url: 'articles/taikyuusei.html', keywords: 'コンクリート 耐久性 耐久年数 計画供用期間 劣化機構 中性化 塩害 凍害 化学的侵食 アルカリ骨材反応 かぶり' },
    { title: '側圧とは？意味・計算式とコンクリートとの関係', url: 'articles/sokuatsu.html', keywords: '側圧 そくあつ 意味 計算式 型枠 セパレーター 液体圧 W×H 打込み速度 温度 スランプ コンクリート' },
    { title: '木造（W造）とは？在来軸組工法と枠組壁工法・耐震のポイント', url: 'articles/w-zou.html', keywords: '木造 W造 在来軸組 2×4 枠組壁工法 壁量計算 四分割法 N値計算 壁倍率 CLT 接合金物' },
    { title: '在来工法とは？概要・耐震性・伝統工法との違い', url: 'articles/zairai-kouhou.html', keywords: '在来工法 在来軸組工法 木造 伝統工法 伝統構法 耐震性 筋かい 石場建て 違い' },
    { title: '在来軸組工法とは？部材の種類と役割・枠組壁工法との違い', url: 'articles/jikugumi-kouhou.html', keywords: '在来軸組工法 部材 土台 柱 通し柱 管柱 梁 桁 胴差 筋かい 火打ち 母屋 2×4 枠組壁工法' },
    { title: '軸組と枠組の違い・耐力壁の役割と軸組図の読み方', url: 'articles/jiku-waku.html', keywords: '軸組 枠組 違い 耐力壁 軸組図 読み方 たすき掛け 筋かい 2×4 木造' },
    { title: '四分割法とは？壁充足率・壁率比の計算と偏心の確認方法', url: 'articles/yonbunkatsu.html', keywords: '四分割法 壁充足率 壁率比 偏心 配置バランス 側端部分 必要壁量 存在壁量 木造' },
    { title: '壁倍率とは？筋かい・石膏ボードの値一覧と必要壁量の計算', url: 'articles/kabebairitsu.html', keywords: '壁倍率 筋かい 石膏ボード 構造用合板 値 一覧 必要壁量 存在壁量 壁量計算 たすき掛け ホールダウン' },
    { title: '土台とは？役割・基礎との違いと樹種・サイズ', url: 'articles/dodai.html', keywords: '土台 どだい 木造 役割 基礎 違い 樹種 ヒノキ ヒバ サイズ 105 120 アンカーボルト 基礎パッキン 心材' },
    { title: '横架材とは？梁・桁・胴差しの種類と欠き込み基準', url: 'articles/oukazai.html', keywords: '横架材 おうかざい 種類 梁 桁 胴差し 土台 大引 欠き込み 基準 梁との違い 1/3' },
    { title: '床組とは？木造・RC造の構造と根太・梁', url: 'articles/yukagumi.html', keywords: '床組 ゆかぐみ 木造 RC造 根太 大引 床束 梁 スラブ 根太レス 剛床' },
    { title: '大引とは？根太・束柱との関係と継手位置', url: 'articles/oobiki.html', keywords: '大引 おおびき 根太 束柱 床束 継手位置 木材 90角 床組' },
    { title: '大引と根太の違い｜床組・支保工での役割', url: 'articles/oobiki-neda.html', keywords: '大引 根太 違い おおびき ねだ 床組 支保工 型枠 間隔 太さ せき板 支柱' },
    { title: '床束とは？鋼製束との違いと使い方', url: 'articles/yukazuka.html', keywords: '床束 ゆかづか 読み方 鋼製束 木製束 プラ束 違い 使い方 注意点 根がらみ 束石 大引' },
    { title: '束（つか）とは？小屋束・床束の役割と種類', url: 'articles/tsuka.html', keywords: '束 つか 小屋束 床束 役割 種類 木製 鋼製 プラスチック 短い垂直材' },
    { title: '垂木と根太の違い｜役割・寸法・胴縁との違い', url: 'articles/taruki-neda.html', keywords: '垂木 たるき 根太 ねだ 違い 役割 寸法 配置 胴縁 どうぶち 屋根 床 母屋' },
    { title: '和小屋とは？洋小屋との違いとスパンの限界', url: 'articles/wagoya.html', keywords: '和小屋 わごや 構造 洋小屋 違い スパン 限界 小屋梁 小屋束 母屋 棟木 束建て トラス' },
    { title: '小屋束とは？母屋・小屋梁との関係', url: 'articles/koyazuka.html', keywords: '小屋束 こやづか 読み方 母屋 棟木 小屋梁 関係 振れ止め 雲筋かい 間隔' },
    { title: '小屋梁とは？妻梁・軒桁との違い', url: 'articles/koyabari.html', keywords: '小屋梁 こやばり 読み方 役割 妻梁 軒桁 のきげた 違い 小屋束 屋根荷重 丸太梁' },
    { title: '水平構面とは？役割と屋根・吹き抜けの関係', url: 'articles/suihei-koumen.html', keywords: '水平構面 すいへいこうめん 役割 屋根 吹き抜け 水平剛性 床倍率 耐力壁 火打ち 木造' },
    { title: '火打ちとは？筋交いとの違いと目的', url: 'articles/hiuchi.html', keywords: '火打ち ひうち 火打ち梁 火打ち土台 意味 筋交い 違い 目的 水平構面 隅角部 鋼製火打ち' },
    { title: '筋交いとは？役割・効果・寸法とブレースとの違い', url: 'articles/sujikai.html', keywords: '筋交い すじかい 筋かい 役割 効果 寸法 壁倍率 ブレース 違い たすき掛け 耐力壁 45×90' },
    { title: '筋交いの鉄筋（鉄筋ブレース）とは？倍率・種類', url: 'articles/sujikai-tekkin.html', keywords: '筋交い 鉄筋 鉄筋ブレース 丸鋼 意味 倍率 種類 引張 ターンバックル 木造 たすき掛け 壁倍率' },
    { title: '大壁と真壁の違いと木造住宅での使い方', url: 'articles/okabe-shinkabe.html', keywords: '大壁 真壁 おおかべ しんかべ 違い 木造住宅 使い方 柱 断熱 耐震 和室 洋室' },
    { title: '木表と木裏の違い・反りの方向と使い分け', url: 'articles/kiomote-kiura.html', keywords: '木表 木裏 きおもて きうら 違い 反り 方向 鴨居 敷居 框 使い分け 乾燥 凹' },
    { title: '辺材と心材の違い｜腐朽しやすい理由', url: 'articles/henzai-shinzai.html', keywords: '辺材 心材 へんざい しんざい 白太 赤身 違い 腐朽 虫害 耐久性 木造 設計 土台' },
    { title: '気乾状態とは？含水率と絶乾・湿潤との違い', url: 'articles/kikan-joutai.html', keywords: '気乾状態 きかんじょうたい 含水率 絶乾 全乾 湿潤 生材 繊維飽和点 15% 30% 木材' },
    { title: '木材の比重と密度｜樹種別一覧と荷重計算', url: 'articles/mokuzai-hijuu.html', keywords: '木材 比重 密度 樹種別 一覧 スギ ヒノキ ベイマツ ケヤキ 気乾比重 kg/m3 荷重計算 自重' },
    { title: '木材の重さ計算｜立米（m³）から重量を求める', url: 'articles/mokuzai-omosa.html', keywords: '木材 重さ 計算 比重 単位体積重量 立米 m3 体積 密度 重量 樹種 含水率' },
    { title: '木材の許容応力度｜基準強度と長期・短期', url: 'articles/mokuzai-kyoyo.html', keywords: '木材 許容応力度 基準強度 Fc Fb Ft Fs 長期 短期 1.1/3 2/3 樹種 等級 スギ ヒノキ 荷重継続' },
    { title: '木材の背割りとは？心持ち材・心去り材と効果', url: 'articles/seware.html', keywords: '背割り せわり 心持ち材 心去り材 違い 乾燥 割れ 強度 効果 化粧面 KD材' },
    { title: '木材のm³をtに換算する方法｜体積と重量', url: 'articles/mokuzai-m3-t.html', keywords: '木材 m3 立米 t トン 換算 計算 体積 重量 密度 比重 樹種 含水率 運搬' },
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
