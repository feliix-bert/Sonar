"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowRight,
  BookOpenCheck,
  ChevronDown,
  CircleHelp,
  Info,
  Menu,
  ShieldCheck,
} from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  { label: "Pernyataan Aksesibilitas", description: "Komitmen WCAG 2.2 AA", href: "/accessibility", icon: ShieldCheck },
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
  if (href === "/accessibility") return { label: "Accessibility Statement", description: "WCAG 2.2 AA commitment" };
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

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t, isEn } = useTranslation();

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

              <div className="space-y-2 border-t border-border p-4 font-ui">
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
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
