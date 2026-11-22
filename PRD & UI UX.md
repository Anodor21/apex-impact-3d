# Product Requirements Document (PRD) & Desain UI/UX: Game 3D Target Physics

Dokumen ini dirancang sebagai cetak biru (*blueprint*) siap pakai—baik untuk lampiran laporan tugas maupun sebagai acuan teknis saat memerintahkan AI membangun kode game 3D (menggunakan **Three.js** dan *physics engine* **Cannon-es / Rapier**).

---

## BAGIAN 1: PRODUCT REQUIREMENTS DOCUMENT (PRD)

### 1.1 Ringkasan Produk (Product Overview)
* **Judul Kerja:** *Apex Impact 3D*
* **Genre:** 3D Realistic Physics Puzzle / Target Demolition
* **Platform Target:** Web Browser (Desktop & Mobile) berbasis WebGL
* **Tujuan Permainan:** Pemain menembakkan proyektil (bola logam/batu) ke arah susunan struktur 3D untuk menjatuhkan atau menghancurkan seluruh **Target Inti** menggunakan jumlah amunisi yang terbatas.

### 1.2 Mekanisme Permainan Inti (Core Gameplay Mechanics)
1. **Sistem Bidik & Lontar (Aim & Launch):**
   * Pemain menekan dan menarik kursor/jari (*drag-and-release* seperti ketapel 3D) untuk mengatur sudut horizontal (kiri-kanan), sudut elevasi (atas-bawah), serta kekuatan lontaran.
   * **Trajectory Predictor:** Muncul garis titik-titik parabola 3D semi-transparan yang memprediksi lintasan awal bola sebelum dilepaskan.
2. **Simulasi Fisika Realistis (Rigid-Body Physics):**
   * Menggunakan gravitasi standar bumi ($9.8\text{ m/s}^2$) dengan perhitungan massa (*mass*), gesekan permukaan (*friction*), elastisitas pantulan (*restitution*), dan transfer momentum antarobjek.
   * **Reaksi Berantai (Chain Reaction):** Merobohkan balok penyangga di bagian bawah akan membuat struktur di atasnya runtuh secara alami akibat gravitasi.
3. **Variasi Material & Objek 3D:**

| Jenis Objek | Sifat Fisika & Massa | Perilaku Saat Terkena Tumbukan | Visual Realistis (PBR Material) |
| :--- | :--- | :--- | :--- |
| **Proyektil (Bola Besi)** | Berat (Massa: 5.0), pantulan rendah | Menembus material ringan, mendorong balok berat | Logam gelap (*metalness* tinggi, pantulan cahaya tajam) |
| **Balok Kayu (Wood)** | Sedang (Massa: 1.5), gesekan sedang | Terpental, bergeser, dan mudah roboh | Tekstur serat kayu matte (*roughness* 0.8) |
| **Panel Kaca (Glass)** | Ringan (Massa: 0.8), rapuh | Pecah/hancur berkeping-keping saat kecepatan tumbukan melewati batas tertentu | Transparan reflektif dengan efek kilau tepi |
| **Pilar Beton (Concrete)** | Sangat Berat (Massa: 6.0), gesekan tinggi | Sulit digeser; berfungsi sebagai dinding pelindung atau fondasi | Tekstur batu abu-abu kasar dengan bayangan tegas |
| **Target Inti (Core Target)** | Sedang (Massa: 1.2), objek tujuan utama | Level selesai jika seluruh Target Inti jatuh keluar dari platform arena | Kapsul/kristal bercahaya emas-merah (*emissive glow*) |

### 1.3 Sistem Level & Progresi (Level Progression)
Permainan terdiri dari tingkat kesulitan bertahap yang memperkenalkan elemen mekanik baru di setiap level:

