# BestHistory

<p align="center"><img src="../../assets/besthistory-icon.png" alt="BestHistory" width="112" /></p>
<p align="center"><strong>Ubah riwayat browser menjadi kumpulan situs yang benar-benar bisa Anda temukan lagi.</strong></p>

<p align="center">
[简体中文](../../README.md) · [繁體中文](../zh-TW/README.md) · [English](../en/README.md) · [日本語](../ja/README.md) · [한국어](../ko/README.md) · [Español](../es/README.md) · [Português](../pt/README.md) · [Français](../fr/README.md) · [Deutsch](../de/README.md) · [Italiano](../it/README.md) · [Nederlands](../nl/README.md) · [Русский](../ru/README.md) · [العربية](../ar/README.md) · [हिन्दी](../hi/README.md) · Bahasa Indonesia · [Türkçe](../tr/README.md) · [বাংলা](../bn/README.md) · [Tiếng Việt](../vi/README.md)
</p>

<p align="center"><a href="https://github.com/renboxue/BestHistory/releases/tag/v0.1.0-beta"><strong>⬇️ Unduh Chrome Beta v0.1.0</strong></a> · <a href="INSTALL.md">Instalasi</a> · <a href="../LANGUAGES.md">Dokumentasi dalam 18 bahasa</a></p>

## Sebelum mulai: mengapa BestHistory dibuat

BestHistory adalah alat kecil yang saya bangun sebagai pengembang independen karena saya sendiri terus mengalami masalah yang sama.

Saya memakai situs yang sangat berguna, lalu beberapa hari kemudian membutuhkannya lagi dan tidak ingat namanya. Kadang saya hanya ingat “pernah melihat ini di suatu situs”, tetapi tidak tahu halaman tepatnya. Karena takut tidak akan menemukannya lagi, saya membiarkan terlalu banyak tab dan jendela terbuka, menyematkan situs, dan memasukkan lebih banyak lagi ke bookmark. Lama-lama saya punya riwayat, tab tersemat, bookmark, dan puluhan halaman yang tidak berani saya tutup — tetapi mencari situs lama tetap sulit.

Saya kemudian sadar: saya tidak membutuhkan daftar riwayat yang sekadar lebih cantik.

Saya membutuhkan sesuatu yang lebih dekat dengan cara kita mengingat:

**saya bisa lupa judul halaman dan tanggalnya, tetapi biasanya masih ingat jenis situsnya dan untuk apa saya memakainya.**

Dari situlah BestHistory lahir.

> **Saya ingin Anda berani menutup tab yang tetap terbuka hanya karena takut tidak bisa menemukannya lagi.**  
> Saat benar-benar dibutuhkan, BestHistory seharusnya membantu Anda kembali ke sana.

BestHistory masih merupakan proyek pribadi yang sangat awal. Jika ini juga menyelesaikan masalah Anda, itu sangat berarti. Saya juga benar-benar ingin tahu bagian mana yang berguna, mana yang merepotkan, dan apa yang Anda harap dapat diselesaikan selanjutnya.

<p align="center"><img src="../../assets/screenshots/home.webp" alt="BestHistory situs" width="100%" /></p>
<p align="center"><sub>Dari ribuan halaman, kembali ke pertanyaan yang lebih sederhana: “situs apa saja yang pernah saya gunakan?”</sub></p>

---

## Apa bedanya dengan riwayat browser biasa?

### 1. Mulai dari situs, bukan puluhan ribu halaman

Riwayat biasa menampilkan setiap kunjungan sebagai baris terpisah. Jika Anda membuka banyak halaman dalam satu situs, satu situs bisa memenuhi layar.

BestHistory terlebih dahulu mengelompokkan riwayat berdasarkan **situs web**. Anda dapat melihat situs terbaru, yang paling sering digunakan, waktu kunjungan terakhir, serta halaman spesifik yang pernah dibuka di dalam situs itu.

### 2. Beberapa cara mengurutkan

- **Terbaru**
- **Paling sering dikunjungi**
- **Nama**
- **Disematkan**
- tampilan terpisah seperti **Belum diatur / Tong Sampah / Situs privat**

### 3. Tag Anda sendiri

Situs yang bagi orang lain adalah “alat” mungkin bagi Anda adalah “pekerjaan”. Situs itu juga bisa sekaligus masuk “desain”, “AI”, dan “pakai lagi nanti”.

BestHistory mendukung **tag kustom** dan beberapa tag untuk satu situs. Tujuannya bukan membuat sistem arsip sempurna, tetapi memberi lebih banyak jalan untuk menemukan kembali sesuatu saat berbulan-bulan kemudian Anda hanya ingat kira-kira fungsinya.

### 4. Timeline yang melipat halaman dari situs yang sama

Kadang kita tetap ingin menjawab: “kemarin sore saya membuka apa?”

Timeline BestHistory mengelompokkan halaman berurutan dari situs yang sama dan hanya membukanya ketika detail diperlukan.

<p align="center"><img src="../../assets/screenshots/timeline.webp" alt="Timeline BestHistory yang dapat dilipat" width="100%" /></p>
<p align="center"><sub>Halaman dari situs yang sama tetap bersama, sehingga timeline terasa seperti perjalanan browsing, bukan dinding judul halaman.</sub></p>

### 5. Deskripsi yang hanya perlu Anda pahami

