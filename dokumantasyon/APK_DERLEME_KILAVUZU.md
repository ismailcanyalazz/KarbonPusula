# APK Derleme Kılavuzu

Bu kılavuz, KarbonPusula'yı telefona kurulabilir bir `.apk` dosyasına
dönüştürmenin **üç yolunu** anlatır. En kolayından başlayın.

| Yol | Gereken | Süre | Kime uygun |
|---|---|---|---|
| **A — GitHub Actions** | Yalnızca GitHub hesabı | ~5 dk kurulum, ~4 dk derleme | Bilgisayarına bir şey kurmak istemeyen |
| **B — Android Studio** | Android Studio (~1 GB indirme) | ~30 dk kurulum, ~3 dk derleme | Kodu görmek, kendi telefonunda anında denemek isteyen |
| **C — Komut satırı** | JDK 17 + Android SDK | Orta | Terminal kullanmayı bilen |

> **Önce şunu bilin:** Uygulamanın arayüzünü derlemeden de görebilirsiniz.
> `android/app/src/main/assets/index.html` dosyasını çift tıklayıp tarayıcıda
> açın — uygulama tam olarak telefondaki gibi çalışır. Sunumdan önce hızlı
> kontrol için en pratik yol budur.

---

## Yol A — GitHub Actions (önerilen)

Projeyi GitHub'a yüklersiniz, GitHub sizin için bulutta derler, APK'yı
indirirsiniz. Bilgisayarınıza Android Studio kurmanız gerekmez.

### A.1 GitHub hesabı ve depo

1. <https://github.com> adresinden ücretsiz hesap açın.
2. Sağ üstteki **+** → **New repository**.
3. İsim: `KarbonPusula`. **Private** seçebilirsiniz; Actions özel depolarda da
   ücretsiz çalışır.
4. **Create repository**.

### A.2 Dosyaları yükleme

**En kolay yol — sürükle bırak:**

1. Yeni deponun sayfasında **uploading an existing file** bağlantısına tıklayın.
2. `KarbonPusula` klasörünün **içindekileri** seçip tarayıcıya sürükleyin.
   - `.venv` ve `__pycache__` klasörlerini **yüklemeyin** (gereksiz ve çok
     büyüktür; `.gitignore` zaten dışlar).
   - `.github` klasörünün yüklendiğinden emin olun — iş akışı oradadır.
     Windows Gezgini gizli klasörleri saklıyorsa: **Görünüm → Gizli öğeler**.
3. Alttaki kutuya kısa bir açıklama yazıp **Commit changes**.

**Git kuruluysa (daha temiz):**

```powershell
cd C:\Users\msipc\Desktop\KarbonPusula
git init
git add .
git commit -m "KarbonPusula 2.0"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADINIZ/KarbonPusula.git
git push -u origin main
```

### A.3 APK'yı indirme

1. Deponun **Actions** sekmesine gidin.
2. "APK derle" iş akışı kendiliğinden başlamış olmalı. Başlamadıysa soldan
   seçip **Run workflow** deyin.
3. Yeşil ✓ işareti çıkana kadar bekleyin (yaklaşık 3–5 dakika).
4. Çalışmaya tıklayın, sayfanın altındaki **Artifacts** bölümünden
   **KarbonPusula-APK** dosyasını indirin.
5. İçinden çıkan `app-debug.apk` dosyasını telefona aktarın.

> İş akışı önce testleri çalıştırır. Testler başarısız olursa APK üretilmez —
> bu kasıtlıdır: hatalı hesap yapan bir uygulama elinize geçmesin.

---

## Yol B — Android Studio

### B.1 Kurulum

1. <https://developer.android.com/studio> adresinden indirin.
2. Kurulum sırasında **Android SDK** ve **Android SDK Platform 35** bileşenlerini
   seçili bırakın.
3. Android Studio kendi JDK'sını (JBR 17) getirir; ayrıca JDK kurmanız gerekmez.

### B.2 Projeyi açma

