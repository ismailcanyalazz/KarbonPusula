# KarbonPusula — Hesaplama Yöntemi ve Kaynakça

**Sürüm 2.0.0 · Veri güncellemesi: 13 Ekim 2026**

Bu belge, uygulamanın her sayısının nereden geldiğini ve nasıl hesaplandığını
açıklar. Bitirme projesi raporunun "Materyal ve Yöntem" bölümü doğrudan buradan
türetilebilir.

---

## 1. Temel yaklaşım

Karbon ayak izi hesabı, uluslararası kabul görmüş **faaliyet verisi × emisyon
faktörü** yaklaşımına dayanır (IPCC 2006 Ulusal Sera Gazı Envanterleri Rehberi,
Cilt 1, Bölüm 1):

```
E = A × EF
```

| Simge | Anlamı | Birim |
|---|---|---|
| `E` | Emisyon | kg CO₂e |
| `A` | Faaliyet verisi (tüketilen enerji, katedilen mesafe, tüketilen gıda…) | kWh, m³, km, kg |
| `EF` | Emisyon faktörü | kg CO₂e / faaliyet birimi |

Toplam ayak izi, kategorilerin toplamıdır:

```
E_toplam = Σ (A_i × EF_i)
```

### 1.1 Küresel ısınma potansiyeli

Sera gazları yalnızca CO₂ değildir. Metan (CH₄) ve diazot monoksit (N₂O) gibi
gazlar, birim kütle başına CO₂'den çok daha güçlüdür. Hepsi **CO₂ eşdeğerine
(CO₂e)** çevrilerek toplanır:

```
CO₂e = Σ (m_gaz × GWP₁₀₀,gaz)
```

Uygulamadaki tüm faktörler **IPCC Beşinci Değerlendirme Raporu (AR5), 100 yıllık
küresel ısınma potansiyeli (GWP-100)** temelindedir. AR5'e göre CH₄ için GWP₁₀₀
= 28, N₂O için 265'tir.

### 1.2 Kapsam sınıflandırması

GHG Protocol'ün kapsam ayrımı bireysel ayak izine şöyle uyarlanır:

| Kapsam | Tanım | Uygulamadaki karşılığı |
|---|---|---|
| **Kapsam 1** | Doğrudan yanma | Doğal gaz, kömür, odun, LPG, araç yakıtı |
| **Kapsam 2** | Satın alınan enerji | Şebeke elektriği |
| **Kapsam 3** | Dolaylı / yukarı akış | Gıda üretimi, atık bertarafı, su arıtma, toplu taşıma, uçuş |

### 1.3 Hane paylaşımı

Bazı tüketimler hane düzeyinde gerçekleşir ve hanede yaşayan kişi sayısına
bölünmelidir. Aksi hâlde beş kişilik bir hanenin her bireyi, tek başına yaşayan
biriyle aynı elektrik yüküne sahipmiş gibi görünür — bu, kalabalık hanelerin
kişi başı avantajını gizler.

| Kategori | Paylaşım |
|---|---|
| Elektrik, ısınma, atık, su | Hane bazlı → **kişi sayısına bölünür** |
| Ulaşım, uçuş, beslenme | Kişisel → **bölünmez** |

```
E_kişi = E_hane / n     (hane bazlı kategoriler)
E_kişi = E_kişisel      (kişisel kategoriler)
```

### 1.4 Zaman dönüşümleri

Girdiler aylık ya da haftalık alınır; sonuç yıllıktır. Dönüşümde kullanılan
sabitler:

```
1 yıl = 12 ay
1 yıl = 365 / 7 = 52,142857… hafta
```

> **Not.** Hafta sayısı için yuvarlanmış bir değer (52,14 veya 52,1429)
> kullanmak haftalık girdilerde binde bir düzeyinde sapmaya yol açar. Uygulamada
> bölme doğrudan yapılır. Bu ayrıntı, JavaScript ve Python motorlarının çapraz
> doğrulamasında yakalanmış ve düzeltilmiştir (bkz. Bölüm 6).

