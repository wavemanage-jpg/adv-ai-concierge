# ADV AI Concierge v1.1 — Cloud Run準備

**重要:** これはデプロイ準備用の構成。Cloud Runへの実デプロイ、OpenAI APIとの実通信、Supabaseとの実通信は未実施です。

## 安全なデプロイの前提

- 対象GCPプロジェクト: `adv-ai-concierge` **のみ**。SIGプロジェクトには触れない。
- 対象Supabase: `dyamamoto05's Project` を転用したADV専用DB (`concierge` スキーマ) **のみ**。
- 最初のCloud Runは認証必須の内部検証用とし、公開アクセスを許可しない。
- OpenAI APIキーとDB接続URLはSecret Managerに登録。値はログやチャットに貼り付けない。
- Cloud Runのサービスアカウントは専用に作成し、必要なSecretへのアクセスだけ付与。
- `ALLOWED_ORIGIN`は、設置するサイトのオリジン（最初は `https://adv-wave.co.jp`）と一致させる。

## 必要なランタイム環境変数

| 変数 | 例 | 種類 |
| --- | --- | --- |
| NODE_ENV | production | 通常 |
| DEMO_MODE | false | 通常 |
| PORT | 8080 | 通常（Cloud Runから自動設定） |
| HOST | 0.0.0.0 | 通常 |
| ALLOWED_ORIGIN | https://adv-wave.co.jp | 通常 |
| CONTACT_URL | https://adv-wave.co.jp/ | 通常、正式な問い合わせURLへ変更 |
| OPENAI_MODEL | gpt-4.1-mini | 通常 |
| OPENAI_API_KEY | **Secret Manager参照** | 秘密 |
| DATABASE_URL | **Secret Manager参照** | 秘密 |

## ビルド / デプロイの準備

```bash
# このフォルダで Docker が利用可能な環境の場合
# docker build -t adv-ai-concierge:v1.1 .
# docker run --rm -p 8080:8080 -e DEMO_MODE=false \
#   -e NODE_ENV=production ... # Secretsはコンテナ実行環境から注入
```

Cloud Runで「ソースからデプロイ」または「コンテナイメージからデプロイ」を選び、まず **未認証アクセスを許可しない** 設定にすること。未認証アクセスを許可した場合、APIは世界中から呼ばれ得る。

**公開前に必要**：共有ストレージ/ゲートウェイによるレート制限、悪用対策、利用料金上限、プライバシー通知と保存期間、会話データ削除、監視、正確な記事データ、DBとAPIの実通信テスト。v1.1は一般公開用完成版ではない。

## microCMSについて

`knowledge.json` はコンテナに組み込まれるため、コンテナ内で `sync:microcms` を実行してもCloud Runの稼働インスタンス間で同期されない。公開情報を反映するにはビルド前に同期し、新しいコンテナを再デプロイする。将来的には共有DBや検索ストアへ移行する。

The `ai_leads_one_per_session_idx` unique index has been created and verified **only in the designated ADV project**. No SIG resources were accessed.

## v1.2 additions

- Set `QUOTA_HASH_SECRET` to a random, unique 32+ character secret using Secret Manager; do **not** place it in source control or chat.
- Optionally set `DAILY_API_REQUEST_LIMIT` (default: 500). This is a count of accepted requests, **not** a dollar limit.
- The new `concierge.ai_quota` table exists in the **ADV project only**. `anon` and `authenticated` have no direct grants. No SIG resources are involved.
- Shared transactional quotas reduce multi-instance race conditions, but they do not replace Cloud Armor, abuse monitoring, OpenAI budget alerts or proper request identity verification.
- Run a secure cleanup job periodically to delete quota buckets older than two days. That job is not deployed in this package.
- `GET /health` is a liveness endpoint and must not be treated as proof that model calls and database writes work.
- Important: `widget.js` assumes the backend's service URL is publicly reachable. An authenticated-only Cloud Run service **cannot** be used by anonymous website visitors until a controlled public access setup has been designed and tested.
