# 🎬 anime — EpanDStream

Ambil data anime/donghua yang dipakai situs
[stream.epand.my.id](https://stream.epand.my.id).

Situsnya cuma "kulit" (SPA) — semua data datang dari **API publik**:

```
https://www.sankavollerei.web.id/anime
```

Jadi nggak perlu scraping HTML, cukup panggil API-nya langsung.

## Syarat

- Node.js **18+** (pakai `fetch` bawaan, tanpa dependency).

## Cara pakai (terminal)

Jalankan dari root repo:

```bash
node anime/anime.js home                 # konten halaman utama
node anime/anime.js ongoing [halaman]    # daftar anime ongoing
node anime/anime.js search <kata>        # cari anime (1 kata paling akurat)
node anime/anime.js detail <animeId>     # detail + daftar episode
node anime/anime.js episode <episodeId>  # link streaming + server + download
```

**Alur biasa:** `search` → ambil `animeId` → `detail` → ambil `episodeId`
→ `episode` → dapat `defaultStreamingUrl` (tinggal buka di browser).

## Pakai sebagai modul

```js
import { search, getDetail, getEpisode } from "./anime/anime.js";

const { animeList } = await search("wistoria");
const detail = await getDetail(animeList[0].animeId);
const ep = await getEpisode(detail.episodeList[0].episodeId);
console.log(ep.defaultStreamingUrl); // link iframe siap diputar
```

## Daftar endpoint API

Semua diawali base `https://www.sankavollerei.web.id/anime` dan dibungkus
`{ status, data, ... }`.

### Anime

| Fungsi          | Path                          |
| --------------- | ----------------------------- |
| home            | `/home`                       |
| ongoing         | `/ongoing-anime?page=N`       |
| complete        | `/complete-anime?page=N`      |
| jadwal rilis    | `/schedule`                   |
| cari            | `/search/<kata>`              |
| detail anime    | `/anime/<animeId>`            |
| episode         | `/episode/<episodeId>`        |
| link per server | `/server/<serverId>`          |
| daftar genre    | `/genre`                      |
| anime per genre | `/genre/<genreId>?page=N`     |

### Donghua

| Fungsi   | Path                              |
| -------- | --------------------------------- |
| ongoing  | `/donghua/ongoing/<page>`         |
| completed| `/donghua/completed/<page>`       |
| schedule | `/donghua/schedule`               |
| detail   | `/donghua/detail/<id>`            |
| episode  | `/donghua/episode/<id>`           |
| cari     | `/donghua/search/<kata>`          |

## Catatan

- **Search cuma akurat 1 kata.** Query multi-kata bikin server upstream
  balas HTTP 500, jadi `search()` otomatis pakai kata pertama lalu nyaring
  hasil secara lokal.
- API butuh header `User-Agent` + `Referer` (sudah diatur di `anime.js`).
- Sumber data aslinya dari otakudesu, jadi kualitas/ketersediaan ngikut sana.