1. Android Studio → **Open**.
2. `C:\Users\msipc\Desktop\KarbonPusula\android` klasörünü seçin.
   **Dikkat:** Üstteki `KarbonPusula` klasörünü değil, içindeki **`android`**
   klasörünü seçin.
3. İlk açılışta Gradle bağımlılıkları indirir (birkaç dakika, internet gerekir).
   Alt çubuktaki ilerleme bitene kadar bekleyin.

### B.3 Telefonda doğrudan çalıştırma

1. Telefonda **Ayarlar → Telefon hakkında → Yapı numarası**na yedi kez dokunun
   (Geliştirici seçenekleri açılır).
2. **Ayarlar → Geliştirici seçenekleri → USB hata ayıklama**yı açın.
3. Telefonu USB ile bağlayın, çıkan izin penceresinde **İzin ver** deyin.
4. Android Studio'da üstteki cihaz listesinden telefonunuzu seçin ve yeşil
   **Run ▶** düğmesine basın.

Uygulama birkaç saniyede telefona kurulup açılır. Kod veya arayüzde değişiklik
yapıp tekrar **Run** demeniz yeterlidir.

### B.4 APK dosyası üretme

**Build → Build Bundle(s) / APK(s) → Build APK(s)**

APK şurada oluşur:

```
android\app\build\outputs\apk\debug\app-debug.apk
```

Sağ altta çıkan bildirimdeki **locate** bağlantısıyla klasöre gidebilirsiniz.

---

## Yol C — Komut satırı

JDK 17 ve Android SDK kuruluysa:

```powershell
cd C:\Users\msipc\Desktop\KarbonPusula\android
.\gradlew.bat assembleDebug
```

Linux / macOS:

```bash
cd KarbonPusula/android
chmod +x gradlew
./gradlew assembleDebug
```

`ANDROID_HOME` ortam değişkeni tanımlı değilse `android/local.properties`
dosyası oluşturup SDK yolunu yazın:

```properties
sdk.dir=C\:\\Users\\msipc\\AppData\\Local\\Android\\Sdk
```

Yararlı komutlar:

| Komut | İşlev |
|---|---|
| `.\gradlew.bat assembleDebug` | Hata ayıklama APK'sı |
| `.\gradlew.bat assembleRelease` | Yayın APK'sı |
| `.\gradlew.bat installDebug` | Derleyip bağlı telefona kur |
| `.\gradlew.bat lintDebug` | Statik analiz raporu |
| `.\gradlew.bat clean` | Derleme çıktılarını temizle |

---

## Telefona kurma

1. APK dosyasını telefona kopyalayın (USB, e-posta, Drive, WhatsApp — fark etmez).
2. Telefonda **Dosyalar** uygulamasından APK'ya dokunun.
3. "Bilinmeyen kaynaklardan uygulama yükleme" uyarısı çıkarsa **Ayarlar**a gidip
   kullandığınız uygulamaya (Dosyalar / Chrome) izin verin, sonra geri dönün.
4. **Yükle** → **Aç**.

> Hata ayıklama (debug) APK'sı Play Store'a yüklenemez ama telefona doğrudan
> kurulur ve bitirme projesi sunumu için tamamen yeterlidir.

### Google Play'e yükleme (isteğe bağlı)

Play Store için **imzalı yayın APK'sı** ya da AAB gerekir:

1. Android Studio → **Build → Generate Signed Bundle / APK**.
2. **Create new…** ile bir anahtar deposu (keystore) oluşturun.
   **Şifreyi ve `.jks` dosyasını kaybetmeyin** — kaybederseniz uygulamayı bir
   daha güncelleyemezsiniz.
3. Alternatif olarak `android/keystore.properties` dosyası oluşturun:

   ```properties
   storeFile=karbonpusula.jks
   storePassword=...
   keyAlias=karbonpusula
   keyPassword=...
   ```

   Bu dosya varsa `assembleRelease` otomatik imzalar. `.gitignore` her ikisini de
   depo dışında tutar — **asla GitHub'a yüklemeyin.**

