# Ruang Proyek

Aplikasi proyek pribadi. Tanpa konfigurasi Firebase, aplikasi langsung berjalan dalam mode lokal dan menyimpan data di browser perangkat ini. Data lokal tidak otomatis dikirim ke Firebase. Jangan hapus data situs browser sebelum mencadangkan data yang diperlukan.

Untuk menjalankan: `npm install`, lalu `npm run dev`, dan buka http://localhost:3000.

Untuk mengaktifkan Firebase nanti:

1. Buat proyek Firebase, aktifkan Authentication metode Email/Password dan Cloud Firestore.
2. Salin `.env.example` ke `.env.local`, lalu isi konfigurasi aplikasi web dari Firebase Console.
3. Terapkan `firestore.rules` melalui Firebase Console atau Firebase CLI (`firebase deploy --only firestore:rules`).
4. Mulai ulang `npm run dev`, buka http://localhost:3000, dan buat akun.

Data akun disimpan di `users/{uid}`. Lokasi folder hanya disimpan sebagai teks. Jangan menjalankan aplikasi dengan aturan Firestore terbuka.
