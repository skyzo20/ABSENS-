# Sistem Absensi Karyawan

Aplikasi absensi karyawan dengan React dan Firebase.

## Setup

1. Install dependencies: `npm install`
2. Setup Firebase project di https://console.firebase.google.com/
3. Enable Authentication (Email/Password) dan Firestore.
4. Copy Firebase config ke `src/firebase.js`
5. Run app: `npm start`

## Fitur

- Login dengan Firebase Auth
- Check-in/Check-out dengan foto dan timestamp
- Riwayat absensi
- UI Minimalist

## Struktur

- `src/App.js`: Komponen utama
- `src/components/`: Komponen UI
- `src/firebase.js`: Konfigurasi Firebase