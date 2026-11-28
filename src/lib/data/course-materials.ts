export interface SharedReviewedMaterial {
  id: string;
  courseId: string;
  title: string;
  category: "Modul" | "Slide" | "Handout" | "Formula Sheet" | "Tugas";
  sourceFilename: string;
  sourceVersion: string;
  reviewedDate: string;
  reviewerName: string;
  reviewerRole: string;
  reviewerNotes: string;
  pageCount: number;
  equationsCount: number;
  tablesCount: number;
  figuresCount: number;
  sharingPermission: "course_enrolled" | "public_in_course" | "restricted";
  hasNewerSourceVersion: boolean;
  newerSourceVersion?: string;
  versionNotice?: string;
  audioDurationMinutes: number;
  tags: string[];
}

export const SHARED_REVIEWED_MATERIALS: SharedReviewedMaterial[] = [
  {
    id: "doc-cs-01",
    courseId: "cs-201",
    title: "Modul 04: Binary Search Trees & AVL Balancing",
    category: "Modul",
    sourceFilename: "CS201_Modul_04_BST_v2.1.pdf",
    sourceVersion: "v2.1",
    reviewedDate: "18 November 2026",
    reviewerName: "Dewi Sartika, S.Kom.",
    reviewerRole: "Senior Teaching Assistant & Volunteer Reviewer",
    reviewerNotes: "Seluruh 14 pohon biner, rumus keseimbangan, dan tabel rotasi telah diverifikasi MathML dan deskripsi taktilnya. Sangat akurat untuk screen reader.",
    pageCount: 24,
    equationsCount: 12,
    tablesCount: 3,
    figuresCount: 6,
    sharingPermission: "course_enrolled",
    hasNewerSourceVersion: false,
    audioDurationMinutes: 32,
    tags: ["Tree", "AVL", "Data Structures", "Verified MathML"],
  },
  {
    id: "doc-cs-02",
    courseId: "cs-201",
    title: "Slide 07: Graph Traversal: BFS dan DFS",
    category: "Slide",
    sourceFilename: "CS201_Graph_BFS_DFS_v1.0.pdf",
    sourceVersion: "v1.0",
    reviewedDate: "16 November 2026",
    reviewerName: "Dewi Sartika, S.Kom.",
    reviewerRole: "Volunteer Reviewer",
    reviewerNotes: "Urutan penelusuran graf dan matriks ketetanggaan telah diformat dalam tabel semantik. Navigasi heading per slide sudah diurutkan logis.",
    pageCount: 18,
    equationsCount: 4,
    tablesCount: 2,
    figuresCount: 8,
    sharingPermission: "course_enrolled",
    hasNewerSourceVersion: false,
    audioDurationMinutes: 24,
    tags: ["Graph", "BFS", "DFS", "Algorithms"],
  },
  {
    id: "doc-math-01",
    courseId: "math-105",
    title: "Bab 03: Turunan Parsial, Gradien, dan Matriks Hessian",
    category: "Modul",
    sourceFilename: "MATH105_Bab03_Turunan_Parsial_v1.2.pdf",
    sourceVersion: "v1.2",
    reviewedDate: "15 November 2026",
    reviewerName: "Kevin Sanjaya, S.Si.",
    reviewerRole: "Graduate Teaching Assistant (Matematika)",
    reviewerNotes: "32 rumus turunan berarah dan determinan Hessian dinarasikan lengkap dengan narasi audio bilingual. Simbol nabla dan turunan parsial dipastikan standar.",
    pageCount: 32,
    equationsCount: 32,
    tablesCount: 1,
    figuresCount: 4,
    sharingPermission: "course_enrolled",
    hasNewerSourceVersion: false,
    audioDurationMinutes: 45,
    tags: ["Calculus", "Partial Derivatives", "Gradient", "Hessian"],
  },
  {
    id: "doc-math-02",
    courseId: "math-105",
    title: "Ringkasan Formula UTS Kalkulus Multivariabel",
    category: "Formula Sheet",
    sourceFilename: "MATH105_Formula_UTS_v1.0.pdf",
    sourceVersion: "v1.0",
    reviewedDate: "10 November 2026",
    reviewerName: "Kevin Sanjaya, S.Si.",
    reviewerRole: "Volunteer Reviewer",
    reviewerNotes: "Formula integral lipat dua dan transformasi koordinat kutub sudah tervalidasi. Siap digunakan untuk persiapan ujian tengah semester.",
    pageCount: 8,
    equationsCount: 28,
    tablesCount: 2,
    figuresCount: 2,
    sharingPermission: "course_enrolled",
    hasNewerSourceVersion: true,
    newerSourceVersion: "v1.1 (diunggah dosen 20 Nov 2026)",
    versionNotice: "Perhatian Versi Sumber: Dosen telah mengunggah pembaruan v1.1 dengan tambahan aturan rantai multivariabel. Materi review aktif ini diverifikasi berdasarkan v1.0. Volunteer sedang menjadwalkan review ulang untuk v1.1.",
    audioDurationMinutes: 15,
    tags: ["UTS", "Cheat Sheet", "Formulas", "Needs Update Recheck"],
  },
  {
    id: "doc-stat-01",
    courseId: "stat-210",
    title: "Handout 02: Distribusi Probabilitas Diskrit & Kontinu",
    category: "Handout",
    sourceFilename: "STAT210_Distribusi_Probabilitas_v2.0.pdf",
    sourceVersion: "v2.0",
    reviewedDate: "12 November 2026",
    reviewerName: "Sarah Jenkins, S.Kom.",
    reviewerRole: "Senior Teaching Assistant & Volunteer Reviewer",
    reviewerNotes: "Fungsi kepadatan probabilitas (PDF) dan fungsi distribusi kumulatif (CDF) untuk Gaussian, Poisson, dan Gamma telah diverifikasi. Kurva distribusi dilengkapi deskripsi taktil.",
    pageCount: 28,
    equationsCount: 22,
    tablesCount: 4,
    figuresCount: 5,
    sharingPermission: "course_enrolled",
    hasNewerSourceVersion: false,
    audioDurationMinutes: 38,
    tags: ["Probability", "Gaussian", "Poisson", "Statistics"],
  },
];

export function getSharedMaterialsByCourse(courseId: string): SharedReviewedMaterial[] {
  return SHARED_REVIEWED_MATERIALS.filter((m) => m.courseId === courseId);
}

export function getSharedMaterialById(id: string): SharedReviewedMaterial | undefined {
  return SHARED_REVIEWED_MATERIALS.find((m) => m.id === id);
}
