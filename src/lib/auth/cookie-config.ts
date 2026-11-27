/**
 * Centralized session and cookie configuration for SONAR.
 * Ensures persistent, resilient, and long-lived authentication sessions (30 days).
 */

// 30 days in seconds: 30 days * 24 hours * 60 minutes * 60 seconds = 2,592,000s
export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

// Cookie name for user role context
export const ROLE_COOKIE_NAME = "sonar_role";

/**
 * Standard cookie options for HTTP-only session cookies (e.g., sonar_role).
 */
export const SESSION_COOKIE_OPTIONS = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: SESSION_COOKIE_MAX_AGE,
};

/**
 * Standard cookie options for Supabase Auth SSR tokens (shared between client & server).
 */
export const SUPABASE_COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: SESSION_COOKIE_MAX_AGE,
};