Yıllıklandırma, girilen aylık/haftalık faaliyetin yıl boyunca değişmediği
varsayımına dayanır. Isınma gibi mevsimsel kalemlerde kullanıcıdan doğrudan
**yıllık** değer istenerek bu varsayımdan kaçınılmıştır.

---

## 2. Kategori bazında hesap

### 2.1 Elektrik

Tüketim üç kaynağa bölünebilir:

```
E_elektrik = A_yıllık × [ p_şebeke × EF_şebeke
                        + p_GES    × EF_PV
                        + p_YEK-G  × 0 ]
```

| Bileşen | Değer | Birim | Kaynak |
|---|---|---|---|
| `EF_şebeke` (Türkiye) | 0,47573 | kg CO₂e/kWh | Ember [1] |
| `EF_PV` (çatı tipi FV, yaşam döngüsü) | 0,041 | kg CO₂e/kWh | IPCC AR5 WG3 Ek III [4] |
| YEK-G belgeli tüketim | 0 | kg CO₂e/kWh | GHG Protocol Scope 2, piyasa temelli [3] |

`A_yıllık = kWh/ay × 12`. Oranların toplamı 1'i aşarsa sırayla kırpılır.

> **Neden ortalama şebeke faktörü?**
> T.C. Enerji ve Tabii Kaynaklar Bakanlığı'nın yayımladığı ulusal şebeke emisyon
> faktörü (işletme marjı 0,7279 · inşa marjı 0,3541 · birleşik marj 0,6345
> tCO₂/MWh), UNFCCC CDM Tool 07 yöntemiyle hesaplanır ve **proje bazlı emisyon
> azaltımı** (bir yenilenebilir santralin şebekede neyin yerini aldığı) sorusunu
> yanıtlar [3]. Bireysel tüketim ayak izinde sorulan soru farklıdır: "tükettiğim
> elektriğin ortalama karbon yoğunluğu nedir?" Bunun doğru yanıtı toplam üretim
> emisyonunun toplam üretime bölümüdür — yani ortalama faktördür. İki değerin
> karıştırılması bireysel hesaplarda yaklaşık %33 fazla tahmine yol açar.

> **Neden YEK-G sıfır sayılıyor?**
> GHG Protocol Scope 2 Guidance iki paralel muhasebe tanımlar: *konum temelli*
> (location-based) raporlama her zaman şebeke ortalamasını kullanır; *piyasa
> temelli* (market-based) raporlama ise sözleşmeye bağlı enerji nitelik
> belgelerini tanır. Türkiye'de bu belge YEK-G'dir. Uygulama, kullanıcının
> belgesi olduğunu beyan etmesi hâlinde piyasa temelli muhasebeyi uygular ve bunu
> arayüzde açıkça belirtir.

### 2.2 Isınma

Tek yakıt türü ve yıllık miktar:

```
E_ısınma = A_yıllık × EF_yakıt
```

| Yakıt | EF | Birim | Tür |
|---|---|---|---|
| Doğal gaz | 2,02633 | kg CO₂e/m³ | Kaynaklı [2] |
| Doğal gaz (pay ölçer) | 0,18231 | kg CO₂e/kWh | Kaynaklı [2] |
| LPG / tüpgaz | 2,938 | kg CO₂e/kg | Türetilmiş |
| Kömür (ev tipi) | 2,90495 | kg CO₂e/kg | Türetilmiş |
| Yakacak odun | 0,0477 | kg CO₂e/kg | Türetilmiş |
| Elektrikli ısıtma | 0,47573 | kg CO₂e/kWh | Kaynaklı [1] |

**Türetmeler:**

