"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  BookOpenCheck,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Info,
  LayoutDashboard,
  LogOut,
  Menu,
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
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SonarLogo } from "@/components/shared/SonarLogo";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { AccessibilityToolbar } from "@/components/accessibility/AccessibilityToolbar";
import { CommandMenu } from "@/components/accessibility/CommandMenu";
import { useTranslation } from "@/lib/i18n/use-translation";
import { initialsOf } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { LogoutConfirmDialog } from "@/components/auth/LogoutConfirmDialog";

interface NavLink {
  label: string;
  href: string;
  badge?: string;
  badgeLabel?: string;
}

const PRIMARY_LINKS: NavLink[] = [
  { label: "Fitur", href: "/#features" },
  { label: "Mata Kuliah", href: "/courses", badge: "3", badgeLabel: "3 mata kuliah tersedia" },
  { label: "Cara Kerja", href: "/how-it-works" },
  { label: "Ulasan", href: "/#testimonials" },
];

const INFO_LINKS = [
  { label: "Tentang SONAR", description: "Visi, misi, dan prinsip inklusif", href: "/about", icon: Info },
  { label: "Pernyataan Aksesibilitas", description: "Komitmen aksesibilitas inklusif", href: "/accessibility", icon: ShieldCheck },
  { label: "Pusat Bantuan", description: "Panduan dan pertanyaan umum", href: "/help", icon: CircleHelp },
];

const linkBase =
  "inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium font-ui transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring";

function isActive(pathname: string | null, href: string) {
  if (!pathname || href.includes("#")) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function getPrimaryNavLabel(href: string, defaultLabel: string, isEn: boolean) {
  if (!isEn) return defaultLabel;
  if (href === "/#features") return "Features";
  if (href === "/courses") return "Courses";
  if (href === "/how-it-works") return "How It Works";
  if (href === "/#testimonials") return "Reviews";
  return defaultLabel;
}

function getInfoNavLabel(href: string, defaultLabel: string, defaultDesc: string, isEn: boolean) {
  if (!isEn) return { label: defaultLabel, description: defaultDesc };
  if (href === "/about") return { label: "About SONAR", description: "Vision, mission, and inclusivity" };
  if (href === "/accessibility") return { label: "Accessibility Statement", description: "Inclusive accessibility commitment" };
  if (href === "/help") return { label: "Help Center", description: "Guides and FAQ" };
  return { label: defaultLabel, description: defaultDesc };
}

function DesktopNavView({ pathname }: { pathname: string | null }) {
  const { isEn } = useTranslation();
  const infoActive = INFO_LINKS.some((item) => isActive(pathname, item.href));

  return (
    <ul className="flex items-center gap-0.5">
      {PRIMARY_LINKS.map((item) => {
        const active = isActive(pathname, item.href);
        const label = getPrimaryNavLabel(item.href, item.label, isEn);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                linkBase,
                active ? "bg-muted text-foreground font-semibold" : "text-muted-foreground"
              )}
            >
              <span>{label}</span>
              {item.badge ? (
                <>
                  <span
                    aria-hidden="true"
                    className="ml-2 inline-flex size-5 items-center justify-center rounded-full bg-brand-ink text-[11px] font-semibold text-brand-paper dark:bg-primary dark:text-primary-foreground"
                  >
                    {item.badge}
                  </span>
                  <span className="sr-only">, {item.badgeLabel}</span>
                </>
              ) : null}
            </Link>
          </li>
        );
      })}
      <li>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                linkBase,
                "gap-1.5 aria-expanded:bg-muted aria-expanded:text-foreground",
                infoActive ? "text-foreground font-semibold" : "text-muted-foreground"
              )}
            >
              <span>{isEn ? "Information" : "Informasi"}</span>
              <ChevronDown className="size-4" aria-hidden="true" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72 rounded-xl p-1.5">
            {INFO_LINKS.map((item) => {
              const Icon = item.icon;
              const info = getInfoNavLabel(item.href, item.label, item.description, isEn);
              return (
                <DropdownMenuItem key={item.href} asChild className="cursor-pointer rounded-lg p-2.5">
                  <Link href={item.href} className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold font-ui text-foreground">{info.label}</span>
                      <span className="block text-xs text-muted-foreground">{info.description}</span>
                    </span>
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </li>
    </ul>
  );
}

function DesktopNav() {
  const pathname = usePathname();
  return <DesktopNavView pathname={pathname} />;
}

interface HeaderUser {
  id: string;
  name: string | null;
  email: string | null;
  roles: string[];
  roleLabel: string;
  dashboardHref: string;
  avatarUrl: string | null;
}

function NavAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const [imageError, setImageError] = useState(false);

  if (avatarUrl && !imageError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        aria-hidden="true"
        className="size-8 rounded-full object-cover ring-1 ring-border"
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <span
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary ring-1 ring-border"
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  );
}

const USER_CACHE_KEY = "sonar_user_cache";
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 menit cache di session storage

function getCachedUser(): HeaderUser | null | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = sessionStorage.getItem(USER_CACHE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.timestamp === "number") {
      if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
        return (parsed.user as HeaderUser | null) ?? null;
      }
    }
  } catch {
    // Ignore storage parse error
  }
  return undefined;
}

