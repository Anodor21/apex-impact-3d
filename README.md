# Apex Impact 3D

Game 3D bertema **target demolition / physics puzzle** untuk browser. Pemain menembakkan bola besi ke susunan struktur (kayu, kaca, beton) untuk menjatuhkan semua **Target Inti** dengan jumlah bola terbatas.

Dibangun mengikuti dokumen `PRD & UI_UX Design - Apex Impact 3D.md` di folder ini.

---

## Fitur

- **Fisika rigid-body realistis** memakai cannon.js: massa, gesekan, pantulan, dan reaksi berantai saat struktur runtuh.
- **Bidik dan lontar** dengan tarik-lepas (drag and release), plus **trajectory predictor** berupa titik-titik parabola.
- **Material berbeda**:
  - Bola besi (berat, pantulan rendah)
  - Balok kayu (sedang, mudah roboh)
  - Panel kaca (ringan, pecah + partikel saat tumbukan kencang)
  - Pilar beton (sangat berat, sebagai pelindung/fondasi)
  - Target inti (kristal bercahaya, tujuan utama)
- **5 level** dengan susunan dan tingkat kesulitan bertahap.
- **Kamera dinamis**: fase bidik, fase terbang mengikuti bola, fase evaluasi (zoom out).
- **Game feel**: screen shake saat tumbukan dan partikel serpihan kaca.
- **UI dark glassmorphism** dengan aksen amber: menu utama, pilih level, HUD, hasil menang/kalah, jeda.
- **Sistem bintang dan progres** tersimpan di browser (localStorage).
- **Efek suara sintetis** (WebAudio) dengan tombol mute.
- **Responsif** dan mendukung mouse maupun layar sentuh.
- **Offline**: three.js dan cannon.js disimpan lokal di folder `lib/`.

---

## Cara Menjalankan

1. Buka `apex-impact-3d.html` di browser modern (Chrome, Edge, Firefox, atau Safari).
2. Klik **MULAI BERMAIN** atau **PILIH LEVEL**.

Tidak perlu server atau instalasi. Semua library bersifat lokal.

> Jika tampilan lama muncul setelah update, lakukan hard refresh dengan `Ctrl + F5` (Windows) atau `Cmd + Shift + R` (Mac) untuk membersihkan cache.

Opsional, jika ingin menjalankan lewat server lokal:

```bash
# dari folder D:\DKP\game
python -m http.server 8000
# lalu buka http://localhost:8000/apex-impact-3d.html
```

---

## Kontrol

| Aksi | Kontrol |
| --- | --- |
| Bidik dan lontar bola | Tarik lalu lepas (mouse atau sentuh) |
| Ulangi level | Tombol `↻` di HUD atau tombol `R` |
| Jeda / lanjut | Tombol `II` di HUD atau `Esc` |
| Aktifkan / matikan suara | Tombol ikon speaker di menu |

Cara membidik: tarik ke arah sasaran. Semakin jauh tarikan, semakin kuat lontaran. Gerakan horizontal mengatur sudut kiri-kanan, gerakan vertikal mengatur elevasi. Garis titik memprediksi lintasan.

---

## Struktur File

```
D:\DKP\game\
├── apex-impact-3d.html          # Halaman game (buka ini)
├── game.js                      # Seluruh logika game
├── README.md                    # Dokumen ini
├── PRD & UI_UX Design - Apex Impact 3D.md
└── lib\
    ├── three.min.js             # three.js r128 (render 3D)
    └── cannon.min.js            # cannon.js 0.6.2 (fisika)
```

---

## Daftar Level

| Level | Nama | Tantangan | Bola |
| :---: | --- | --- | :---: |
| 1 | First Strike | Menara kayu sederhana dengan 2 target di atas meja batu | 3 |
| 2 | Twin Towers | Dua menara terpisah dengan jembatan penghubung, 3 target | 4 |
| 3 | Fragile Shield | Target dilindungi dinding kaca dan pilar beton | 4 |
| 4 | Pendulum Gate | Balok berayun menghalangi tembakan lurus | 5 |
| 5 | The Fortress | Struktur bertingkat beton, kayu, kaca, 4 target | 5 |

**Menang:** semua target inti jatuh atau keluar dari platform.
**Kalah:** bola habis dan masih ada target yang bertahan.

---

## Skor dan Bintang

- **Skor Kehancuran**: bertambah saat balok bergeser, kaca pecah, dan target tumbang.
- **Bonus Sisa Bola**: 500 poin per bola yang belum terpakai saat menang.
- **Bintang**:
  - 3 bintang: menang dengan sisa minimal 2 bola
  - 2 bintang: menang dengan sisa 1 bola
  - 1 bintang: menang dengan bola habis
- Bintang terbaik per level disimpan dan membuka level berikutnya.

---

## Teknologi

- **three.js r128** untuk rendering 3D (PBR material, shadow, fog, sky shader).
- **cannon.js 0.6.2** untuk simulasi fisika.
- **HTML, CSS, JavaScript** murni tanpa build step atau framework.

---

## Troubleshooting

- **Layar "Menyiapkan arena 3D..." terasa lama**: pastikan memakai versi terbaru file ini. Versi lama memuat Google Fonts eksternal yang bisa memblokir render. Lakukan hard refresh.
- **Gerakan lambat / patah-patah**: aktifkan akselerasi hardware (GPU) di pengaturan browser. Game memakai WebGL; software rendering akan jauh lebih lambat.
- **Suara tidak keluar**: browser menahan audio sampai ada interaksi pengguna. Klik tombol mulai atau ikon suara terlebih dahulu.
- **Progres bintang hilang**: data disimpan di localStorage browser. Menghapus data situs akan menghapus progres.

---

## Catatan

Game ini dibuat untuk keperluan tugas (Case DKP). Silakan modifikasi level, fisika, atau tampilan sesuai kebutuhan. Definisi level ada di array `LEVELS` dalam `game.js`.
