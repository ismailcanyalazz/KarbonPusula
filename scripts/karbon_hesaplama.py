#!/usr/bin/env python3
"""KarbonPusula hesap motorunun bağımsız Python uygulaması.

Amaç
----
Uygulamada çalışan motor JavaScript ile yazılmıştır (``hesap.js``). Bu dosya
aynı yöntemi, aynı veri kaynağından (``veriler/emisyon_faktorleri.json``)
okuyarak Python'da yeniden uygular.

İki bağımsız uygulamanın aynı girdi için aynı sonucu vermesi, hesabın
kodlama hatasından arınmış olduğunun güçlü bir göstergesidir — bu tür
çapraz doğrulama, mühendislik hesaplarının denetiminde standart bir
uygulamadır. Karşılaştırmayı ``tests/test_dogrulama.py`` yapar.

Bu dosya ayrıca komut satırından tek başına kullanılabilir::

    python3 scripts/karbon_hesaplama.py            # örnek hane
    python3 scripts/karbon_hesaplama.py girdi.json # kendi girdinizle
"""

from __future__ import annotations

import json
import math
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

KOK = Path(__file__).resolve().parent.parent
VERI_YOLU = KOK / "veriler" / "emisyon_faktorleri.json"

HAFTA_YIL = 365.0 / 7.0          # 52,142857…
AY_YIL = 12

# Görüntüleme kategorileri: (anahtar, etiket, renk yuvası, hane bazlı mı)
KATEGORILER: list[tuple[str, str, int, bool]] = [
    ("elektrik", "Elektrik", 1, True),
    ("isinma", "Isınma", 2, True),
    ("ulasim", "Ulaşım", 3, False),
    ("ucus", "Uçuş", 4, False),
    ("beslenme", "Beslenme", 5, False),
    ("atiksu", "Atık ve su", 6, True),
]

ISINMA_ESLESME = {
    "dogalgaz": "dogalgaz_m3",
    "dogalgaz_kwh": "dogalgaz_kwh",
    "lpg": "lpg_kg",
    "komur": "komur_kg",
    "odun": "odun_kg",
    "elektrik": "elektrik_sebeke",
}


class GirdiHatasi(ValueError):
    """Kullanıcıya gösterilebilir doğrulama hatası."""


@dataclass
class Sonuc:
    """Hesap çıktısı."""

    kategoriler: dict[str, float] = field(default_factory=dict)
    toplam_kg_yil: float = 0.0
    hane_kisi: int = 1

    @property
    def toplam_ton_yil(self) -> float:
        return self.toplam_kg_yil / 1000.0

    @property
    def toplam_kg_ay(self) -> float:
        return self.toplam_kg_yil / AY_YIL


def veriyi_yukle(yol: Path | None = None) -> dict[str, Any]:
    """Emisyon faktörü veri setini okur."""
    with (yol or VERI_YOLU).open(encoding="utf-8") as f:
        return json.load(f)


# --------------------------------------------------------------------------- #
# Yardımcılar
# --------------------------------------------------------------------------- #


def _sayi(deger: Any, varsayilan: float = 0.0) -> float:
    """Girdiyi sonlu bir sayıya çevirir; çeviremezse varsayılanı verir."""
    if isinstance(deger, bool) or deger is None:
        return varsayilan
    try:
        n = float(deger)
    except (TypeError, ValueError):
        return varsayilan
    return n if math.isfinite(n) else varsayilan


def _pozitif(deger: Any) -> float:
    return max(0.0, _sayi(deger, 0.0))


def _faktor(veri: dict, anahtar: str) -> float:
    try:
        return float(veri["faktorler"][anahtar]["deger"])
    except KeyError as e:
        raise GirdiHatasi(f"Tanımsız emisyon faktörü: {anahtar}") from e


# --------------------------------------------------------------------------- #
# Doğrulama
# --------------------------------------------------------------------------- #


