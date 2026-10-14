# Bitirme Projesi Raporu — Taslak

**KarbonPusula: Yenilenebilir Enerji Odaklı Kişisel Karbon Ayak İzi
Hesaplama ve Çatı GES Telafi Uygulaması**

> Bu taslak, raporun iskeletini ve her bölümde yazılacakları içerir. Gri
> kutudaki notlar size yöneliktir, rapora alınmaz. Teknik içeriğin tamamı
> `YONTEM_VE_KAYNAKCA.md` dosyasından alınabilir.
>
> Okulunuzun yazım kılavuzundaki başlık numaralandırması, yazı tipi ve kenar
> boşlukları kurallarına göre uyarlayın.

---

## Özet

> **150–250 kelime.** Şu beş soruyu sırayla yanıtlayın: ne yapıldı, neden
> gerekliydi, nasıl yapıldı, ne bulundu, ne anlama geliyor.

**Örnek taslak:**

Bu çalışmada, bireylerin yıllık karbon ayak izini hesaplayan ve bu ayak izinin
çatı tipi fotovoltaik sistemle ne ölçüde telafi edilebileceğini gösteren
Android tabanlı bir mobil uygulama (KarbonPusula) geliştirilmiştir. Mevcut
hesaplama araçlarının çoğu yabancı kaynaklı emisyon faktörleri kullanmakta,
hesap yöntemini kullanıcıya açıklamamakta ve yenilenebilir enerji ile telafi
boyutunu içermemektedir. Geliştirilen uygulamada elektrik için Türkiye'ye özgü
şebeke emisyon faktörü (0,476 kg CO₂e/kWh) kullanılmış; ısınma, ulaşım, uçuş,
beslenme, atık ve su kategorileri için uluslararası kurumsal kaynaklardan
alınan 32 emisyon faktörü, kaynak ve kapsam bilgisiyle birlikte uygulamaya
gömülmüştür. Elektrik içeren tüm faktörler Türkiye şebeke karışımıyla yeniden
türetilmiştir. Uygulamaya ayrıca, yedi coğrafi bölge için `E = GHI × K_eğim × PR`
bağıntısıyla özgül üretim hesaplayan bir çatı GES modülü eklenmiştir. Hesap
motoru, JavaScript ve Python'da bağımsız olarak iki kez uygulanmış ve 28 farklı
senaryoda çapraz doğrulanmıştır; toplam 110 otomatik test kullanılmıştır.
Üç kişilik referans bir hane için sonuç 5,98 ton CO₂e/kişi·yıl olarak
hesaplanmış, bu değer TÜİK'in 2024 Türkiye ortalaması olan 6,8 tonun %88'ine
karşılık gelmiştir. Uygulama tamamen çevrimdışı çalışmakta ve hiçbir Android
izni talep etmemektedir.

**Anahtar kelimeler:** karbon ayak izi, sera gazı emisyonu, fotovoltaik enerji,
emisyon faktörü, mobil uygulama, Android

---

## 1. Giriş

### 1.1 Problemin tanımı

> Şunları işleyin:
> - İklim değişikliği ve Türkiye'nin durumu. TÜİK 2024: toplam 584,5 Mt CO₂e,
>   kişi başı 6,8 ton; 2023'te 6,5 tondu — artış eğilimi var.
> - Paris Anlaşması ve Türkiye'nin 2053 net sıfır hedefi.
> - Bireysel farkındalığın rolü: ölçülemeyen azaltılamaz.

### 1.2 Mevcut durum ve eksiklikler