- **LPG:** DEFRA litre faktörü 1,55713 kg CO₂e/L, sıvı LPG yoğunluğu 0,53 kg/L
  → `1,55713 ÷ 0,53 = 2,938 kg CO₂e/kg`
- **Kömür:** DEFRA "coal (domestic)" 2.904,95234 kg CO₂e/ton → `÷ 1000`
- **Odun:** Biyojenik CO₂ döngüseldir ve net sıfır kabul edilir; yalnızca eksik
  yanmadan doğan CH₄/N₂O sayılır. DEFRA "wood pellets" 0,01193 kg CO₂e/kWh, hava
  kurusu odunun alt ısıl değeri 4,0 kWh/kg → `0,01193 × 4,0 = 0,0477 kg CO₂e/kg`

> **Kapsam dışı:** Kömür ve odun yakımı önemli PM₁₀/PM₂,₅ ve SO₂ kaynağıdır.
> Bu kirleticiler sera gazı değildir ve hesaba girmez; ancak sağlık açısından
> ayrıca önemlidir ve uygulamada kullanıcıya hatırlatılır.

### 2.3 Ulaşım

```
E_ulaşım = Σ ( A_hafta,i × 52,142857 × EF_i / n_yolcu,i )
```

`n_yolcu` yalnızca **araç-km** bazlı faktörlerde uygulanır. Toplu taşıma
faktörleri zaten **yolcu-km** bazlıdır ve bölünmez — bu ayrım sık yapılan bir
hatadır.

| Araç | EF | Birim | Tür |
|---|---|---|---|
| Otomobil · benzinli | 0,16152 | kg CO₂e/araç-km | Kaynaklı [2] |
| Otomobil · dizel | 0,17265 | kg CO₂e/araç-km | Kaynaklı [2] |
| Otomobil · hibrit | 0,12961 | kg CO₂e/araç-km | Kaynaklı [2] |
| Otomobil · LPG | 0,1526 | kg CO₂e/araç-km | Türetilmiş |
| Otomobil · elektrikli | 0,08563 | kg CO₂e/araç-km | Türetilmiş |
| Motosiklet | 0,11367 | kg CO₂e/araç-km | Kaynaklı [2] |
| Şehir içi otobüs / dolmuş | 0,10151 | kg CO₂e/yolcu-km | Kaynaklı [2] |
| Şehirler arası otobüs | 0,03948 | kg CO₂e/yolcu-km | Kaynaklı [2] |
| Tren / YHT | 0,03092 | kg CO₂e/yolcu-km | Kaynaklı [2] |
| Metro / tramvay | 0,02121 | kg CO₂e/yolcu-km | Kaynaklı [2] |
| Vapur | 0,01871 | kg CO₂e/yolcu-km | Kaynaklı [2] |
| Benzin | 2,075 | kg CO₂e/L | Kaynaklı [2] |
| Motorin | 2,58354 | kg CO₂e/L | Kaynaklı [2] |
| Otogaz LPG | 1,55713 | kg CO₂e/L | Kaynaklı [2] |

**Elektrikli otomobil türetmesi — yöntemsel olarak kritik:**

DEFRA'nın elektrikli araç faktörü Birleşik Krallık şebekesine özgüdür (yaklaşık
0,131 kg CO₂e/kWh) ve Türkiye için geçersizdir; kullanılması elektrikli aracın
avantajını gerçekte olduğundan yaklaşık **3,6 kat** abartır. Bu yüzden faktör
Türkiye şebekesiyle yeniden türetilmiştir:

```
EF_EV = tüketim × EF_şebeke,TR
      = 0,18 kWh/km × 0,47573 kg CO₂e/kWh
      = 0,08563 kg CO₂e/km
```

Aynı ilke LPG'li otomobil için de uygulanır:
`1,55713 kg CO₂e/L × 0,098 L/km = 0,1526 kg CO₂e/km`.