def dogrula(girdi: dict) -> list[str]:
    """Girdiyi denetler; boş liste dönerse girdi geçerlidir."""
    hatalar: list[str] = []

    kisi = girdi.get("hane", {}).get("kisi")
    if not isinstance(kisi, (int, float)) or isinstance(kisi, bool) or kisi < 1:
        hatalar.append("Hanedeki kişi sayısı en az 1 olmalıdır.")
    elif kisi > 30:
        hatalar.append("Hanedeki kişi sayısı 30'dan büyük olamaz.")

    def denetle(deger: Any, ad: str) -> None:
        if deger is None or deger == "":
            return
        if isinstance(deger, bool) or not isinstance(deger, (int, float)):
            try:
                deger = float(deger)
            except (TypeError, ValueError):
                hatalar.append(f"{ad}: geçerli bir sayı girin.")
                return
        if not math.isfinite(float(deger)):
            hatalar.append(f"{ad}: sayı sonlu olmalıdır.")
        elif float(deger) < 0:
            hatalar.append(f"{ad}: negatif değer kullanılamaz.")

    denetle(girdi.get("elektrik", {}).get("kwh_ay"), "Aylık elektrik tüketimi")
    denetle(girdi.get("isinma", {}).get("miktar_yil"), "Yıllık ısınma yakıtı")
    denetle(girdi.get("su", {}).get("m3_ay"), "Aylık su tüketimi")
    denetle(girdi.get("atik", {}).get("kg_hafta"), "Haftalık atık miktarı")

    for i, s in enumerate(girdi.get("ulasim") or []):
        denetle(s.get("miktar_hafta"), f"Ulaşım {i + 1} miktarı")
    for i, s in enumerate(girdi.get("ucus") or []):
        denetle(s.get("km_yil"), f"Uçuş {i + 1} mesafesi")

    atik = girdi.get("atik") or {}
    toplam_oran = sum(
        _pozitif(atik.get(k))
        for k in ("depolama_orani", "geri_donusum_orani", "kompost_orani", "yakma_orani")
    )
    if toplam_oran > 1.0001:
        hatalar.append("Atık bertaraf oranlarının toplamı %100'ü aşamaz.")

    return hatalar


# --------------------------------------------------------------------------- #
# Kategori hesapları
# --------------------------------------------------------------------------- #


def _elektrik(veri: dict, girdi: dict) -> float:
    e = girdi.get("elektrik") or {}
    yillik = _pozitif(e.get("kwh_ay")) * AY_YIL
    if yillik <= 0:
        return 0.0

    ges = min(1.0, max(0.0, _sayi(e.get("ges_orani"))))
    yesil = min(1.0 - ges, max(0.0, _sayi(e.get("yesil_orani"))))
    sebeke = max(0.0, 1.0 - ges - yesil)

    return (
        yillik * sebeke * _faktor(veri, "elektrik_sebeke")
        + yillik * ges * _faktor(veri, "elektrik_ozgun_ges")
        + yillik * yesil * _faktor(veri, "elektrik_yesil_tarife")
    )


def _isinma(veri: dict, girdi: dict) -> float:
    i = girdi.get("isinma") or {}
    tur = i.get("tur")
    miktar = _pozitif(i.get("miktar_yil"))
    if miktar <= 0 or not tur or tur == "yok":
        return 0.0
    if tur not in ISINMA_ESLESME:
        raise GirdiHatasi(f"Tanımsız ısınma türü: {tur}")
    return miktar * _faktor(veri, ISINMA_ESLESME[tur])


def _ulasim(veri: dict, girdi: dict) -> float:
    toplam = 0.0
    for s in girdi.get("ulasim") or []:
        hafta = _pozitif(s.get("miktar_hafta"))
        tur = s.get("tur")
        if hafta <= 0 or not tur:
            continue
        tanim = veri["faktorler"].get(tur)
        if tanim is None:
            raise GirdiHatasi(f"Tanımsız emisyon faktörü: {tur}")
        yolcu = max(1.0, _sayi(s.get("yolcu"), 1.0)) if tanim["birim_faaliyet"] == "araç-km" else 1.0
        toplam += (hafta * HAFTA_YIL * float(tanim["deger"])) / yolcu
    return toplam