> Var olan hesaplayıcıların üç zayıf noktası — bunlar projenizin varlık
> gerekçesidir:
>
> 1. **Faktör şeffaflığı yok.** Çoğu araç hangi katsayıyı, hangi yıldan, hangi
>    kurumdan aldığını göstermez. Kullanıcı sonucu doğrulayamaz.
> 2. **Ülkeye uyarlama yok.** Yabancı araçlar elektrik için kendi şebeke
>    faktörlerini kullanır. Elektrikli araç örneği çarpıcıdır: Birleşik Krallık
>    faktörüyle (0,131 kg CO₂e/kWh) hesaplanan bir elektrikli otomobil,
>    Türkiye'de gerçekte olduğundan ~3,6 kat temiz görünür.
> 3. **Telafi boyutu yok.** "Ayak iziniz şu kadar" denir ama "ne yapmalısınız"
>    kısmı genel tavsiyelerle geçiştirilir; yenilenebilir kurulumla sayısal
>    bağlantı kurulmaz.

### 1.3 Projenin amacı ve kapsamı

> **Amaç:** Türkiye koşullarına uyarlanmış, her katsayısı kaynaklı ve kullanıcıya
> açık, çevrimdışı çalışan, çatı GES telafi analizi içeren bir mobil uygulama
> geliştirmek.
>
> **Kapsam (yapılanlar):** altı kategori, 32 kaynaklı emisyon faktörü, GES
> modülü, geçmiş kaydı, HTML rapor çıktısı, Android APK.
>
> **Kapsam dışı:** satın alınan mal ve hizmetler, konutun gömülü karbonu, kamu
> hizmetleri payı. (`YONTEM_VE_KAYNAKCA.md` Bölüm 5'teki yedi maddeyi buraya
> taşıyın — sınırlarını bilmek, jüri önünde güçlü bir duruştur.)

---

## 2. Kuramsal Temeller

### 2.1 Sera gazları ve küresel ısınma potansiyeli

> CO₂, CH₄, N₂O. GWP kavramı ve neden 100 yıllık ufuk kullanıldığı. AR5
> değerleri: CH₄ = 28, N₂O = 265. CO₂ eşdeğeri tanımı.

### 2.2 Karbon ayak izi ve kapsam sınıflandırması

> GHG Protocol Kapsam 1 / 2 / 3. Üretim temelli ile tüketim temelli muhasebe
> arasındaki fark. Hangisini kullandığınızı ve nedenini belirtin.

### 2.3 Emisyon faktörü kavramı

> `E = A × EF` bağıntısı. Faktörün ülke, yıl, kapsam ve birim bilgisiyle birlikte
> anlam kazandığı — bu üçü belirtilmeden bir faktör kullanılamaz.

### 2.4 Fotovoltaik sistemlerde enerji verimi

> Bu bölüm sizin uzmanlık alanınız; en ayrıntılı bölüm olmalı.
>
> - Global yatay ışınım (GHI), direkt ve difüz bileşenler.
> - Eğim ve azimut etkisi; Türkiye enlemleri için optimum eğim 30–35°.
> - **Performans oranı (PR)** ve bileşenleri: sıcaklık kaybı %7–10, evirici
>   %2–4, kablo %1–2, kirlenme %2–3, modül uyumsuzluğu %1–2, gölgelenme.
>   IEC 61724 tanımı.
> - Fotovoltaiğin yaşam döngüsü emisyonu: çatı tipi için 41 g CO₂e/kWh (IPCC
>   AR5). **Enerji geri ödeme süresi** kavramı.
> - Türkiye'de lisanssız üretim ve mahsuplaşma mevzuatına kısa değinme.

---

## 3. Materyal ve Yöntem

> Bu bölümün tamamı `YONTEM_VE_KAYNAKCA.md` dosyasından alınabilir. Her
> alt bölümün formüllerini ve tablolarını oraya bakarak yazın.

### 3.1 Genel hesap yaklaşımı
> `E = A × EF`, kategori toplamı, GWP temeli, hane paylaşımı mantığı, zaman
> dönüşümleri (Bölüm 1).

