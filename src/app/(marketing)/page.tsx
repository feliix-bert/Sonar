"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import gsap from "gsap";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Plus,
  Sparkles,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { InteractiveSandbox } from "@/components/marketing/InteractiveSandbox";
import { APP_IMAGES } from "@/lib/images";
import { useTranslation } from "@/lib/i18n/use-translation";

const HERO_AVATARS = [
  APP_IMAGES.testimonialStudent1.src,
  APP_IMAGES.testimonialStudent2.src,
  APP_IMAGES.testimonialVolunteer.src,
];

export default function LandingPage() {
  const { t } = useTranslation();
  const heroRef = useRef<HTMLDivElement>(null);
  const [activeTestimonialIdx, setActiveTestimonialIdx] = useState(0);

  const featureCards = [
    {
      title: t("feature1Title"),
      category: t("feature1Category"),
      badgeClass: "bg-brand-mint text-brand-ink",
      accentBar: "bg-brand-teal",
      description: t("feature1Desc"),
      image: APP_IMAGES.featureAudio,
      href: "/reader",
      cta: t("feature1Cta"),
    },
    {
      title: t("feature2Title"),
      category: t("feature2Category"),
      badgeClass: "bg-tint-blue text-brand-ink",
      accentBar: "bg-brand-blue",
      description: t("feature2Desc"),
      image: APP_IMAGES.courseMath,
      href: "/courses/math-105",
      cta: t("feature2Cta"),
    },
    {
      title: t("feature3Title"),
      category: t("feature3Category"),
      badgeClass: "bg-tint-peach text-brand-ink",
      accentBar: "bg-brand-peach",
      description: t("feature3Desc"),
      image: APP_IMAGES.featureBraille,
      href: "/courses/cs-201",
      cta: t("feature3Cta"),
    },
    {
      title: t("feature4Title"),
      category: t("feature4Category"),
      badgeClass: "bg-tint-gold text-brand-ink",
      accentBar: "bg-brand-gold",
      description: t("feature4Desc"),
      image: APP_IMAGES.featureStudy,
      href: "/courses",
      cta: t("feature4Cta"),
    },
  ];

  const coursePreviews = [
    {
      code: "CS 201",
      title: t("courseCsTitle"),
      image: APP_IMAGES.courseCS,
      materials: t("courseCsMeta"),
      badgeClass: "bg-brand-mint text-brand-ink",
      href: "/courses/cs-201",
    },
    {
      code: "MATH 105",
      title: t("courseMathTitle"),
      image: APP_IMAGES.courseMath,
      materials: t("courseMathMeta"),
      badgeClass: "bg-tint-blue text-brand-ink",
      href: "/courses/math-105",
    },
    {
      code: "STAT 210",
      title: t("courseStatTitle"),
      image: APP_IMAGES.courseStat,
      materials: t("courseStatMeta"),
      badgeClass: "bg-tint-peach text-brand-ink",
      href: "/courses/stat-210",
    },
  ];

  const testimonials = [
    {
      src: APP_IMAGES.testimonialStudent1.src,
      alt: APP_IMAGES.testimonialStudent1.alt,
      name: APP_IMAGES.testimonialStudent1.name,
      role: t("testimonial1Role"),
      university: APP_IMAGES.testimonialStudent1.university,
      quote: t("testimonial1Quote"),
      rating: 5,
    },
    {
      src: APP_IMAGES.testimonialStudent2.src,
      alt: APP_IMAGES.testimonialStudent2.alt,
      name: APP_IMAGES.testimonialStudent2.name,
      role: t("testimonial2Role"),
      university: APP_IMAGES.testimonialStudent2.university,
      quote: t("testimonial2Quote"),
      rating: 5,
    },
    {
      src: APP_IMAGES.testimonialVolunteer.src,
      alt: APP_IMAGES.testimonialVolunteer.alt,
      name: APP_IMAGES.testimonialVolunteer.name,
      role: t("testimonial3Role"),
      university: APP_IMAGES.testimonialVolunteer.university,
      quote: t("testimonial3Quote"),
      rating: 5,
    },
  ];

  // Catch any OAuth code landing on the root landing page and forward to auth callback
  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get("code");
      if (code) {
        window.location.replace(`/auth/callback${window.location.search}`);
      }
    }
  }, []);

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      if (!heroRef.current) return;
      const items = heroRef.current.querySelectorAll("[data-hero-reveal]");
      gsap.fromTo(
        items,
        { y: 12, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.35,
          stagger: 0.04,
          ease: "power2.out",
          clearProps: "transform,opacity",
        }
      );
    });
    return () => mm.revert();
  }, []);

  const nextTestimonial = () => {
    setActiveTestimonialIdx((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setActiveTestimonialIdx((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <div className="flex min-h-screen flex-col overflow-x-clip bg-background font-sans text-foreground">
      <SiteHeader />

      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        {/* HERO SECTION — Enlango-inspired editorial split with SONAR 8-color palette */}
        <section
          ref={heroRef}
          aria-labelledby="hero-heading"
          className="relative overflow-x-clip pb-16 pt-8 sm:pb-24 sm:pt-12 lg:pb-28 lg:pt-14"
        >
          {/* Subtle grid & multi-tone brand aura */}
          <div aria-hidden="true" className="hero-grid pointer-events-none absolute inset-0" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 right-0 size-96 rounded-full bg-brand-aqua/15 blur-3xl dark:bg-brand-aqua/10"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-1/4 size-80 rounded-full bg-brand-blue/10 blur-3xl dark:bg-brand-blue/10"
          />

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
              {/* Left Column: Expressive Display Headline, CTAs & Stats */}
              <div className="min-w-0 space-y-7 lg:col-span-6">
                <h1
                  id="hero-heading"
                  data-hero-reveal
                  className="font-heading text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-[3.45rem] leading-[1.08]"
                >
                  <span className="block">{t("heroTitle1")}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>{t("heroTitle2")}</span>
                    <span
                      aria-hidden="true"
                      className="inline-flex items-center -space-x-2.5 align-middle"
                    >
                      {HERO_AVATARS.map((src, idx) => (
                        <span
                          key={src}
                          className="relative inline-block size-10 overflow-hidden rounded-full border-2 border-background bg-muted shadow-xs sm:size-12"
                        >
                          <Image
                            src={src}
                            alt=""
                            fill
                            sizes="48px"
                            className="object-cover"
                            priority={idx === 0}
                          />
                        </span>
                      ))}
                    </span>
                    <span className="italic font-bold text-brand-teal dark:text-brand-aqua">
                      {t("heroTitle3")}
                    </span>
                  </span>
                  <span className="mt-1 block">{t("heroTitle4")}</span>
                </h1>

                <p
                  data-hero-reveal
                  className="max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg font-sans"
                >
                  {t("heroSubtitle")}
                </p>

                <div
                  data-hero-reveal
                  className="flex flex-wrap items-center gap-3 pt-1 font-ui"
                >
                  <Button
                    size="lg"
                    asChild
                    className="h-12 rounded-full bg-brand-teal px-6 font-semibold text-white shadow-md hover:bg-brand-ink dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
                  >
                    <Link href="/register">
                      <span>{t("heroCtaStart")}</span>
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    asChild
                    className="h-12 rounded-full border-border bg-card px-6 font-semibold text-foreground hover:bg-brand-mint hover:text-brand-ink dark:hover:bg-muted dark:hover:text-foreground"
                  >
                    <a href="#sandbox-heading">
                      <Headphones className="size-4 text-primary" aria-hidden="true" />
                      <span>{t("heroCtaDemo")}</span>
                    </a>
                  </Button>
                </div>

                {/* 3 Bold Metric Pillars */}
                <dl
                  data-hero-reveal
                  className="grid grid-cols-3 gap-4 border-t border-border/80 pt-7 sm:gap-6"
                >
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground font-ui">
                      {t("heroStat1Label")}
                    </dt>
                    <dd className="mt-1 font-heading text-2xl font-extrabold tracking-tight text-foreground tabular-nums sm:text-3xl">
                      100%
                    </dd>
                    <dd className="text-[11px] font-medium text-primary font-ui">{t("heroStat1Sub")}</dd>
                  </div>
                  <div className="border-l border-border/80 pl-4 sm:pl-6">
                    <dt className="text-xs font-medium text-muted-foreground font-ui">
                      {t("heroStat2Label")}
                    </dt>
                    <dd className="mt-1 font-heading text-2xl font-extrabold tracking-tight text-foreground tabular-nums sm:text-3xl">
                      3+
                    </dd>
                    <dd className="text-[11px] font-medium text-muted-foreground font-ui">
                      {t("heroStat2Sub")}
                    </dd>
                  </div>
                  <div className="border-l border-border/80 pl-4 sm:pl-6">
                    <dt className="text-xs font-medium text-muted-foreground font-ui">
                      {t("heroStat3Label")}
                    </dt>
                    <dd className="mt-1 font-heading text-2xl font-extrabold tracking-tight text-foreground tabular-nums sm:text-3xl">
                      4.9/5
                    </dd>
                    <dd className="text-[11px] font-medium text-muted-foreground font-ui">
                      {t("heroStat3Sub")}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Right Column: Authentic Braille Workstation Photo + Floating Palette Cards */}
              <div
                data-hero-reveal
                className="relative min-w-0 lg:col-span-6 lg:pl-6"
              >
                {/* Decorative soft frame behind photo */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-3 -z-10 rounded-[2rem] bg-gradient-to-tr from-brand-mint via-tint-blue/70 to-tint-gold/70 dark:from-brand-teal/20 dark:via-brand-blue/15 dark:to-brand-peach/15"
                />

                <div className="relative mx-auto max-w-lg lg:max-w-none">
                  {/* Main Hero Photo Frame */}
                  <div className="relative aspect-[4/4.2] w-full overflow-hidden rounded-3xl border border-border/80 bg-card shadow-float sm:aspect-[4/4]">
                    <Image
                      src={APP_IMAGES.heroBraille.src}
                      alt={APP_IMAGES.heroBraille.alt}
                      fill
                      priority
                      className="object-cover object-center"
                      sizes="(max-width: 1024px) 100vw, 48vw"
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-ink/35 via-transparent to-transparent"
                    />
                  </div>

                  {/* Floating Badge 1 (Top-Right): Verification Pills */}
                  <div className="hidden flex-col items-end gap-2 sm:flex sm:absolute sm:-right-3 sm:top-6">
                    <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/95 px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-float backdrop-blur-md font-ui">
                      <CheckCircle2 className="size-4 text-brand-teal dark:text-brand-aqua" aria-hidden="true" />
                      <span>{t("heroBadgeScreenReader")}</span>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/95 px-3.5 py-1.5 text-xs font-semibold text-foreground shadow-float backdrop-blur-md font-ui">
                      <CheckCircle2 className="size-4 text-brand-blue-strong dark:text-brand-blue" aria-hidden="true" />
                      <span>{t("heroBadgeVolunteer")}</span>
                    </div>
                  </div>

                  {/* Floating Badge 2 (Mid-Left): Periwinkle Blue Card */}
                  <div className="hidden sm:block sm:absolute sm:-left-6 sm:top-1/3 sm:w-44 rounded-2xl bg-brand-blue-strong p-4 text-white shadow-float ring-4 ring-brand-blue/30 animate-float-slow">
                    <p className="font-heading text-2xl font-extrabold leading-none">MathML</p>
                    <p className="mt-1.5 text-xs font-medium text-white/90 font-ui leading-snug">
                      {t("heroBadgeMathDesc")}
                    </p>
                  </div>

                  {/* Floating Badge 3 (Bottom-Left): White Mode Selector Card */}
                  <div className="hidden sm:block sm:absolute sm:-left-5 sm:bottom-10 rounded-2xl border border-border/80 bg-card/95 p-4 shadow-float backdrop-blur-md">
                    <p className="font-heading text-xs font-bold text-foreground">
                      {t("heroBadgeInclusiveModes")}
                    </p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5 font-ui text-[11px] font-semibold">
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-mint px-2.5 py-1 text-brand-ink">
                        <Plus className="size-3" aria-hidden="true" />
                        Audio
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-tint-blue px-2.5 py-1 text-brand-ink">
                        <Plus className="size-3" aria-hidden="true" />
                        Braille
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-tint-gold px-2.5 py-1 text-brand-ink">
                        <Plus className="size-3" aria-hidden="true" />
                        Tanya AI
                      </span>
                    </div>
                  </div>

                  {/* Floating Badge 4 (Bottom-Right): Warm Peach Highlight Card */}
                  <div className="hidden sm:block sm:absolute sm:-bottom-5 sm:right-4 sm:w-44 rounded-2xl bg-brand-peach p-4 text-brand-ink shadow-float ring-4 ring-background animate-float">
                    <p className="font-heading text-2xl font-extrabold leading-none">24/7</p>
                    <p className="mt-1.5 text-xs font-semibold text-brand-ink/90 font-ui leading-snug">
                      {t("heroBadge247Desc")}
                    </p>
                  </div>

                  {/* Mobile-only compact summary cards */}
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:hidden font-ui">
                    <div className="rounded-2xl bg-brand-blue-strong p-3.5 text-white shadow-xs">
                      <p className="font-heading text-lg font-extrabold">MathML</p>
                      <p className="mt-0.5 text-xs text-white/90">{t("heroBadgeMathDesc")}</p>
                    </div>
                    <div className="rounded-2xl bg-brand-peach p-3.5 text-brand-ink shadow-xs">
                      <p className="font-heading text-lg font-extrabold">24/7</p>
                      <p className="mt-0.5 text-xs font-semibold text-brand-ink/90">
                        {t("heroBadge247Desc")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURE CARDS */}
        <section
          id="features"
          aria-labelledby="features-heading"
          className="py-16 sm:py-24 bg-background"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div className="max-w-2xl space-y-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-mint px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand-ink font-ui">
                  <Sparkles className="size-3.5 text-brand-teal" aria-hidden="true" />
                  {t("featuresTag")}
                </span>
                <h2
                  id="features-heading"
                  className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl"
                >
                  {t("featuresHeading")}
                </h2>
              </div>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base font-sans">
                {t("featuresSubtitle")}
              </p>
            </div>

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featureCards.map((card) => (
                <article
                  key={card.title}
                  className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-float"
                >
                  <div>
                    <div className={`h-1.5 w-full ${card.accentBar}`} aria-hidden="true" />
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                      <Image
                        src={card.image.src}
                        alt={card.image.alt}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      />
                      <span
                        className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold shadow-xs font-ui ${card.badgeClass}`}
                      >
                        {card.category}
                      </span>
                    </div>

                    <div className="p-5">
                      <h3 className="font-heading text-lg font-bold leading-snug text-foreground">
                        {card.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground font-sans">
                        {card.description}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-border/60 px-5 py-3.5">
                    <Link
                      href={card.href}
                      className="inline-flex w-full items-center justify-between text-sm font-semibold text-primary transition-colors hover:text-brand-ink dark:hover:text-brand-aqua font-ui"
                    >
                      <span>{card.cta}</span>
                      <ArrowRight
                        className="size-4 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* EDITORIAL QUOTE & BRAILLE SPOTLIGHT */}
        <section
          aria-label={t("quoteTag")}
          className="px-4 py-4 sm:px-6 lg:px-8"
        >
          <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-brand-peach/40 bg-tint-peach dark:border-border dark:bg-card">
            <div className="grid items-center lg:grid-cols-12">
              <div className="relative aspect-[16/10] w-full lg:col-span-5 lg:aspect-auto lg:h-full">
                <Image
                  src={APP_IMAGES.quoteBraille.src}
                  alt={APP_IMAGES.quoteBraille.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 42vw"
                />
              </div>

              <div className="space-y-4 p-7 sm:p-10 lg:col-span-7 lg:p-12">
                <span className="inline-block rounded-full bg-brand-ink px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-paper font-ui dark:bg-brand-peach dark:text-brand-ink">
                  {t("quoteTag")}
                </span>
                <blockquote className="font-heading text-xl font-bold leading-relaxed tracking-tight text-brand-ink sm:text-2xl dark:text-foreground">
                  {t("quoteText")}
                </blockquote>
                <p className="text-sm font-semibold text-brand-ink/80 font-ui dark:text-muted-foreground">
                  {t("quoteAuthor")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS SECTION */}
        <section
          id="testimonials"
          aria-labelledby="testimonials-heading"
          className="py-16 sm:py-24 bg-background"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-tint-gold px-3 py-1 text-brand-ink font-ui">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="size-3.5 fill-current" aria-hidden="true" />
                    ))}
                  </div>
                  <span className="text-xs font-bold">{t("testimonialsTag")}</span>
                </div>
                <h2
                  id="testimonials-heading"
                  className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl"
                >
                  {t("testimonialsHeading")}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={prevTestimonial}
                  aria-label={t("testimonialPrev")}
                  className="rounded-full"
                >
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={nextTestimonial}
                  aria-label={t("testimonialNext")}
                  className="rounded-full"
                >
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.map((testimonialItem, idx) => {
                const isActive = idx === activeTestimonialIdx;
                return (
                  <article
                    key={testimonialItem.name}
                    className={`flex flex-col justify-between rounded-2xl border p-6 transition-all ${
                      isActive
                        ? "border-primary bg-card shadow-float ring-2 ring-primary/20"
                        : "border-border bg-card/80 shadow-xs hover:border-primary/40"
                    }`}
                  >
                    <div>
                      <div className="mb-4 inline-flex items-center gap-1 rounded-full bg-tint-gold px-2.5 py-1 text-brand-ink">
                        {[...Array(testimonialItem.rating)].map((_, i) => (
                          <Star key={i} className="size-3.5 fill-current" aria-hidden="true" />
                        ))}
                      </div>

                      <p className="text-sm leading-relaxed text-foreground/90 font-sans">
                        &ldquo;{testimonialItem.quote}&rdquo;
                      </p>
                    </div>

                    <div className="mt-6 flex items-center gap-3 border-t border-border/60 pt-4">
                      <div className="relative size-11 shrink-0 overflow-hidden rounded-full border-2 border-brand-mint">
                        <Image
                          src={testimonialItem.src}
                          alt={testimonialItem.alt}
                          fill
                          className="object-cover"
                          sizes="44px"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-heading text-sm font-bold text-foreground">
                          {testimonialItem.name}
                        </h3>
                        <p className="truncate text-xs text-muted-foreground font-ui">
                          {testimonialItem.role}
                        </p>
                        <p className="truncate text-[11px] font-semibold text-primary font-ui">
                          {testimonialItem.university}
                        </p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* LIVE ACCESSIBILITY ENGINE SANDBOX */}
        <section className="border-y border-border bg-brand-mint/45 py-16 dark:bg-surface-subtle/60">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <InteractiveSandbox />
          </div>
        </section>

        {/* SHARED REUSABLE COURSE MATERIALS */}
        <section
          aria-labelledby="shared-heading"
          className="py-16 sm:py-24 bg-background"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-10 lg:grid-cols-12">
              <div className="min-w-0 space-y-5 lg:col-span-6">
                <span className="inline-block rounded-full bg-tint-blue px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-brand-ink font-ui">
                  {t("sharedTag")}
                </span>
                <h2
                  id="shared-heading"
                  className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl"
                >
                  {t("sharedHeading")}
                </h2>
                <p className="text-base leading-relaxed text-muted-foreground font-sans">
                  {t("sharedSubtitle")}
                </p>

                <ul className="space-y-3 text-sm font-ui">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                    <span>
                      <strong>{t("sharedPoint1Title")}</strong> {t("sharedPoint1Desc")}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                    <span>
                      <strong>{t("sharedPoint2Title")}</strong> {t("sharedPoint2Desc")}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
                    <span>
                      <strong>{t("sharedPoint3Title")}</strong> {t("sharedPoint3Desc")}
                    </span>
                  </li>
                </ul>

                <div className="pt-2">
                  <Button
                    size="lg"
                    asChild
                    className="h-12 rounded-full bg-brand-teal px-7 font-ui font-semibold text-white hover:bg-brand-ink dark:bg-primary dark:text-primary-foreground"
                  >
                    <Link href="/courses">
                      <span>{t("sharedCtaCourses")}</span>
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Course Preview Cards */}
              <div className="min-w-0 space-y-4 lg:col-span-6">
                {coursePreviews.map((c) => (
                  <Link
                    key={c.code}
                    href={c.href}
                    className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-float"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="relative size-14 shrink-0 overflow-hidden rounded-xl border border-border">
                        <Image
                          src={c.image.src}
                          alt={c.image.alt}
                          fill
                          className="object-cover"
                          sizes="56px"
                        />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 font-heading text-xs font-bold ${c.badgeClass}`}
                        >
                          {c.code}
                        </span>
                        <p className="truncate font-ui text-sm font-bold text-foreground sm:text-base">
                          {c.title}
                        </p>
                        <p className="text-xs text-muted-foreground font-ui">{c.materials}</p>
                      </div>
                    </div>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* GOLDEN CAMPUS IMPACT BANNER */}
        <section
          aria-label={t("campusHeading")}
          className="px-4 pb-16 pt-2 sm:px-6 sm:pb-24 lg:px-8"
        >
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-brand-gold px-6 py-14 text-center text-brand-ink shadow-float sm:px-12 sm:py-16">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -left-16 -top-16 size-56 rounded-full bg-brand-peach/45 blur-2xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-20 -right-12 size-64 rounded-full bg-brand-aqua/35 blur-2xl"
            />

            <div className="relative mx-auto max-w-3xl">
              <span className="inline-block rounded-full bg-brand-ink/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-brand-ink font-ui">
                {t("campusTag")}
              </span>
              <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-brand-ink sm:text-4xl">
                {t("campusHeading")}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-brand-ink/85 font-sans">
                {t("campusSubtitle")}
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3 font-ui">
                <Button
                  size="lg"
                  asChild
                  className="h-12 rounded-full bg-brand-ink px-7 font-semibold text-brand-paper hover:bg-brand-teal"
                >
                  <Link href="/register">
                    <span>{t("campusCtaRegister")}</span>
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="h-12 rounded-full border-brand-ink/35 bg-brand-paper/70 px-7 font-semibold text-brand-ink hover:bg-brand-paper"
                >
                  <Link href="/how-it-works">{t("campusCtaWorkflow")}</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