**Yakıt miktarı yöntemi.** Kullanıcı L/hafta girerse araç tipi, sürüş biçimi ve
yük varsayımları tamamen devre dışı kalır; bu, en düşük belirsizlikli yoldur ve
uygulamada ayrı bir giriş kipi olarak sunulur.

### 2.4 Uçuş

```
E_uçuş = Σ ( A_yıllık,i × EF_i )
```

| Uçuş türü | EF (RF dahil) | EF (RF hariç) |
|---|---|---|
| İç hat | 0,22928 | 0,13552 |
| Kısa menzilli dış hat (ekonomi) | 0,12576 | — |
| Uzun menzilli (ekonomi) | 0,11704 | — |
| Uzun menzilli (business) | 0,3394 | 0,20083 |

Uygulama **radyatif zorlama (RF) dahil** değerleri kullanır. Yüksek irtifada
salınan su buharı, NOₓ ve kondenzasyon izleri, yalnızca CO₂'nin hesaba
katılmasının öngördüğünden daha güçlü bir ısınma etkisi yaratır. RF dahil
değerler bu etkiyi içerir ve bireysel ayak izi hesaplarında önerilen yaklaşımdır.

Business sınıfı faktörün ekonomiye göre yaklaşık **2,9 katı** olmasının nedeni
koltuk başına düşen uçak alanının büyüklüğüdür — uçağın emisyonu daha az yolcuya
dağılır.

İç hat uçuşun km başına uzun menzilliden yoğun olması, kalkış ve tırmanışın bir
uçuşun en yakıt yoğun bölümü olmasından kaynaklanır; kısa uçuşlarda bu bölüm
toplam mesafenin büyük kısmını oluşturur.

### 2.5 Beslenme

```
E_beslenme = Σ ( porsiyon_hafta,i × 52,142857 × gram_porsiyon,i / 1000 × EF_i )
```

| Gıda | EF (kg CO₂e/kg) | Porsiyon |
|---|---|---|
| Kırmızı et (sığır) | 60 | 100 g |
| Kuzu / koyun | 24 | 100 g |
| Peynir | 21 | 30 g |
| Çikolata | 19 | 25 g |
| Kahve (çekirdek) | 17 | 10 g |
| Beyaz et | 6 | 120 g |
| Balık (çiftlik) | 5 | 120 g |
| Yumurta | 4,5 | 55 g |
| Pirinç | 4 | 70 g |
| Süt / yoğurt | 3 | 200 g |
| Ekmek / tahıl | 1,4 | 150 g |
| Sebze ve meyve | 1,0 | 250 g |
| Baklagil | 0,9 | 80 g |
| Kuruyemiş | 0,3 | 30 g |

Faktörler Poore & Nemecek (2018) [5] meta-analizinden alınmıştır: 119 ülkede
38.700 çiftliği kapsar ve tedarik zincirinin tamamını (arazi kullanımı, çiftlik,
yem, işleme, taşıma, perakende, ambalaj) içerir.

Porsiyon ağırlıkları TÜBER (Türkiye Beslenme Rehberi) standart porsiyon
büyüklükleri esas alınarak seçilmiştir. Sebze-meyve için 1,0 kg CO₂e/kg değeri,
kaynaktaki domates (1,4), muz (0,7) ve kök sebze (0,4) değerlerinin karma tüketim
için yuvarlanmış ortalamasıdır.

Beş hazır profil (et ağırlıklı, dengeli, az etli, vejetaryen, vegan) bu
porsiyonlardan oluşturulur; kullanıcı dilerse her kalemi tek tek girebilir.

### 2.6 Atık ve su

```
E_atık = A_yıllık × ( p_depolama × EF_depolama
                    + p_geri     × EF_geri
                    + p_kompost  × EF_kompost
                    + p_yakma    × EF_yakma )

E_su   = A_yıllık × ( EF_temin + EF_atıksu )
```