| Level | Nama Stage | Susunan Arena & Tantangan | Jumlah Bola | Syarat 3 Bintang |
| :---: | :--- | :--- | :---: | :--- |
| **1** | *First Strike* | 1 menara kayu sederhana berisi 2 Target Inti di atas meja batu. | 3 Bola | Sisa minimal 2 bola |
| **2** | *Twin Towers* | 2 menara kayu terpisah dengan jembatan penghubung dan 3 Target Inti. | 4 Bola | Sisa minimal 2 bola |
| **3** | *Fragile Shield* | Target Inti dilindungi dinding kaca di depan dan pilar beton di samping. | 4 Bola | Sisa minimal 2 bola |
| **4** | *Pendulum Gate* | Rintangan balok berayun di depan struktur utama yang menghalangi tembakan lurus. | 5 Bola | Sisa minimal 2 bola |
| **5** | *The Fortress* | Struktur bertingkat gabungan beton, kayu, dan kaca dengan 4 Target Inti tersembunyi. | 5 Bola | Sisa minimal 2 bola |

* **Kondisi Menang:** Seluruh **Target Inti** jatuh melewati batas ketinggian lantai arena.
* **Kondisi Kalah:** Seluruh bola habis terpakai dan masih ada **Target Inti** yang bertahan di atas platform setelah 3 detik waktu tunggu fisika berhenti bergerak.

### 1.4 Spesifikasi Visual 3D Realistis (Art & Technical Specs)
* **Pencahayaan (Lighting):** Menggunakan kombinasi *Hemisphere Light* (cahaya langit dan pantulan tanah) serta *Directional Light* dengan resolusi peta bayangan tinggi (*Real-time Soft Shadows*) untuk memberikan kedalaman ruang.
* **Atmosfer & Latar Belakang:** Arena berada di atas platform terbuka di ketinggian (latar langit senja/pagi dengan kabut jarak jauh *exponential fog* agar batas cakrawala terlihat menyatu halus).
* **Kamera Dinamis (Dynamic Camera):**
  * *Fase Bidik:* Kamera berada tepat di belakang titik peluncuran bola.
  * *Fase Terbang:* Kamera meluncur mengikuti pergerakan bola dari sudut sedikit serong hingga terjadi tumbukan pertama.
  * *Fase Evaluasi:* Kamera mundur perlahan (*zoom out*) untuk memperlihatkan efek reruntuhan struktur secara menyeluruh.
* **Game Feel (Umpan Balik Sensorik):** Getaran kamera halus (*subtle screen shake*) saat bola menghantam beton atau memecahkan kaca, disertai efek partikel serpihan saat kaca hancur.

---

## BAGIAN 2: DESAIN UI/UX (USER INTERFACE & EXPERIENCE)

### 2.1 Prinsip Pengalaman Pengguna (UX Principles)
* **Live 3D Background (Zero-Friction):** Layar menu utama tidak menggunakan gambar statis, melainkan langsung menampilkan arena 3D level aktif dengan kamera yang berputar perlahan (*slow orbit*). Pemain langsung merasakan kualitas visual game sejak detik pertama.
* **Minimalist Diegetic HUD:** Selama bermain, elemen antarmuka dibuat transparan dan diletakkan di tepi layar agar area tengah sepenuhnya bersih untuk membidik objek 3D.
* **Alur Navigasi (User Flow):**
  `Main Menu` → `Level Select` → `Gameplay (Aim → Launch → Impact)` → `Modal Victory / Game Over`

### 2.2 Tata Letak & Wireframe Layar (Screen Layouts)

#### A. Layar Utama (Main Menu)
```text
+-----------------------------------------------------------------------+
|  [Icon Suara]                                        [Total Bintang]  |
|                                                                       |
|                                                                       |
|                          APEX IMPACT 3D                               |
|                     Realistic Physics Challenge                       |
|                                                                       |
|                        [   MULAI BERMAIN   ]                          |
|                        [    PILIH LEVEL    ]                          |
|                                                                       |
|           (Latar belakang: Kamera 3D berputar mengelilingi            |
|            menara target dengan pencahayaan realistis)                |
+-----------------------------------------------------------------------+
```