### 3.2 Emisyon faktörlerinin seçimi
> Her kategori için hangi kaynak ve neden. **Ortalama şebeke faktörü ile CDM
> marjinal faktörü arasındaki ayrımı mutlaka açıklayın** — bu, raporun en
> teknik ve en değerli noktalarından biridir (Bölüm 2.1).

### 3.3 Türkiye'ye uyarlama
> Elektrikli araç ve LPG'li araç faktörlerinin yeniden türetilmesi. YEK-G ve
> piyasa temelli muhasebe (Bölüm 2.1, 2.3).

### 3.4 Kategori hesapları
> Elektrik, ısınma, ulaşım, uçuş, beslenme, atık ve su — her biri için formül
> ve faktör tablosu (Bölüm 2.1–2.6).

### 3.5 Çatı GES telafi modülü
> `E = GHI × K_eğim × PR`, bölgesel tablo, ulusal doğrulama, net telafi
> hesabı, sistem boyutlandırma (Bölüm 3).

### 3.6 Yazılım mimarisi

```
┌──────────────────────────────────────────────┐
│  Android kabuğu (Java)                       │
│  WebViewAssetLoader · paylaşım köprüsü       │
├──────────────────────────────────────────────┤
│  Arayüz (ui.js) · Grafikler (grafik.js)      │
│  Yerel depolama (depolama.js)                │
├──────────────────────────────────────────────┤
│  Hesap motoru (hesap.js)  ← arayüzden bağımsız│
├──────────────────────────────────────────────┤
│  Veri katmanı (emisyon_faktorleri.json)      │
│         tek doğruluk kaynağı                 │
└──────────────────────────────────────────────┘
```

> Vurgulanacak tasarım kararları:
> - **Tek veri kaynağı.** Tüm faktörler tek bir JSON'da. Uygulamanın veri modülü
>   bu dosyadan otomatik üretilir; testler ikisinin eşleştiğini denetler. Bir
>   faktörün bir yerde güncellenip başka yerde eski kalması yapısal olarak
>   imkânsızdır.
> - **Katman ayrımı.** Hesap motoru arayüzü bilmez; bu yüzden ayrıca test
>   edilebilir ve başka bir arayüze taşınabilir.
> - **Çevrimdışı çalışma.** Hiçbir ağ isteği yok, hiçbir Android izni yok.
>   Kullanıcı verisi cihazdan çıkmaz. Gizlilik, bir özellik değil tasarım
>   kararıdır.
> - **WebViewAssetLoader.** Varlıklar `file://` yerine sanal bir `https://`
>   kaynağında sunulur; böylece yerel depolama kısıtlamaları aşılır ve güvenlik
>   modeli sağlamlaşır.

### 3.7 Doğrulama yöntemi
> Üç katmanlı doğrulama (Bölüm 6): 62 birim testi, 48 çapraz doğrulama testi,
> veri bütünlüğü denetimi.
>
> **Çapraz doğrulamanın gerçek bir hata yakaladığını mutlaka yazın:** JavaScript
> motoru yıldaki hafta sayısı için yuvarlanmış sabit (52,1429) kullanırken Python
> motoru 365/7 bölmesini yapıyordu. Binde birlik fark testlerde görüldü ve
> düzeltildi. Bu, doğrulama yönteminin işe yaradığının somut kanıtıdır — jüriye
> anlatacak en iyi hikâyelerden biri.

---

## 4. Bulgular

### 4.1 Geliştirilen uygulama

> Beş ekranı ekran görüntüleriyle tanıtın. Görseller
> `dokumantasyon/gorseller/` klasöründedir (açık ve koyu tema ayrı ayrı).
>
> | Ekran | Dosya | Anlatılacak |
> |---|---|---|
> | Hesapla | `koyu-hesapla.png` | Kategori bölümleri, anlık hesap |
> | Sonuç | `koyu-sonuc.png` | Kahraman sayı, kıyaslama, halka grafik |
> | GES | `koyu-ges.png` | Bölge seçimi, kurulu güç, telafi, formül |
> | Geçmiş | `koyu-gecmis.png` | Ölçüm karşılaştırması |
> | Bilgi | `koyu-bilgi.png` | Faktör listesi ve kaynakça |

