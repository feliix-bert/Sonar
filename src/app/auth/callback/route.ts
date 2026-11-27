import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, getAppUrl } from "@/lib/env";
import {
  ROLE_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth/cookie-config";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";
  const errorParam = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const safeNext = next.startsWith("/") ? next : "/dashboard";

  // Determine actual public origin dynamically
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const isLocalEnv = process.env.NODE_ENV === "development";

  let origin: string;
  if (forwardedHost && !isLocalEnv) {
    origin = `${forwardedProto}://${forwardedHost}`;
  } else if (!isLocalEnv && getAppUrl() && !getAppUrl().includes("localhost")) {
    origin = getAppUrl();
  } else {
    origin = requestUrl.origin;
  }

  if (errorParam || errorDescription) {
    const errorMsg = errorDescription || errorParam || "auth_callback_failed";
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorMsg)}`
    );
  }

  if (code && isSupabaseConfigured()) {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        // Retrieve authenticated user
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // If signing up or logging in with Google, ensure student role is present in user_roles
          const { data: existingRoles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id);

          const hasAnyDefinedRole =
            existingRoles && existingRoles.length > 0;

          if (!hasAnyDefinedRole) {
            await supabase.from("user_roles").insert({
              user_id: user.id,
              role: "student",
            });
          }

          // Ensure profile data is populated from Google provider metadata
          const fullName =
            (user.user_metadata?.full_name as string) ??
            (user.user_metadata?.name as string) ??
            user.email?.split("@")[0] ??
            "Mahasiswa SONAR";

          const avatarUrl =
            (user.user_metadata?.avatar_url as string) ??
            (user.user_metadata?.picture as string) ??
            null;

          await supabase.from("profiles").upsert(
            {
              id: user.id,
              email: user.email ?? "",
              full_name: fullName,
              avatar_url: avatarUrl,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" }
          );
        }

        // Establish student role cookie session with 30-day persistence
        const cookieStore = await cookies();
        cookieStore.set(ROLE_COOKIE_NAME, "student", SESSION_COOKIE_OPTIONS);

        return NextResponse.redirect(`${origin}${safeNext}`);
      }

      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`
      );
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