#### B. Layar Pilih Level (Level Select Modal)
```text
+-----------------------------------------------------------------------+
|  [ ← Kembali ]              PILIH LEVEL                               |
|                                                                       |
|    +-------------+   +-------------+   +-------------+                |
|    |   LEVEL 1   |   |   LEVEL 2   |   |   LEVEL 3   |                |
|    |    ★ ★ ★    |   |    ★ ★ ☆    |   |  [TERKUNCI] |                |
|    +-------------+   +-------------+   +-------------+                |
|                                                                       |
|    +-------------+   +-------------+                                  |
|    |   LEVEL 4   |   |   LEVEL 5   |                                  |
|    |  [TERKUNCI] |   |  [TERKUNCI] |                                  |
|    +-------------+   +-------------+                                  |
+-----------------------------------------------------------------------+
```

#### C. Layar Bermain (In-Game HUD)
```text
+-----------------------------------------------------------------------+
|  LEVEL 1                                            [ ↻ ]   [ || ]    |
|  Skor: 1.250                                        (Reset) (Pause)   |
|                                                                       |
|                         [ Target Inti 3D ]                            |
|                        [ Struktur Balok 3D ]                          |
|                              .  .  .  (Garis Prediksi Lintasan)      |
|                            .                                          |
|                          ( O )  <-- Bola Proyektil                    |
|                                                                       |
|  Target Tersisa: 2/2                        Sisa Bola:  (●) (●) (○)   |
+-----------------------------------------------------------------------+
```

#### D. Layar Hasil (Victory / Game Over Overlay)
```text
+-----------------------------------------------------------------------+
|                                                                       |
|                  +-------------------------------+                    |
|                  |        LEVEL SELESAI!         |                    |
|                  |                               |                    |
|                  |          ★    ★    ★          |                    |
|                  |                               |                    |
|                  |   Skor Kehancuran : 1.500     |                    |
|                  |   Bonus Sisa Bola : 1.000     |                    |
|                  |   Total Skor      : 2.500     |                    |
|                  |                               |                    |
|                  |   [ ULANGI ]   [ LANJUT → ]   |                    |
|                  +-------------------------------+                    |
|                                                                       |
+-----------------------------------------------------------------------+
```

### 2.3 Panduan Gaya Visual UI (UI Style Guide)
Agar antarmuka menyatu dengan nuansa 3D realistis dan terlihat modern, gunakan gaya **Dark Glassmorphism**:

| Elemen UI | Spesifikasi Desain | Tujuan UX |
| :--- | :--- | :--- |
| **Panel & Kartu** | Latar belakang hitam transparan (`rgba(15, 23, 42, 0.72)`) dengan efek blur (`backdrop-filter: blur(12px)`) dan garis tepi tipis putih transparan. | Menjaga keterbacaan teks tanpa memblokir pemandangan arena 3D di belakangnya. |
| **Warna Utama (Primary)** | Emas Hangat / Amber (`#F59E0B`) untuk tombol aksi utama (`MULAI`, `LANJUT`) dan ikon bintang. | Memberikan kontras tinggi dan menarik fokus mata pada aksi berikutnya. |
| **Warna Sekunder** | Putih Bersih (`#F8FAFC`) untuk judul dan Abu-abu Terang (`#94A3B8`) untuk teks informasi sekunder. | Memastikan keterbacaan instan dalam waktu singkat saat bermain. |
| **Tipografi** | Sans-serif geometris modern (seperti *Inter*, *Poppins*, atau *Montserrat*) dengan ketebalan *Bold* untuk angka skor dan level. | Terlihat bersih, rapi, dan proporsional baik di layar laptop maupun ponsel. |
| **Umpan Balik Interaksi** | Tombol membesar halus (`scale(1.04)`) saat diarahkan kursor; indikator sisa bola berdenyut saat tinggal 1 bola terakhir. | Memberi sinyal visual yang jelas tanpa mengganggu konsentrasi membidik. |