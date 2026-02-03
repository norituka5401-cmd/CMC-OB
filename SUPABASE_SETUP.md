# Supabase セットアップガイド

このアプリケーションを正常に動作させるために、以下の3つのステップを完了させてください。

## Step 1: Supabase プロジェクトの作成

1. [Supabase Dashboard](https://supabase.com/dashboard/) にアクセスし、新規プロジェクトを作成します。
2. プロジェクト名とデータベースパスワードを設定します。

## Step 2: データベーステーブルの作成

1. 作成したプロジェクトの左メニューから **"SQL Editor"** を開きます。
2. **"New Query"** をクリックします。
3. プロジェクトフォルダ内にある `supabase/schema.sql` の内容をすべてコピー＆ペーストしてください。
4. **"Run"** ボタンを押して実行します。「Success」と表示されればOKです。

## Step 3: 環境変数の設定

1. プロジェクトの **"Project Settings"** > **"API"** を開きます。
2. 以下の2つの値をコピーします：
   - `Project URL`
   - `anon public` (API Key)
3. プロジェクトのルートディレクトリに `.env.local` という名前のファイルを作成し、以下のように記述してください：

```env
NEXT_PUBLIC_SUPABASE_URL=あなたのProject_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=あなたのanon_public_key
```

## 確認方法

上記の設定が完了したら、開発サーバーを再起動（`Ctrl+C` のあと `npm run dev`）してリロードしてください。
これでイベントの作成・保存が可能になります！
