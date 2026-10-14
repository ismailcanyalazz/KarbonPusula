package com.karbonpusula.app;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.webkit.WebViewAssetLoader;

/**
 * KarbonPusula — tek etkinlikli WebView kabuğu.
 *
 * <p>Arayüzün tamamı {@code src/main/assets} altındaki HTML/CSS/JS dosyalarındadır.
 * Bu sınıf yalnızca şunları yapar:
 * <ul>
 *   <li>Varlıkları {@link WebViewAssetLoader} ile {@code https://appassets.androidplatform.net/}
 *       altında sunar. Böylece sayfa gerçek bir https kaynağında çalışır ve
 *       {@code localStorage} ile {@code fetch} kısıtlamasız kullanılabilir.
 *       {@code file://} şeması bu nedenle hiç kullanılmaz.</li>
 *   <li>Geri tuşunu önce sayfaya sorar (sekmeler arası geri gidiş).</li>
 *   <li>Sayfaya {@code Kopru} adıyla paylaşım ve dosya kaydetme köprüsü verir.</li>
 *   <li>Durum çubuğu renklerini sayfanın temasıyla eşleştirir.</li>
 * </ul>
 *
 * <p><b>Ağ erişimi yoktur.</b> Uygulama INTERNET iznini istemez; varlık yükleyicinin
 * dışındaki tüm istekler {@link #shouldInterceptRequest} içinde engellenir. Kaynakça
 * bağlantıları cihazın tarayıcısına devredilir.
 */
public class MainActivity extends AppCompatActivity {

    /** Varlıkların sunulduğu sanal alan adı (WebViewAssetLoader varsayılanı). */
    private static final String VARLIK_ALANI = "appassets.androidplatform.net";
    private static final String BASLANGIC = "https://" + VARLIK_ALANI + "/assets/index.html";

    private View kok;
    private WebView webGorunum;
    private WebViewAssetLoader varlikYukleyici;

    @Override
    @SuppressLint("SetJavaScriptEnabled")
    protected void onCreate(@Nullable Bundle kayitliDurum) {
        super.onCreate(kayitliDurum);

        // Android 15 (API 35) hedeflendiğinde kenardan kenara düzen zorunludur.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        setContentView(R.layout.activity_main);
        webGorunum = findViewById(R.id.web_gorunum);
        kok = findViewById(R.id.kok);

        varlikYukleyici = new WebViewAssetLoader.Builder()
                .setDomain(VARLIK_ALANI)
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        ayarlariUygula(webGorunum.getSettings());
        webGorunum.setWebViewClient(new KarbonWebViewClient());
        webGorunum.addJavascriptInterface(new Kopru(this), "Kopru");
        webGorunum.setBackgroundColor(ContextCompat.getColor(this, R.color.zemin));

        // Uzun basınca çıkan metin seçimi/bağlam menüsü uygulama hissini bozar.
        webGorunum.setLongClickable(false);
        webGorunum.setOnLongClickListener(v -> true);
        webGorunum.setHapticFeedbackEnabled(false);
        webGorunum.setOverScrollMode(View.OVER_SCROLL_NEVER);

        if (kayitliDurum != null) {
            webGorunum.restoreState(kayitliDurum);
        } else {
            webGorunum.loadUrl(BASLANGIC);
        }

        geriTusuKur();
        bosluklariKur();
    }

