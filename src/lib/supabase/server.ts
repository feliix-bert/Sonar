import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { getPublicEnv, getSupabasePublicKey, isSupabaseConfigured } from "@/lib/env";
import { SUPABASE_COOKIE_OPTIONS } from "@/lib/auth/cookie-config";

export async function createServerSupabaseClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const env = getPublicEnv();
  const key = getSupabasePublicKey();

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !key) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, key, {
    cookieOptions: SUPABASE_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            const isDeletion = options?.maxAge !== undefined && options.maxAge <= 0;
            const mergedOptions = isDeletion
              ? { ...options, maxAge: 0 }
              : {
                  ...SUPABASE_COOKIE_OPTIONS,
                  ...options,
                  maxAge: options?.maxAge ?? SUPABASE_COOKIE_OPTIONS.maxAge,
                };
            cookieStore.set(name, value, mergedOptions);
          });
        } catch {
          // Server Components cannot mutate cookies during render; proxy.ts handles token refresh.
        }
      },
    },
  });
}
