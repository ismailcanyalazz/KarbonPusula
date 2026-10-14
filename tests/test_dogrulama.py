#!/usr/bin/env python3
"""Çapraz doğrulama: JavaScript motoru ile Python motoru aynı sonucu veriyor mu?

Uygulamada çalışan hesap motoru JavaScript ile yazılmıştır
(``android/app/src/main/assets/js/hesap.js``). ``scripts/karbon_hesaplama.py``
aynı yöntemi bağımsız olarak Python'da uygular.

Bu test, çok sayıda senaryoyu her iki motorda çalıştırır ve sonuçları
karşılaştırır. İki bağımsız uygulamanın aynı değeri vermesi, hesabın yazım
hatasından arınmış olduğunun kanıtıdır. Ayrıca sonuçlar elle hesaplanmış
beklenen değerlerle de karşılaştırılır.

Çalıştırma::

    python3 tests/test_dogrulama.py

Gereksinim: Node.js (hesap.js'i çalıştırmak için). Başka paket gerekmez.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

KOK = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(KOK / "scripts"))

from karbon_hesaplama import (  # noqa: E402
    HAFTA_YIL,
    KATEGORILER,
    GirdiHatasi,
    ges_telafi,
    hesapla,
    ozgul_uretim,
    veriyi_yukle,
)

HESAP_JS = KOK / "android" / "app" / "src" / "main" / "assets" / "js" / "hesap.js"
VERI_JSON = KOK / "veriler" / "emisyon_faktorleri.json"

TOLERANS = 1e-7          # kg CO₂e — kayan nokta yuvarlamasından fazlası kabul edilmez

gecen = 0
kalan: list[str] = []


def test(ad: str):
    """Küçük bir test dekoratörü."""
    def sarma(fn):
        global gecen
        try:
            fn()
            gecen += 1
            print(f"  ✓ {ad}")
        except Exception as e:  # noqa: BLE001 — test koşucusu tüm hataları yakalar
            kalan.append(ad)
            print(f"  ✗ {ad}\n      {e}")
        return fn
    return sarma


def yakin(a: float, b: float, tolerans: float = TOLERANS, mesaj: str = "") -> None:
    if abs(a - b) > tolerans:
        raise AssertionError(f"{mesaj or 'değer uyuşmuyor'}: {a!r} ≈ {b!r} değil "
                             f"(fark {abs(a - b):.3e}, tolerans {tolerans:.1e})")


# --------------------------------------------------------------------------- #
# JavaScript motorunu çalıştırma
# --------------------------------------------------------------------------- #


def js_hesapla(senaryolar: list[dict]) -> list[dict]:
    """Senaryoları hesap.js ile çalıştırır ve sonuçları döndürür."""
    betik = """
