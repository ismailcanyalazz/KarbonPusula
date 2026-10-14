# Eski sürüm hakkında

Projenin ilk hâli Streamlit tabanlı bir Python web uygulamasıydı. O sürüm iki
nedenle devam ettirilmedi:

1. **Emisyon faktörlerinin tamamı sentetik örnekti.** Kodun kendi yorum
   satırlarında da belirtildiği gibi, katsayılar hiçbir kaynağa dayanmıyordu;
   dolayısıyla sonuçlar gerçek bir ayak izi ölçümü değildi.
2. **Streamlit bir sunucu uygulamasıdır.** Çalışmak için Python ortamı ve
   çalışan bir sunucu gerekir; telefona kurulabilen bir APK üretilemez.

Yeni sürümde her iki sorun da çözüldü: 32 emisyon faktörünün tamamı kurumsal
kaynaklara dayandırıldı ve uygulama çevrimdışı çalışan bir Android uygulamasına
dönüştürüldü.

## Silinebilecek dosyalar

Proje klasörünün kökünde eski sürümden kalan şu dosyalar artık kullanılmıyor ve
silinebilir (ya da bu `arsiv/` klasörüne taşınabilir):

```
app.py                            Streamlit arayüzü
karbon_hesaplama.py               Eski hesap modülü — sentetik faktörler
requirements.txt                  Streamlit ve pandas bağımlılıkları
tests/test_karbon_hesaplama.py    Eski modülün testleri
.streamlit/                       Streamlit yapılandırması
```

`.venv/` klasörü de yalnızca Streamlit için kurulmuştu; yeni sürüm hiçbir Python
paketi gerektirmez (doğrulama betikleri yalnızca standart kütüphaneyi kullanır).
İsterseniz silebilirsiniz.

## Karşılık gelen yeni dosyalar

| Eski | Yeni |
|---|---|
| `karbon_hesaplama.py` | `android/app/src/main/assets/js/hesap.js` (uygulama motoru) |
| | `scripts/karbon_hesaplama.py` (bağımsız doğrulama motoru) |
| `app.py` | `android/app/src/main/assets/` (arayüzün tamamı) |
| `tests/test_karbon_hesaplama.py` | `tests/test_hesap.js` + `tests/test_dogrulama.py` |
| Koda gömülü sentetik faktörler | `veriler/emisyon_faktorleri.json` |
