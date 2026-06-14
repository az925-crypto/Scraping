// music/music.js — cari & download lagu lewat API JioSaavn (sumber data yang
// dipakai banyak app musik, termasuk musicapplify.vercel.app).
//
// Situs musicapplify-nya sendiri dikunci "Vercel Security Checkpoint" (challenge
// bot), jadi nggak bisa di-scrape langsung. Tapi datanya berasal dari JioSaavn,
// dan API internal JioSaavn (www.jiosaavn.com/api.php) bisa diakses langsung.
//
// Link MP3-nya ke-enkripsi pakai DES-ECB. Karena OpenSSL 3 mematikan DES secara
// default, file ini otomatis re-launch dirinya dengan --openssl-legacy-provider
// supaya kamu cukup jalanin "node music/music.js ..." seperti biasa.
//
// Tanpa dependency. Node.js 18+.
//
// CLI:
//   node music/music.js search <judul/artis>      # cari lagu + link MP3
//   node music/music.js download <judul> [nomor]  # download lagu ke folder ini
//
// Modul:
//   import { searchSongs } from "./music/music.js";

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// --- Auto-aktifkan legacy provider OpenSSL (buat DES-ECB) kalau perlu ---
function desSupported() {
  try {
    crypto.createDecipheriv("des-ecb", Buffer.from("38346591"), null);
    return true;
  } catch {
    return false;
  }
}
if (!desSupported() && !process.env.__MUSIC_RELAUNCHED) {
  const res = spawnSync(
    process.execPath,
    ["--openssl-legacy-provider", fileURLToPath(import.meta.url), ...process.argv.slice(2)],
    { stdio: "inherit", env: { ...process.env, __MUSIC_RELAUNCHED: "1" } }
  );
  process.exit(res.status ?? 0);
}

const API = "https://www.jiosaavn.com/api.php";
const KEY = Buffer.from("38346591"); // kunci DES JioSaavn (publik, dipakai semua client)

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36",
};

// rapikan entitas HTML (&amp; &quot; &#39; dsb) di judul/artis
const unescape = (s = "") =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");

// panggil API JioSaavn dengan retry sederhana
async function apiCall(params, { retries = 3 } = {}) {
  const url = `${API}?${new URLSearchParams({
    _format: "json",
    _marker: "0",
    api_version: "4",
    ctx: "web6dot0",
    ...params,
  })}`;
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: HEADERS });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      // JioSaavn kadang sisipkan karakter aneh sebelum JSON
      return JSON.parse(text.slice(text.indexOf("{")));
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 2 ** i * 1000));
    }
  }
  throw lastErr;
}

// decrypt encrypted_media_url -> link MP4/MP3 langsung (kualitas dipilih)
export function decryptUrl(encrypted, quality = "320") {
  const dec = crypto.createDecipheriv("des-ecb", KEY, null);
  dec.setAutoPadding(true);
  const url = dec.update(encrypted, "base64", "utf8") + dec.final("utf8");
  return url.replace("_96.mp4", `_${quality}.mp4`);
}

// rapikan satu objek lagu mentah jadi bentuk enak dipakai
function normalize(raw) {
  const mi = raw.more_info || {};
  return {
    id: raw.id,
    title: unescape(raw.title),
    artists: unescape(raw.subtitle || mi.music || ""),
    album: unescape(mi.album || ""),
    year: raw.year || "",
    duration: Number(mi.duration || 0), // detik
    image: (raw.image || "").replace("150x150", "500x500"),
    hasLyrics: mi.has_lyrics === "true",
    // link MP3 langsung (320kbps), siap diputar/diunduh:
    downloadUrl: mi.encrypted_media_url ? decryptUrl(mi.encrypted_media_url) : null,
  };
}

// Cari lagu -> array lagu yang sudah dirapikan (lengkap dengan downloadUrl)
export async function searchSongs(query, limit = 10) {
  const data = await apiCall({
    __call: "search.getResults",
    q: query,
    n: String(limit),
    p: "1",
  });
  return (data.results || []).map(normalize);
}

const fmtDur = (s) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// ------------------------------------------------------------------
// CLI
// ------------------------------------------------------------------
async function cli() {
  const [cmd, ...rest] = process.argv.slice(2);

  if (cmd === "search") {
    const q = rest.join(" ");
    if (!q) return console.log('Pakai: node music/music.js search "judul lagu"');
    const songs = await searchSongs(q);
    console.log(`\nHasil "${q}": ${songs.length} lagu\n`);
    songs.forEach((s, i) => {
      console.log(`${String(i + 1).padStart(2)}. ${s.title} — ${s.artists}`);
      console.log(`    album: ${s.album} (${s.year}) | ${fmtDur(s.duration)}`);
      console.log(`    mp3: ${s.downloadUrl}`);
    });
    return;
  }

  if (cmd === "download") {
    // nomor opsional di argumen terakhir (default 1)
    let idx = 1;
    if (rest.length > 1 && /^\d+$/.test(rest[rest.length - 1])) {
      idx = Number(rest.pop());
    }
    const q = rest.join(" ");
    if (!q) return console.log('Pakai: node music/music.js download "judul lagu" [nomor]');
    const songs = await searchSongs(q);
    const song = songs[idx - 1];
    if (!song || !song.downloadUrl) return console.log("Lagu tidak ketemu / tanpa link.");

    const safe = `${song.title} - ${song.artists}`.replace(/[/\\?%*:|"<>]/g, "_").slice(0, 120);
    const file = path.join(path.dirname(fileURLToPath(import.meta.url)), `${safe}.m4a`);
    console.log(`Mengunduh: ${song.title} — ${song.artists} ...`);
    const res = await fetch(song.downloadUrl, { headers: HEADERS });
    if (!res.ok) return console.log(`Gagal unduh: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(file, buf);
    console.log(`Tersimpan: ${file} (${(buf.length / 1048576).toFixed(1)} MB)`);
    return;
  }

  console.log(`Pakai salah satu:
  node music/music.js search "<judul/artis>"        # cari lagu + link MP3
  node music/music.js download "<judul>" [nomor]    # unduh (default lagu ke-1)`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  cli().catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
}
