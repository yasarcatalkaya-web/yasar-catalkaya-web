#!/usr/bin/env python3
"""
Excel "linkli özelge listesi.xlsx" dosyasından bu yılın özelgelerini
data/ozelgeler.json olarak çıkarır.

Excel kullanıcının lokalindedir, repoya commit edilmez. Bu yüzden script
GitHub Actions'tan çağrılmaz — kullanıcı yeni özelgeler eklediğinde
manuel olarak çalıştırılır:

    python scripts/build-ozelgeler.py
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
import openpyxl

# Excel kaynağı — kullanıcının OneDrive'ında
SOURCE = Path(r"C:\Users\yasar\OneDrive - ticaret.edu.tr\Masaüstü\Mevzuat\linkli özelge listesi.xlsx")
OUT    = Path("data/ozelgeler.json")

YEAR = datetime.now().year

# Excel'deki "Kanun" sütunundaki kısaltmaları kategori etiketine eşle
KANUN_LABEL = {
    "KVK":   "KVK",
    "VUK":   "VUK",
    "KDV":   "KDV",
    "GVK":   "GVK",
    "ÖTV":   "ÖTV",
    "OTV":   "ÖTV",
    "DVK":   "DAMGA",
    "DV":    "DAMGA",
    "VİV":   "VERASET",
    "VIV":   "VERASET",
    "GİDER VERGİLERİ KANUNU": "GİDER",
    "BSMV":  "BSMV",
    "MTV":   "MTV",
    "EÇK":   "EMLAK",
}

def normalize_kanun(raw: str) -> str:
    if not raw:
        return "GENEL"
    raw_up = str(raw).strip().upper()
    if raw_up in KANUN_LABEL:
        return KANUN_LABEL[raw_up]
    for k, v in KANUN_LABEL.items():
        if k in raw_up:
            return v
    return raw_up[:20] or "GENEL"

def fmt_date(value) -> str:
    if isinstance(value, datetime):
        return value.strftime("%d.%m.%Y")
    return str(value or "").strip()

def main() -> int:
    if not SOURCE.exists():
        print(f"Excel kaynağı bulunamadı: {SOURCE}", file=sys.stderr)
        return 1

    wb = openpyxl.load_workbook(SOURCE, read_only=True, data_only=True)
    ws = wb["Sayfa1"]

    items = []
    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i == 0:
            continue  # header
        tarih, sayi, konu, kanun, url = (row + (None,) * 5)[:5]
        if not isinstance(tarih, datetime) or tarih.year != YEAR:
            continue
        if not url:
            continue
        items.append({
            "date":     fmt_date(tarih),
            "sortKey":  tarih.strftime("%Y-%m-%d"),
            "no":       (str(sayi).strip() if sayi else ""),
            "subject":  (str(konu).strip() if konu else ""),
            "law":      normalize_kanun(kanun),
            "lawRaw":   (str(kanun).strip() if kanun else ""),
            "url":      str(url).strip()
        })

    # En yeni tarih en üstte
    items.sort(key=lambda x: x["sortKey"], reverse=True)

    payload = {
        "source": str(SOURCE.name),
        "year":   YEAR,
        "fetchedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "count":  len(items),
        "items":  items,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
        f.write("\n")

    print(f"Wrote {len(items)} özelge to {OUT} (year={YEAR})")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
