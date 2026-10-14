package com.karbonpusula.app;

import android.app.Application;
import android.os.Build;
import android.webkit.WebView;

import androidx.appcompat.app.AppCompatDelegate;

/**
 * Uygulama sınıfı.
 *
 * <p>İki iş yapar:
 * <ul>
 *   <li>Temayı sistem ayarına bağlar; kullanıcının sayfa içinden yaptığı tema
 *       seçimi yalnızca WebView içeriğini etkiler, sistem çubukları
 *       {@code MainActivity.temayiUygula} ile ayrıca eşitlenir.</li>
 *   <li>Hata ayıklama derlemelerinde WebView denetimini (Chrome DevTools ile
 *       {@code chrome://inspect}) açar. Yayın derlemesinde kapalıdır.</li>
 * </ul>
 */
public class KarbonPusulaUygulama extends Application {

    @Override
    public void onCreate() {
        super.onCreate();

        AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM);

        if (BuildConfig.DEBUG && Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
        }
    }
}
