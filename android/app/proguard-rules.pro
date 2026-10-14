# KarbonPusula — yayın derlemesi küçültme kuralları
#
# Kritik nokta: WebView'a addJavascriptInterface ile verilen sınıfın
# @JavascriptInterface metotları yansıma (reflection) ile çağrılır. R8 bu
# metotları kullanılmıyor sanıp siler; o zaman paylaşım ve rapor kaydetme
# sessizce çalışmaz. Aşağıdaki kural bunu engeller.

-keepclassmembers class com.karbonpusula.app.Kopru {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.karbonpusula.app.Kopru { *; }

# WebView'a verilen tüm JavaScript arayüzleri için genel koruma
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Bildirimde adıyla anılan sınıflar
-keep class com.karbonpusula.app.MainActivity { *; }
-keep class com.karbonpusula.app.KarbonPusulaUygulama { *; }

# Yığın izlerinin okunabilir kalması için satır numaraları
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# AndroidX WebKit — WebViewAssetLoader iç sınıfları
-dontwarn androidx.webkit.**
