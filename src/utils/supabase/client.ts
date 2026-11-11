import { createBrowserClient } from '@supabase/ssr';
import type { Database } from "@/types/supabase";

const SESSION_MAX_AGE_SECONDS = 14 * 24 * 60 * 60; // 14 days

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function createClient() {
  if (client) return client;

  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: SESSION_MAX_AGE_SECONDS,
      },
    }
  );

  return client;
}
