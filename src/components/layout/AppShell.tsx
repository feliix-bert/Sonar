"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ChevronDown,
  ClipboardCheck,
  FileUp,
  Headphones,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SonarLogo } from "@/components/shared/SonarLogo";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { AccessibilityToolbar } from "@/components/accessibility/AccessibilityToolbar";
import { CommandMenu } from "@/components/accessibility/CommandMenu";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { LogoutConfirmDialog } from "@/components/auth/LogoutConfirmDialog";
import { initialsOf } from "@/lib/format";
import type { AppRole } from "@/types/database";
import { useTranslation } from "@/lib/i18n/use-translation";

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
}

const STUDENT_MENU_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Mata Kuliah", href: "/courses", icon: BookOpen },
  { label: "Unggah Materi", href: "/upload", icon: FileUp },
  { label: "Pembaca", href: "/reader", icon: Headphones },
];

const VOLUNTEER_MENU_ITEMS: NavItem[] = [
  { label: "Dashboard Volunteer", href: "/dashboard", icon: LayoutDashboard },
  { label: "Antrean Review", href: "/review", icon: ClipboardCheck },
];

const ADMIN_MENU_ITEMS: NavItem[] = [
  { label: "Dashboard Admin", href: "/admin", icon: ShieldCheck },
  { label: "Mata Kuliah", href: "/courses", icon: BookOpen },
  { label: "Antrean Review", href: "/review", icon: ClipboardCheck },
  { label: "Unggah Materi", href: "/upload", icon: FileUp },
  { label: "Pembaca", href: "/reader", icon: Headphones },
];

const ACCOUNT_ITEMS: NavItem[] = [
  { label: "Pengaturan", href: "/settings", icon: Settings },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getLocalizedNavLabel(href: string, defaultLabel: string, isEn: boolean) {
  if (!isEn) return defaultLabel;
  if (href === "/dashboard") return defaultLabel.includes("Volunteer") ? "Volunteer Dashboard" : "Dashboard";
  if (href === "/admin") return "Admin Dashboard";
  if (href === "/courses") return "Courses";
  if (href === "/upload") return "Upload Material";
  if (href === "/reader") return "Reader";
  if (href === "/review") return "Review Queue";
  if (href === "/settings") return "Settings";
  return defaultLabel;
}

function NavListItems({
  items,
  pathname,
}: {
  items: NavItem[];
  pathname: string;
}) {
  const { isEn } = useTranslation();

  return (
    <>
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActivePath(pathname, item.href);
        const label = getLocalizedNavLabel(item.href, item.label, isEn);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                active
                  ? "bg-primary font-semibold text-primary-foreground shadow-xs"
                  : "text-foreground/85 hover:bg-brand-mint hover:text-brand-ink dark:hover:bg-muted dark:hover:text-foreground"
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              <span>{label}</span>
            </Link>
          </li>
        );
      })}
    </>
  );
}

/** Inner component: safe to call usePathname() inside a <Suspense> boundary. */
function DynamicNavMenuItemsInner({ userRoles }: { userRoles: AppRole[] }) {
  const pathname = usePathname();
  const isAdmin = userRoles.includes("admin");
  const isVolunteer = !isAdmin && userRoles.includes("volunteer");

  const navItems = isAdmin
    ? ADMIN_MENU_ITEMS
    : isVolunteer
    ? VOLUNTEER_MENU_ITEMS
    : STUDENT_MENU_ITEMS;

  return <NavListItems items={navItems} pathname={pathname} />;
}

export function RoleNavMenuItems({ userRoles = ["student"] }: { userRoles?: AppRole[] }) {
  return (
    <Suspense fallback={null}>
      <DynamicNavMenuItemsInner userRoles={userRoles} />
    </Suspense>
  );
}

function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-tint-blue font-heading font-bold text-brand-ink",
        className
      )}
    >
      {initialsOf(name)}
    </span>
  );
}

export function SidebarAccountSection({
  userName,
  userEmail,
  roleLabel,
}: {
  userName?: string | null;
  userEmail?: string | null;
  roleLabel: string;
}) {
  const [logoutOpen, setLogoutOpen] = useState(false);
  const { t, isEn } = useTranslation();
  const displayName =
    userName?.trim() || userEmail?.split("@")[0] || (isEn ? "SONAR User" : "Pengguna SONAR");
  const displayRole = isEn
    ? roleLabel.toLowerCase().includes("mahasiswa")
      ? "Student"
      : roleLabel.toLowerCase().includes("admin")
        ? "Administrator"
        : roleLabel.toLowerCase().includes("volunteer")
          ? "Volunteer"
          : roleLabel
    : roleLabel;

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center gap-3 rounded-xl bg-surface-subtle p-3">
          <Avatar name={displayName} className="size-10 text-sm" />
          <div className="min-w-0">
            <p className="truncate font-ui text-sm font-semibold text-foreground">
              {displayName}
            </p>
            <p className="text-xs text-muted-foreground">{displayRole}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setLogoutOpen(true)}
          className="h-11 w-full justify-start gap-3 rounded-xl px-3 font-ui text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <LogOut className="size-5" aria-hidden="true" />
          <span>{t("signOut")}</span>
        </Button>
      </div>
      <LogoutConfirmDialog open={logoutOpen} onOpenChange={setLogoutOpen} />
    </>
  );
}

