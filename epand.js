// epand.js — client kecil buat ngambil data anime/donghua dari API
// yang dipakai situs https://stream.epand.my.id
//
// Tidak butuh dependency apa pun. Cukup Node.js 18+ (pakai fetch bawaan).
//
// Cara pakai (CLI):
//   node epand.js search naruto
//   node epand.js detail borot-sub-indo
//   node epand.js episode btr-ng-episode-293-sub-indo
//   node epand.js ongoing
//   node epand.js home
//
// Atau import sebagai modul:
//   import { search, getDetail, getEpisode } from "./epand.js";

const BASE = "https://www.sankavollerei.web.id/anime";

// Beberapa endpoint kadang nolak request tanpa header browser, jadi kita
// kirim User-Agent + Referer biar dianggap berasal dari situsnya.
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Referer: "https://stream.epand.my.id/",
  Accept: "application/json",
};

// fetch JSON dengan retry sederhana (jaga-jaga kalau jaringan ngadat).
async function api(path, { retries = 3 } = {}) {
  const url = `${BASE}${path}`;
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (!res.ok) throw new Error(`HTTP ${res.status} untuk ${path}`);
      const json = await res.json();
      // API membungkus hasil di dalam { data: ... }
      return json?.data ?? json;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 2 ** i * 1000)); // backoff: 1s,2s,4s
    }
  }
  throw lastErr;
}

// ---- Endpoint anime ----
export const home = () => api("/home");
export const ongoing = (page = 1) => api(`/ongoing-anime?page=${page}`);
export const complete = (page = 1) => api(`/complete-anime?page=${page}`);
export const schedule = () => api("/schedule");
// Catatan: API upstream cuma menerima SATU kata kunci — query multi-kata
// bikin server balas HTTP 500. Jadi kalau ada spasi, kita pakai kata pertama
// aja sebagai kueri, lalu sisanya dipakai buat menyaring hasil secara lokal.
export const search = async (q) => {
  const words = q.trim().split(/\s+/);
  const data = await api(`/search/${encodeURIComponent(words[0])}`);
  if (words.length > 1 && Array.isArray(data?.animeList)) {
    const needle = q.toLowerCase();
    const filtered = data.animeList.filter((a) =>
      (a.title || "").toLowerCase().includes(needle)
    );
    // pakai hasil tersaring kalau ada; kalau kosong, balikin hasil mentah
    if (filtered.length) return { ...data, animeList: filtered };
  }
  return data;
};
export const getDetail = (animeId) => api(`/anime/${animeId}`);
export const getEpisode = (episodeId) => api(`/episode/${episodeId}`);
export const genres = () => api("/genre");
export const genreDetail = (genreId, page = 1) =>
  api(`/genre/${genreId}?page=${page}`);

// Ambil link embed untuk server/kualitas tertentu (href dari episode.server)
export const getServerUrl = async (serverHref) => {
  // serverHref contoh: "/anime/server/68D8BB-5-9D5u"
  const path = serverHref.replace(/^\/anime/, "");
  const data = await api(path);
  return data?.url || data?.embed || "";
};

// ---- Endpoint donghua (bonus, formatnya beda dikit) ----
export const donghua = {
  ongoing: (page = 1) => api(`/donghua/ongoing/${page}`),
  completed: (page = 1) => api(`/donghua/completed/${page}`),
  schedule: () => api("/donghua/schedule"),
  detail: (id) => api(`/donghua/detail/${id}`),
  episode: (id) => api(`/donghua/episode/${id}`),
  search: (q) => api(`/donghua/search/${encodeURIComponent(q)}`),
};

// ------------------------------------------------------------------
// CLI sederhana — biar bisa langsung dicoba dari terminal
// ------------------------------------------------------------------
async function cli() {
  const [cmd, ...args] = process.argv.slice(2);
  const arg = args.join(" ");

  switch (cmd) {
    case "search": {
      const { animeList = [] } = await search(arg);
      console.log(`\nHasil pencarian "${arg}": ${animeList.length} judul\n`);
      for (const a of animeList) {
        console.log(`• ${a.title}`);
        console.log(`  id: ${a.animeId}  | status: ${a.status} | skor: ${a.score}`);
      }
      break;
    }
    case "detail": {
      const d = await getDetail(arg);
      console.log(`\n${d.title}`);
      console.log(`Status: ${d.status} | Episode: ${d.episodes} | Skor: ${d.score}`);
      console.log(`\nSinopsis:\n${(d.synopsis || "").slice(0, 300)}...`);
      console.log(`\n${d.episodeList?.length || 0} episode (terbaru di atas):`);
      for (const e of (d.episodeList || []).slice(0, 10)) {
        console.log(`  - Ep ${e.eps}  → id: ${e.episodeId}`);
      }
      break;
    }
    case "episode": {
      const e = await getEpisode(arg);
      console.log(`\n${e.title}`);
      console.log(`\n▶ Link streaming default (tinggal buka di browser):`);
      console.log(e.defaultStreamingUrl);
      console.log(`\nServer & kualitas lain:`);
      for (const q of e.server?.qualities || []) {
        const names = (q.serverList || []).map((s) => s.title).join(", ");
        console.log(`  [${q.title}] ${names}`);
      }
      console.log(`\nLink download:`);
      for (const q of e.downloadUrl?.qualities || []) {
        console.log(`  [${q.title}] ${(q.urls || []).map((u) => u.title).join(", ")}`);
      }
      break;
    }
    case "ongoing": {
      const { animeList = [] } = await ongoing(Number(arg) || 1);
      console.log(`\nAnime ongoing:\n`);
      for (const a of animeList)
        console.log(`• ${a.title}  (ep ${a.episodes}, ${a.releaseDay}) → ${a.animeId}`);
      break;
    }
    case "home": {
      const d = await home();
      console.log("\nSeksi di halaman utama:", Object.keys(d).join(", "));
      console.log("\nOngoing terbaru:");
      for (const a of (d.ongoing?.animeList || []).slice(0, 8))
        console.log(`• ${a.title} → ${a.animeId}`);
      break;
    }
    default:
      console.log(`Perintah tidak dikenal: "${cmd || "(kosong)"}"

Pakai salah satu:
  node epand.js home
  node epand.js ongoing [halaman]
  node epand.js search <kata kunci>
  node epand.js detail <animeId>
  node epand.js episode <episodeId>

Alur biasa: search → detail (lihat episodeId) → episode (dapat link nonton).`);
  }
}

// Jalankan CLI hanya kalau file ini dieksekusi langsung (bukan di-import)
import { fileURLToPath } from "node:url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  cli().catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
}
