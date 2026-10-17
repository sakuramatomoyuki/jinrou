# 月影の村 — オンライン人狼

React + TypeScript + Vite の日本語Webアプリです。GitHub Pagesは静的フロントエンドを配信し、Firebase Authentication（匿名認証）と Callable Cloud Functions がルーム状態・役職・行動・勝敗を管理します。Realtime Databaseはクライアントの読み書きを全面禁止し、Cloud FunctionsだけがAdmin SDKで読み書きします。参加者に返す情報は関数内で整形します。

## 現在の実装範囲

- ルーム作成、5桁コード発行、参加、招待URL/QR、3〜20人の人数チェック
- 役職構成とタイマー設定、初日襲撃、同票処理、未定義特殊ルールの無効表示
- 匿名Firebase認証を利用した端末間参加と本人用役職情報の分離
- 役職配布、役職確認、夜の行動、公開朝結果、議論、投票、再投票、勝敗判定、再戦
- GMの一時停止、再開、時間延長、強制進行、終了、切断者の死亡/保留判断
- 日本語のレスポンシブ画面、役職一覧、遊び方、公開ログ
- GitHub ActionsのPagesビルド/デプロイ

## 外部サービス設定

### Firebase

1. Firebase Consoleでプロジェクトを作成し、Webアプリを登録します。
2. Authenticationで「匿名」プロバイダを有効にします。
3. Realtime Databaseを作成し、リージョンを控えます。Functionsのリージョンは `asia-northeast1` です。
4. Firebase CLIを用意し、`firebase login` と `firebase use --add` でプロジェクトを選択します。
5. Webアプリの設定値を `.env.local` に記入します（`.env.example` を参照）。これらはブラウザー用Firebase識別子であり、秘密鍵ではありません。
6. `firebase deploy --only database,functions` を実行します。Cloud FunctionsのデプロイにはBlazeプランと請求先設定が必要になる場合があります。Functions v2が使えるプロジェクトを使用してください。
7. データベースルールは `database.rules.json` の通り全クライアント操作を拒否します。Functions Admin SDKのみが状態を書き換えます。

### ローカル実行

```sh
npm ci
npm run dev
```

Functionsの依存関係を別途導入して型検査する場合は `npm ci --prefix functions && npm run build --prefix functions` を実行してください。Firebase設定前でも画面は開きますが、オンラインルームは利用できません。

### GitHub Pages

1. GitHubにこのプロジェクトをpushし、既定ブランチを `main` にします。
2. Repository Settings → Pages → Build and deployment で「GitHub Actions」を選びます。
3. Settings → Secrets and variables → Actions → Variables に以下を登録します：`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_DATABASE_URL`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`。
4. `main`へのpushまたはActionsの手動実行でビルドとPagesデプロイが行われます。Vite設定はリポジトリ名からベースパスを組み立てます。
5. 公開URLを開き、Firebaseの承認済みドメインに `*.github.io` のホスト名を追加し、匿名ログイン、作成、別ブラウザーからの参加を確認します。

## セキュリティ設計と制約

- roomコードは秘密鍵ではありません。Callable APIはFirebase Auth UIDを必須にし、管理操作は作成者UIDまたは登録されたGM UIDで認可します。
- ルームデータ全体をブラウザーへ配信せず、各呼び出しの応答で公開/本人/GM情報を分けます。DBクライアントルールはread/writeとも拒否です。
- 役職配布と勝敗判定、投票集計、襲撃/護衛処理はFunctions側で行います。
- Firebaseプロジェクト自体の作成・課金・ドメイン登録とPages公開操作はリポジトリから代行できません。上の手順が必要です。
- 議論/夜/投票のタイマー進行はスケジュールFunctionの1分周期です。現状、30秒単位の実時間精度や即時の全行動完了検知は保証しません。
- 投票結果の公開方式、霊媒判定の安全な個別受け渡し、切断通知の保留一覧/時刻/フェーズ表示、投票履歴公開方式、保存済み構成、ルーム自動削除、複数GM/招待権限委譲は未完成です。
- Firebase未接続のため、複数端末統合・権限境界の実環境確認は未実施です。特殊ルール3種は効果未定義のため選択できません。

## テストと確認

`npm test` はVitestを起動します。Firebase Emulatorを使う統合テスト環境は未構成です。Firebase接続後は、別ブラウザー/端末、一般参加者とGM、Database Rules拒否、3人/20人、投票・同票・再戦の確認が必要です。未実施の項目を実施済みとして扱わないでください。
### 共有端末モード

ルーム作成時に「全員共有」または「併用」を選び、共有端末を使う人の名前を1行ずつ登録します。共有席ごとに本人が8文字以上のPINを登録し、役職確認・投票・夜の行動のたびに自分のPINを入力します。PINはソルト付きハッシュとしてRealtime Databaseに保存され、ブラウザには保存しません。共有端末で席を交代するときは「画面を隠す」または操作完了ボタンを押してください。
