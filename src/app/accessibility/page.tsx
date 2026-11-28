"use client";

import { Ear, Eye, FileCheck, Keyboard } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { useTranslation } from "@/lib/i18n/use-translation";

export default function AccessibilityStatementPage() {
  const { isEn } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans">
      <SiteHeader />

      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl flex-1 space-y-10 px-4 py-12 outline-none sm:px-8"
      >
        <header className="space-y-3">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            {isEn
              ? "SONAR Digital Accessibility Commitment"
              : "Komitmen Aksesibilitas Digital SONAR"}
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {isEn
              ? "SONAR is engineered so reading, search, display adjustments, and review workflows can be operated independently via keyboard and screen readers."
              : "SONAR dirancang agar seluruh fungsi membaca, pencarian, pengaturan tampilan, dan peninjauan materi dapat dijalankan mandiri menggunakan keyboard dan pembaca layar secara inklusif."}
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3 rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand-mint text-brand-teal">
                <Keyboard className="size-5" aria-hidden="true" />
              </span>
              <h2 className="font-heading text-xl font-bold text-foreground">
                {isEn ? "Full Keyboard Navigation" : "Navigasi Keyboard Penuh"}
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {isEn
                ? "All pages provide skip links to main content, high-contrast focus rings, automated focus routing on page changes, and a table of contents that shifts focus directly to target blocks."
                : "Seluruh halaman menyediakan tautan lewati ke konten utama, indikator fokus kontras tinggi, manajemen fokus otomatis saat berpindah halaman, dan daftar isi yang langsung memindahkan fokus ke blok tujuan."}
            </p>
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-tint-blue text-brand-blue-strong">
                <Ear className="size-5" aria-hidden="true" />
              </span>
              <h2 className="font-heading text-xl font-bold text-foreground">
                {isEn ? "Screen Reader Compatibility" : "Kompatibilitas Pembaca Layar"}
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {isEn
                ? "Semantic structures use clean landmarks, a single h1 per page, tables with scope attributes, standard MathML for formulas, and live regions for status announcements."
                : "Struktur semantik menggunakan landmark jelas, satu heading utama per halaman, tabel dengan atribut scope, MathML standar untuk persamaan matematika, serta pengumuman live region untuk perubahan status penting."}
            </p>
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-tint-peach text-brand-ink">
                <Eye className="size-5" aria-hidden="true" />
              </span>
              <h2 className="font-heading text-xl font-bold text-foreground">
                {isEn ? "Low Vision Customization" : "Kustomisasi Tampilan Low Vision"}
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {isEn
                ? "Readers can choose Atkinson Hyperlegible, Lexend, or Inter fonts, adjust font size from 14px to 28px, tune line spacing and column width, enable high-contrast or warm paper modes, and reduce motion."
                : "Pengguna dapat memilih huruf Atkinson Hyperlegible, Lexend, atau Inter, menyesuaikan ukuran huruf 14px–28px, jarak baris, lebar kolom, mode kontras tinggi, latar kertas hangat, dan opsi pengurangan animasi."}
            </p>
          </div>

          <div className="space-y-3 rounded-2xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-tint-gold text-brand-ink">
                <FileCheck className="size-5" aria-hidden="true" />
              </span>
              <h2 className="font-heading text-xl font-bold text-foreground">
                {isEn ? "Human Verification & Source Versions" : "Verifikasi Manusia & Versi Sumber"}
              </h2>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {isEn
                ? "Volunteers verify the accuracy of text, formulas, tables, and image descriptions, while linking source PDF versions so updated materials are never confused with older ones."
                : "Volunteer meninjau keakuratan teks, rumus, tabel, dan deskripsi gambar, sambil menandai versi PDF sumber agar materi hasil perbaikan tidak tertukar dengan dokumen lama."}
            </p>
          </div>
        </div>

        <section
          aria-labelledby="shortcuts-heading"
          className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card"
        >
          <h2 id="shortcuts-heading" className="font-heading text-lg font-bold text-foreground">
            {isEn ? "Main Keyboard Shortcuts & Controls" : "Pintasan & Kontrol Navigasi Utama"}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 text-sm font-ui">
            <li className="flex items-center justify-between gap-2 rounded-xl bg-surface-subtle p-3">
              <span className="text-foreground">
                {isEn ? "Skip to main content" : "Lewati ke konten utama"}
              </span>
              <kbd className="rounded-md border border-border bg-card px-2 py-0.5 font-mono text-xs text-foreground">
                {isEn ? "Tab (top of page)" : "Tab (awal halaman)"}
              </kbd>
            </li>
            <li className="flex items-center justify-between gap-2 rounded-xl bg-surface-subtle p-3">
              <span className="text-foreground">
                {isEn ? "Quick page jump menu" : "Menu lompat cepat halaman"}
              </span>
              <kbd className="rounded-md border border-border bg-card px-2 py-0.5 font-mono text-xs text-foreground">
                Ctrl + K / ⌘ + K
              </kbd>
            </li>
            <li className="flex items-center justify-between gap-2 rounded-xl bg-surface-subtle p-3">
              <span className="text-foreground">
                {isEn ? "Navigate document headings" : "Navigasi antar subbab dokumen"}
              </span>
              <kbd className="rounded-md border border-border bg-card px-2 py-0.5 font-mono text-xs text-foreground">
                {isEn ? "H key (NVDA / JAWS)" : "Tombol H (NVDA / JAWS)"}
              </kbd>
            </li>
            <li className="flex items-center justify-between gap-2 rounded-xl bg-surface-subtle p-3">
              <span className="text-foreground">
                {isEn ? "Close dialog / menu" : "Tutup panel dialog / menu"}
              </span>
              <kbd className="rounded-md border border-border bg-card px-2 py-0.5 font-mono text-xs text-foreground">
                Esc
              </kbd>
            </li>
          </ul>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