def _ucus(veri: dict, girdi: dict) -> float:
    toplam = 0.0
    for s in girdi.get("ucus") or []:
        km = _pozitif(s.get("km_yil"))
        tur = s.get("tur")
        if km <= 0 or not tur:
            continue
        toplam += km * _faktor(veri, tur)
    return toplam


def _beslenme(veri: dict, girdi: dict) -> float:
    b = girdi.get("beslenme") or {}
    porsiyonlar = b.get("porsiyonlar")

    if not porsiyonlar and b.get("profil"):
        profil = veri["beslenme"]["hazir_profiller"].get(b["profil"])
        if profil is None:
            raise GirdiHatasi(f"Tanımsız beslenme profili: {b['profil']}")
        porsiyonlar = profil["carpanlar"]
    if not porsiyonlar:
        return 0.0

    toplam = 0.0
    for kalem in veri["beslenme"]["kalemler"]:
        adet = _pozitif(porsiyonlar.get(kalem["anahtar"]))
        if adet <= 0:
            continue
        kg_gida = (adet * HAFTA_YIL * kalem["porsiyon_g"]) / 1000.0
        toplam += kg_gida * float(kalem["faktor"])
    return toplam


def _atik_su(veri: dict, girdi: dict) -> float:
    toplam = 0.0

    a = girdi.get("atik") or {}
    atik_yil = _pozitif(a.get("kg_hafta")) * HAFTA_YIL
    if atik_yil > 0:
        geri = min(1.0, _pozitif(a.get("geri_donusum_orani")))
        kompost = min(1.0 - geri, _pozitif(a.get("kompost_orani")))
        yakma = min(1.0 - geri - kompost, _pozitif(a.get("yakma_orani")))
        depolama = max(0.0, 1.0 - geri - kompost - yakma)

        toplam += atik_yil * depolama * _faktor(veri, "atik_depolama_kg")
        toplam += atik_yil * geri * _faktor(veri, "atik_geridonusum_kg")
        toplam += atik_yil * kompost * _faktor(veri, "atik_kompost_kg")
        toplam += atik_yil * yakma * _faktor(veri, "atik_yakma_kg")

    su_yil = _pozitif((girdi.get("su") or {}).get("m3_ay")) * AY_YIL
    if su_yil > 0:
        toplam += su_yil * _faktor(veri, "su_sebeke_m3")
        toplam += su_yil * _faktor(veri, "su_atiksu_m3")

    return toplam


# --------------------------------------------------------------------------- #
# Ana hesap
# --------------------------------------------------------------------------- #


def hesapla(veri: dict, girdi: dict) -> Sonuc:
    """Kişi başı yıllık karbon ayak izini hesaplar."""
    hatalar = dogrula(girdi)
    if hatalar:
        raise GirdiHatasi("\n".join(hatalar))

    kisi = max(1.0, _sayi(girdi.get("hane", {}).get("kisi"), 1.0))

    ham = {
        "elektrik": _elektrik(veri, girdi),
        "isinma": _isinma(veri, girdi),
        "ulasim": _ulasim(veri, girdi),
        "ucus": _ucus(veri, girdi),
        "beslenme": _beslenme(veri, girdi),
        "atiksu": _atik_su(veri, girdi),
    }

    sonuc = Sonuc(hane_kisi=int(kisi))
    for anahtar, _etiket, _yuva, hane_bazli in KATEGORILER:
        deger = ham[anahtar] / (kisi if hane_bazli else 1.0)
        sonuc.kategoriler[anahtar] = deger
        sonuc.toplam_kg_yil += deger

    return sonuc


