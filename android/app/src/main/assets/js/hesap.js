/*!
 * KarbonPusula — Hesap motoru
 * ---------------------------------------------------------------------------
 * Bu dosya karbon ayak izi hesabının tamamını içerir. Arayüzden tamamen
 * bağımsızdır: aynı fonksiyonlar Node.js üzerinde test edilebilir.
 *
 * Temel ilke:  emisyon = faaliyet verisi × emisyon faktörü
 *
 * Hane paylaşımı: Elektrik, ısınma, atık ve su hane düzeyinde tüketilir ve
 * hanedeki kişi sayısına bölünerek kişi başı ayak izine dönüştürülür.
 * Ulaşım, uçuş ve beslenme kişiseldir ve bölünmez.
 *
 * Tüm sonuçlar kg CO₂e / yıl cinsindendir.
 */
(function (global) {
  'use strict';

  /* ----------------------------------------------------------------------- *
   * Sabitler
   * ----------------------------------------------------------------------- */

  // Yıldaki hafta sayısı tam bölünmediği için yuvarlanmış bir sabit (52,1429)
  // kullanmak haftalık girdilerde binde bir düzeyinde sapma yaratır. Bölme
  // doğrudan yapılarak Python doğrulama motoruyla birebir aynı sonuç üretilir.
  var HAFTA_YIL = 365 / 7;   // 52,142857…
  var AY_YIL = 12;

  /** Görüntüleme kategorileri — sıra ve renk yuvası sabittir. */
  var KATEGORILER = [
    { anahtar: 'elektrik', etiket: 'Elektrik', yuva: 1, hane: true },
    { anahtar: 'isinma', etiket: 'Isınma', yuva: 2, hane: true },
    { anahtar: 'ulasim', etiket: 'Ulaşım', yuva: 3, hane: false },
    { anahtar: 'ucus', etiket: 'Uçuş', yuva: 4, hane: false },
    { anahtar: 'beslenme', etiket: 'Beslenme', yuva: 5, hane: false },
    { anahtar: 'atiksu', etiket: 'Atık ve su', yuva: 6, hane: true }
  ];

  /* ----------------------------------------------------------------------- *
   * Yardımcılar
   * ----------------------------------------------------------------------- */

  function sayi(deger, varsayilan) {
    var n = typeof deger === 'number' ? deger : parseFloat(deger);
    if (typeof n !== 'number' || !isFinite(n)) return varsayilan || 0;
    return n;
  }

  function pozitif(deger) {
    var n = sayi(deger, 0);
    return n < 0 ? 0 : n;
  }

  /** Verilen anahtarın faktör değerini döndürür; yoksa hata fırlatır. */
  function faktor(veri, anahtar) {
    var f = veri.faktorler[anahtar];
    if (!f) throw new Error('Tanımsız emisyon faktörü: ' + anahtar);
    return f;
  }

  /* ----------------------------------------------------------------------- *
   * Doğrulama
   * ----------------------------------------------------------------------- */

  /**
   * Girdiyi denetler. Kullanıcıya gösterilebilecek hata metinleri döndürür.
   * Boş dizi dönerse girdi geçerlidir.
   */
  function dogrula(girdi) {
    var hatalar = [];
    if (!girdi || typeof girdi !== 'object') {
      return ['Girdi verisi okunamadı.'];
    }

    var kisi = sayi(girdi.hane && girdi.hane.kisi, 0);
    if (!(kisi >= 1)) hatalar.push('Hanedeki kişi sayısı en az 1 olmalıdır.');
    if (kisi > 30) hatalar.push('Hanedeki kişi sayısı 30\'dan büyük olamaz.');

    function sayisalAlan(deger, ad) {
      if (deger === undefined || deger === null || deger === '') return;
      var n = typeof deger === 'number' ? deger : parseFloat(deger);
      if (typeof deger === 'boolean' || isNaN(n)) {
        hatalar.push(ad + ': geçerli bir sayı girin.');
      } else if (!isFinite(n)) {
        hatalar.push(ad + ': sayı sonlu olmalıdır.');
      } else if (n < 0) {
        hatalar.push(ad + ': negatif değer kullanılamaz.');
      }
    }

    sayisalAlan(girdi.elektrik && girdi.elektrik.kwh_ay, 'Aylık elektrik tüketimi');
    sayisalAlan(girdi.isinma && girdi.isinma.miktar_yil, 'Yıllık ısınma yakıtı');
    sayisalAlan(girdi.su && girdi.su.m3_ay, 'Aylık su tüketimi');
    sayisalAlan(girdi.atik && girdi.atik.kg_hafta, 'Haftalık atık miktarı');

    (girdi.ulasim || []).forEach(function (satir, i) {
      sayisalAlan(satir.miktar_hafta, (satir.etiket || 'Ulaşım ' + (i + 1)) + ' miktarı');
      if (satir.yolcu !== undefined && sayi(satir.yolcu, 1) < 1) {
        hatalar.push((satir.etiket || 'Ulaşım ' + (i + 1)) + ': yolcu sayısı en az 1 olmalıdır.');
      }
    });

    (girdi.ucus || []).forEach(function (satir, i) {
      sayisalAlan(satir.km_yil, (satir.etiket || 'Uçuş ' + (i + 1)) + ' mesafesi');
    });

    if (girdi.atik) {
      var toplamOran =
        pozitif(girdi.atik.depolama_orani) +
        pozitif(girdi.atik.geri_donusum_orani) +
        pozitif(girdi.atik.kompost_orani) +
        pozitif(girdi.atik.yakma_orani);
      if (toplamOran > 1.0001) {
        hatalar.push('Atık bertaraf oranlarının toplamı %100\'ü aşamaz.');
      }
    }

    return hatalar;
  }

  /* ----------------------------------------------------------------------- *
   * Kategori hesapları — her biri { kg: Number, satirlar: [...] } döndürür
   * ----------------------------------------------------------------------- */

  /**
   * Elektrik. Tüketimin bir kısmı çatı GES'ten, bir kısmı YEK-G belgeli
   * tarifeden karşılanabilir; kalan kısım şebeke faktörüyle hesaplanır.
   */
  function hesapElektrik(veri, girdi) {
    var e = girdi.elektrik || {};
    var yillikKwh = pozitif(e.kwh_ay) * AY_YIL;
    var satirlar = [];
    if (yillikKwh <= 0) return { kg: 0, satirlar: satirlar };

    var gesOrani = Math.min(1, Math.max(0, sayi(e.ges_orani, 0)));
    var yesilOrani = Math.min(1 - gesOrani, Math.max(0, sayi(e.yesil_orani, 0)));
    var sebekeOrani = Math.max(0, 1 - gesOrani - yesilOrani);

    var parcalar = [
      { oran: sebekeOrani, anahtar: 'elektrik_sebeke' },
      { oran: gesOrani, anahtar: 'elektrik_ozgun_ges' },
      { oran: yesilOrani, anahtar: 'elektrik_yesil_tarife' }
    ];

    var toplam = 0;
    parcalar.forEach(function (p) {
      if (p.oran <= 0) return;
      var f = faktor(veri, p.anahtar);
      var faaliyet = yillikKwh * p.oran;
      var kg = faaliyet * f.deger;
      toplam += kg;
      satirlar.push({
        etiket: f.etiket,
        faaliyet: faaliyet,
        faaliyet_birim: f.birim_faaliyet + '/yıl',
        faktor: f.deger,
        faktor_birim: 'kg CO₂e/' + f.birim_faaliyet,
        kaynak: f.kaynak,
        kg: kg
      });
    });

    return { kg: toplam, satirlar: satirlar };
  }

  /** Isınma. Tek bir yakıt türü ve yıllık miktar. */
  function hesapIsinma(veri, girdi) {
    var i = girdi.isinma || {};
    var miktar = pozitif(i.miktar_yil);
    if (miktar <= 0 || !i.tur || i.tur === 'yok') return { kg: 0, satirlar: [] };

    var eslesme = {
      dogalgaz: 'dogalgaz_m3',
      dogalgaz_kwh: 'dogalgaz_kwh',
      lpg: 'lpg_kg',
      komur: 'komur_kg',
      odun: 'odun_kg',
      elektrik: 'elektrik_sebeke'
    };
    var anahtar = eslesme[i.tur];
    if (!anahtar) throw new Error('Tanımsız ısınma türü: ' + i.tur);

    var f = faktor(veri, anahtar);
    var kg = miktar * f.deger;
    return {
      kg: kg,
      satirlar: [{
        etiket: i.tur === 'elektrik' ? 'Elektrikli ısıtma' : f.etiket,
        faaliyet: miktar,
        faaliyet_birim: f.birim_faaliyet + '/yıl',
        faktor: f.deger,
        faktor_birim: 'kg CO₂e/' + f.birim_faaliyet,
        kaynak: f.kaynak,
        kg: kg
      }]
    };
  }

  /**
   * Ulaşım. Her satır ya mesafe (km/hafta) ya da yakıt (litre/hafta) temelli.
   * Araç tipi faktörleri araç-km başınadır; yolcu sayısına bölünerek kişi
   * başına düşen pay bulunur. Toplu taşıma faktörleri zaten yolcu-km bazlıdır
   * ve bölünmez.
   */
  function hesapUlasim(veri, girdi) {
    var satirlar = [];
    var toplam = 0;

    (girdi.ulasim || []).forEach(function (s) {
      var miktarHafta = pozitif(s.miktar_hafta);
      if (miktarHafta <= 0 || !s.tur) return;

      var f = faktor(veri, s.tur);
      var yillik = miktarHafta * HAFTA_YIL;
      var aracBasli = f.birim_faaliyet === 'araç-km';
      var yolcu = aracBasli ? Math.max(1, sayi(s.yolcu, 1)) : 1;
      var kg = (yillik * f.deger) / yolcu;

      toplam += kg;
      satirlar.push({
        etiket: f.etiket + (aracBasli && yolcu > 1 ? ' · ' + yolcu + ' kişi' : ''),
        faaliyet: yillik,
        faaliyet_birim: f.birim_faaliyet + '/yıl',
        faktor: f.deger,
        faktor_birim: 'kg CO₂e/' + f.birim_faaliyet,
        kaynak: f.kaynak,
        yolcu: yolcu,
        kg: kg
      });
    });

    return { kg: toplam, satirlar: satirlar };
  }

  /** Uçuş. Yıllık yolcu-km doğrudan girilir. */
  function hesapUcus(veri, girdi) {
    var satirlar = [];
    var toplam = 0;

    (girdi.ucus || []).forEach(function (s) {
      var km = pozitif(s.km_yil);
      if (km <= 0 || !s.tur) return;
      var f = faktor(veri, s.tur);
      var kg = km * f.deger;
      toplam += kg;
      satirlar.push({
        etiket: f.etiket,
        faaliyet: km,
        faaliyet_birim: f.birim_faaliyet + '/yıl',
        faktor: f.deger,
        faktor_birim: 'kg CO₂e/' + f.birim_faaliyet,
        kaynak: f.kaynak,
        kg: kg
      });
    });

    return { kg: toplam, satirlar: satirlar };
  }

  /**
   * Beslenme. Haftalık porsiyon × porsiyon ağırlığı × kg başı faktör.
   * Porsiyon sayıları doğrudan verilebilir ya da hazır bir profil seçilebilir.
   */
  function hesapBeslenme(veri, girdi) {
    var b = girdi.beslenme || {};
    var porsiyonlar = b.porsiyonlar;

    if (!porsiyonlar && b.profil) {
      var profil = veri.beslenme.hazir_profiller[b.profil];
      if (!profil) throw new Error('Tanımsız beslenme profili: ' + b.profil);
      porsiyonlar = profil.carpanlar;
    }
    if (!porsiyonlar) return { kg: 0, satirlar: [] };

    var satirlar = [];
    var toplam = 0;

    veri.beslenme.kalemler.forEach(function (k) {
      var adetHafta = pozitif(porsiyonlar[k.anahtar]);
      if (adetHafta <= 0) return;
      var kgYil = (adetHafta * HAFTA_YIL * k.porsiyon_g) / 1000;  // kg gıda/yıl
      var kg = kgYil * k.faktor;
      toplam += kg;
      satirlar.push({
        etiket: k.etiket,
        faaliyet: kgYil,
        faaliyet_birim: 'kg/yıl',
        faktor: k.faktor,
        faktor_birim: 'kg CO₂e/kg',
        kaynak: veri.beslenme.kaynak,
        porsiyon_hafta: adetHafta,
        kg: kg
      });
    });

    satirlar.sort(function (a, b2) { return b2.kg - a.kg; });
    return { kg: toplam, satirlar: satirlar };
  }

  /**
   * Atık ve su. Atık miktarı bertaraf yöntemlerine oranlanarak dağıtılır;
   * oranların toplamı 1'den küçükse kalan kısım düzenli depolama sayılır.
   */
  function hesapAtikSu(veri, girdi) {
    var satirlar = [];
    var toplam = 0;

    var a = girdi.atik || {};
    var atikYil = pozitif(a.kg_hafta) * HAFTA_YIL;
    if (atikYil > 0) {
      var geri = Math.min(1, pozitif(a.geri_donusum_orani));
      var kompost = Math.min(1 - geri, pozitif(a.kompost_orani));
      var yakma = Math.min(1 - geri - kompost, pozitif(a.yakma_orani));
      var depolama = Math.max(0, 1 - geri - kompost - yakma);

      [
        { oran: depolama, anahtar: 'atik_depolama_kg' },
        { oran: geri, anahtar: 'atik_geridonusum_kg' },
        { oran: kompost, anahtar: 'atik_kompost_kg' },
        { oran: yakma, anahtar: 'atik_yakma_kg' }
      ].forEach(function (p) {
        if (p.oran <= 0) return;
        var f = faktor(veri, p.anahtar);
        var faaliyet = atikYil * p.oran;
        var kg = faaliyet * f.deger;
        toplam += kg;
        satirlar.push({
          etiket: f.etiket,
          faaliyet: faaliyet,
          faaliyet_birim: 'kg/yıl',
          faktor: f.deger,
          faktor_birim: 'kg CO₂e/kg',
          kaynak: f.kaynak,
          kg: kg
        });
      });
    }

    var suYil = pozitif(girdi.su && girdi.su.m3_ay) * AY_YIL;
    if (suYil > 0) {
      ['su_sebeke_m3', 'su_atiksu_m3'].forEach(function (anahtar) {
        var f = faktor(veri, anahtar);
        var kg = suYil * f.deger;
        toplam += kg;
        satirlar.push({
          etiket: f.etiket,
          faaliyet: suYil,
          faaliyet_birim: 'm³/yıl',
          faktor: f.deger,
          faktor_birim: 'kg CO₂e/m³',
          kaynak: f.kaynak,
          kg: kg
        });
      });
    }

    return { kg: toplam, satirlar: satirlar };
  }

  /* ----------------------------------------------------------------------- *
   * Ana hesap
   * ----------------------------------------------------------------------- */

  /**
   * Tüm kategorileri hesaplar ve kişi başı yıllık ayak izini döndürür.
   * @param {Object} veri   emisyon_faktorleri.json içeriği
   * @param {Object} girdi  kullanıcı girdisi
   */
  function hesapla(veri, girdi) {
    var hatalar = dogrula(girdi);
    if (hatalar.length) {
      var hata = new Error(hatalar.join('\n'));
      hata.dogrulama = hatalar;
      throw hata;
    }

    var kisi = Math.max(1, sayi(girdi.hane && girdi.hane.kisi, 1));

    var ham = {
      elektrik: hesapElektrik(veri, girdi),
      isinma: hesapIsinma(veri, girdi),
      ulasim: hesapUlasim(veri, girdi),
      ucus: hesapUcus(veri, girdi),
      beslenme: hesapBeslenme(veri, girdi),
      atiksu: hesapAtikSu(veri, girdi)
    };

    var kategoriler = [];
    var toplamKg = 0;

    KATEGORILER.forEach(function (k) {
      var h = ham[k.anahtar];
      var bolen = k.hane ? kisi : 1;
      var kg = h.kg / bolen;
      toplamKg += kg;
      kategoriler.push({
        anahtar: k.anahtar,
        etiket: k.etiket,
        yuva: k.yuva,
        hane_bazli: k.hane,
        kisi_bolen: bolen,
        kg_yil_hane: h.kg,
        kg_yil: kg,
        satirlar: h.satirlar.map(function (s) {
          var kopya = {};
          for (var alan in s) if (Object.prototype.hasOwnProperty.call(s, alan)) kopya[alan] = s[alan];
          kopya.kg_yil_hane = s.kg;
          kopya.kg = s.kg / bolen;
          return kopya;
        })
      });
    });

    kategoriler.forEach(function (k) {
      k.pay = toplamKg > 0 ? k.kg_yil / toplamKg : 0;
    });

    var ton = toplamKg / 1000;
    var kb = veri.kiyaslama;

    return {
      zaman: new Date().toISOString(),
      surum: veri.meta.surum,
      hane_kisi: kisi,
      kategoriler: kategoriler,
      toplam_kg_yil: toplamKg,
      toplam_ton_yil: ton,
      toplam_kg_ay: toplamKg / AY_YIL,
      kiyaslama: {
        turkiye: { deger: kb.turkiye_kisi_basi.deger, oran: kb.turkiye_kisi_basi.deger > 0 ? ton / kb.turkiye_kisi_basi.deger : 0, etiket: kb.turkiye_kisi_basi.etiket },
        dunya: { deger: kb.dunya_kisi_basi.deger, oran: kb.dunya_kisi_basi.deger > 0 ? ton / kb.dunya_kisi_basi.deger : 0, etiket: kb.dunya_kisi_basi.etiket },
        hedef: { deger: kb.paris_hedefi.deger, oran: kb.paris_hedefi.deger > 0 ? ton / kb.paris_hedefi.deger : 0, etiket: kb.paris_hedefi.etiket }
      }
    };
  }

  /* ----------------------------------------------------------------------- *
   * Öneriler
   * ----------------------------------------------------------------------- */

  /**
   * Kategorileri emisyona göre sıralar ve en etkili önerileri getirir.
   * Her öneri için tahmini yıllık azaltım (kg CO₂e) hesaplanır.
   */
  function onerileriGetir(veri, sonuc, adet) {
    var limit = adet || 6;
    var kategoriKg = {};
    sonuc.kategoriler.forEach(function (k) { kategoriKg[k.anahtar] = k.kg_yil; });

    // Öneri kategorileri ile görüntüleme kategorilerini eşle
    var esle = {
      elektrik: 'elektrik',
      isinma: 'isinma',
      ulasim: 'ulasim',
      ucus: 'ucus',
      beslenme: 'beslenme',
      atik: 'atiksu',
      su: 'atiksu'
    };

    var liste = veri.oneriler.map(function (o) {
      var hedefKategori = esle[o.kategori];
      var taban = kategoriKg[hedefKategori] || 0;
      // Atık ve su aynı kategoriyi paylaştığı için payı bölüştür
      if (o.kategori === 'atik' || o.kategori === 'su') taban = taban * 0.5;
      return {
        kategori: o.kategori,
        baslik: o.baslik,
        metin: o.metin,
        tahmini_azaltim_kg: taban * o.azaltim_orani,
        uygulanabilir: taban > 0
      };
    });

    return liste
      .filter(function (o) { return o.uygulanabilir && o.tahmini_azaltim_kg > 1; })
      .sort(function (a, b) { return b.tahmini_azaltim_kg - a.tahmini_azaltim_kg; })
      .slice(0, limit);
  }

  /* ----------------------------------------------------------------------- *
   * Güneş enerjisi (GES) telafi modülü
   * ----------------------------------------------------------------------- */

  /**
   * Bölgesel özgül üretimi yöntem formülünden hesaplar.
   *   E = GHI × K_eğim × PR
   */
  function ozgulUretim(veri, bolgeAnahtar) {
    var y = veri.gunes.yontem;
    var bolge = veri.gunes.bolgeler.filter(function (b) { return b.anahtar === bolgeAnahtar; })[0];
    if (!bolge) throw new Error('Tanımsız bölge: ' + bolgeAnahtar);
    return {
      bolge: bolge,
      ghi: bolge.ghi,
      k_egim: y.k_egim,
      pr: y.pr,
      kwh_kwp_yil: bolge.ghi * y.k_egim * y.pr
    };
  }

  /**
   * Çatı GES hesabı.
   * @param {Object} veri
   * @param {Object} p  { bolge, kwp, ozgul_uretim_override, elektrik_kwh_yil,
   *                      sebeke_faktoru_override, maliyet_tl_kwp, elektrik_fiyat_tl_kwh }
   */
  function gesHesapla(veri, p) {
    p = p || {};
    var y = veri.gunes.yontem;
    var ou = p.bolge ? ozgulUretim(veri, p.bolge) : null;
    var ozgul = pozitif(p.ozgul_uretim_override) > 0
      ? pozitif(p.ozgul_uretim_override)
      : (ou ? ou.kwh_kwp_yil : y.k_egim * y.pr * 1581);

    var kwp = pozitif(p.kwp);
    var uretimKwhYil = kwp * ozgul;

    var sebekeFaktoru = pozitif(p.sebeke_faktoru_override) > 0
      ? pozitif(p.sebeke_faktoru_override)
      : faktor(veri, 'elektrik_sebeke').deger;
    var gesFaktoru = faktor(veri, 'elektrik_ozgun_ges').deger;

    // Net telafi: şebekeden çekilmeyen her kWh için (şebeke − PV yaşam döngüsü)
    var netTelafiKgKwh = Math.max(0, sebekeFaktoru - gesFaktoru);
    var telafiKgYil = uretimKwhYil * netTelafiKgKwh;

    var tuketimKwhYil = pozitif(p.elektrik_kwh_yil);
    var karsilamaOrani = tuketimKwhYil > 0 ? uretimKwhYil / tuketimKwhYil : null;
    var gerekliKwp = tuketimKwhYil > 0 && ozgul > 0 ? tuketimKwhYil / ozgul : null;

    var panelWp = veri.gunes.panel.varsayilan_wp;
    var panelAdet = panelWp > 0 ? Math.ceil((kwp * 1000) / panelWp) : null;
    var alanM2 = kwp * veri.gunes.panel.m2_per_kwp;

    var maliyetBirim = pozitif(p.maliyet_tl_kwp) > 0 ? pozitif(p.maliyet_tl_kwp) : y.ozgul_maliyet_tl_kwp;
    var yatirimTl = kwp * maliyetBirim;
    var fiyatTlKwh = pozitif(p.elektrik_fiyat_tl_kwh);
    var yillikTasarrufTl = fiyatTlKwh > 0 ? uretimKwhYil * fiyatTlKwh : null;
    var geriOdemeYil = yillikTasarrufTl > 0 ? yatirimTl / yillikTasarrufTl : null;

    return {
      bolge: ou ? ou.bolge : null,
      ghi: ou ? ou.ghi : null,
      k_egim: y.k_egim,
      pr: y.pr,
      ozgul_uretim_kwh_kwp: ozgul,
      ozgul_uretim_elle_girildi: pozitif(p.ozgul_uretim_override) > 0,
      kwp: kwp,
      panel_adet: panelAdet,
      panel_wp: panelWp,
      gereken_alan_m2: alanM2,
      uretim_kwh_yil: uretimKwhYil,
      uretim_kwh_ay: uretimKwhYil / AY_YIL,
      sebeke_faktoru: sebekeFaktoru,
      ges_faktoru: gesFaktoru,
      net_telafi_kg_kwh: netTelafiKgKwh,
      telafi_kg_yil: telafiKgYil,
      telafi_ton_yil: telafiKgYil / 1000,
      tuketim_kwh_yil: tuketimKwhYil,
      karsilama_orani: karsilamaOrani,
      gereken_kwp: gerekliKwp,
      yatirim_tl: yatirimTl,
      maliyet_tl_kwp: maliyetBirim,
      yillik_tasarruf_tl: yillikTasarrufTl,
      geri_odeme_yil: geriOdemeYil,
      omur_yil: 25,
      omur_boyu_telafi_ton: (telafiKgYil * 25) / 1000
    };
  }

  /**
   * Toplam ayak izini sıfırlamak için gereken kWp.
   * Not: GES yalnızca elektrik tüketimini ikame eder; toplam ayak izinin
   * tamamını "telafi etmek" ancak şebekeye fazla üretim vererek başka
   * tüketimin yerini alma varsayımıyla anlamlıdır. Bu yüzden iki değer
   * birlikte döndürülür.
   */
  function gesHedefKwp(veri, sonuc, bolgeAnahtar, ozgulOverride) {
    var ozgul = pozitif(ozgulOverride) > 0
      ? pozitif(ozgulOverride)
      : ozgulUretim(veri, bolgeAnahtar).kwh_kwp_yil;
    var sebeke = faktor(veri, 'elektrik_sebeke').deger;
    var ges = faktor(veri, 'elektrik_ozgun_ges').deger;
    var net = Math.max(0.0001, sebeke - ges);

    var elektrikKategori = sonuc.kategoriler.filter(function (k) { return k.anahtar === 'elektrik'; })[0];
    var elektrikKg = elektrikKategori ? elektrikKategori.kg_yil : 0;

    return {
      ozgul_uretim_kwh_kwp: ozgul,
      elektrigi_sifirlayan_kwp: ozgul > 0 ? (elektrikKg / net) / ozgul : null,
      toplami_telafi_eden_kwp: ozgul > 0 ? (sonuc.toplam_kg_yil / net) / ozgul : null
    };
  }

  /* ----------------------------------------------------------------------- *
   * Dışa aktarım
   * ----------------------------------------------------------------------- */

  var API = {
    HAFTA_YIL: HAFTA_YIL,
    AY_YIL: AY_YIL,
    KATEGORILER: KATEGORILER,
    dogrula: dogrula,
    hesapla: hesapla,
    onerileriGetir: onerileriGetir,
    ozgulUretim: ozgulUretim,
    gesHesapla: gesHesapla,
    gesHedefKwp: gesHedefKwp
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = API;
  } else {
    global.KPHesap = API;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
