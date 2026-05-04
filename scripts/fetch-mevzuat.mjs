#!/usr/bin/env node
// GİB duyuru-arsivi/mevzuat → data/mevzuat.json
// API: gib.gov.tr/api/gibportal/duyuru/listPublish, type=1 (mevzuat)

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

const API   = 'https://gib.gov.tr/api/gibportal/duyuru/listPublish';
const SIZE  = 15;
const TYPE  = 1; // 1 = mevzuat

const stripHtml = (s) =>
  (s || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

const KEYWORDS = [
  ['KDV',       /\b(kdv|katma de(g|ğ)er)\b/i],
  ['VUK',       /\b(vuk|vergi usul)\b/i],
  ['KVK',       /\b(kurumlar vergisi|kvk)\b/i],
  ['GVK',       /\b(gelir vergisi|gvk)\b/i],
  ['ÖTV',       /\b(otv|ötv|özel tüketim)\b/i],
  ['DAMGA',     /\bdamga\b/i],
  ['SGK',       /\b(sgk|sosyal güvenlik)\b/i],
  ['TFRS',      /\b(tfrs|bobi|kgk)\b/i],
  ['CB-KARARI', /cumhurba(s|ş)kan(ı|i) karar/i],
  ['TEBLİĞ',    /tebli(g|ğ)/i],
  ['SİRKÜLER',  /sirküler|sirkuler/i],
  ['REHBER',    /rehber/i]
];
const categorize = (title) => {
  for (const [k, re] of KEYWORDS) if (re.test(title)) return k;
  return 'GENEL';
};

const fmtDate = (iso) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}.${d.getFullYear()}`;
};

const body = {
  type: TYPE,
  ilkodu: 'UNIVERSAL',
  preview: false,
  page: 0,
  size: SIZE,
  sortFieldName: 'startdate',
  sortType: 'DESC'
};

console.log(`Fetching ${SIZE} items from GİB API...`);
const res = await fetch(API, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (compatible; static-site-builder)'
  },
  body: JSON.stringify(body)
});
if (!res.ok) {
  console.error(`Upstream HTTP ${res.status}`);
  process.exit(1);
}
const data = await res.json();
const all  = data?.resultContainer?.content || [];

// Sadece içinde bulunduğumuz yılın duyurularını al
const currentYear = new Date().getFullYear();
const filtered = all.filter((i) => {
  const d = new Date(i.startdate || i.ts);
  return !isNaN(d.getTime()) && d.getFullYear() === currentYear;
});

const raw = filtered.slice(0, SIZE);

const items = raw.map((i) => ({
  id: i.id,
  date: fmtDate(i.startdate || i.ts),
  title: i.title,
  summary: stripHtml(i.summary || i.description).slice(0, 240),
  url: `https://gib.gov.tr/duyuru-arsivi/mevzuat/${i.id}`,
  category: categorize(i.title)
}));

const out = {
  source: 'gib.gov.tr/duyuru-arsivi/mevzuat',
  fetchedAt: new Date().toISOString(),
  count: items.length,
  items
};

const outPath = 'data/mevzuat.json';
mkdirSync(dirname(outPath), { recursive: true });

const next = JSON.stringify(out, null, 2) + '\n';
let changed = true;
if (existsSync(outPath)) {
  const prev = readFileSync(outPath, 'utf8');
  // ignore fetchedAt timestamp diff when comparing
  const norm = (s) => s.replace(/"fetchedAt":\s*"[^"]+"/, '"fetchedAt":""');
  if (norm(prev) === norm(next)) changed = false;
}

writeFileSync(outPath, next, 'utf8');
console.log(`Wrote ${items.length} items to ${outPath} (changed=${changed})`);