def ozgul_uretim(veri: dict, bolge_anahtar: str) -> float:
    """GES özgül üretimi: E = GHI × K_eğim × PR  [kWh/kWp·yıl]"""
    yontem = veri["gunes"]["yontem"]
    for b in veri["gunes"]["bolgeler"]:
        if b["anahtar"] == bolge_anahtar:
            return b["ghi"] * yontem["k_egim"] * yontem["pr"]
    raise GirdiHatasi(f"Tanımsız bölge: {bolge_anahtar}")


def ges_telafi(veri: dict, bolge: str, kwp: float) -> dict[str, float]:
    """Çatı GES'in yıllık üretimi ve net CO₂ telafisi."""
    ozgul = ozgul_uretim(veri, bolge)
    uretim = _pozitif(kwp) * ozgul
    net = max(0.0, _faktor(veri, "elektrik_sebeke") - _faktor(veri, "elektrik_ozgun_ges"))
    return {
        "ozgul_uretim_kwh_kwp": ozgul,
        "uretim_kwh_yil": uretim,
        "net_telafi_kg_kwh": net,
        "telafi_kg_yil": uretim * net,
    }


# --------------------------------------------------------------------------- #
# Komut satırı
# --------------------------------------------------------------------------- #


ORNEK_GIRDI = {
    "hane": {"kisi": 3},
    "elektrik": {"kwh_ay": 280},
    "isinma": {"tur": "dogalgaz", "miktar_yil": 1400},
    "ulasim": [
        {"tur": "otomobil_benzin_km", "miktar_hafta": 180, "yolcu": 1},
        {"tur": "metro_km", "miktar_hafta": 40},
    ],
    "ucus": [{"tur": "ucus_ichat_km", "km_yil": 1800}],
    "beslenme": {"profil": "dengeli"},
    "atik": {"kg_hafta": 12, "geri_donusum_orani": 0.2, "kompost_orani": 0.05},
    "su": {"m3_ay": 14},
}


def main(argv: list[str]) -> int:
    veri = veriyi_yukle()

    if len(argv) > 1:
        with open(argv[1], encoding="utf-8") as f:
            girdi = json.load(f)
    else:
        girdi = ORNEK_GIRDI
        print("Örnek hane kullanılıyor (kendi girdiniz için: "
              "python3 scripts/karbon_hesaplama.py girdi.json)\n")

    try:
        sonuc = hesapla(veri, girdi)
    except GirdiHatasi as hata:
        print("Girdi hatası:\n" + str(hata), file=sys.stderr)
        return 1

    print(f"Hane: {sonuc.hane_kisi} kişi\n")
    print(f"{'Kategori':<14}{'kg CO₂e/yıl':>14}{'Pay':>9}")
    print("-" * 37)
    for anahtar, etiket, _yuva, _hane in KATEGORILER:
        kg = sonuc.kategoriler[anahtar]
        pay = kg / sonuc.toplam_kg_yil * 100 if sonuc.toplam_kg_yil else 0
        print(f"{etiket:<14}{kg:>14,.0f}{pay:>8.1f}%")
    print("-" * 37)
    print(f"{'TOPLAM':<14}{sonuc.toplam_kg_yil:>14,.0f}")
    print(f"\nKişi başı: {sonuc.toplam_ton_yil:.2f} ton CO₂e/yıl "
          f"({sonuc.toplam_kg_ay:,.0f} kg/ay)")

    kiyas = veri["kiyaslama"]
    print(f"Türkiye ortalaması ({kiyas['turkiye_kisi_basi']['deger']} t) ile oranı: "
          f"%{sonuc.toplam_ton_yil / kiyas['turkiye_kisi_basi']['deger'] * 100:.0f}")
    print(f"1,5 °C hedefinin ({kiyas['paris_hedefi']['deger']} t) "
          f"{sonuc.toplam_ton_yil / kiyas['paris_hedefi']['deger']:.2f} katı")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
