#!/usr/bin/env python3
"""veriler/emisyon_faktorleri.json dosyasından uygulamanın JS veri modülünü üretir.

Neden gerekli?
--------------
Android WebView'da `file://` şemasıyla açılan bir sayfadan `fetch()` ile yerel
JSON okumak modern WebView sürümlerinde CORS nedeniyle engellenir. Bu yüzden
JSON içeriği bir `<script>` dosyasına global değişken olarak gömülür. Böylece
uygulama internet bağlantısı olmadan ve hiçbir ek izin gerektirmeden çalışır.

JSON tek doğruluk kaynağıdır; bu betik her değişiklikten sonra çalıştırılır:

    python3 scripts/veri_uret.py

tests/test_veri_senkron.py bu iki dosyanın eşleştiğini doğrular.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

KOK = Path(__file__).resolve().parent.parent
KAYNAK = KOK / "veriler" / "emisyon_faktorleri.json"
HEDEF = KOK / "android" / "app" / "src" / "main" / "assets" / "js" / "veri.js"

BASLIK = """/*!
 * KarbonPusula — Emisyon faktörü veri modülü
 * ---------------------------------------------------------------------------
 * BU DOSYA OTOMATİK ÜRETİLİR — ELLE DÜZENLEMEYİN.
 *
 * Kaynak dosya : veriler/emisyon_faktorleri.json
 * Üreten betik : scripts/veri_uret.py
 *
 * Değişiklik yapmak için JSON dosyasını düzenleyin ve şu komutu çalıştırın:
 *     python3 scripts/veri_uret.py
 */
"""

ALTLIK = """
if (typeof module === 'object' && module.exports) {
  module.exports = KARBONPUSULA_VERI;
}
"""


def uret() -> int:
    if not KAYNAK.exists():
        print(f"HATA: kaynak bulunamadı: {KAYNAK}", file=sys.stderr)
        return 1

    with KAYNAK.open(encoding="utf-8") as f:
        veri = json.load(f)

    govde = json.dumps(veri, ensure_ascii=False, indent=2, sort_keys=False)
    icerik = f"{BASLIK}var KARBONPUSULA_VERI = {govde};\n{ALTLIK}"

    HEDEF.parent.mkdir(parents=True, exist_ok=True)
    HEDEF.write_text(icerik, encoding="utf-8")

    print(f"Üretildi: {HEDEF.relative_to(KOK)}")
    print(f"  kaynak sayısı : {len(veri['kaynaklar'])}")
    print(f"  faktör sayısı : {len(veri['faktorler'])}")
    print(f"  boyut         : {len(icerik):,} bayt")
    return 0


if __name__ == "__main__":
    raise SystemExit(uret())