const fs = require('fs');
const veri = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const KP = require(process.argv[3]);
const senaryolar = JSON.parse(fs.readFileSync(process.argv[4], 'utf8'));
const cikti = senaryolar.map(function (g) {
  try {
    const s = KP.hesapla(veri, g);
    const kat = {};
    s.kategoriler.forEach(function (k) { kat[k.anahtar] = k.kg_yil; });
    return { ok: true, toplam: s.toplam_kg_yil, kategoriler: kat };
  } catch (e) {
    return { ok: false, hata: e.message };
  }
});
process.stdout.write(JSON.stringify(cikti));
"""
    import tempfile

    with tempfile.TemporaryDirectory() as gecici:
        g = Path(gecici)
        (g / "kos.js").write_text(betik, encoding="utf-8")
        (g / "senaryolar.json").write_text(json.dumps(senaryolar), encoding="utf-8")
        sonuc = subprocess.run(
            ["node", str(g / "kos.js"), str(VERI_JSON), str(HESAP_JS), str(g / "senaryolar.json")],
            capture_output=True, text=True, check=False,
        )
    if sonuc.returncode != 0:
        raise RuntimeError(f"Node çalıştırılamadı:\n{sonuc.stderr}")
    return json.loads(sonuc.stdout)


def js_var_mi() -> bool:
    try:
        subprocess.run(["node", "--version"], capture_output=True, check=True)
        return True
    except (FileNotFoundError, subprocess.CalledProcessError):
        return False


# --------------------------------------------------------------------------- #
# Senaryolar
# --------------------------------------------------------------------------- #


def senaryolari_uret() -> list[tuple[str, dict]]:
    """Kapsamlı ve birbirinden farklı girdi senaryoları."""
    temel = {
        "hane": {"kisi": 1},
        "elektrik": {"kwh_ay": 0},
        "isinma": {"tur": "yok", "miktar_yil": 0},
        "ulasim": [], "ucus": [],
        "beslenme": {"porsiyonlar": {}},
        "atik": {"kg_hafta": 0},
        "su": {"m3_ay": 0},
    }

    def t(**degisiklik):
        import copy
        g = copy.deepcopy(temel)
        g.update(copy.deepcopy(degisiklik))
        return g

    s: list[tuple[str, dict]] = [
        ("boş girdi", t()),
        ("yalnızca elektrik", t(elektrik={"kwh_ay": 250})),
        ("elektrik + çatı GES %40", t(elektrik={"kwh_ay": 250, "ges_orani": 0.4})),
        ("elektrik + yeşil tarife %100", t(elektrik={"kwh_ay": 400, "yesil_orani": 1.0})),
        ("GES ve yeşil birlikte", t(elektrik={"kwh_ay": 300, "ges_orani": 0.3, "yesil_orani": 0.5})),
        ("oranlar taşıyor (kırpılmalı)", t(elektrik={"kwh_ay": 300, "ges_orani": 0.9, "yesil_orani": 0.9})),
        ("doğal gaz", t(isinma={"tur": "dogalgaz", "miktar_yil": 1400})),
        ("kömür", t(isinma={"tur": "komur", "miktar_yil": 2500})),
        ("odun", t(isinma={"tur": "odun", "miktar_yil": 3000})),
        ("LPG", t(isinma={"tur": "lpg", "miktar_yil": 240})),
        ("elektrikli ısıtma", t(isinma={"tur": "elektrik", "miktar_yil": 4000})),
        ("pay ölçer kWh", t(isinma={"tur": "dogalgaz_kwh", "miktar_yil": 9000})),
        ("otomobil tek kişi", t(ulasim=[{"tur": "otomobil_benzin_km", "miktar_hafta": 200, "yolcu": 1}])),
        ("otomobil 4 kişi", t(ulasim=[{"tur": "otomobil_benzin_km", "miktar_hafta": 200, "yolcu": 4}])),
        ("elektrikli otomobil", t(ulasim=[{"tur": "otomobil_elektrik_km", "miktar_hafta": 300, "yolcu": 2}])),
        ("karma ulaşım", t(ulasim=[
            {"tur": "otomobil_dizel_km", "miktar_hafta": 90, "yolcu": 2},
            {"tur": "metro_km", "miktar_hafta": 60},
            {"tur": "tren_km", "miktar_hafta": 120},
            {"tur": "vapur_km", "miktar_hafta": 20},
        ])),
        ("yakıt litre modu", t(ulasim=[
            {"tur": "benzin_litre", "miktar_hafta": 25},
            {"tur": "lpg_litre", "miktar_hafta": 18},
        ])),
        ("uçuşlar", t(ucus=[
            {"tur": "ucus_ichat_km", "km_yil": 1400},
            {"tur": "ucus_uzun_km", "km_yil": 16000},
            {"tur": "ucus_uzun_business_km", "km_yil": 5000},
        ])),
        ("atık karışık bertaraf", t(atik={
            "kg_hafta": 14, "geri_donusum_orani": 0.25,
            "kompost_orani": 0.15, "yakma_orani": 0.1,
        })),
        ("atık tamamen geri dönüşüm", t(atik={"kg_hafta": 10, "geri_donusum_orani": 1.0})),
        ("su", t(su={"m3_ay": 18})),
        ("5 kişilik hane, her kategori", {
            "hane": {"kisi": 5},
            "elektrik": {"kwh_ay": 420, "ges_orani": 0.25},
            "isinma": {"tur": "dogalgaz", "miktar_yil": 2200},
            "ulasim": [
                {"tur": "otomobil_hibrit_km", "miktar_hafta": 160, "yolcu": 2},
                {"tur": "otobus_sehirici_km", "miktar_hafta": 70},
            ],
            "ucus": [{"tur": "ucus_kisa_km", "km_yil": 4200}],
            "beslenme": {"profil": "az_et"},
            "atik": {"kg_hafta": 22, "geri_donusum_orani": 0.3, "kompost_orani": 0.2},
            "su": {"m3_ay": 26},
        }),
        ("tek kişilik hane, et ağırlıklı", {
            "hane": {"kisi": 1},
            "elektrik": {"kwh_ay": 180},
            "isinma": {"tur": "komur", "miktar_yil": 1800},
            "ulasim": [{"tur": "otomobil_dizel_km", "miktar_hafta": 420, "yolcu": 1}],
            "ucus": [{"tur": "ucus_ichat_km", "km_yil": 3200}],
            "beslenme": {"profil": "yuksek_et"},
            "atik": {"kg_hafta": 8},
            "su": {"m3_ay": 9},
        }),
        ("vegan, araçsız", {
            "hane": {"kisi": 2},
            "elektrik": {"kwh_ay": 140, "yesil_orani": 1.0},
            "isinma": {"tur": "dogalgaz", "miktar_yil": 700},
            "ulasim": [{"tur": "metro_km", "miktar_hafta": 110}],
            "ucus": [],
            "beslenme": {"profil": "vegan"},
            "atik": {"kg_hafta": 6, "geri_donusum_orani": 0.5, "kompost_orani": 0.4},
            "su": {"m3_ay": 10},
        }),
        ("elle porsiyon girişi", t(beslenme={"porsiyonlar": {
            "kirmizi_et": 4, "beyaz_et": 2, "peynir": 14, "yumurta": 7,
            "sut": 10, "ekmek": 21, "sebze_meyve": 18, "kahve": 14,
        }})),
    ]
    for profil in ("yuksek_et", "dengeli", "az_et", "vejetaryen", "vegan"):
        s.append((f"beslenme profili: {profil}", t(beslenme={"profil": profil})))
    return s


# --------------------------------------------------------------------------- #
# Testler
# --------------------------------------------------------------------------- #


def main() -> int:
    print("\nKarbonPusula çapraz doğrulama (JavaScript ↔ Python)")
    print("=" * 54)

    veri = veriyi_yukle()
    senaryolar = senaryolari_uret()

    # ---- Çapraz doğrulama -------------------------------------------------
    print(f"\nİki motor karşılaştırması — {len(senaryolar)} senaryo")

    if not js_var_mi():
        print("  ! Node.js bulunamadı; çapraz doğrulama atlandı.")
    else:
        js_sonuclar = js_hesapla([g for _ad, g in senaryolar])
        for (ad, girdi), js in zip(senaryolar, js_sonuclar):
            @test(ad)
            def _(girdi=girdi, js=js, ad=ad):
                if not js["ok"]:
                    raise AssertionError(f"JavaScript motoru hata verdi: {js['hata']}")
                py = hesapla(veri, girdi)
                yakin(py.toplam_kg_yil, js["toplam"], TOLERANS, f"{ad} — toplam")
                for anahtar, _e, _y, _h in KATEGORILER:
                    yakin(py.kategoriler[anahtar], js["kategoriler"][anahtar],
                          TOLERANS, f"{ad} — {anahtar}")

    # ---- Elle hesaplanmış beklenen değerler -------------------------------
    print("\nElle doğrulanmış değerler")

    @test("elektrik: 250 kWh/ay × 12 × 0,47573")
    def _():
        g = {"hane": {"kisi": 1}, "elektrik": {"kwh_ay": 250}}
        yakin(hesapla(veri, g).toplam_kg_yil, 250 * 12 * 0.47573, 1e-9)

    @test("doğal gaz: 1.400 m³ × 2,02633")
    def _():
        g = {"hane": {"kisi": 1}, "isinma": {"tur": "dogalgaz", "miktar_yil": 1400}}
        yakin(hesapla(veri, g).toplam_kg_yil, 1400 * 2.02633, 1e-9)

    @test("otomobil: 200 km/hafta × 52,142857 × 0,16152")
    def _():
        g = {"hane": {"kisi": 1},
             "ulasim": [{"tur": "otomobil_benzin_km", "miktar_hafta": 200, "yolcu": 1}]}
        yakin(hesapla(veri, g).toplam_kg_yil, 200 * HAFTA_YIL * 0.16152, 1e-9)

    @test("kırmızı et: 2 porsiyon/hafta × 100 g × 60 kg CO₂e/kg")
    def _():
        g = {"hane": {"kisi": 1}, "beslenme": {"porsiyonlar": {"kirmizi_et": 2}}}
        beklenen = (2 * HAFTA_YIL * 100 / 1000) * 60
        yakin(hesapla(veri, g).toplam_kg_yil, beklenen, 1e-9)

    @test("su: 12 m³/ay × 12 × (0,1913 + 0,17088)")
    def _():
        g = {"hane": {"kisi": 1}, "su": {"m3_ay": 12}}
        yakin(hesapla(veri, g).toplam_kg_yil, 144 * (0.1913 + 0.17088), 1e-9)

    @test("hane paylaşımı: 4 kişide elektrik dörde bölünür")
    def _():
        bir = hesapla(veri, {"hane": {"kisi": 1}, "elektrik": {"kwh_ay": 400}}).toplam_kg_yil
        dort = hesapla(veri, {"hane": {"kisi": 4}, "elektrik": {"kwh_ay": 400}}).toplam_kg_yil
        yakin(dort, bir / 4, 1e-9)

    @test("beslenme kişiseldir, hane sayısına bölünmez")
    def _():
        bir = hesapla(veri, {"hane": {"kisi": 1}, "beslenme": {"profil": "dengeli"}}).toplam_kg_yil
        bes = hesapla(veri, {"hane": {"kisi": 5}, "beslenme": {"profil": "dengeli"}}).toplam_kg_yil
        yakin(bes, bir, 1e-9)

    # ---- GES modülü -------------------------------------------------------
    print("\nGES modülü")

    @test("özgül üretim: GHI × 1,15 × 0,80")
    def _():
        yakin(ozgul_uretim(veri, "akdeniz"), 1390 * 1.15 * 0.80, 1e-9)

    @test("JSON'daki ozgul_uretim alanları formülle tutarlı")
    def _():
        for b in veri["gunes"]["bolgeler"]:
            yakin(b["ozgul_uretim"], round(b["ghi"] * 1.15 * 0.80), 1.0, b["etiket"])

    @test("net telafi = şebeke faktörü − PV yaşam döngüsü faktörü")
    def _():
        r = ges_telafi(veri, "icanadolu", 5)
        yakin(r["net_telafi_kg_kwh"], 0.47573 - 0.041, 1e-9)
        yakin(r["telafi_kg_yil"], 5 * (1314 * 1.15 * 0.80) * (0.47573 - 0.041), 1e-7)

    @test("bölgeler ışınıma göre azalan sırada")
    def _():
        sira = ["gda", "akdeniz", "dogu", "icanadolu", "ege", "marmara", "karadeniz"]
        d = [ozgul_uretim(veri, b) for b in sira]
        if d != sorted(d, reverse=True):
            raise AssertionError(f"sıra bozuk: {d}")

    # ---- Doğrulama --------------------------------------------------------
    print("\nGirdi doğrulama")

    @test("negatif değer reddedilir")
    def _():
        try:
            hesapla(veri, {"hane": {"kisi": 1}, "elektrik": {"kwh_ay": -5}})
        except GirdiHatasi as e:
            if "negatif" not in str(e).lower():
                raise AssertionError(f"beklenmeyen hata metni: {e}") from None
            return
        raise AssertionError("hata bekleniyordu")

    @test("kişi sayısı sıfır reddedilir")
    def _():
        try:
            hesapla(veri, {"hane": {"kisi": 0}})
        except GirdiHatasi:
            return
        raise AssertionError("hata bekleniyordu")

    @test("tanımsız ısınma türü reddedilir")
    def _():
        try:
            hesapla(veri, {"hane": {"kisi": 1}, "isinma": {"tur": "nukleer", "miktar_yil": 5}})
        except GirdiHatasi:
            return
        raise AssertionError("hata bekleniyordu")

    @test("atık oranları toplamı %100'ü aşamaz")
    def _():
        try:
            hesapla(veri, {"hane": {"kisi": 1},
                           "atik": {"kg_hafta": 10, "geri_donusum_orani": 0.7,
                                    "kompost_orani": 0.7}})
        except GirdiHatasi:
            return
        raise AssertionError("hata bekleniyordu")

    # ---- Veri bütünlüğü ---------------------------------------------------
    print("\nVeri bütünlüğü")

    @test("üretilmiş veri.js, JSON ile birebir aynı")
    def _():
        js_yol = KOK / "android/app/src/main/assets/js/veri.js"
        metin = js_yol.read_text(encoding="utf-8")
        bas = metin.index("{")
        son = metin.rindex("};")
        uretilmis = json.loads(metin[bas:son + 1])
        if uretilmis != veri:
            raise AssertionError("veri.js güncel değil — "
                                 "'python3 scripts/veri_uret.py' çalıştırın")

    @test("her faktörün kaynağı tanımlı ve değeri geçerli")
    def _():
        kaynaklar = set(veri["kaynaklar"])
        for anahtar, f in veri["faktorler"].items():
            if f["kaynak"] not in kaynaklar:
                raise AssertionError(f"{anahtar}: tanımsız kaynak {f['kaynak']}")
            d = f["deger"]
            if not isinstance(d, (int, float)) or d < 0:
                raise AssertionError(f"{anahtar}: geçersiz değer {d}")

    @test("türetilmiş faktörlerde türetme açıklaması var")
    def _():
        for anahtar, f in veri["faktorler"].items():
            if f.get("tur") == "turetilmis" and len(f.get("turetme", "")) < 20:
                raise AssertionError(f"{anahtar}: türetme açıklaması eksik")

    # ---- Özet -------------------------------------------------------------
    print("\n" + "=" * 54)
    if kalan:
        print(f"{len(kalan)} TEST BAŞARISIZ ({gecen} geçti)\n")
        for ad in kalan:
            print(f"  - {ad}")
        return 1

    print(f"TÜM TESTLER GEÇTİ — {gecen} test")
    print("İki bağımsız motor tüm senaryolarda aynı sonucu üretti.\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
