# 🎵 music — JioSaavn

Cari & unduh lagu lewat **API JioSaavn** — sumber data yang dipakai banyak app
musik, termasuk [musicapplify.vercel.app](https://musicapplify.vercel.app).

## Kenapa nggak scrape situs musicapplify langsung?

Situs `musicapplify.vercel.app` dikunci **Vercel Security Checkpoint** (mode
anti-bot). Semua request (termasuk `/api/...`) dibalas `429` + halaman challenge
JavaScript, jadi `curl`/`fetch` biasa nggak bisa lewat (butuh browser asli).

Untungnya datanya berasal dari **JioSaavn**, dan API internal JioSaavn
(`www.jiosaavn.com/api.php`) bisa diakses langsung — jadi kita ambil dari sumber
aslinya, lebih bersih & stabil.

## Syarat

- Node.js **18+** (pakai `fetch` + `crypto` bawaan, tanpa dependency).

## Cara pakai (terminal)

```bash
node music/music.js search "tulus"            # cari lagu + link MP3 (320kbps)
node music/music.js download "tulus" 2        # unduh lagu hasil ke-2 ke folder ini
```

> Cukup `node music/music.js ...` biasa. Script otomatis re-launch dengan
> `--openssl-legacy-provider` kalau diperlukan (lihat catatan DES di bawah).

## Pakai sebagai modul

```js
import { searchSongs } from "./music/music.js";

const songs = await searchSongs("coldplay", 5);
console.log(songs[0].title, songs[0].downloadUrl); // link .m4a 320kbps
```

Tiap lagu berisi: `id, title, artists, album, year, duration, image,
hasLyrics, downloadUrl`.

## Cara kerja singkat

1. `search.getResults` → daftar lagu (judul, artis, album, dll).
2. Tiap lagu punya `encrypted_media_url` yang dienkripsi **DES-ECB**
   (kunci publik `38346591`).
3. Di-decrypt jadi link CDN `aac.saavncdn.com/.../_320.mp4` — bisa langsung
   diputar/diunduh **tanpa auth & tanpa kedaluwarsa**.

## Catatan

- **DES-ECB & OpenSSL 3:** OpenSSL 3 mematikan DES secara default. Script ini
  otomatis menjalankan ulang dirinya dengan `--openssl-legacy-provider`. Kalau
  mau jalankan manual: `node --openssl-legacy-provider music/music.js ...`.
- File audio (`*.m4a/*.mp3/*.mp4`) di-ignore git (lihat `.gitignore`).
- Katalog JioSaavn lebih kuat untuk lagu India/Barat; sebagian lagu Indonesia
  indie mungkin tidak lengkap — itu keterbatasan sumber, bukan scraper-nya.
- Buat dipakai sendiri. Hormati hak cipta & ketentuan layanan.
