# Pemberitahuan Privasi BestHistory

_Terakhir diperbarui: 2026-08-20_

[← BestHistory](README.md) · [Semua bahasa](../LANGUAGES.md)

BestHistory adalah ekstensi local-first untuk mengatur riwayat browser.

## Data browsing
Riwayat, URL yang dikunjungi, judul halaman, metadata situs, tag, catatan, input pencarian, dan record Mode Privat diproses di perangkat dan tidak diunggah ke server akun BestHistory.

## Akun dan entitlement
Jika Anda login, BestHistory menggunakan infrastruktur akun untuk mengenali akun dan menentukan Free / Trial / Pro. Data dapat mencakup ID akun, email dan metadata autentikasi, bahasa pilihan, status dan masa berlaku trial/member/subscription, serta identifier penyedia pembayaran di masa depan.

## Mode Privat
URL privat, judul, dan kunjungan dienkripsi di perangkat. Kata sandi privat dan data privat yang sudah didekripsi tidak dikirim ke server.

## Backup
Backup dibuat lokal dan tidak diunggah otomatis oleh BestHistory. Record privat tetap terenkripsi; jangan menganggap seluruh bagian riwayat biasa di file tersebut terenkripsi secara penuh.

## Layanan pihak ketiga
Saat ini BestHistory menggunakan Supabase untuk autentikasi/entitlement dan Amazon SES untuk email autentikasi. Keduanya hanya memproses data yang diperlukan untuk akun dan pengiriman email, bukan riwayat browsing.

## Penghapusan
Data lokal dapat dihapus dari ekstensi. Logout menghapus sesi akun lokal tetapi tidak sengaja menghapus data organisasi riwayat lokal. Alur penghapusan akun dapat berkembang selama Beta.

## Kontak
Privasi: **besthistory@126.com**
