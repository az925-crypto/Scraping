# 📺 tv — JadwalTV

Ambil jadwal acara TV nasional Indonesia dari
[jadwaltv.net](https://jadwaltv.net).

Situsnya WordPress biasa (bukan API). Tiap channel punya halaman
`/channel/<slug>` berisi tabel **Jam | Acara**. Scraper ini ngambil tabel
terbesar di halaman itu (= jadwal full sehari), lalu dirapikan jadi
`{ time, program }`.

## Syarat

- Node.js **18+** (pakai `fetch` bawaan, tanpa dependency).

## Cara pakai (terminal)

Jalankan dari root repo:

```bash
node tv/tv.js channels        # daftar semua channel
node tv/tv.js rcti            # jadwal lengkap satu channel
node tv/tv.js now rcti        # acara lagi/akan tayang di satu channel
node tv/tv.js now             # acara lagi tayang di SEMUA channel
```

## Pakai sebagai modul

```js
import { getChannel, getNowPlaying, CHANNELS } from "./tv/tv.js";

const jadwal = await getChannel("trans7");
// [{ time: "04:45", program: "Jalur Langit" }, ...]

const { current, next } = await getNowPlaying("rcti");
console.log(current.program, "->", next.program);
```

## Channel yang didukung

`antv, gtv, indosiar, inewstv, kompastv, mdtv, metrotv, mnctv, moji, nettv,
rcti, rtv, sctv, trans7, transtv, tvone, tvri`

## Catatan

- Jam dihitung pakai **WIB (UTC+7)** buat fitur "now playing".
- Datanya hasil parsing HTML, jadi kalau situsnya ganti tata letak, parser
  mungkin perlu disesuaikan (lihat fungsi `parseTables`).
- Tabel kecil "lagi tayang" yang ada baris iklannya sengaja dilewati; kita
  selalu ambil tabel dengan baris terbanyak.
- Ada jeda 300ms antar request di mode `now` (semua channel) biar sopan.
