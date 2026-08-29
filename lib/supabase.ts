import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://notxrjsuukrrxdlboavo.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "temporary-placeholder-key";

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
