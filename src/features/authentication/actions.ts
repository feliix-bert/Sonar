"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAppUrl, isSupabaseConfigured } from "@/lib/env";
import {
  ROLE_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth/cookie-config";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validation/schemas";
import { mapAuthErrorMessage } from "@/features/authentication/utils";

export interface AuthActionResult {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
}

export { mapAuthErrorMessage };

export async function loginAction(input: {
  email: string;
  password: string;
  redirectTo?: string;
}): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Periksa kembali data yang dimasukkan.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (error) {
        return { error: mapAuthErrorMessage(error.message) };
      }

      // Check role to determine intelligent default destination
      const {
        data: { user },
      } = await supabase.auth.getUser();
      let defaultTarget = "/dashboard";
      if (user) {
        const metaRole = (
          user.user_metadata?.role ||
          user.app_metadata?.role ||
          ""
        )
          .toString()
          .toLowerCase()
          .trim();
        const email = user.email || "";

        let roleValue: "student" | "volunteer" | "admin" = "student";
        if (
          metaRole === "admin" ||
          email === "admin@sonar.ac.id" ||
          email === "hendra.gunawan@faculty.ac.id"
        ) {
          defaultTarget = "/admin";
          roleValue = "admin";
        } else if (
          metaRole === "volunteer" ||
          metaRole === "reviewer" ||
          email === "volunteer@sonar.ac.id" ||
          email === "dewi.sartika@volunteer.sonar.ac.id"
        ) {
          defaultTarget = "/review";
          roleValue = "volunteer";
        }

        const cookieStore = await cookies();
        cookieStore.set(ROLE_COOKIE_NAME, roleValue, SESSION_COOKIE_OPTIONS);
      }

      const safeRedirect =
        input.redirectTo && input.redirectTo.startsWith("/")
          ? input.redirectTo
          : defaultTarget;
      redirect(safeRedirect);
    }
  }

  // Graceful fallback for local development: set default student session with 30-day persistence
  const cookieStore = await cookies();
  cookieStore.set(ROLE_COOKIE_NAME, "student", SESSION_COOKIE_OPTIONS);
  const safeRedirect =
    input.redirectTo && input.redirectTo.startsWith("/")
      ? input.redirectTo
      : "/dashboard";
  redirect(safeRedirect);
}

export async function loginAsDemoRole(role: "student" | "volunteer" | "admin", redirectTo?: string) {
  const cookieStore = await cookies();
  cookieStore.set(ROLE_COOKIE_NAME, role, SESSION_COOKIE_OPTIONS);
  
  let target = "/dashboard";
  if (redirectTo && redirectTo.startsWith("/")) {
    target = redirectTo;
  } else if (role === "volunteer") {
    target = "/review";
  } else if (role === "admin") {
    target = "/admin";
  }

  redirect(target);
}

export async function registerAction(input: {
  email: string;
  password: string;
  fullName: string;
  studyProgram?: string;
  role?: "student" | "volunteer" | "admin";
}): Promise<AuthActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Periksa kembali data yang dimasukkan.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const selectedRole = parsed.data.role ?? "student";

  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          data: {
            full_name: parsed.data.fullName,
            study_program: parsed.data.studyProgram ?? null,
            role: selectedRole,
          },
        },
      });

      if (error) {
        return { error: mapAuthErrorMessage(error.message) };
      }

      if (data.session) {
        redirect("/dashboard");
      }

      return {
        message:
          "Pendaftaran berhasil! Silakan periksa inbox email Anda untuk memverifikasi akun sebelum masuk.",
      };
    }
  }

  const cookieStore = await cookies();
  cookieStore.set("sonar_role", selectedRole, { path: "/", httpOnly: true, sameSite: "lax" });
  redirect("/dashboard");
}

export async function forgotPasswordAction(input: {
  email: string;
}): Promise<AuthActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Periksa kembali data yang dimasukkan.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const appUrl = getAppUrl();
      const callbackUrl = `${appUrl}/auth/callback?next=/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
        redirectTo: callbackUrl,
      });

      if (error) {
        return { error: mapAuthErrorMessage(error.message) };
      }

      return {
        success: true,
        message:
          "Tautan pemulihan kata sandi telah dikirim ke email Anda. Silakan periksa kotak masuk atau spam.",
      };
    }
  }

  return {
    success: true,
    message:
      "Tautan pemulihan kata sandi telah dikirim ke email Anda. (Mode Demo Lokal)",
  };
}

export async function resetPasswordAction(input: {
  password: string;
  confirmPassword: string;
}): Promise<AuthActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Periksa kembali kata sandi yang dimasukkan.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return {
          error:
            "Sesi pemulihan kata sandi tidak ditemukan atau telah kedaluwarsa. Silakan ajukan permohonan tautan baru.",
        };
      }

      const { error } = await supabase.auth.updateUser({
        password: parsed.data.password,
      });

      if (error) {
        return { error: mapAuthErrorMessage(error.message) };
      }

      redirect("/dashboard");
    }
  }

  redirect("/dashboard");
}

export async function signInWithGoogleAction(redirectTo?: string) {
  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const headerList = await headers();
      const forwardedHost =
        headerList.get("x-forwarded-host") ?? headerList.get("host");
      const forwardedProto = headerList.get("x-forwarded-proto") ?? "https";
      const baseUrl = forwardedHost
        ? `${forwardedProto}://${forwardedHost}`
        : getAppUrl();

      const safeRedirect =
        redirectTo && redirectTo.startsWith("/") ? redirectTo : "/dashboard";
      const callbackUrl = `${baseUrl}/auth/callback?next=${encodeURIComponent(safeRedirect)}`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        return { error: mapAuthErrorMessage(error.message) };
      }

      if (data?.url) {
        redirect(data.url);
      }
    }
  }

  return {
    error:
      "Supabase belum dikonfigurasi dengan URL dan Publishable Key yang valid.",
  };
}

export async function signOutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(ROLE_COOKIE_NAME);
  
  if (isSupabaseConfigured()) {
    const supabase = await createServerSupabaseClient();
    await supabase?.auth.signOut();
  }
  redirect("/login");
}