---

## Sorun giderme

### "SDK location not found"
`android/local.properties` dosyası yok veya yanlış. Yol C'deki `sdk.dir`
satırını ekleyin. Android Studio'dan açtığınızda bu dosya kendiliğinden oluşur.

### "Unsupported class file major version" / "Unsupported Java version"
JDK sürümü uyumsuz. Proje **JDK 17** ister.
Android Studio: **File → Settings → Build, Execution, Deployment → Build Tools →
Gradle → Gradle JDK** → 17 seçin.

### "Could not resolve com.android.application"
İnternet yok ya da ilk indirme tamamlanmadı. Bağlantıyı kontrol edip
**File → Sync Project with Gradle Files** deyin. Kurumsal ağ/VPN arkasındaysanız
bağlantıyı değiştirmeyi deneyin.

### "Installation failed: INSTALL_FAILED_UPDATE_INCOMPATIBLE"
Telefonda aynı uygulamanın farklı imzalı bir sürümü var. Eskisini kaldırıp
tekrar kurun.

### Uygulama açılıyor ama ekran boş
Varlıklar eksik derlenmiş olabilir. `android/app/src/main/assets/` altında
`index.html`, `css/` ve `js/` klasörlerinin bulunduğunu doğrulayın, sonra
`clean` + `assembleDebug` yapın.

Ayrıca WebView içeriğini bilgisayardan inceleyebilirsiniz: telefon USB ile
bağlıyken Chrome'da `chrome://inspect` adresini açın, KarbonPusula'yı seçip
**inspect** deyin. (Yalnızca debug derlemelerinde açıktır.)

### "veri.js, emisyon_faktorleri.json ile uyuşmuyor" (GitHub Actions hatası)
JSON'u düzenleyip üretim betiğini çalıştırmayı unutmuşsunuz:

```bash
python3 scripts/veri_uret.py
```

Sonra değişikliği tekrar yükleyin.

### Gradle "configuration cache problems"
`android/gradle.properties` içindeki şu satırı başına `#` koyarak kapatın:

```properties
#org.gradle.configuration-cache=true
```

---

## Geliştirme döngüsü

Arayüzde değişiklik yaparken Android Studio'ya hiç ihtiyacınız yok:

1. `android/app/src/main/assets/` altındaki HTML/CSS/JS dosyalarını düzenleyin.
2. `index.html` dosyasını tarayıcıda açıp **Ctrl+R** ile yenileyin.
3. Beğendiğinizde bir kez derleyin.

Emisyon faktörü değiştirirken:

1. `veriler/emisyon_faktorleri.json` dosyasını düzenleyin.
2. `python3 scripts/veri_uret.py` çalıştırın.
3. `node tests/test_hesap.js` ve `python3 tests/test_dogrulama.py` ile sınayın.

---

## Teknik künye

| | |
|---|---|
| Paket adı | `com.karbonpusula.app` |
| Sürüm | 2.0.0 (versionCode 2) |
| En düşük Android | 7.0 (API 24) |
| Hedef Android | 15 (API 35) |
| Derleme SDK | 35 |
| Android Gradle Plugin | 8.7.3 |
| Gradle | 8.11.1 (sarmalayıcı dahil) |
| Java | 17 |
| İzinler | **Yok** |
| APK boyutu | ≈ 1,5 MB |

### Kullanılan kütüphaneler

| Kütüphane | Neden |
|---|---|
| `androidx.webkit:webkit` | `WebViewAssetLoader` — varlıkları `https://` kaynağında sunar, `file://` kısıtlamalarından kaçınır |
| `androidx.appcompat:appcompat` | DayNight teması |
| `androidx.core:core` | `FileProvider`, pencere boşlukları |
| `androidx.activity:activity` | Modern geri tuşu yönetimi |

Arayüz tarafında **hiçbir harici kütüphane yoktur**: grafikler elle yazılmış
SVG'dir, yazı tipi sistem yazı tipidir, ağ isteği yapılmaz.
