// 動画ごとの設定（シードと自動プレイの速さを固定しているので、何度書き出しても同じ展開になります）
module.exports = {
  // ふつうの営業：ランチタイムでピンチ→持ち直してクリア（シード23）。最初のお客さんはカバオくん
  shorts: {
    SEED: 23, FPS: 60, QUERY: 'first=kabao', OUT: 'anpanman-cafe-shorts.mp4',
    BOT_PROFILE: { think: 0.5, perG: 0.2, sil: 0.5, text: 0.45, gap: 0.27, gapJ: 0.12, mistake: 0.06 },
  },
  // とくべつへん：カバオくん・ばいきんまん・ドキンちゃんのおかわりが とまらずにゲームオーバー（シード15）
  okawari: {
    SEED: 15, FPS: 60, QUERY: 'mode=okawari', OUT: 'anpanman-cafe-okawari.mp4',
    BOT_PROFILE: { think: 0.3, perG: 0.12, sil: 0.26, text: 0.2, gap: 0.18, gapJ: 0.08, mistake: 0.02 },
  },
};
