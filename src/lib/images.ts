export interface AccessibleImage {
  src: string;
  alt: string;
  caption?: string;
  category?: string;
}

export const APP_IMAGES = {
  heroBraille: {
    src: "/images/hero_braille_display.jpg",
    alt: "Tampilan jarak dekat jari-jemari pengguna tunanetra membaca baris huruf timbul pada perangkat refreshable braille display di depan layar monitor komputer yang menampilkan materi digital.",
    caption: "Navigasi materi kuliah mandiri dengan refreshable braille display dan screen reader.",
    category: "hero",
  },
  quoteBraille: {
    src: "/images/quote_braille_hands.jpg",
    alt: "Jari-jemari seorang pembaca tunanetra menyusuri deretan titik timbul pada halaman buku cetak braille dengan pencahayaan lembut.",
    caption: "Menjembatani literasi taktil dan materi perkuliahan digital modern.",
    category: "editorial",
  },
  featureAudio: {
    src: "/images/feature_audio.jpg",
    alt: "Mahasiswi tersenyum hangat sambil mengenakan headphone berkabel untuk mendengarkan narasi audio materi perkuliahan terstruktur.",
    caption: "Narasi audio natural berbahasa Indonesia dan Inggris per blok bacaan.",
    category: "feature",
  },
  featureScan: {
    src: "/images/feature_scan.jpg",
    alt: "Buku teks perkuliahan terbuka lebar dengan lembaran halaman berlatar langit biru, menggambarkan konversi dokumen cetak dan PDF menjadi teks digital terbuka.",
    caption: "Ekstraksi OCR dan restrukturisasi semantik dari PDF hasil scan.",
    category: "feature",
  },
  featureStudy: {
    src: "/images/feature_study.jpg",
    alt: "Mahasiswa dan volunteer duduk mengelilingi meja belajar kampus, berkolaborasi meninjau dan memverifikasi keakuratan materi perkuliahan bersama.",
    caption: "Kolaborasi verifikasi antara mahasiswa dan volunteer dalam satu mata kuliah.",
    category: "feature",
  },
  featureBraille: {
    src: "/images/feature_braille.jpg",
    alt: "Tampilan makro deretan titik timbul huruf braille pada kertas krem di bawah cahaya hangat, melambangkan keterbacaan taktil dan dukungan perangkat braille.",
    caption: "Kompatibilitas penuh dengan refreshable braille display dan screen reader.",
    category: "feature",
  },
  testimonialStudent1: {
    src: "/images/testimonial_1.jpg",
    alt: "Foto potret Maya Lin, mahasiswi Ilmu Komputer, tersenyum ramah di ruang terbuka kampus.",
    name: "Maya Lin",
    role: "Mahasiswi Ilmu Komputer (Tunanetra Total)",
    university: "Universitas Indonesia",
    quote:
      "Sebelum ada SONAR, rumus kalkulus dan struktur pohon biner di PDF slide selalu dibacakan 'image graphic' oleh NVDA. Sekarang semua rumus dibacakan runtut dalam MathML dan bahasa Indonesia yang natural.",
    rating: 5,
  },
  testimonialStudent2: {
    src: "/images/testimonial_2.jpg",
    alt: "Foto David Pratama bersama rekan belajar menggunakan laptop di halaman rumput kampus.",
    name: "David Pratama",
    role: "Mahasiswa Matematika (Low Vision)",
    university: "Institut Teknologi Bandung",
    quote:
      "Fitur warm paper canvas, font Atkinson Hyperlegible, dan navigasi heading di SONAR membuat saya tidak cepat lelah saat membaca jurnal puluhan halaman. Tanya AI dengan sitasi dokumen sangat membantu persiapan ujian.",
    rating: 5,
  },
  testimonialVolunteer: {
    src: "/images/testimonial_3.jpg",
    alt: "Foto potret Sarah Jenkins, S.Kom., asisten pengajar dan volunteer reviewer di depan papan tulis kelas.",
    name: "Sarah Jenkins, S.Kom.",
    role: "Asisten Pengajar & Volunteer Reviewer",
    university: "Universitas Gadjah Mada",
    quote:
      "Review workbench SONAR memudahkan saya memeriksa LaTeX formula dan deskripsi diagram secara terstruktur. Sekali materi saya setujui, seluruh mahasiswa sekelas langsung bisa menggunakannya kembali.",
    rating: 5,
  },
  courseCS: {
    src: "/images/course_cs.jpg",
    alt: "Layar laptop menampilkan potongan kode pemrograman terstruktur di atas meja kerja dengan pencahayaan kontras yang jelas.",
    caption: "CS 201: Struktur Data dan Algoritma",
  },
  courseMath: {
    src: "/images/course_math.jpg",
    alt: "Ilustrasi papan tulis akademis berisi grafik vektor ruang, koordinat kartesius, dan persamaan matematika kalkulus multivariabel.",
    caption: "MATH 105: Kalkulus Multivariabel & Aljabar Linier",
  },
  courseStat: {
    src: "/images/course_stat.jpg",
    alt: "Layar tablet menampilkan grafik garis tren dan diagram lingkaran distribusi data statistik dengan label angka yang terukur.",
    caption: "STAT 210: Teori Probabilitas & Inferensi Statistik",
  },
} as const;
