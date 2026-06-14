# 🕸️ Scraping

Kumpulan script scraping / pengambil data buat dipakai sendiri.

Tiap scraper ditaruh di **foldernya masing-masing** dan punya **README sendiri**
yang jelasin detailnya. File ini cuma daftar index + aturan main umum.

## 📂 Daftar scraper

| Folder                  | Sumber                                            | Keterangan                                                        |
| ----------------------- | ------------------------------------------------- | ---------------------------------------------------------------- |
| [`anime/`](./anime)     | [stream.epand.my.id](https://stream.epand.my.id)  | Data anime/donghua (cari, detail, episode, link streaming).      |
| [`tv/`](./tv)           | [jadwaltv.net](https://jadwaltv.net)              | Jadwal acara TV nasional per channel + acara yang lagi tayang.   |
| [`music/`](./music)     | JioSaavn (via musicapplify)                        | Cari & unduh lagu (link MP3 320kbps) dari API JioSaavn.          |

> Tambah scraper baru? Bikin folder baru, isi script + `README.md`-nya,
> lalu daftarin di tabel atas.

## 🚀 Cara pakai umum

Kebanyakan script di sini pakai **Node.js 18+** (biar bisa pakai `fetch`
bawaan tanpa install apa-apa). Jalankan dari root repo:

```bash
node <folder>/<script>.js [perintah] [argumen]
```

Contoh:

```bash
node anime/anime.js search wistoria
```

Cek README di tiap folder buat perintah lengkapnya.

## 🧱 Struktur repo

```
.
├── README.md          <- kamu di sini (index semua scraper)
├── package.json       <- config bersama (type: module)
├── anime/
│   ├── README.md      <- dokumentasi khusus scraper anime
│   └── anime.js
├── tv/
│   ├── README.md      <- dokumentasi khusus scraper jadwal TV
│   └── tv.js
└── music/
    ├── README.md      <- dokumentasi khusus scraper musik
    └── music.js
```

## ✍️ Konvensi nambah scraper baru

1. Bikin folder dengan nama yang jelas, mis. `berita/`, `lowongan/`.
2. Taruh script utama di dalamnya (mis. `berita/berita.js`).
3. Bikin `berita/README.md` — jelasin sumber, cara pakai, & endpoint/struktur data.
4. Daftarin di tabel **Daftar scraper** di atas.
5. Usahakan tanpa dependency kalau bisa; kalau perlu, catat di README folder itu.

## ⚠️ Catatan

Semua ini buat keperluan pribadi / belajar. Hormati hak cipta, `robots.txt`,
dan ketentuan layanan situs sumber. Jangan spam request (kasih jeda kalau
ngambil banyak data).