function setCachedUser(user: HeaderUser | null) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      USER_CACHE_KEY,
      JSON.stringify({ user, timestamp: Date.now() })
    );
  } catch {
    // Ignore storage write error
  }
}

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [user, setUser] = useState<HeaderUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const { t, isEn } = useTranslation();

  useEffect(() => {
    let isMounted = true;

    // 1. Cek cache sessionStorage terlebih dahulu (0ms, 0 API request ke Supabase)
    const cached = getCachedUser();
    if (cached !== undefined) {
      setUser(cached);
      setIsLoadingUser(false);
      return;
    }

    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) {
          if (isMounted) {
            setUser(null);
            setCachedUser(null);
          }
          return;
        }
        const data = await res.json();
        const resolvedUser = (data.user as HeaderUser | null) ?? null;
        if (isMounted) {
          setUser(resolvedUser);
          setCachedUser(resolvedUser);
        }
      } catch {
        if (isMounted) {
          setUser(null);
          setCachedUser(null);
        }
      } finally {
        if (isMounted) setIsLoadingUser(false);
      }
    }

    void loadUser();

    try {
      const supabase = createClient();
      if (!supabase) {
        return () => {
          isMounted = false;
        };
      }
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(() => {
        try {
          sessionStorage.removeItem(USER_CACHE_KEY);
        } catch {
          // ignore
        }
        void loadUser();
      });
      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    } catch {
      return () => {
        isMounted = false;
      };
    }
  }, []);

  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-6 sm:pt-4">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 rounded-2xl bg-card/90 px-3 shadow-nav backdrop-blur-xl sm:h-16 sm:px-4">
        <Link
          href="/"
          aria-label="SONAR, kembali ke beranda"
          className="inline-flex shrink-0 items-center rounded-lg py-1 pr-1 outline-none focus-visible:outline-2 focus-visible:outline-ring"
        >
          <span className="sm:hidden">
            <SonarLogo variant="mark" size="sm" />
          </span>
          <span className="hidden sm:inline-flex">
            <SonarLogo size="sm" />
          </span>
        </Link>

        <nav aria-label="Navigasi utama" className="ml-3 hidden lg:block">
          <Suspense fallback={<DesktopNavView pathname={null} />}>
            <DesktopNav />
          </Suspense>
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <CommandMenu compact />
          <AccessibilityToolbar compact />
          <ThemeToggle />

          {!isLoadingUser && user ? (
            <div className="hidden items-center gap-2 md:flex">
              <Button
                size="sm"
                asChild
                className="h-10 rounded-xl bg-brand-ink px-3.5 font-ui font-semibold text-brand-paper hover:bg-brand-teal dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
              >
                <Link href={user.dashboardHref} className="inline-flex items-center gap-1.5">
                  <LayoutDashboard className="size-4" aria-hidden="true" />
                  <span>{user.roles.includes("admin") ? "Dashboard Admin" : isEn ? "Dashboard" : "Buka Dashboard"}</span>
                </Link>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-full p-1 text-left outline-none ring-offset-background transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                    aria-label={isEn ? "Open user profile menu" : "Buka menu profil pengguna"}
                  >
                    <NavAvatar name={user.name ?? user.email ?? "User"} avatarUrl={user.avatarUrl} />
                    <span className="sr-only">{user.name ?? user.email ?? "Profil Pengguna"}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 font-ui">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold leading-none text-foreground">{user.name || (isEn ? "User" : "Pengguna")}</p>
                      {user.email ? (
                        <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                      ) : null}
                      <div className="pt-1">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                          {user.roleLabel}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href={user.dashboardHref} className="flex cursor-pointer items-center gap-2">
                      <LayoutDashboard className="size-4" aria-hidden="true" />
                      <span>Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  {user.roles.includes("admin") || user.roles.includes("volunteer") ? (
                    <DropdownMenuItem asChild>
                      <Link href="/volunteer" className="flex cursor-pointer items-center gap-2">
                        <ClipboardCheck className="size-4" aria-hidden="true" />
                        <span>Antrean Review</span>
                      </Link>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem asChild>
                    <Link href="/courses" className="flex cursor-pointer items-center gap-2">
                      <BookOpen className="size-4" aria-hidden="true" />
                      <span>{isEn ? "Courses" : "Mata Kuliah"}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="flex cursor-pointer items-center gap-2">
                      <Settings className="size-4" aria-hidden="true" />
                      <span>{isEn ? "Reading Settings" : "Pengaturan Membaca"}</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => setLogoutConfirmOpen(true)}
                    className="flex cursor-pointer items-center gap-2 text-destructive focus:text-destructive"
                  >
                    <LogOut className="size-4" aria-hidden="true" />
                    <span>{t("signOut")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="hidden h-10 px-3 font-ui font-medium text-foreground md:inline-flex"
              >
                <Link href="/login">{t("signIn")}</Link>
              </Button>
              <Button
                size="sm"
                asChild
                className="hidden h-10 rounded-xl bg-brand-ink px-4 font-ui font-semibold text-brand-paper hover:bg-brand-teal dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 md:inline-flex"
              >
                <Link href="/register">
                  <span>{isEn ? "Get Started" : "Mulai Gratis"}</span>
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </>
          )}

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="lg:hidden"
                aria-label={isEn ? "Open navigation menu" : "Buka menu navigasi"}
              >
                <Menu className="size-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-[min(22rem,100vw)] flex-col gap-0 p-0">
              <SheetHeader className="border-b border-border px-5 py-4 text-left">
                <SheetTitle>
                  <SonarLogo size="sm" />
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Menu navigasi utama SONAR dan tautan informasi.
                </SheetDescription>
              </SheetHeader>

              <nav aria-label="Navigasi seluler" className="flex-1 overflow-y-auto px-3 py-4">
                <ul className="space-y-1 font-ui">
                  {PRIMARY_LINKS.map((item) => {
                    const label = getPrimaryNavLabel(item.href, item.label, isEn);
                    return (
                      <li key={item.href}>
                        <SheetClose asChild>
                          <Link
                            href={item.href}
                            className="flex min-h-12 items-center justify-between rounded-xl px-4 text-base font-medium text-foreground transition-colors hover:bg-muted"
                          >
                            <span>{label}</span>
                            {item.badge ? (
                              <span className="rounded-full bg-brand-ink px-2 py-0.5 text-xs font-semibold text-brand-paper dark:bg-primary dark:text-primary-foreground">
                                {item.badgeLabel}
                              </span>
                            ) : null}
                          </Link>
                        </SheetClose>
                      </li>
                    );
                  })}
                </ul>

                <p className="mt-6 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground font-ui">
                  {isEn ? "Information" : "Informasi"}
                </p>
                <ul className="mt-2 space-y-1 font-ui">
                  {INFO_LINKS.map((item) => {
                    const Icon = item.icon;
                    const info = getInfoNavLabel(item.href, item.label, item.description, isEn);
                    return (
                      <li key={item.href}>
                        <SheetClose asChild>
                          <Link
                            href={item.href}
                            className="flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                          >
                            <Icon className="size-4 text-primary" aria-hidden="true" />
                            <span>{info.label}</span>
                          </Link>
                        </SheetClose>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <div className="space-y-3 border-t border-border p-4 font-ui">
                {user ? (
                  <>
                    <div className="flex items-center gap-3 rounded-xl bg-muted/60 p-3">
                      <NavAvatar name={user.name ?? user.email ?? "User"} avatarUrl={user.avatarUrl} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{user.name || "Pengguna"}</p>
                        <p className="truncate text-xs text-muted-foreground">{user.email || user.roleLabel}</p>
                        <span className="mt-1 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          {user.roleLabel}
                        </span>
                      </div>
                    </div>

                    <SheetClose asChild>
                      <Button
                        asChild
                        size="lg"
                        className="h-11 w-full rounded-xl bg-brand-ink font-semibold text-brand-paper hover:bg-brand-teal dark:bg-primary dark:text-primary-foreground"
                      >
                        <Link href={user.dashboardHref} className="inline-flex items-center justify-center gap-2">
                          <LayoutDashboard className="size-4" aria-hidden="true" />
                          <span>{user.roles.includes("admin") ? "Dashboard Admin" : isEn ? "Dashboard" : "Buka Dashboard"}</span>
                        </Link>
                      </Button>
                    </SheetClose>

                    <div className="flex gap-2">
                      <SheetClose asChild>
                        <Button asChild size="sm" variant="outline" className="h-10 flex-1 rounded-xl">
                          <Link href="/settings" className="inline-flex items-center justify-center gap-1.5">
                            <Settings className="size-4" aria-hidden="true" />
                            <span>Pengaturan</span>
                          </Link>
                        </Button>
                      </SheetClose>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setMobileOpen(false);
                          setLogoutConfirmOpen(true);
                        }}
                        className="h-10 flex-1 rounded-xl text-destructive hover:text-destructive"
                      >
                        <LogOut className="size-4" aria-hidden="true" />
                        <span>{t("signOut")}</span>
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <SheetClose asChild>
                      <Button
                        asChild
                        size="lg"
                        className="h-12 w-full rounded-xl bg-brand-ink font-semibold text-brand-paper hover:bg-brand-teal dark:bg-primary dark:text-primary-foreground"
                      >
                        <Link href="/register">
                          <BookOpenCheck className="size-4" aria-hidden="true" />
                          <span>{isEn ? "Get Started" : "Mulai Gratis"}</span>
                        </Link>
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button asChild size="lg" variant="outline" className="h-12 w-full rounded-xl font-semibold">
                        <Link href="/login">{t("signIn")}</Link>
                      </Button>
                    </SheetClose>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <LogoutConfirmDialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen} />
    </header>
  );
}
