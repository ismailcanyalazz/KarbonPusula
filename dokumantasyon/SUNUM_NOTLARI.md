# Sunum ve Savunma Notları

Jüri önünde 10–15 dakikanız olacak. Bu belge neyi hangi sırayla göstereceğinizi
ve gelmesi muhtemel soruların yanıtlarını içerir.

---

## Canlı gösterim — 6 dakika

Telefondan ya da tarayıcıdan (`android/app/src/main/assets/index.html`) yapın.
Projeksiyonda tarayıcı daha güvenlidir; telefonu da yedek olarak yanınızda
bulundurun.

### 1. Açılış (30 sn)

> "KarbonPusula, kişisel karbon ayak izini Türkiye'ye özgü emisyon faktörleriyle
> hesaplayan ve bu ayak izinin çatı güneş enerjisi sistemiyle ne kadarının
> telafi edilebileceğini gösteren bir Android uygulaması."

### 2. Hesapla ekranı (90 sn)

- Elektrik tüketimini değiştirin; **alttaki toplamın anında güncellendiğini**
  gösterin. "Ayrı bir hesapla düğmesi yok, her değişiklik anında yansıyor."
- **Hane kişi sayısını** 3'ten 1'e düşürün. Elektrik katkısının üçe katlandığını
  gösterin.
  > "Elektrik, ısınma, atık ve su hane ortak tüketimidir ve kişi sayısına
  > bölünür. Ulaşım ve beslenme kişiseldir, bölünmez. Bu ayrım yapılmazsa
  > kalabalık hanelerin kişi başı avantajı görünmez olur."
- Ulaşımda **araçtaki kişi sayısını** 1'den 4'e çıkarın.
  > "Otomobil faktörü araç-km başınadır, yolcu sayısına bölünür. Metro faktörü
  > zaten yolcu-km bazlıdır, bölünmez. Bu, sık yapılan bir hatadır."

### 3. Sonuç ekranı (90 sn)

- Kahraman sayıyı ve kıyaslama çubuklarını gösterin.
  > "5,98 ton. TÜİK'in 2024 Türkiye ortalaması 6,8 ton; bunun %88'i. 1,5 °C
  > hedefi olan 2,3 tonun ise 2,6 katı."
- Halka grafikte **beslenmenin birinci** olduğunu gösterin.
  > "Beklenen bir sonuç: sığır eti kilogram başına 60 kg CO₂e, tavuk 6,
  > baklagil 0,9."
- **"Tablo" görünümüne geçin**, sonra **Hesap ayrıntısı** tablosunu açın.
  > "Her satırda faaliyet verisi, birim, faktör ve sonuç var. Hesap elle
  > doğrulanabilir."

### 4. GES ekranı — en önemli bölüm (2 dk)

- Bölgeyi değiştirin (Karadeniz → Güneydoğu Anadolu), özgül üretimin
  1.030'dan 1.343 kWh/kWp'ye çıktığını gösterin.
- Kurulu gücü 5 kWp yapın: üretim, panel sayısı, çatı alanı, CO₂ telafisi.
- Karşılama ölçerini gösterin.
- **Hesap yöntemi kutusunu açın** — formülün gerçek sayılarla yazıldığını
  gösterin:
  > "E = GHI × K_eğim × PR = 1.314 × 1,15 × 0,80 = 1.209 kWh/kWp·yıl.
  > K_eğim optimum eğim kazancı, PR ise performans oranı — sıcaklık, evirici,
  > kablo, kirlenme ve gölgelenme kayıplarını içeriyor."
- Net telafi kutusunu gösterin:
  > "Telafiyi hesaplarken şebeke faktöründen fotovoltaiğin kendi yaşam döngüsü
  > emisyonunu çıkarıyoruz. Çıkarmasaydık kazancı olduğundan yüksek
  > gösterirdik."

### 5. Bilgi ekranı (60 sn)

- Faktör listesini kaydırın. Bir türetilmiş faktörü (sarı etiketli) gösterin.
  > "Her faktörün kurumu, kapsamı ve varsa türetme adımı yazılı. Sarı etiketli
  > olanlar kaynaktaki bir değerden açıklanan bir dönüşümle elde edilmiş."
- Kaynakçayı gösterin.

### 6. Kapanış (30 sn)

- Koyu/açık tema düğmesine basın.
- "Özeti paylaş" ya da "HTML rapor" düğmesini gösterin.
  > "Uygulama tamamen çevrimdışı çalışıyor ve hiçbir Android izni istemiyor.
  > Veriler cihazdan çıkmıyor."

---

## Vurgulanacak dört nokta

Sunumun geri kalanında bunlar geçsin:

