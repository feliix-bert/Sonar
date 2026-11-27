import { describe, expect, it } from "vitest";
import {
  ROLE_COOKIE_NAME,
  SESSION_COOKIE_MAX_AGE,
  SESSION_COOKIE_OPTIONS,
  SUPABASE_COOKIE_OPTIONS,
} from "@/lib/auth/cookie-config";

describe("Session and Cookie Configuration", () => {
  it("defines 30-day persistent session lifetime", () => {
    // 30 days * 24 hours * 60 minutes * 60 seconds = 2,592,000 seconds
    expect(SESSION_COOKIE_MAX_AGE).toBe(2592000);
    expect(SESSION_COOKIE_MAX_AGE).toBe(60 * 60 * 24 * 30);
  });

  it("configures resilient HTTP-only session cookie options", () => {
    expect(ROLE_COOKIE_NAME).toBe("sonar_role");
    expect(SESSION_COOKIE_OPTIONS.path).toBe("/");
    expect(SESSION_COOKIE_OPTIONS.httpOnly).toBe(true);
    expect(SESSION_COOKIE_OPTIONS.sameSite).toBe("lax");
    expect(SESSION_COOKIE_OPTIONS.maxAge).toBe(2592000);
  });

  it("configures Supabase SSR cookie options with matching long-lived maxAge", () => {
    expect(SUPABASE_COOKIE_OPTIONS.path).toBe("/");
    expect(SUPABASE_COOKIE_OPTIONS.sameSite).toBe("lax");
    expect(SUPABASE_COOKIE_OPTIONS.maxAge).toBe(2592000);
  });
});