| Bertaraf | EF (kg CO₂e/kg) |
|---|---|
| Düzenli depolama | 0,49729 |
| Yakma / enerji geri kazanımı | 0,00465 |
| Geri dönüşüm | 0,00465 |
| Kompost | 0,00901 |

| Su | EF (kg CO₂e/m³) |
|---|---|
| Şebeke suyu temini | 0,1913 |
| Atıksu arıtma | 0,17088 |

Ayrılmayan pay otomatik olarak düzenli depolama sayılır. Depolama faktörünün
kompostun yaklaşık **55 katı** olmasının nedeni, oksijensiz ortamda ayrışan
organik atığın metan üretmesidir; metanın GWP₁₀₀ değeri 28'dir.

> **Önemli sınırlama.** Geri dönüşüm faktörü yalnızca toplama ve taşımayı
> içerir. İkincil hammaddenin birincil üretimin yerini almasından doğan kazanç
> (*avoided emissions*) bu faktöre dahil değildir. Yani geri dönüşümün gerçek
> faydası, uygulamanın gösterdiğinden **büyüktür**.

---

## 3. Güneş enerjisi (GES) telafi modülü

Bu modül, projeyi genel bir karbon hesaplayıcıdan ayıran ve doğrudan
yenilenebilir enerji teknikerliği alanına bağlayan bölümdür.

### 3.1 Özgül üretim

```
E_yıllık [kWh/kWp·yıl] = GHI × K_eğim × PR
```

| Simge | Anlam | Değer | Gerekçe |
|---|---|---|---|
| `GHI` | Yıllık yatay global ışınım | Bölgeye göre | GEPA [7] |
| `K_eğim` | Optimum eğim kazancı | 1,15 | 30–35° güney yönelim, 36–42° K enlemleri |
| `PR` | Performans oranı | 0,80 | IEC 61724; çatı tipi konut kurulumu |

**PR'nin bileşenleri:** sıcaklık kaybı %7–10, evirici %2–4, kablo %1–2,
kirlenme %2–3, modül uyumsuzluğu %1–2, gölgelenme ve azimut sapması.

| Bölge | GHI (kWh/m²·yıl) | Güneşlenme (saat/yıl) | Özgül üretim (kWh/kWp·yıl) |
|---|---|---|---|
| Güneydoğu Anadolu | 1.460 | 2.993 | 1.343 |
| Akdeniz | 1.390 | 2.956 | 1.279 |
| Doğu Anadolu | 1.365 | 2.664 | 1.256 |
| İç Anadolu | 1.314 | 2.628 | 1.209 |
| Ege | 1.304 | 2.738 | 1.200 |
| Marmara | 1.168 | 2.409 | 1.075 |
| Karadeniz | 1.120 | 1.971 | 1.030 |

**Ulusal doğrulama.** Meteoroloji Genel Müdürlüğü'nün 55 büyük iklim
istasyonundan 2011–2024 arasında ölçtüğü ulusal ortalama yatay global ışınım
1.581,1 kWh/m²·yıl'dır [6]. Aynı formülle:

```
1.581 × 1,15 × 0,80 = 1.454 kWh/kWp·yıl
```

Dünya Bankası / ESMAP'in Türkiye için verdiği pratik PV potansiyeli (Seviye 1
ortalama) 4,32 kWh/kWp·gün ≈ **1.577 kWh/kWp·yıl**'dır [8]. Bu değer *serbest
duran, optimum eğimli santral* içindir; çatı tipi kurulumda daha düşük çıkması
beklenir. İki bağımsız yolun birbirine yakın ve beklenen yönde farklı sonuç
vermesi, yöntemin tutarlı olduğunu gösterir.

**Belirsizlik.** Bölgesel değerler ±%10–15 belirsizlik taşır; GEPA'nın bölgesel
tablosu yer ölçümlerine dayanır ve modern uydu verilerine göre muhafazakârdır.
Kesin fizibilite için koordinat bazlı PVGIS veya GEPA sorgusu gerekir. Uygulama,
özgül üretim değerinin elle girilmesine izin vererek bu sınırlamayı aşmanın
yolunu sunar.

