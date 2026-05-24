# Space Shooter

React Native (Expo) で作られたモバイル向けシューティングゲームです。

## ゲーム内容

- プレイヤーは画面下部の青い宇宙船
- 指で画面をドラッグして左右に移動
- 弾は自動で発射されます
- 上から降ってくる赤い敵を撃ち落としてスコアを稼ぐ
- 敵に衝突するとライフが減り、3回当たるとゲームオーバー

## セットアップ

```bash
npm install
npm start
```

Expo Go アプリ（iOS / Android）でQRコードを読み取るとプレイできます。
ブラウザで試す場合は `npm run web` を実行してください。

## 技術スタック

- React Native 0.73
- Expo SDK 50
- TypeScript

## ファイル構成

- `App.tsx` — ゲーム本体（プレイヤー、敵、弾、衝突判定、HUD）
- `app.json` — Expo 設定
- `package.json` — 依存関係