### 4.2 Referans hane sonucu

| Kategori | kg CO₂e/yıl | Pay |
|---|---:|---:|
| Beslenme | 2.429 | %40,6 |
| Ulaşım | 1.560 | %26,1 |
| Isınma | 946 | %15,8 |
| Elektrik | 533 | %8,9 |
| Uçuş | 413 | %6,9 |
| Atık ve su | 98 | %1,6 |
| **Toplam** | **5.979** | **%100** |

> Referans hane: 3 kişi, Ankara, 280 kWh/ay elektrik, 1.400 m³/yıl doğal gaz,
> haftada 180 km benzinli otomobil + 40 km metro, yılda 1.800 yolcu-km iç hat
> uçuş, dengeli beslenme, haftada 12 kg atık (%20 geri dönüşüm, %5 kompost),
> 14 m³/ay su.
>
> **Sonuç: 5,98 ton CO₂e/kişi·yıl** — TÜİK 2024 Türkiye ortalamasının (6,8 ton)
> %88'i; 1,5 °C hedefinin (2,3 ton) 2,60 katı.
>
> Beslenmenin birinci sırada çıkması beklenen bir bulgudur ve tartışmaya değer:
> kırmızı et kilogram başına 60 kg CO₂e ile zincirin en yoğun kalemidir.

### 4.3 GES telafi analizi

> Bir örnek üzerinden anlatın. İç Anadolu, 5 kWp:
>
> | Büyüklük | Değer |
> |---|---|
> | Özgül üretim | 1.209 kWh/kWp·yıl |
> | Yıllık üretim | 6.044 kWh |
> | Panel sayısı | 10 × 550 Wp |
> | Gereken çatı alanı | ≈ 30 m² |
> | Net CO₂ telafisi | 2,63 ton/yıl |
> | 25 yıllık telafi | 65,7 ton CO₂e |
>
> Referans hanenin 3.000 kWh/yıl elektrik tüketimi için yalnızca **2,5 kWp**
> yeterlidir; 5 kWp tüketimin %201'ini karşılar.
>
> **Tartışılacak nokta:** GES yalnızca elektrik tüketimini ikame eder. Referans
> hanenin ayak izinin %8,9'u elektriktendir; dolayısıyla elektriği tamamen
> sıfırlamak toplam ayak izini ancak o kadar azaltır. Asıl kazanç
> **elektrifikasyonla** gelir: ısı pompası ısınmayı (%15,8), elektrikli araç
> ulaşımı (%26,1) elektriğe taşıdığında GES bu kategorileri de kapsamaya başlar.
> Bu, yenilenebilir enerji teknikerliği açısından raporun en önemli çıkarımıdır.

### 4.4 Doğrulama sonuçları

> | Test kümesi | Test sayısı | Sonuç |
> |---|---:|---|
> | JavaScript birim testleri | 62 | Tamamı geçti |
> | Çapraz doğrulama (JS ↔ Python) | 48 | Tamamı geçti |
> | **Toplam** | **110** | **Tamamı geçti** |
>
> İki bağımsız motor, 28 senaryoda 10⁻⁷ kg toleransında aynı sonucu verdi.

---

## 5. Tartışma