### 3.2 Net CO₂ telafisi

```
net = EF_şebeke − EF_PV = 0,47573 − 0,041 = 0,43473 kg CO₂e/kWh
telafi_yıllık = kWp × E_yıllık × net
```

Fotovoltaik elektriğin kendi yaşam döngüsü emisyonu (modül üretimi, kurulum,
bakım, bertaraf) düşülmeden hesaplanan telafi, gerçek kazancı olduğundan yüksek
gösterir. Bu yüzden şebeke faktöründen PV faktörü çıkarılır.

### 3.3 Sistem boyutlandırma

```
panel sayısı    = ⌈ kWp × 1000 / W_p,modül ⌉        (W_p = 550 W)
çatı alanı      ≈ kWp × 6,0 m²/kWp
karşılama oranı = üretim_yıllık / tüketim_yıllık
gereken kWp     = tüketim_yıllık / E_yıllık
yatırım         = kWp × birim maliyet
geri ödeme      = yatırım / (üretim_yıllık × elektrik birim fiyatı)
ömür boyu telafi = telafi_yıllık × 25 yıl
```

Çatı alanı katsayısı (6 m²/kWp) sıra aralığı, servis yolu ve gölge payını içerir;
modül alanının kendisi yaklaşık 4,7 m²/kWp'dir.

---

## 4. Kıyaslama değerleri

| Ölçüt | Değer | Kaynak |
|---|---|---|
| Türkiye kişi başı (2024) | 6,8 ton CO₂e/yıl | TÜİK [9] |
| Dünya ortalaması | ≈ 6,6 ton CO₂e/yıl | EDGAR/JRC [10], türetilmiş |
| 1,5 °C hedefi (2030) | 2,3 ton CO₂/yıl | IEEP & SEI [11] |

TÜİK'in 2024 envanterine göre Türkiye'nin toplam sera gazı emisyonu 584,5 Mt
CO₂e, kişi başı değer 6,8 ton CO₂e'dir (2023: 6,5 ton).

---

## 5. Kapsam dışı bırakılanlar

Hesabın dürüstlüğü açısından, **neyin hesaplanmadığı** da açıkça belirtilmelidir:

1. **Satın alınan mal ve hizmetler** — giyim, elektronik, mobilya, hizmetler.
   Tüketim temelli ayak izinin önemli bir parçasıdır.
2. **Konutun gömülü karbonu** — inşaat malzemeleri ve yapım süreci.
3. **Kamu hizmetlerinin kişi başı payı** — altyapı, savunma, sağlık, eğitim.
4. **Yakıtların yukarı akış emisyonları** — çıkarma, rafinaj ve taşıma
   (*well-to-tank*). Kullanılan faktörler doğrudan yanmayı (*tank-to-wheel*)
   esas alır.
5. **Gıda israfı** — ayrı bir kalem olarak modellenmemiştir.
6. **Hava kalitesi etkileri** — PM₂,₅, SO₂, NOₓ sera gazı değildir.
7. **Geri dönüşümün ikame kazancı** — Bölüm 2.6'da açıklandı.

Bu nedenle uygulamanın verdiği değer, tam tüketim temelli bir ayak izinden
**bir miktar düşüktür**. Karşılaştırma yapılırken bu akılda tutulmalıdır.

Ayrıca gıda faktörleri küresel ortalamalardır; Türkiye üretim koşullarına özgü
değerler literatürde henüz bu kapsamda mevcut değildir.

---

## 6. Doğrulama

Hesabın doğruluğu üç bağımsız yolla sınanır:

### 6.1 Birim testleri (62 test)

