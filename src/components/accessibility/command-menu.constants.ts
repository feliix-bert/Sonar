import {
  BookOpen,
  CheckSquare,
  CircleHelp,
  FileUp,
  Home,
  Info,
  LayoutDashboard,
  Settings,
  Shield,
  ShieldCheck,
} from "lucide-react";
import type { CommandRouteItem } from "./command-menu.types";

export const COMMAND_ROUTES: CommandRouteItem[] = [
  {
    label: "Beranda",
    href: "/",
    icon: Home,
    keywords: "beranda home utama landing sonar index",
  },
  {
    label: "Dashboard Mahasiswa",
    href: "/dashboard",
    icon: LayoutDashboard,
    keywords: "dashboard mahasiswa ikhtisar kelas bacaan aktif",
  },
  {
    label: "Mata Kuliah & Materi Reusable",
    href: "/courses",
    icon: BookOpen,
    keywords: "courses mata kuliah materi silabus kelas pelajaran daftar",
  },
  {
    label: "Pindai Materi Kuliah",
    href: "/upload",
    icon: FileUp,
    keywords: "upload unggah scan pindai dokumen berkas pdf ocr materi baru mata kuliah",
  },
  {
    label: "Accessible Reader",
    href: "/reader",
    icon: BookOpen,
    keywords: "reader baca pembaca buku asistif dokumen text audio narasi studio",
  },
  {
    label: "Antrean Review Volunteer",
    href: "/review",
    icon: CheckSquare,
    keywords: "review antrean volunteer verifikasi koreksi audit peninjauan",
  },
  {
    label: "Pengaturan Membaca & Akun",
    href: "/settings",
    icon: Settings,
    keywords: "settings pengaturan preferensi akun font kontras tema konfigurasi",
  },
  {
    label: "Konsol Administrasi",
    href: "/admin",
    icon: Shield,
    keywords: "admin administrasi kelola konsol sistem pengguna",
  },
  {
    label: "Cara Kerja SONAR",
    href: "/how-it-works",
    icon: Info,
    keywords: "how it works cara kerja panduan info alur",
  },
  {
    label: "Pernyataan Aksesibilitas",
    href: "/accessibility",
    icon: ShieldCheck,
    keywords: "accessibility aksesibilitas wcag screen reader disabilitas",
  },
  {
    label: "Pusat Bantuan",
    href: "/help",
    icon: CircleHelp,
    keywords: "help bantuan faq panduan kontak support",
  },
];