> **5.1 Sonuçların makullüğü.** Hesaplanan değerin TÜİK ortalamasının %88'i
> çıkması ve kapsam dışı kalemlerin (Bölüm 5) bu farkı açıklaması.
>
> **5.2 Kategori dağılımının anlamı.** Beslenme ve ulaşımın baskınlığı; bireysel
> davranış değişikliğinin hangi alanda en yüksek getirisi olduğu.
>
> **5.3 Belirsizlik kaynakları.** Faktör belirsizliği, kullanıcı girdisindeki
> tahmin payı, GES bölgesel değerlerinde ±%10–15 belirsizlik, gıda faktörlerinin
> küresel ortalama olması.
>
> **5.4 Elektrifikasyon–yenilenebilir bağlantısı.** 4.3'teki çıkarımın
> genişletilmesi: şebeke karışımı yenilenebilire kaydıkça elektrik faktörü düşer
> ve elektrifiye edilmiş her kategori birlikte temizlenir.
>
> **5.5 Benzer çalışmalarla karşılaştırma.** Varsa literatürdeki Türkiye
> odaklı karbon ayak izi çalışmalarıyla karşılaştırın.

---

## 6. Sonuç ve Öneriler

> **Yapılanlar.** Maddeler hâlinde, abartısız.
>
> **Ulaşılan sayısal sonuçlar.** Referans hane değeri, GES telafisi, test sayısı.
>
> **Geliştirmeye açık yönler** (dürüstlük puan kazandırır):
> - 81 il için koordinat bazlı ışınım verisi (PVGIS API ile)
> - Türkiye'ye özgü gıda emisyon faktörleri
> - Satın alınan mal ve hizmetler kategorisi
> - Fatura fotoğrafından otomatik veri okuma (OCR)
> - Rüzgâr ve ısı pompası modülleri
> - iOS sürümü
>
> **Öneriler.** Bireysel düzeyde (ölçmeye başlamak, en büyük kategoriden
> başlamak), politika düzeyinde (çatı GES teşvikleri, mahsuplaşma kolaylığı).

---

## Kaynaklar

> `YONTEM_VE_KAYNAKCA.md` Bölüm 8'deki 11 kaynak ile yöntem çerçevesi
> kaynaklarını okulunuzun atıf biçimine (APA / IEEE) çevirin.

**APA 7 örneği:**

> Poore, J., & Nemecek, T. (2018). Reducing food's environmental impacts through
> producers and consumers. *Science, 360*(6392), 987–992.
> https://doi.org/10.1126/science.aaq0216

**IEEE örneği:**

> [1] J. Poore and T. Nemecek, "Reducing food's environmental impacts through
> producers and consumers," *Science*, vol. 360, no. 6392, pp. 987–992, 2018.

---

## Ekler

- **Ek A — Emisyon faktörü tablosu.** 32 faktörün tamamı, kaynak ve kapsam
  bilgisiyle. (`YONTEM_VE_KAYNAKCA.md` tablolarından ya da uygulamanın Bilgi
  ekranından.)
- **Ek B — Ekran görüntüleri.** `dokumantasyon/gorseller/`
- **Ek C — Kaynak kod dizini.** Dosya yapısı ve her dosyanın görevi
  (`README.md`'deki tablo).
- **Ek D — Test çıktıları.** İki test kümesinin terminal çıktısı.
- **Ek E — Örnek uygulama raporu.** Uygulamanın ürettiği HTML raporun çıktısı.

---

## Yazarken dikkat

> - **Her sayının kaynağı olsun.** Kaynaksız tek bir katsayı bile jürinin ilk
>   soracağı şeydir. Uygulamanın Bilgi ekranı tam da bunun için var — sunumda
>   bu ekranı göstermek güçlü bir cevaptır.
> - **Sınırlamaları saklamayın.** Bölüm 5'teki yedi maddeyi açıkça yazın.
>   Neyi hesaplamadığını bilen bir mühendis, her şeyi hesapladığını sanandan
>   daha güvenilirdir.
> - **GES modülünü öne çıkarın.** Bölümünüzle bağı buradan kurulur. Karbon
>   hesabı aracın kendisi, yenilenebilir telafi ise projenin özgün katkısıdır.
> - **Hafta sabiti hikâyesini anlatın.** Küçük görünür ama mühendislik
>   olgunluğunu gösterir: doğrulama yöntemi kurdunuz ve gerçek bir hata buldu.
