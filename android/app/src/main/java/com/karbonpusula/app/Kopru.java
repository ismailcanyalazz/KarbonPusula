package com.karbonpusula.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.webkit.JavascriptInterface;

import androidx.core.content.FileProvider;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.Writer;
import java.nio.charset.StandardCharsets;

/**
 * Sayfa ile Android arasındaki köprü. JavaScript tarafında {@code window.Kopru}
 * adıyla görünür; {@code ui.js} her çağrıyı {@code try/catch} içinde yapar ve
 * köprü yoksa tarayıcı davranışına döner. Böylece aynı HTML hem uygulamada hem
 * masaüstü tarayıcıda çalışır.
 *
 * <p><b>Güvenlik.</b> Yalnızca {@link JavascriptInterface} ile işaretli metotlar
 * sayfadan erişilebilir. Sayfa tamamen uygulama paketinin içinden sunulduğu ve
 * uzak içerik yüklenmediği için köprü yalnızca güvenilen koda açıktır. Üretilen
 * dosyalar uygulamanın kendi önbellek dizinine yazılır ve dışarıya yalnızca
 * {@link FileProvider} üzerinden, tek seferlik okuma izniyle verilir — bu yüzden
 * depolama izni gerekmez.
 */
public class Kopru {

    /** Paylaşılacak dosyaların yazıldığı alt dizin (bkz. res/xml/paylasim_yollari.xml). */
    private static final String PAYLASIM_DIZINI = "paylasim";

    private final MainActivity etkinlik;

    Kopru(MainActivity etkinlik) {
        this.etkinlik = etkinlik;
    }

    /** Düz metin özetini sistem paylaşım sayfasına gönderir. */
    @JavascriptInterface
    public void paylas(String baslik, String metin) {
        if (metin == null || metin.isEmpty()) return;

        Intent gonder = new Intent(Intent.ACTION_SEND);
        gonder.setType("text/plain");
        gonder.putExtra(Intent.EXTRA_SUBJECT, baslik == null ? "" : baslik);
        gonder.putExtra(Intent.EXTRA_TEXT, metin);

        Intent secici = Intent.createChooser(gonder, etkinlik.getString(R.string.paylas_baslik));
        secici.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        etkinlik.startActivity(secici);
    }

    /**
     * İçeriği bir dosyaya yazar ve paylaşım sayfasını açar. Kullanıcı buradan
     * dosyayı kaydedebilir, e-posta ile gönderebilir ya da bir uygulamada açabilir.
     *
     * @param dosyaAdi "karbonpusula-rapor-2026-10-14.html" gibi
     * @param icerik   UTF-8 metin
     * @param mimeTuru "text/html" veya "application/json"
     */
    @JavascriptInterface
    public void dosyaKaydet(String dosyaAdi, String icerik, String mimeTuru) {
        if (dosyaAdi == null || icerik == null) return;
        String ad = guvenliAd(dosyaAdi);

        try {
            File dizin = new File(etkinlik.getCacheDir(), PAYLASIM_DIZINI);
            if (!dizin.exists() && !dizin.mkdirs()) {
                throw new IOException("Paylaşım dizini oluşturulamadı");
            }
            eskileriTemizle(dizin);

            File dosya = new File(dizin, ad);
            try (Writer yazici = new OutputStreamWriter(
                    new FileOutputStream(dosya), StandardCharsets.UTF_8)) {
                yazici.write(icerik);
            }

            Uri adres = FileProvider.getUriForFile(
                    etkinlik, etkinlik.getPackageName() + ".dosyalar", dosya);

            Intent gonder = new Intent(Intent.ACTION_SEND);
            gonder.setType(mimeTuru == null || mimeTuru.isEmpty() ? "text/plain" : mimeTuru);
            gonder.putExtra(Intent.EXTRA_STREAM, adres);
            gonder.putExtra(Intent.EXTRA_SUBJECT, ad);
            gonder.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            Intent secici = Intent.createChooser(gonder, etkinlik.getString(R.string.rapor_baslik));
            secici.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            secici.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            etkinlik.startActivity(secici);

        } catch (IOException | IllegalArgumentException hata) {
            etkinlik.mesajGoster(etkinlik.getString(R.string.rapor_olusturulamadi));
        }
    }

    /** Sayfanın etkin teması: "koyu" veya "acik". Durum çubuğu buna göre ayarlanır. */
    @JavascriptInterface
    public void temaBildir(String tema) {
        etkinlik.temayiUygula("koyu".equals(tema));
    }

    /** Kısa bir sistem bildirimi (toast) gösterir. */
    @JavascriptInterface
    public void bildir(String mesaj) {
        if (mesaj != null && !mesaj.isEmpty()) etkinlik.mesajGoster(mesaj);
    }

    /** Uygulama sürümü — "Hakkında" bölümünde gösterilebilir. */
    @JavascriptInterface
    public String surum() {
        return BuildConfig.VERSION_NAME + " (" + BuildConfig.VERSION_CODE + ")";
    }

    /* --------------------------------------------------------------------- */

    /** Dizin geçişi ve geçersiz karakterlere karşı dosya adını temizler. */
    private static String guvenliAd(String ham) {
        String ad = new File(ham).getName().replaceAll("[^A-Za-z0-9._-]", "_");
        if (ad.isEmpty() || ".".equals(ad) || "..".equals(ad)) ad = "karbonpusula.txt";
        return ad.length() > 100 ? ad.substring(ad.length() - 100) : ad;
    }

    /** Önceki paylaşımlardan kalan dosyaları siler; önbellek büyümesin. */
    private static void eskileriTemizle(File dizin) {
        File[] dosyalar = dizin.listFiles();
        if (dosyalar == null) return;
        long sinir = System.currentTimeMillis() - 24L * 60L * 60L * 1000L;
        for (File d : dosyalar) {
            if (d.isFile() && d.lastModified() < sinir) {
                //noinspection ResultOfMethodCallIgnored
                d.delete();
            }
        }
    }

    /** Birim testleri ve statik analiz için bağlam erişimi. */
    Context baglam() {
        return etkinlik;
    }
}
