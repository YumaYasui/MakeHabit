# MakeHabit

やったらスタンプ。続けた日が目に見える、スマホブラウザ向けの習慣化アプリ。

要件は [docs/requirements.md](docs/requirements.md) を参照。現在はフェーズ1（ひとりで使える機能）まで実装済み。

## 技術構成

- Next.js（App Router）+ TypeScript + Tailwind CSS
- Supabase（Googleログイン・PostgreSQL・行単位アクセス制御）
- Vercel（ホスティング）

## ディレクトリ

| パス | 内容 |
|---|---|
| `src/app` | 画面（ホーム、習慣の詳細・追加・編集、設定、ログイン） |
| `src/lib/habit-stats.ts` | 累計・連続の計算 |
| `src/lib/praise.ts` | 褒める言葉と節目の判定 |
| `src/lib/dates.ts` | 午前3時区切りの日付計算 |
| `supabase/migrations` | テーブル・アクセス制御・関数の定義 |

## 本番環境の準備

1. **Supabase**：プロジェクトを作り、`supabase/migrations` の SQL を SQL Editor で実行する（または `npx supabase link` → `npx supabase db push`）
2. **Google ログイン**：Google Cloud Console で OAuth クライアント（ウェブアプリケーション）を作り、承認済みのリダイレクト URI に `https://<プロジェクト>.supabase.co/auth/v1/callback` を登録する。発行されたクライアント ID とシークレットを Supabase の Authentication > Sign In / Providers > Google に設定する
3. **Supabase の URL 設定**：Authentication > URL Configuration の Site URL に本番 URL、Redirect URLs に `https://<本番ドメイン>/auth/callback` を追加する
4. **Vercel**：このリポジトリをインポートし、環境変数 `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` を設定する（値は Supabase の Project Settings > API Keys）

## ローカル開発

Docker が必要。

```bash
npm install
npx supabase start          # ローカルの Supabase を起動（マイグレーションも適用される）
cp .env.example .env.local  # supabase start が表示する URL と Publishable key を記入
npm run dev                 # http://localhost:3000
```

ローカルで Google ログインを使うには、`SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` と `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` を設定してから `supabase start` する。OAuth クライアントのリダイレクト URI には `http://127.0.0.1:54321/auth/v1/callback` を登録する。

## テスト

```bash
npm test        # 累計・連続・褒める言葉の単体テスト
npm run lint
```