`tests/test_hesap.js` — her kategori için elle hesaplanmış beklenen değerler,
sınır koşulları (sıfır, negatif, sonsuz, metin girdisi), oran kırpma davranışı,
hane paylaşımı, sıralama kuralları ve veri bütünlüğü.

```bash
node tests/test_hesap.js
```

### 6.2 Çapraz doğrulama (48 test)

`tests/test_dogrulama.py` — uygulamanın JavaScript motoru ile `scripts/
karbon_hesaplama.py` içindeki **bağımsız Python uygulaması**, 28 farklı senaryoda
karşılaştırılır. İki ayrı dilde, ayrı yazılmış iki uygulamanın 10⁻⁷ kg
toleransında aynı sonucu vermesi, hesabın kodlama hatasından arınmış olduğunun
güçlü göstergesidir.

```bash
python3 tests/test_dogrulama.py
```

> Bu yöntem gerçek bir hata yakaladı: JavaScript motoru yıldaki hafta sayısı
> için yuvarlanmış bir sabit (52,1429) kullanıyordu; Python motoru 365/7
> bölmesini doğrudan yapıyordu. Aradaki binde birlik fark testlerde görünür
> oldu ve düzeltildi.

### 6.3 Veri bütünlüğü denetimi

Her emisyon faktörünün tanımlı bir kaynağı, birimi ve kapsam açıklaması olduğu;
türetilmiş her değerin türetme adımını taşıdığı; uygulamaya gömülü veri
modülünün (`veri.js`) kaynak JSON ile birebir aynı olduğu otomatik denetlenir.

### 6.4 Makullük kontrolü

Referans hane (3 kişi, Ankara, doğal gaz ısıtma, benzinli otomobil, dengeli
beslenme) için sonuç **5,98 ton CO₂e/kişi·yıl**; TÜİK'in 2024 Türkiye ortalaması
olan 6,8 tonun %88'i. Hesaba girmeyen kalemler (Bölüm 5) göz önüne alındığında
bu beklenen aralıktadır.

---

## 7. Veri mimarisi

Tüm faktörler **tek bir kaynakta** tutulur: `veriler/emisyon_faktorleri.json`.

```
veriler/emisyon_faktorleri.json      ← tek doğruluk kaynağı
        │
        ├── scripts/veri_uret.py → android/.../assets/js/veri.js   (uygulama)
        └── doğrudan okunur      → scripts/karbon_hesaplama.py     (doğrulama)
```

Bir faktör güncellenmek istendiğinde yalnızca JSON düzenlenir ve
`python3 scripts/veri_uret.py` çalıştırılır. Testler, iki dosyanın eşleştiğini
doğrular; eşleşmiyorsa derleme iş akışı hata verir.

Bu yapının amacı, bir faktörün bir yerde güncellenip başka yerde eski kalmasını
yapısal olarak imkânsız kılmaktır.

---

## 8. Kaynakça

**[1]** Ember. *Yearly Electricity Data* (2025 yayını, 2024 takvim yılı verisi).
Ülke bazında şebeke elektriği karbon yoğunluğu, yaşam döngüsü temelli.
Türkiye: 0,47573 kg CO₂e/kWh.
<https://ember-energy.org/data/yearly-electricity-data/>

**[2]** Department for Energy Security and Net Zero / DEFRA (Birleşik Krallık).
*UK Government greenhouse gas conversion factors for company reporting*, 2026.
Yakıt, ulaşım, atık ve su dönüşüm katsayıları.
<https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting>

**[3]** T.C. Enerji ve Tabii Kaynaklar Bakanlığı, Enerji Verimliliği ve Çevre
Dairesi Başkanlığı. *Türkiye Ulusal Elektrik Şebekesi Emisyon Faktörü Bilgi
Formu* (ETKB-EVÇED-FRM-039 Rev.03), 2024 yayını, 2021 hesap yılı. UNFCCC CDM
Tool 07 v07.0 yöntemi.
<https://enerji.gov.tr/evced-cevre-ve-iklim-ulusal-elektrik-sebekesi-emisyon-faktoru>