**1. Doğru şebeke faktörü seçimi.**
Bakanlık iki farklı değer yayımlar. CDM yöntemiyle hesaplanan birleşik marj
(0,6345 tCO₂/MWh) *proje bazlı emisyon azaltımı* içindir — "bu rüzgâr santrali
şebekede neyin yerini aldı?" sorusunu yanıtlar. Bireysel tüketim ayak izinde
sorulan soru farklıdır: "tükettiğim elektriğin ortalama karbon yoğunluğu nedir?"
Doğru yanıt ortalama faktördür (0,476). İkisinin karıştırılması bireysel
hesaplarda yaklaşık %33 fazla tahmine yol açar.

**2. Elektrikli araç faktörünün yeniden türetilmesi.**
DEFRA'nın elektrikli araç faktörü Birleşik Krallık şebekesine özgüdür
(≈0,131 kg CO₂e/kWh). Türkiye'de olduğu gibi kullanılırsa elektrikli otomobil
gerçekte olduğundan **3,6 kat** temiz görünür. Faktör yeniden türetildi:
`0,18 kWh/km × 0,47573 kg CO₂e/kWh = 0,0856 kg CO₂e/km`.

**3. Çift motorlu doğrulama ve yakalanan hata.**
Hesap motoru JavaScript ve Python'da bağımsız olarak iki kez yazıldı, 28
senaryoda karşılaştırıldı. Yöntem gerçek bir hata yakaladı: JavaScript motoru
yıldaki hafta sayısı için yuvarlanmış bir sabit (52,1429) kullanırken Python
motoru 365/7 bölmesini doğrudan yapıyordu. Binde birlik fark testlerde görünür
oldu ve düzeltildi.

**4. Elektrifikasyon bağlantısı.**
GES yalnızca elektrik tüketimini ikame eder. Referans hanede elektrik toplamın
%8,9'u; dolayısıyla elektriği sıfırlamak toplam ayak izini ancak o kadar
azaltır. Asıl kazanç **elektrifikasyonla** gelir: ısı pompası ısınmayı (%15,8),
elektrikli araç ulaşımı (%26,1) elektriğe taşıdığında GES bu kategorileri de
kapsamaya başlar. Yenilenebilir enerji ancak tüketim elektriğe taşındığı ölçüde
ayak izini düşürür.

---

## Gelmesi muhtemel sorular

**"Bu faktörleri nereden aldınız?"**
> Elektrik için Ember'in 2024 Türkiye verisi; yakıt, ulaşım, atık ve su için
> Birleşik Krallık DESNZ/DEFRA 2026 katsayıları; gıda için Poore & Nemecek'in
> Science'ta yayımlanan 2018 meta-analizi; güneş için GEPA ve Meteoroloji Genel
> Müdürlüğü ölçümleri. Hepsi uygulamanın Bilgi ekranında kurum, yıl ve kapsam
> bilgisiyle listeli. *(Ekranı açıp gösterin.)*

**"Neden İngiliz katsayıları kullandınız? Türkiye'nin kendi katsayıları yok mu?"**
> Doğrudan yakıt yanması faktörleri (doğal gaz, kömür, benzin) kimyasaldır;
> yakıtın karbon içeriğine bağlıdır ve ülkeye göre değişmez. Ülkeye bağlı olan
> elektriktir — orada Türkiye'ye özgü faktör kullandım ve elektrik içeren tüm
> faktörleri Türkiye şebekesiyle yeniden türettim. Türkiye'nin yayımlanmış
> kapsamlı bir ulusal faktör veri tabanı henüz yok; olduğunda tek bir JSON
> dosyasını güncellemek yeterli olacak şekilde tasarladım.

**"Sonuç gerçeği ne kadar yansıtıyor?"**
> Referans hane için 5,98 ton çıktı; TÜİK'in ulusal ortalaması 6,8 ton. Fark,
> bilinçli olarak kapsam dışı bıraktığım kalemlerden geliyor: satın alınan mal
> ve hizmetler, konutun gömülü karbonu, kamu hizmetleri payı. Bunları
> dokümantasyonda yedi madde hâlinde listeledim. Yani uygulamanın değeri gerçek
> ayak izinin alt sınırıdır.

**"Hesabın doğru olduğunu nasıl biliyorsunuz?"**
> Üç yolla. Birincisi 62 birim testi — her kategori elle hesaplanmış değerlerle
> karşılaştırılıyor. İkincisi çapraz doğrulama: motoru iki ayrı dilde bağımsız
> yazdım ve 28 senaryoda karşılaştırdım; bu gerçek bir hata yakaladı. Üçüncüsü
> makullük kontrolü: sonucun TÜİK ortalamasıyla tutarlılığı.

**"Neden yerel (native) Android arayüzü değil de WebView?"**
> Hesap motorunu arayüzden tamamen ayırmak istedim; bu sayede motor ayrıca test
> edilebiliyor ve aynı kod hem uygulamada hem tarayıcıda çalışıyor. Arayüz
> `WebViewAssetLoader` ile uygulamanın içinden sanal bir https kaynağında
> sunuluyor; ağ erişimi yok, uygulama INTERNET izni bile istemiyor. APK 1,5 MB
> ve hiçbir harici kütüphane kullanmıyor — grafikler elle yazılmış SVG.

