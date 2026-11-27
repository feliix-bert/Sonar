import { cache } from "react";
import { cookies } from "next/headers";
import type { AppRole } from "@/types/database";
import { ROLE_COOKIE_NAME } from "@/lib/auth/cookie-config";

export interface AppUserSession {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  roleLabel: string;
  avatarUrl?: string;
  enrolledCourses: string[];
  isDemoSession: boolean;
}

export const DEMO_PROFILES: Record<"student" | "volunteer" | "admin", AppUserSession> = {
  student: {
    id: "usr-student-001",
    name: "Ahmad Fauzi",
    email: "ahmad.fauzi@student.ac.id",
    role: "student",
    roleLabel: "Mahasiswa Tunanetra",
    avatarUrl: "/images/testimonial_2.jpg",
    enrolledCourses: ["cs-201", "math-105"],
    isDemoSession: true,
  },
  volunteer: {
    id: "usr-volunteer-001",
    name: "Dewi Sartika, S.Kom.",
    email: "dewi.sartika@volunteer.sonar.ac.id",
    role: "volunteer",
    roleLabel: "Volunteer Reviewer",
    avatarUrl: "/images/testimonial_3.jpg",
    enrolledCourses: ["cs-201", "math-105", "stat-210"],
    isDemoSession: true,
  },
  admin: {
    id: "usr-admin-001",
    name: "Dr. Hendra Gunawan",
    email: "hendra.gunawan@faculty.ac.id",
    role: "admin",
    roleLabel: "Platform Administrator",
    avatarUrl: "/images/testimonial_1.jpg",
    enrolledCourses: ["cs-201", "math-105", "stat-210"],
    isDemoSession: true,
  },
};

export const getCurrentAppUser = cache(async function getCurrentAppUser(): Promise<AppUserSession | null> {
  const cookieStore = await cookies();
  const roleCookie = cookieStore.get(ROLE_COOKIE_NAME)?.value as "student" | "volunteer" | "admin" | undefined;

  if (roleCookie && DEMO_PROFILES[roleCookie]) {
    return DEMO_PROFILES[roleCookie];
  }

  return null;
});
