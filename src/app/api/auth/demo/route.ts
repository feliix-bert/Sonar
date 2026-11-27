import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ROLE_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth/cookie-config";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const role = url.searchParams.get("role");

  if (role !== "student" && role !== "volunteer" && role !== "admin") {
    return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
  }

  const cookieStore = await cookies();
  cookieStore.set(ROLE_COOKIE_NAME, role, SESSION_COOKIE_OPTIONS);

  const target =
    role === "admin"
      ? "/admin"
      : role === "volunteer"
      ? "/dashboard"
      : "/dashboard";

  return NextResponse.redirect(new URL(target, req.url));
}