    /**
     * Sistem çubuklarının ve klavyenin kapladığı alanı kök görünüme dolgu olarak
     * uygular.
     *
     * <p>Neden CSS ile yapılmıyor: WebView'da {@code env(safe-area-inset-*)}
     * yalnızca ekran çentiğini (display cutout) bildirir; durum çubuğu ve
     * gezinme çubuğu yüksekliğini bildirmez. Bu yüzden içerik alanı yerel
     * tarafta daraltılır ve sayfa her zaman görünür bölgede çizilir.
     *
     * <p>Klavye açıldığında alt dolgu klavye yüksekliğine çıkar; böylece
     * {@code adjustResize} davranışı kenardan kenara düzende de doğru çalışır
     * ve odaklanılan giriş alanı klavyenin altında kalmaz.
     */
    private void bosluklariKur() {
        ViewCompat.setOnApplyWindowInsetsListener(kok, (gorunum, pencereBosluklari) -> {
            Insets cubuklar = pencereBosluklari.getInsets(
                    WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            Insets klavye = pencereBosluklari.getInsets(WindowInsetsCompat.Type.ime());

            gorunum.setPadding(
                    cubuklar.left,
                    cubuklar.top,
                    cubuklar.right,
                    Math.max(cubuklar.bottom, klavye.bottom));

            return WindowInsetsCompat.CONSUMED;
        });
    }

    private void ayarlariUygula(@NonNull WebSettings a) {
        a.setJavaScriptEnabled(true);
        a.setDomStorageEnabled(true);          // localStorage — geçmiş ve ayarlar
        a.setDatabaseEnabled(true);

        // Varlıklar yükleyici üzerinden sunulduğu için dosya erişimi kapatılır.
        a.setAllowFileAccess(false);
        a.setAllowContentAccess(false);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            a.setAllowFileAccessFromFileURLs(false);
            a.setAllowUniversalAccessFromFileURLs(false);
        }

        // Sayfa duyarlı tasarıma sahiptir; WebView'un kendi ölçeklemesi kapatılır.
        a.setUseWideViewPort(false);
        a.setLoadWithOverviewMode(false);
        a.setSupportZoom(false);
        a.setBuiltInZoomControls(false);
        a.setDisplayZoomControls(false);
        a.setTextZoom(100);

        a.setMediaPlaybackRequiresUserGesture(true);
        a.setGeolocationEnabled(false);
        a.setSaveFormData(false);
        a.setCacheMode(WebSettings.LOAD_NO_CACHE);
        a.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    }

    /** Geri tuşu: önce sayfaya sorulur, sayfa devralmazsa uygulama kapanır. */
    private void geriTusuKur() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                webGorunum.evaluateJavascript(
                        "(function(){try{return !!(window.KarbonPusula "
                                + "&& window.KarbonPusula.geriTusu());}catch(e){return false;}})()",
                        sonuc -> {
                            if (!"true".equals(sonuc)) {
                                setEnabled(false);
                                getOnBackPressedDispatcher().onBackPressed();
                            }
                        });
            }
        });
    }

    @Override
    protected void onSaveInstanceState(@NonNull Bundle disaDurum) {
        super.onSaveInstanceState(disaDurum);
        webGorunum.saveState(disaDurum);
    }

    @Override
    protected void onDestroy() {
        if (webGorunum != null) {
            webGorunum.removeJavascriptInterface("Kopru");
            webGorunum.destroy();
            webGorunum = null;
        }
        super.onDestroy();
    }

    /** Sayfanın bildirdiği temaya göre durum/gezinme çubuğu simgelerini ayarlar. */
    void temayiUygula(final boolean koyu) {
        runOnUiThread(() -> {
            WindowInsetsControllerCompat denetleyici =
                    WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
            denetleyici.setAppearanceLightStatusBars(!koyu);
            denetleyici.setAppearanceLightNavigationBars(!koyu);
        });
    }

    void mesajGoster(final String metin) {
        runOnUiThread(() -> Toast.makeText(this, metin, Toast.LENGTH_SHORT).show());
    }

    /* --------------------------------------------------------------------- */

    private class KarbonWebViewClient extends WebViewClient {

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView gorunum, WebResourceRequest istek) {
            return varlikYukleyici.shouldInterceptRequest(istek.getUrl());
        }

        /**
         * Uygulama içi gezinme yalnızca varlık alanında olabilir. Kaynakça
         * bağlantıları gibi dış adresler cihazın tarayıcısına devredilir.
         */
        @Override
        public boolean shouldOverrideUrlLoading(WebView gorunum, WebResourceRequest istek) {
            Uri adres = istek.getUrl();
            if (VARLIK_ALANI.equals(adres.getHost())) {
                return false;
            }
            String sema = adres.getScheme();
            if ("http".equals(sema) || "https".equals(sema) || "mailto".equals(sema)) {
                try {
                    Intent niyet = new Intent(Intent.ACTION_VIEW, adres);
                    niyet.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(niyet);
                } catch (Exception hata) {
                    mesajGoster(getString(R.string.baglanti_acilamadi));
                }
            }
            return true;
        }
    }
}
