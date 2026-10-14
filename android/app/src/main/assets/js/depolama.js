/*!
 * KarbonPusula — Yerel depolama katmanı
 * ---------------------------------------------------------------------------
 * Uygulama tamamen çevrimdışıdır; hiçbir veri cihazdan dışarı çıkmaz.
 * Girdiler, ayarlar ve hesap geçmişi WebView'un localStorage alanında tutulur.
 *
 * localStorage her ortamda kullanılabilir olmayabilir (gizli pencere, site
 * verisi engellenmiş olabilir) ve erişim hata fırlatabilir. Bu yüzden her
 * okuma/yazma try/catch içindedir ve depolama yoksa uygulama bellekte
 * çalışmaya devam eder.
 */
(function (global) {
  'use strict';

  var ONEK = 'karbonpusula.';
  var A_GIRDI = ONEK + 'girdi';
  var A_AYAR = ONEK + 'ayar';
  var A_GECMIS = ONEK + 'gecmis';
  var GECMIS_SINIR = 50;

  /* Depolama yoksa kullanılacak bellek içi yedek */
  var bellek = {};
  var kullanilabilir = (function () {
    try {
      var d = ONEK + 'deneme';
      global.localStorage.setItem(d, '1');
      global.localStorage.removeItem(d);
      return true;
    } catch (e) {
      return false;
    }
  })();

  function yaz(anahtar, deger) {
    var metin;
    try {
      metin = JSON.stringify(deger);
    } catch (e) {
      return false;
    }
    if (kullanilabilir) {
      try {
        global.localStorage.setItem(anahtar, metin);
        return true;
      } catch (e) {
        /* kota dolmuş olabilir — belleğe düş */
      }
    }
    bellek[anahtar] = metin;
    return false;
  }

  function oku(anahtar, varsayilan) {
    var metin = null;
    if (kullanilabilir) {
      try {
        metin = global.localStorage.getItem(anahtar);
      } catch (e) {
        metin = null;
      }
    }
    if (metin === null || metin === undefined) {
      metin = Object.prototype.hasOwnProperty.call(bellek, anahtar) ? bellek[anahtar] : null;
    }
    if (metin === null) return varsayilan;
    try {
      var d = JSON.parse(metin);
      return d === null || d === undefined ? varsayilan : d;
    } catch (e) {
      return varsayilan;
    }
  }

  function sil(anahtar) {
    if (kullanilabilir) {
      try { global.localStorage.removeItem(anahtar); } catch (e) { /* yoksay */ }
    }
    delete bellek[anahtar];
  }

  /* ----------------------------------------------------------------------- *
   * Girdi taslağı
   * ----------------------------------------------------------------------- */

  function girdiKaydet(girdi) { return yaz(A_GIRDI, girdi); }
  function girdiOku(varsayilan) { return oku(A_GIRDI, varsayilan); }
  function girdiSil() { sil(A_GIRDI); }

  /* ----------------------------------------------------------------------- *
   * Ayarlar
   * ----------------------------------------------------------------------- */

  function ayarOku() {
    var a = oku(A_AYAR, {});
    return {
      tema: a.tema === 'acik' || a.tema === 'koyu' ? a.tema : 'sistem',
      gorunum: a.gorunum === 'tablo' ? 'tablo' : 'grafik',
      bolge: typeof a.bolge === 'string' ? a.bolge : 'icanadolu'
    };
  }

  function ayarYaz(yeni) {
    var a = ayarOku();
    for (var k in yeni) {
      if (Object.prototype.hasOwnProperty.call(yeni, k)) a[k] = yeni[k];
    }
    return yaz(A_AYAR, a);
  }

  /* ----------------------------------------------------------------------- *
   * Hesap geçmişi
   * ----------------------------------------------------------------------- */

  function gecmisOku() {
    var g = oku(A_GECMIS, []);
    return Array.isArray(g) ? g : [];
  }

  /**
   * Bir hesap sonucunu geçmişe ekler. Sonucun tamamı değil, geçmiş listesinde
   * gösterilecek özet ile girdiyi geri yüklemeye yetecek veri saklanır.
   */
  function gecmiseEkle(sonuc, girdi, not) {
    var liste = gecmisOku();
    var kayit = {
      kimlik: 'k' + Date.now() + Math.random().toString(36).slice(2, 7),
      zaman: sonuc.zaman || new Date().toISOString(),
      not: typeof not === 'string' ? not.slice(0, 80) : '',
      surum: sonuc.surum,
      hane_kisi: sonuc.hane_kisi,
      toplam_kg_yil: sonuc.toplam_kg_yil,
      toplam_ton_yil: sonuc.toplam_ton_yil,
      kategoriler: sonuc.kategoriler.map(function (k) {
        return { anahtar: k.anahtar, etiket: k.etiket, yuva: k.yuva, kg_yil: k.kg_yil, pay: k.pay };
      }),
      girdi: girdi
    };
    liste.unshift(kayit);
    if (liste.length > GECMIS_SINIR) liste.length = GECMIS_SINIR;
    yaz(A_GECMIS, liste);
    return kayit;
  }

  function gecmistenSil(kimlik) {
    var liste = gecmisOku().filter(function (k) { return k.kimlik !== kimlik; });
    yaz(A_GECMIS, liste);
    return liste;
  }

  function gecmisTemizle() {
    sil(A_GECMIS);
    return [];
  }

  function gecmisBul(kimlik) {
    return gecmisOku().filter(function (k) { return k.kimlik === kimlik; })[0] || null;
  }

  /* ----------------------------------------------------------------------- *
   * Yedekleme (JSON dışa/içe aktarma)
   * ----------------------------------------------------------------------- */

  function yedekUret() {
    return {
      uygulama: 'KarbonPusula',
      yedek_surum: 1,
      olusturma: new Date().toISOString(),
      ayar: ayarOku(),
      girdi: girdiOku(null),
      gecmis: gecmisOku()
    };
  }

  function yedekYukle(nesne) {
    if (!nesne || nesne.uygulama !== 'KarbonPusula') {
      throw new Error('Bu dosya bir KarbonPusula yedeği değil.');
    }
    if (nesne.ayar) ayarYaz(nesne.ayar);
    if (nesne.girdi) girdiKaydet(nesne.girdi);
    if (Array.isArray(nesne.gecmis)) yaz(A_GECMIS, nesne.gecmis.slice(0, GECMIS_SINIR));
    return true;
  }

  /* ----------------------------------------------------------------------- *
   * Dışa aktarım
   * ----------------------------------------------------------------------- */

  global.KPDepo = {
    kullanilabilir: kullanilabilir,
    girdiKaydet: girdiKaydet,
    girdiOku: girdiOku,
    girdiSil: girdiSil,
    ayarOku: ayarOku,
    ayarYaz: ayarYaz,
    gecmisOku: gecmisOku,
    gecmiseEkle: gecmiseEkle,
    gecmistenSil: gecmistenSil,
    gecmisTemizle: gecmisTemizle,
    gecmisBul: gecmisBul,
    yedekUret: yedekUret,
    yedekYukle: yedekYukle,
    GECMIS_SINIR: GECMIS_SINIR
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
