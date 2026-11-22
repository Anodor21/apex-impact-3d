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


## Catatan
Link Web: https://anodor21.github.io/apex-impact-3d/
Game ini dibuat untuk keperluan Tugas