**"GES hesabındaki performans oranını neden 0,80 aldınız?"**
> IEC 61724'e göre performans oranı, sistemin nominal gücüne göre gerçekte
> ürettiği enerjinin oranıdır. Çatı tipi konut kurulumunda tipik bileşenler:
> sıcaklık kaybı %7–10, evirici %2–4, kablo %1–2, kirlenme %2–3, modül
> uyumsuzluğu %1–2, ayrıca gölgelenme ve azimut sapması. 0,80 bunların toplamı
> için muhafazakâr bir değerdir. Yöntemi ulusal ortalamayla doğruladım:
> Meteoroloji'nin 1.581 kWh/m² ölçümüyle 1.454 kWh/kWp çıkıyor; Dünya
> Bankası'nın Türkiye için verdiği 1.577 kWh/kWp ise serbest duran santral için,
> yani çatıda daha düşük çıkması beklenen yönde.

**"Bölgesel değerler ne kadar güvenilir?"**
> ±%10–15 belirsizlik taşıyor; GEPA'nın bölgesel tablosu yer ölçümlerine dayanır
> ve modern uydu verilerine göre muhafazakârdır. Bu yüzden uygulamada özgül
> üretim değeri elle girilebiliyor: kullanıcı PVGIS'ten kendi koordinatı için
> aldığı değeri yazarsa bölge varsayımı devre dışı kalıyor. Belirsizliği
> dokümantasyonda da açıkça yazdım.

**"Veriler nereye gidiyor? Gizlilik?"**
> Hiçbir yere. Uygulama INTERNET izni istemiyor; ağ isteği yapamaz. Girdiler ve
> geçmiş yalnızca cihazın kendi deposunda tutuluyor. Bu bir özellik değil,
> tasarım kararı.

**"Beslenme neden bu kadar yüksek çıktı?"**
> Sığır eti kilogram başına 60 kg CO₂e — zincirin en yoğun kalemi. Tavuk 6,
> baklagil 0,9. Dengeli profilde haftada 3 porsiyon kırmızı et bile yılda
> yaklaşık 940 kg CO₂e demek. Bu, literatürle tutarlı bir bulgu.

**"Uygulamayı Play Store'a yükleyecek misiniz?"**
> Teknik olarak hazır; imzalı yayın yapılandırması var. Yüklemeden önce
> emisyon faktörlerini güncel tutacak bir düzen kurmak ve KVKK/Play politika
> metinlerini hazırlamak gerekir.

**"Ne eklerdiniz?"**
> Dört şey: 81 il için koordinat bazlı ışınım verisi; Türkiye'ye özgü gıda
> faktörleri; satın alınan mal ve hizmetler kategorisi; rüzgâr ve ısı pompası
> modülleri.

---

## Sunum öncesi kontrol listesi

- [ ] APK telefona kurulu ve açılıyor
- [ ] Tarayıcı yedeği hazır (`index.html` açık bir sekmede)
- [ ] Geçmişe iki örnek kayıt eklenmiş (önce/sonra karşılaştırması için)
- [ ] Telefon şarjda, ekran kilidi uzun süreli
- [ ] Projeksiyon bağlantısı denenmiş
- [ ] HTML raporun bir çıktısı yazdırılmış (ek olarak sunulabilir)
- [ ] Test çıktıları ekran görüntüsü olarak hazır
- [ ] Rapor basılı ve ciltli

---

## Slayt iskeleti (12 slayt)

| # | Başlık | İçerik |
|---|---|---|
| 1 | Kapak | Proje adı, ad, bölüm, danışman, tarih |
| 2 | Problem | Türkiye kişi başı 6,8 t · 1,5 °C hedefi 2,3 t |
| 3 | Mevcut araçların eksikleri | Şeffaflık yok · ülkeye uyarlama yok · telafi yok |
| 4 | Amaç ve kapsam | Ne yapıldı, ne yapılmadı |
| 5 | Yöntem | `E = A × EF` · kapsamlar · hane paylaşımı |
| 6 | Emisyon faktörleri | Kaynak tablosu · türetme örneği |
| 7 | Türkiye'ye uyarlama | Şebeke faktörü seçimi · elektrikli araç |
| 8 | GES modülü | `E = GHI × K_eğim × PR` · bölge tablosu |
| 9 | Uygulama | Ekran görüntüleri |
| 10 | Bulgular | Referans hane · GES telafi örneği |
| 11 | Doğrulama | 110 test · yakalanan hata |
| 12 | Sonuç | Çıkarımlar · geliştirmeye açık yönler |

**Slayt kuralı:** Her slaytta en fazla bir ana fikir. Formülleri büyük yazın,
tabloları sadeleştirin, ayrıntıyı konuşarak verin.
