import type { Metadata, Viewport } from "next";
import {
  Plus_Jakarta_Sans,
  Poppins,
  Atkinson_Hyperlegible,
} from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { SkipLink } from "@/components/accessibility/SkipLink";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-atkinson-hyperlegible",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SONAR | Accessible Course Materials for Blind Students",
    template: "%s | SONAR",
  },
  description:
    "SONAR mengonversi PDF materi kuliah, slide scan, tabel, dan persamaan matematika menjadi materi terstruktur yang siap dibaca screen reader dengan audio natural, asistensi AI, dan verifikasi volunteer.",
  applicationName: "SONAR",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1918" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${poppins.variable} ${atkinson.variable}`}
    >
      <body className="min-h-screen bg-background font-sans text-foreground antialiased selection:bg-accent-teal/20 selection:text-foreground">
        <AppProviders>
          <SkipLink targetId="main-content" />
          <div className="relative flex min-h-screen flex-col">{children}</div>
        </AppProviders>
      </body>
    </html>
  );
}
