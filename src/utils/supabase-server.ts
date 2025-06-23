import { createClient } from "@supabase/supabase-js";

// 注意: このファイルはサーバーサイドでのみ使用します。
// クライアントサイドには絶対に漏洩させないでください。

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_URL");
}

if (!supabaseKey) {
  throw new Error("Missing env.SUPABASE_KEY");
}

export const supabaseServer = createClient(supabaseUrl, supabaseKey);
