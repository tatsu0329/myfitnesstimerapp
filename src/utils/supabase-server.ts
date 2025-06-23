import { createClient } from "@supabase/supabase-js";

// 注意: このファイルはサーバーサイドでのみ使用します。
// クライアントサイドには絶対に漏洩させないでください。

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing env.NEXT_PUBLIC_SUPABASE_URL");
}

if (!supabaseServiceKey) {
  throw new Error("Missing env.SUPABASE_SERVICE_KEY");
}

export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey);
 