**[4]** IPCC. *Climate Change 2014: Mitigation of Climate Change. Working Group
III, Annex III: Technology-specific Cost and Performance Parameters.* Cambridge
University Press, 2014. Çatı tipi fotovoltaik yaşam döngüsü medyanı 41 g
CO₂e/kWh.
<https://www.ipcc.ch/site/assets/uploads/2018/02/ipcc_wg3_ar5_annex-iii.pdf>

**[5]** Poore, J. & Nemecek, T. *Reducing food's environmental impacts through
producers and consumers.* Science, 360(6392), 987–992, 2018. Our World in Data
üzerinden yuvarlanmış değerler.
<https://ourworldindata.org/environmental-impacts-of-food>

**[6]** T.C. Çevre, Şehircilik ve İklim Değişikliği Bakanlığı, Meteoroloji Genel
Müdürlüğü. *Türkiye Yıllık Global Güneş Radyasyonu Analizi (2011–2024)*, 2025.
Ulusal ortalama 1.581,1 kWh/m²·yıl.
<https://www.mgm.gov.tr/FILES/resmi-istatistikler/parametreAnalizi/2024-gunes-radyasyonu.pdf>

**[7]** T.C. Enerji ve Tabii Kaynaklar Bakanlığı. *Türkiye Güneş Enerjisi
Potansiyeli Atlası (GEPA)* — bölgesel ışınım ve güneşlenme süresi tablosu.
Ulusal ortalama 1.527 kWh/m²·yıl, 2.737 saat/yıl.
<https://gepa.enerji.gov.tr/MyCalculator/>

**[8]** World Bank / ESMAP (Solargis). *Global Photovoltaic Power Potential by
Country*, 2020. Türkiye pratik PV potansiyeli (Seviye 1 ortalama) 4,32
kWh/kWp·gün.
<https://globalsolaratlas.info/global-pv-potential-study>

**[9]** Türkiye İstatistik Kurumu. *Sera Gazı Emisyon İstatistikleri,
1990–2024*, 2026 yayını. Toplam 584,5 Mt CO₂e; kişi başı 6,8 ton CO₂e.
<https://data.tuik.gov.tr/>

**[10]** Avrupa Komisyonu Ortak Araştırma Merkezi (JRC). *EDGAR — Emissions
Database for Global Atmospheric Research: GHG emissions of all world countries*,
2024.
<https://edgar.jrc.ec.europa.eu/report_2024>

**[11]** Gore, T. *Carbon inequality in 2030: Per capita consumption emissions
and the 1.5 °C goal.* Institute for European Environmental Policy & Stockholm
Environment Institute (Oxfam için), 2021. 1,5 °C ile uyumlu 2030 kişi başı
düzeyi: 2,3 ton CO₂.
<https://ieep.eu/publications/carbon-inequality-in-2030-per-capita-consumption-emissions-and-the-1-5c-goal/>

### Yöntem çerçevesi için

- IPCC. *2006 IPCC Guidelines for National Greenhouse Gas Inventories*,
  Cilt 1 (Genel Rehber ve Raporlama). <https://www.ipcc-nggip.iges.or.jp/public/2006gl/>
- WRI & WBCSD. *GHG Protocol Corporate Standard* ve *Scope 2 Guidance*.
  <https://ghgprotocol.org/>
- IEC 61724-1. *Photovoltaic system performance — Monitoring* (performans oranı
  tanımı).
- ISO 14064-1. *Sera gazları — Kuruluş seviyesinde sera gazı emisyonlarının
  ölçümü ve raporlanması için kılavuz.*

---

*Bu belge KarbonPusula projesinin bir parçasıdır. Sorular ve güncellemeler için
kaynak JSON dosyasındaki `kapsam` ve `turetme` alanları her faktörün gerekçesini
ayrıca taşır.*
