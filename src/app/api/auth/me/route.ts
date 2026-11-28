import { NextResponse } from "next/server";
import { getAuthenticatedContext } from "@/lib/supabase/auth-helpers";
import { getCurrentAppUser } from "@/lib/auth/session";
import type { AppRole } from "@/types/database";

export async function GET() {
  const [{ auth }, demoUser] = await Promise.all([
    getAuthenticatedContext(),
    getCurrentAppUser(),
  ]);

  if (!auth && !demoUser) {
    return NextResponse.json({ user: null });
  }

  const name = auth?.fullName ?? demoUser?.name ?? null;
  const email = auth?.email ?? demoUser?.email ?? null;
  const roles: AppRole[] = auth?.roles ?? (demoUser ? [demoUser.role] : ["student"]);
  const isAdmin = roles.includes("admin");
  const isVolunteer = !isAdmin && roles.includes("volunteer");
  const roleLabel = isAdmin ? "Administrator" : isVolunteer ? "Volunteer" : "Mahasiswa";
  const dashboardHref = isAdmin ? "/admin" : "/dashboard";

  return NextResponse.json({
    user: {
      id: auth?.userId ?? demoUser?.id ?? "user",
      name,
      email,
      roles,
      roleLabel,
      dashboardHref,
      avatarUrl: demoUser?.avatarUrl ?? null,
    },
  });
}