export function HeaderUserMenu({
  userName,
  userEmail,
  roleLabel,
}: {
  userName?: string | null;
  userEmail?: string | null;
  roleLabel: string;
}) {
  const [logoutOpen, setLogoutOpen] = useState(false);
  const { t, isEn } = useTranslation();
  const displayName =
    userName?.trim() || userEmail?.split("@")[0] || (isEn ? "SONAR User" : "Pengguna SONAR");
  const displayRole = isEn
    ? roleLabel.toLowerCase().includes("mahasiswa")
      ? "Student"
      : roleLabel.toLowerCase().includes("admin")
        ? "Administrator"
        : roleLabel.toLowerCase().includes("volunteer")
          ? "Volunteer"
          : roleLabel
    : roleLabel;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-11 gap-2 rounded-full px-1.5 sm:pr-3"
          >
            <Avatar name={displayName} className="size-8 text-xs" />
            <span className="sr-only md:hidden">
              {isEn ? `Account menu ${displayName}` : `Menu akun ${displayName}`}
            </span>
            <span className="hidden min-w-0 text-left leading-tight md:block">
              <span className="block max-w-36 truncate text-sm font-semibold text-foreground">
                {displayName}
              </span>
              <span className="block text-xs font-normal text-muted-foreground">{displayRole}</span>
            </span>
            <ChevronDown className="hidden size-4 text-muted-foreground sm:block" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="space-y-0.5 font-normal">
            <span className="block truncate text-sm font-semibold text-foreground">{displayName}</span>
            {userEmail ? (
              <span className="block truncate text-xs text-muted-foreground">{userEmail}</span>
            ) : null}
            <span className="block text-xs text-muted-foreground">{displayRole}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings" className="min-h-10 cursor-pointer">
              <Settings className="size-4" aria-hidden="true" />
              <span>{isEn ? "Reading preferences" : "Pengaturan membaca"}</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => setLogoutOpen(true)}
            className="min-h-10 w-full cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="size-4" aria-hidden="true" />
            <span>{t("signOut")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <LogoutConfirmDialog open={logoutOpen} onOpenChange={setLogoutOpen} />
    </>
  );
}

/** Renders account nav links with active state: must stay inside a Suspense boundary. */
function AccountNavItemsInner() {
  const pathname = usePathname();
  return <NavListItems items={ACCOUNT_ITEMS} pathname={pathname} />;
}

export function AppShell({
  children,
  userName,
  userEmail,
  userRoles = ["student"],
  roleNavSlot,
  sidebarFooterSlot,
  headerUserSlot,
  mobileNavSlot,
}: {
  children: React.ReactNode;
  userName?: string | null;
  userEmail?: string | null;
  userRoles?: AppRole[];
  roleNavSlot?: React.ReactNode;
  sidebarFooterSlot?: React.ReactNode;
  headerUserSlot?: React.ReactNode;
  mobileNavSlot?: React.ReactNode;
}) {
  const { t, isEn } = useTranslation();
  const isAdmin = userRoles.includes("admin");
  const isVolunteer = isAdmin || userRoles.includes("volunteer");
  const roleLabel = isAdmin
    ? isEn
      ? "Admin"
      : "Administrator"
    : isVolunteer
    ? "Volunteer"
    : isEn
    ? "Student"
    : "Mahasiswa";

  return (
    <div className="min-h-dvh overflow-x-clip bg-background lg:flex">
      {/* Desktop Sidebar (Sticky on viewport) */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-16 items-center px-5">
          <Link
            href="/dashboard"
            aria-label="SONAR, ke dashboard"
            className="inline-flex items-center rounded-md"
          >
            <SonarLogo variant="full" size="sm" />
          </Link>
        </div>

        <nav
          aria-label={isEn ? "Main navigation" : "Navigasi utama"}
          className="flex-1 space-y-6 overflow-y-auto px-3 py-4"
        >
          <div className="space-y-2">
            <p className="px-3 font-ui text-xs font-semibold text-muted-foreground">
              {t("navMenu")}
            </p>
            <ul className="space-y-1 font-ui">
              {roleNavSlot !== undefined ? roleNavSlot : <RoleNavMenuItems userRoles={userRoles} />}
            </ul>
          </div>
          <div className="space-y-2">
            <p className="px-3 font-ui text-xs font-semibold text-muted-foreground">
              {t("navAccount")}
            </p>
            <ul className="space-y-1 font-ui">
              <Suspense fallback={null}>
                <AccountNavItemsInner />
              </Suspense>
            </ul>
          </div>
        </nav>

        <div className="border-t border-border p-3">
          {sidebarFooterSlot !== undefined ? (
            sidebarFooterSlot
          ) : (
            <SidebarAccountSection
              userName={userName}
              userEmail={userEmail}
              roleLabel={roleLabel}
            />
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border/80 bg-background/95 px-4 backdrop-blur sm:gap-3 sm:px-6">
          <Link
            href="/dashboard"
            aria-label="SONAR, ke dashboard"
            className="inline-flex shrink-0 items-center rounded-md lg:hidden"
          >
            <SonarLogo variant="mark" size="sm" />
          </Link>

          <div className="min-w-0 sm:max-w-md sm:flex-1">
            <CommandMenu bar />
          </div>

          <div className="ml-auto flex items-center gap-1">
            <AccessibilityToolbar compact />
            <ThemeToggle />
            {headerUserSlot !== undefined ? (
              headerUserSlot
            ) : (
              <HeaderUserMenu
                userName={userName}
                userEmail={userEmail}
                roleLabel={roleLabel}
              />
            )}
          </div>
        </header>

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 px-4 py-6 pb-28 outline-none sm:px-6 lg:px-8 lg:pb-10"
        >
          {children}
        </main>

        {mobileNavSlot !== undefined ? (
          mobileNavSlot
        ) : (
          <Suspense fallback={null}>
            <MobileBottomNav userRoles={userRoles} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
