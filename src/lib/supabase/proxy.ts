import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";
import { getPublicEnv, getSupabasePublicKey, isSupabaseConfigured } from "@/lib/env";
import {
  ROLE_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  SUPABASE_COOKIE_OPTIONS,
} from "@/lib/auth/cookie-config";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/courses",
  "/upload",
  "/reader",
  "/review",
  "/admin",
  "/settings",
];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  // Intercept OAuth callback codes if they land on the root "/" or any other non-callback page
  const authCode = request.nextUrl.searchParams.get("code");
  if (authCode && !pathname.startsWith("/auth/callback")) {
    const callbackRedirectUrl = request.nextUrl.clone();
    callbackRedirectUrl.pathname = "/auth/callback";
    if (!callbackRedirectUrl.searchParams.has("next")) {
      callbackRedirectUrl.searchParams.set("next", "/dashboard");
    }
    return NextResponse.redirect(callbackRedirectUrl);
  }

  const requiresAuth = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  let hasAuth = false;

  // Check demo/role session cookie with 30-day persistent sliding expiration
  const demoRole = request.cookies.get(ROLE_COOKIE_NAME)?.value;
  if (demoRole === "student" || demoRole === "volunteer" || demoRole === "admin") {
    hasAuth = true;
    response.cookies.set(ROLE_COOKIE_NAME, demoRole, SESSION_COOKIE_OPTIONS);
  }

  // Check Supabase session if configured
  if (isSupabaseConfigured()) {
    const env = getPublicEnv();
    const key = getSupabasePublicKey();

    if (env.NEXT_PUBLIC_SUPABASE_URL && key) {
      const supabase = createServerClient<Database>(
        env.NEXT_PUBLIC_SUPABASE_URL,
        key,
        {
          cookieOptions: SUPABASE_COOKIE_OPTIONS,
          cookies: {
            getAll() {
              return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) =>
                request.cookies.set(name, value)
              );
              response = NextResponse.next({ request });
              cookiesToSet.forEach(({ name, value, options }) => {
                const isDeletion = options?.maxAge !== undefined && options.maxAge <= 0;
                const mergedOptions = isDeletion
                  ? { ...options, maxAge: 0 }
                  : {
                      ...SUPABASE_COOKIE_OPTIONS,
                      ...options,
                      maxAge: options?.maxAge ?? SUPABASE_COOKIE_OPTIONS.maxAge,
                    };
                response.cookies.set(name, value, mergedOptions);
              });
            },
          },
        }
      );

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        hasAuth = true;
      }
    }
  }

  // Enforce authentication gate
  if (!hasAuth && requiresAuth) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectTo", pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach((c) => {
      redirectResponse.cookies.set(c.name, c.value, c);
    });
    return redirectResponse;
  }

  return response;
}