Nama resmi situs tidak selalu mengingatkan saya mengapa saya menggunakannya. Karena itu Anda dapat menambahkan nama, catatan, atau deskripsi sendiri:

> “Situs yang saya pakai untuk mengubah PDF menjadi gambar”
>
> “Referensi yang saya temukan untuk ilustrasi anak”
>
> “Alat kecil untuk melihat harga lama”

Kata-kata itu juga dapat dicari nanti. Deskripsi Anda sendiri sering lebih dekat dengan ingatan nyata dibanding judul resmi.

<p align="center"><img src="../../assets/screenshots/site-detail.webp" alt="Detail, tag, dan catatan BestHistory" width="100%" /></p>

---

## Mode Privat: riwayat yang ingin saya ingat, tetapi tidak ingin saya biarkan terlihat

Ada situs yang tidak ingin kita “lupakan”; kita hanya tidak ingin situs itu bercampur dengan riwayat biasa dan mudah terlihat oleh orang lain.

**Mode Privat (Pro)** mengenkripsi URL privat, judul, dan kunjungan secara lokal. Data hanya terlihat setelah Anda memasukkan kata sandi privat yang Anda tetapkan.

Jika Anda secara eksplisit mengizinkan BestHistory berjalan di mode incognito, kunjungan tersebut juga dapat disimpan dalam bentuk terenkripsi. Data itu tidak bercampur dengan daftar biasa dan tetap tersembunyi saat Mode Privat terkunci.

> **Situs yang tidak nyaman dibiarkan di riwayat biasa tetap dapat diingat BestHistory secara diam-diam.**

Data privat tetap berada di perangkat. Server BestHistory tidak menyimpan URL privat, judul, riwayat privat, atau kata sandi Anda.

---

## Pencarian, sematkan, dan Tong Sampah

Pencarian menggunakan situs, domain, tag, catatan, dan judul halaman. Bahkan jika Anda benar-benar lupa nama situsnya, ingatan tentang sesuatu yang pernah Anda lihat di sana dapat membantu menemukannya lagi.

Situs yang sering digunakan dapat disematkan. Situs yang tidak ingin Anda lihat sekarang dapat masuk ke **Tong Sampah** tanpa langsung dihapus; nanti bisa dipulihkan atau dihapus permanen.

Mengatur riwayat tidak seharusnya memaksa keputusan permanen setiap saat.

---

## Backup, restore, dan pindah antar-browser

Data organisasi BestHistory terutama disimpan secara lokal.

Satu file `.bhbackup` memungkinkan data dipindahkan dan digabungkan antara komputer, instalasi, perangkat, dan browser. Restore menggunakan safe merge, bukan menimpa seluruh keadaan saat ini secara buta.

Data Mode Privat tetap terenkripsi di dalam backup dan membutuhkan kata sandi lama.

> Saat ini, “sinkronisasi antar-browser” berarti transfer dan merge lewat backup lokal. BestHistory **tidak mengunggah seluruh riwayat browsing ke cloud** untuk sinkronisasi real-time.

Ini disengaja: saya ingin BestHistory menjadi alat **local-first** terlebih dahulu.

---

## Privasi, Free, dan Pro

Server BestHistory tidak menyimpan riwayat browsing, URL, judul, tag, catatan, pencarian, data privat, kunci enkripsi, atau isi `.bhbackup`.

Jika Anda login, server terutama mengelola akun, autentikasi, dan hak Free / Trial / Pro. Detail ada di [PRIVACY.md](PRIVACY.md).

Fitur lokal utama dapat digunakan **tanpa login**. Selama Beta, akun baru saat ini mendapat **uji coba Pro 30 hari**. Fitur Pro utama saat ini adalah Mode Privat.

---

## Antarmuka dan dokumentasi dalam 18 bahasa

<p align="center"><img src="../../assets/screenshots/languages.webp" alt="BestHistory 18 bahasa" width="100%" /></p>

README, instalasi, privasi, FAQ, keamanan, changelog, dan Release Note juga tersedia dalam 18 bahasa. Lihat [indeks bahasa](../LANGUAGES.md).

---

## Ini baru permulaan

BestHistory dibuat karena saya sendiri takut menutup tab lalu tidak bisa menemukan situsnya lagi.

Sekarang BestHistory sudah dapat membantu menemukan kembali situs setelah ditutup. Saya ingin terus fokus pada masalah inti yang sama: menutup tab yang tidak perlu dengan lebih tenang dan mengatur situs yang benar-benar kita gunakan dengan lebih mudah, bukan menambah fitur hanya demi jumlah fitur.

Jika BestHistory membantu Anda, saya sangat menghargai ⭐ Star, Issue saat ada masalah, atau sekadar cerita tentang cara Anda mengelola riwayat, bookmark, dan terlalu banyak tab. Untuk feedback privat: **besthistory@126.com**.

Jangan masukkan URL privat, kata sandi, riwayat privat, atau backup penuh ke Issue publik.

---

## Instalasi Beta

**[⬇️ BestHistory v0.1.0 Beta untuk Chrome](https://github.com/renboxue/BestHistory/releases/tag/v0.1.0-beta)**

Saat ini masih manual melalui **Developer mode → Load unpacked**. Lihat [INSTALL.md](INSTALL.md).

---

**Kode sumber aplikasi BestHistory bersifat proprietary dan tidak dipublikasikan di repositori publik ini.**

Versi saat ini: **v0.1.0 Beta** · [CHANGELOG.md](CHANGELOG.md)
