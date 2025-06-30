import { createClient } from "@supabase/supabase-js";

// 注意: このファイルはサーバーサイドでのみ使用します。
// クライアントサイドには絶対に漏洩させないでください。

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 環境変数が設定されていない場合は警告を出すが、エラーは投げない
if (!supabaseUrl) {
  console.warn(
    "Missing env.NEXT_PUBLIC_SUPABASE_URL - Supabase features will be disabled"
  );
}

if (!supabaseKey) {
  console.warn(
    "Missing env.SUPABASE_SERVICE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY - Supabase features will be disabled"
  );
}

// 環境変数が設定されている場合のみクライアントを作成
export const supabaseServer =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
