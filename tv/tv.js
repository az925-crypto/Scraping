// tv/tv.js — ambil jadwal acara TV dari https://jadwaltv.net
//
// Situsnya WordPress biasa: tiap channel punya halaman /channel/<slug> berisi
// tabel "Jam | Acara". Kita ambil tabel terbesar di halaman itu (= jadwal full
// sehari), lalu rapikan jadi array { time, program }.
//
// Tanpa dependency. Cukup Node.js 18+ (pakai fetch bawaan).
//
// Cara pakai (CLI):
//   node tv/tv.js channels          # daftar semua channel
//   node tv/tv.js rcti              # jadwal lengkap satu channel
//   node tv/tv.js now rcti          # acara yang lagi/akan tayang (jam WIB)
//   node tv/tv.js now               # acara lagi tayang di SEMUA channel
//
// Import sebagai modul:
//   import { getChannel, getNowPlaying, CHANNELS } from "./tv/tv.js";

const BASE = "https://www.jadwaltv.net";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  Accept: "text/html",
};

// Daftar channel yang tersedia (slug = bagian akhir URL /channel/<slug>).
export const CHANNELS = [
  "antv", "gtv", "indosiar", "inewstv", "kompastv", "mdtv", "metrotv",
  "mnctv", "moji", "nettv", "rcti", "rtv", "sctv", "trans7", "transtv",
  "tvone", "tvri",
];

// ambil HTML dengan retry + backoff sederhana
async function fetchHtml(url, { retries = 3 } = {}) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, { headers: HEADERS, redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status} untuk ${url}`);
      return await res.text();
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 2 ** i * 1000));
    }
  }
  throw lastErr;
}

const stripTags = (s) =>
  s
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();

// Parse semua tabel jadi array of rows; tiap row = array sel.
function parseTables(html) {
  const tables = html.match(/<table[\s\S]*?<\/table>/gi) || [];
  return tables.map((t) => {
    const trs = t.match(/<tr[\s\S]*?<\/tr>/gi) || [];
    return trs.map((tr) =>
      (tr.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || []).map((c) =>
        stripTags(c.replace(/<\/?t[dh][^>]*>/gi, ""))
      )
    );
  });
}

// Ubah "00:15WIB" / "13.00WIB" -> "00:15"
function cleanTime(raw) {
  const m = raw.match(/(\d{1,2})[.:](\d{2})/);
  if (!m) return null;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

// Ambil jadwal satu channel -> [{ time, program }]
export async function getChannel(slug) {
  if (!CHANNELS.includes(slug)) {
    // tetap dicoba (siapa tahu ada channel baru), cuma kasih peringatan halus
    // lewat hasil kosong kalau gagal
  }
  const html = await fetchHtml(`${BASE}/channel/${slug}`);
  const tables = parseTables(html);
  // jadwal full = tabel dengan baris terbanyak
  const table = tables.sort((a, b) => b.length - a.length)[0] || [];

  const out = [];
  for (const row of table) {
    if (row.length < 2) continue;
    const time = cleanTime(row[0]);
    const program = row[1];
    // buang header & baris promo "Jadwal TV selengkapnya..."
    if (!time || /jadwal tv selengkapnya/i.test(program)) continue;
    if (/^jam$/i.test(row[0])) continue;
    out.push({ time, program });
  }
  // urutkan berdasarkan jam
  out.sort((a, b) => a.time.localeCompare(b.time));
  return out;
}

// Jam sekarang dalam WIB (UTC+7) sebagai "HH:MM"
function nowWIB() {
  const now = new Date(Date.now() + 7 * 3600 * 1000);
  return `${String(now.getUTCHours()).padStart(2, "0")}:${String(
    now.getUTCMinutes()
  ).padStart(2, "0")}`;
}

// Cari acara yang sedang tayang + berikutnya untuk satu channel
export async function getNowPlaying(slug) {
  const sched = await getChannel(slug);
  const now = nowWIB();
  let current = null;
  let next = null;
  for (let i = 0; i < sched.length; i++) {
    if (sched[i].time <= now) current = sched[i];
    else {
      next = sched[i];
      break;
    }
  }
  // kalau belum ada yang mulai hari ini, anggap acara terakhir kemarin
  if (!current && sched.length) current = sched[sched.length - 1];
  return { now, current, next };
}

// ------------------------------------------------------------------
// CLI
// ------------------------------------------------------------------
async function cli() {
  const [cmd, ...rest] = process.argv.slice(2);

  if (cmd === "channels") {
    console.log("\nChannel tersedia:\n");
    console.log(CHANNELS.join(", "));
    return;
  }

  if (cmd === "now") {
    const target = rest[0] ? [rest[0]] : CHANNELS;
    console.log(`\nAcara yang sedang tayang (jam ${nowWIB()} WIB):\n`);
    for (const ch of target) {
      try {
        const { current, next } = await getNowPlaying(ch);
        const cur = current ? `${current.time} ${current.program}` : "-";
        const nx = next ? `  (berikutnya: ${next.time} ${next.program})` : "";
        console.log(`${ch.toUpperCase().padEnd(9)} ▶ ${cur}${nx}`);
      } catch (e) {
        console.log(`${ch.toUpperCase().padEnd(9)} ✗ gagal: ${e.message}`);
      }
      await new Promise((r) => setTimeout(r, 300)); // jeda sopan antar request
    }
    return;
  }

  // selain itu: anggap argumen pertama = slug channel
  const slug = cmd;
  if (!slug) {
    console.log(`Pakai salah satu:
  node tv/tv.js channels        # daftar channel
  node tv/tv.js <channel>       # jadwal lengkap, mis. "node tv/tv.js rcti"
  node tv/tv.js now [channel]   # acara lagi tayang (semua / satu channel)`);
    return;
  }
  const sched = await getChannel(slug);
  if (!sched.length) {
    console.log(`Tidak ada jadwal ketemu untuk "${slug}". Cek nama channel: node tv/tv.js channels`);
    return;
  }
  console.log(`\nJadwal ${slug.toUpperCase()} hari ini (${sched.length} acara):\n`);
  for (const s of sched) console.log(`  ${s.time}  ${s.program}`);
}

import { fileURLToPath } from "node:url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  cli().catch((err) => {
    console.error("Error:", err.message);
    process.exit(1);
  });
}
