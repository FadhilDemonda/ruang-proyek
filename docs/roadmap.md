# Roadmap & Backlog — Ruang Proyek

Daftar rencana fitur dan peningkatan yang sudah disepakati untuk dikerjakan bertahap.

## 1. PWA Quick Access & Pengingat (Mobile)
- [ ] **Halaman Quick Note (`/quick-note`)**
  - Tampilan ringan khusus HP: langsung fokus ke input judul + isi catatan + pilih proyek/warna + tombol Simpan.
  - Menyertakan ringkasan kecil pengingat/tenggat hari ini di bagian atas/bawah.
  - Bisa dipasang sebagai ikon 1-tap tersendiri di home screen HP (*Add to Home screen → Create shortcut* di Android / *Add to Home Screen* di iOS).
- [ ] **PWA App Shortcuts (`app/manifest.ts`)**
  - Tambahkan `shortcuts` untuk: `Quick Note`, `Tambah Tugas`, dan `Kalender`.
- [ ] **Web Share Target (`app/manifest.ts`)**
  - Dukungan terima teks/link dari menu *Share* Android langsung ke form Quick Note.
- [ ] **Pengingat Notifikasi (Opsional / Fase Lanjut)**
  - Web Push Notification via Firebase Cloud Messaging (FCM) agar pengingat tetap muncul di panel notifikasi HP saat aplikasi ditutup.

## 2. Redesign Halaman Notes (Gaya Kartu & Folder + Editor Editorial)
- [x] **Review Mockup UI**
  - **Daftar Notes**: Bagian **Folder / Proyek** dengan kartu pastel + kartu putus-putus `+ Proyek baru`, serta bagian **Catatan Saya** dengan kartu berwarna, filter waktu (`Semua`, `Hari Ini`, `Minggu Ini`, `Bulan Ini`), filter warna, quick-add warna (color dots), dan kartu `+ Catatan baru`.
  - **Isi / Detail Notes**: Kanvas kertas netral tenang bergaya editorial — judul serif besar, chip metadata berbentuk pil (tanggal/jam, folder/proyek, warna kartu), tombol navigasi atas minimalis, toggle `Tulis | Baca` dengan heading berawalan `#` lembut, daftar poin & checklist interaktif, dan dock format tipis di bawah.
  - Dukungan penuh Light/Dark mode dan tampilan Mobile PWA.
- [x] **Keputusan Skema Data**
  - Folder terhubung langsung ke daftar **Proyek** (`projectId`).
  - Menambahkan properti opsional `color` (`butter`, `blush`, `sky`, `sage`) pada tipe `Note` (kompatibel penuh dengan data lama).
- [x] **Implementasi & Pengujian E2E**
  - Diperbarui di `app/NotesView.tsx`, `app/styles/projects-notes.css`, `app/types.ts`, `app/useWorkspaceStore.ts`, `app/WorkspaceApp.tsx`, `app/WorkspaceIcon.tsx`, dan diverifikasi lulus `tsc`, `next build`, serta `tests/notes.spec.ts` + `tests/productivity-features.spec.ts`.
