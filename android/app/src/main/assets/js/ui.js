/*!
 * KarbonPusula — Arayüz
 * ---------------------------------------------------------------------------
 * Form, sonuç panosu, GES modülü, geçmiş ve kaynakça ekranları.
 * Girdiler her değişiklikte anında yeniden hesaplanır; ayrı bir "hesapla"
 * adımı yoktur.
 */
(function () {
  'use strict';

  var V = window.KARBONPUSULA_VERI;
  var H = window.KPHesap;
  var G = window.KPGrafik;
  var D = window.KPDepo;

  /* ======================================================================= *
   * Biçimleme
   * ======================================================================= */

  function bicimci(basamak) {
    try {
      return new Intl.NumberFormat('tr-TR', {
        minimumFractionDigits: basamak,
        maximumFractionDigits: basamak
      });
    } catch (e) {
      return { format: function (n) { return Number(n).toFixed(basamak); } };
    }
  }

  var B0 = bicimci(0), B1 = bicimci(1), B2 = bicimci(2), B3 = bicimci(3);

  function s0(n) { return B0.format(Number(n) || 0); }
  function s1(n) { return B1.format(Number(n) || 0); }
  function s2(n) { return B2.format(Number(n) || 0); }

  /** Emisyon değerini okunur birime çevirir: <1000 kg → kg, üzeri → ton */
  function kgBicim(kg) {
    var n = Number(kg) || 0;
    if (n >= 1000) return s2(n / 1000) + ' t';
    if (n >= 100) return s0(n) + ' kg';
    return s1(n) + ' kg';
  }

  function kgTam(kg) { return s0(kg) + ' kg CO₂e/yıl'; }

  /**
   * Faktör gösterimi. Büyüklüğe göre basamak seçilir; bilimsel gösterim
   * kullanılmaz çünkü okuyucu faktörü doğrudan faaliyet verisiyle çarparak
   * doğrulayabilmelidir.
   */
  function faktorBicim(d) {
    var n = Number(d) || 0;
    if (n === 0) return '0';
    if (n >= 100) return s0(n);
    if (n >= 10) return s1(n);
    if (n >= 0.01) return B3.format(n);
    return bicimci(5).format(n);
  }

  function tarihBicim(iso) {
    try {
      var d = new Date(iso);
      return new Intl.DateTimeFormat('tr-TR', {
        day: '2-digit', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }).format(d);
    } catch (e) {
      return String(iso).slice(0, 16).replace('T', ' ');
    }
  }

  /* ======================================================================= *
   * DOM yardımcıları
   * ======================================================================= */

  function h(etiket, ozellik, cocuklar) {
    var e = document.createElement(etiket);
    if (ozellik) {
      for (var k in ozellik) {
        if (!Object.prototype.hasOwnProperty.call(ozellik, k)) continue;
        var v = ozellik[k];
        if (v === null || v === undefined || v === false) continue;
        if (k === 'metin') { e.textContent = v; }
        else if (k === 'html') { e.innerHTML = v; }
        else if (k === 'sinif') { e.className = v; }
        else if (k.slice(0, 2) === 'on') { e.addEventListener(k.slice(2), v); }
        else { e.setAttribute(k, v === true ? '' : v); }
      }
    }
    ekle(e, cocuklar);
    return e;
  }

  function ekle(kap, cocuklar) {
    if (cocuklar === null || cocuklar === undefined) return kap;
    if (!Array.isArray(cocuklar)) cocuklar = [cocuklar];
    cocuklar.forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      kap.appendChild(typeof c === 'string' || typeof c === 'number'
        ? document.createTextNode(String(c)) : c);
    });
    return kap;
  }

  function bos(e) { while (e && e.firstChild) e.removeChild(e.firstChild); return e; }
  function $(sec) { return document.querySelector(sec); }

  /** İkon kütüphanesi — hepsi 24×24 viewBox, çizgi tabanlı */
  var IKONLAR = {
    hesap: '<path d="M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M9 7h6M9 11h2M13 11h2M9 15h2M13 15h2"/>',
    sonuc: '<path d="M3 20h18"/><path d="M6 20V11M11 20V5M16 20v-6M21 20v-9"/>',
    gunes: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    gecmis: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    bilgi: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    ev: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.8V20h14V9.8"/><path d="M9.5 20v-6h5v6"/>',
    fis: '<path d="M13 2 4.5 13.5H11l-1 8.5L19.5 10H13l1-8z"/>',
    alev: '<path d="M12 22c4 0 6.5-2.7 6.5-6.2 0-4.4-4-6.6-4.6-11.8-2 1.3-3.3 3-3.3 5.2 0 1.6-1 2.3-1.8 2.3-1 0-1.8-.8-1.8-2.2C4.8 11 5.5 12.6 5.5 15.8 5.5 19.3 8 22 12 22z"/>',
    araba: '<path d="M5 17h14M4 17v-4l2-5h12l2 5v4"/><circle cx="7.5" cy="17.5" r="1.6"/><circle cx="16.5" cy="17.5" r="1.6"/><path d="M6.5 13h11"/>',
    ucak: '<path d="M10.2 20.5 12 15l9-3.5v-2l-9 1.5V5.2a1.7 1.7 0 0 0-3.4 0v5.8L2 12.5v2L8.6 13l-.4 4-2.2 1.6v1.4l2.8-.7"/>',
    catal: '<path d="M6 3v7a2.5 2.5 0 0 0 5 0V3M8.5 12v9"/><path d="M16.5 3c-1.4 1.2-2 2.7-2 4.5 0 1.5.6 2.6 2 3.5V21"/>',
    cop: '<path d="M4 7h16M9 7V4h6v3"/><path d="M6 7l1 14h10l1-14"/><path d="M10 11v6M14 11v6"/>',
    paylas: '<circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.3 10.8 15.7 6.3M8.3 13.2l7.4 4.5"/>',
    indir: '<path d="M12 3v12"/><path d="M7.5 10.5 12 15l4.5-4.5"/><path d="M4 19h16"/>',
    kaydet: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8V3"/><path d="M8 14h8v7H8z"/>',
    sil: '<path d="M4 7h16M9 7V4h6v3"/><path d="M6 7l1 14h10l1-14"/>',
    ekle: '<path d="M12 5v14M5 12h14"/>',
    ay: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
    gunesKucuk: '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/>',
    uyari: '<path d="M12 3 2.5 20h19L12 3z"/><path d="M12 9v5M12 17h.01"/>',
    onay: '<path d="M20 6 9 17l-5-5"/>',
    ok: '<path d="M6 9l6 6 6-6"/>',
    hedef: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.6" fill="currentColor"/>',
    yenile: '<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/>',
    kutu: '<path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z"/><path d="M4 7.5 12 12l8-4.5M12 12v9"/>'
  };

  function ikon(ad, boy) {
    var sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    sv.setAttribute('viewBox', '0 0 24 24');
    sv.setAttribute('fill', 'none');
    sv.setAttribute('stroke', 'currentColor');
    sv.setAttribute('stroke-width', '1.8');
    sv.setAttribute('stroke-linecap', 'round');
    sv.setAttribute('stroke-linejoin', 'round');
    sv.setAttribute('aria-hidden', 'true');
    if (boy) { sv.setAttribute('width', boy); sv.setAttribute('height', boy); }
    sv.innerHTML = IKONLAR[ad] || '';
    return sv;
  }

  /* ======================================================================= *
   * Bildirim
   * ======================================================================= */

  var bildirimEl = null, bildirimZaman = null;

  function bildir(mesaj) {
    if (!bildirimEl) {
      bildirimEl = h('div', { sinif: 'bildirim', role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(bildirimEl);
    }
    bildirimEl.textContent = mesaj;
    bildirimEl.classList.add('acik');
    if (bildirimZaman) clearTimeout(bildirimZaman);
    bildirimZaman = setTimeout(function () { bildirimEl.classList.remove('acik'); }, 2400);
  }

  /* ======================================================================= *
   * Durum
   * ======================================================================= */

  /** Türkiye ortalamasına yakın başlangıç değerleri. */
  function varsayilanGirdi() {
    return {
      hane: { kisi: 3 },
      elektrik: { kwh_ay: 250, ges_orani: 0, yesil_orani: 0 },
      isinma: { tur: 'dogalgaz', miktar_yil: 1200 },
      ulasim: [{ tur: 'otomobil_benzin_km', miktar_hafta: 150, yolcu: 1 }],
      ucus: [],
      beslenme: { profil: 'dengeli', porsiyonlar: null },
      atik: { kg_hafta: 10, geri_donusum_orani: 0.15, kompost_orani: 0, yakma_orani: 0 },
      su: { m3_ay: 12 }
    };
  }

  var durum = {
    girdi: null,
    sonuc: null,
    ayar: null,
    ges: { bolge: 'icanadolu', kwp: 5, ozgul_override: 0, maliyet: null, fiyat: null },
    gorunum: 'grafik',
    acikBolum: { hane: true, elektrik: true, isinma: false, ulasim: false, ucus: false, beslenme: false, atiksu: false },
    beslenmeAyrintili: false
  };

  /* ======================================================================= *
   * Form bileşenleri
   * ======================================================================= */

  function sayiAlani(p) {
    var girdi = h('input', {
      type: 'number',
      inputmode: 'decimal',
      value: p.deger === null || p.deger === undefined ? '' : String(p.deger),
      min: p.min !== undefined ? p.min : 0,
      max: p.max,
      step: p.adim || 'any',
      placeholder: p.yertutucu || '0',
      'aria-label': p.etiket,
      oninput: function () {
        var n = parseFloat(this.value.replace(',', '.'));
        p.degisti(isNaN(n) ? 0 : n);
      }
    });
    return h('label', { sinif: 'alan' }, [
      h('span', { sinif: 'alan-etiket', metin: p.etiket }),
      h('div', { sinif: 'giris-sarma' }, [
        girdi,
        p.birim ? h('span', { sinif: 'giris-birim', metin: p.birim }) : null
      ]),
      p.yardim ? h('p', { sinif: 'alan-yardim', metin: p.yardim }) : null
    ]);
  }

  function secimAlani(p) {
    var sec = h('select', {
      'aria-label': p.etiket,
      onchange: function () { p.degisti(this.value); }
    });
    (p.gruplar || [{ secenekler: p.secenekler }]).forEach(function (grup) {
      var hedef = sec;
      if (grup.ad) {
        hedef = h('optgroup', { label: grup.ad });
        sec.appendChild(hedef);
      }
      grup.secenekler.forEach(function (o) {
        hedef.appendChild(h('option', {
          value: o.deger,
          metin: o.etiket,
          selected: o.deger === p.deger ? true : null
        }));
      });
    });
    if (!p.etiketGizli) {
      return h('label', { sinif: 'alan' }, [
        h('span', { sinif: 'alan-etiket', metin: p.etiket }),
        sec,
        p.yardim ? h('p', { sinif: 'alan-yardim', metin: p.yardim }) : null
      ]);
    }
    return sec;
  }

  function kaydiriciAlani(p) {
    var deg = h('span', { sinif: 'kd-deger', metin: p.bicim(p.deger) });
    var rng = h('input', {
      type: 'range',
      min: p.min, max: p.max, step: p.adim,
      value: String(p.deger),
      'aria-label': p.etiket,
      oninput: function () {
        var n = parseFloat(this.value);
        deg.textContent = p.bicim(n);
        p.degisti(n);
      }
    });
    return h('label', { sinif: 'alan' }, [
      h('span', { sinif: 'alan-etiket', metin: p.etiket }),
      h('div', { sinif: 'kaydirici-sat' }, [rng, deg]),
      p.yardim ? h('p', { sinif: 'alan-yardim', metin: p.yardim }) : null
    ]);
  }

  function cipGrubu(p) {
    return h('div', { sinif: 'alan' }, [
      p.etiket ? h('span', { sinif: 'alan-etiket', metin: p.etiket }) : null,
      h('div', { sinif: 'cipler', role: 'group', 'aria-label': p.etiket || '' },
        p.secenekler.map(function (o) {
          return h('button', {
            type: 'button',
            sinif: 'cip',
            'aria-pressed': o.deger === p.deger ? 'true' : 'false',
            metin: o.etiket,
            onclick: function () { p.degisti(o.deger); }
          });
        })),
      p.yardim ? h('p', { sinif: 'alan-yardim', metin: p.yardim }) : null
    ]);
  }

  /* ======================================================================= *
   * HESAPLA sekmesi — bölümler
   * ======================================================================= */

  var ULASIM_GRUPLARI = [
    {
      ad: 'Özel araç — mesafe',
      secenekler: [
        { deger: 'otomobil_benzin_km', etiket: 'Otomobil · benzinli' },
        { deger: 'otomobil_dizel_km', etiket: 'Otomobil · dizel' },
        { deger: 'otomobil_lpg_km', etiket: 'Otomobil · LPG' },
        { deger: 'otomobil_hibrit_km', etiket: 'Otomobil · hibrit' },
        { deger: 'otomobil_elektrik_km', etiket: 'Otomobil · elektrikli' },
        { deger: 'motosiklet_km', etiket: 'Motosiklet' }
      ]
    },
    {
      ad: 'Toplu taşıma — mesafe',
      secenekler: [
        { deger: 'otobus_sehirici_km', etiket: 'Şehir içi otobüs / dolmuş' },
        { deger: 'otobus_sehirlerarasi_km', etiket: 'Şehirler arası otobüs' },
        { deger: 'metro_km', etiket: 'Metro / tramvay' },
        { deger: 'tren_km', etiket: 'Tren / YHT' },
        { deger: 'vapur_km', etiket: 'Vapur / deniz otobüsü' }
      ]
    },
    {
      ad: 'Yakıt miktarı (en doğru yöntem)',
      secenekler: [
        { deger: 'benzin_litre', etiket: 'Benzin' },
        { deger: 'dizel_litre', etiket: 'Motorin' },
        { deger: 'lpg_litre', etiket: 'Otogaz LPG' }
      ]
    }
  ];

  var UCUS_SECENEKLERI = [
    { deger: 'ucus_ichat_km', etiket: 'İç hat' },
    { deger: 'ucus_kisa_km', etiket: 'Kısa menzilli dış hat (ekonomi)' },
    { deger: 'ucus_uzun_km', etiket: 'Uzun menzilli (ekonomi)' },
    { deger: 'ucus_uzun_business_km', etiket: 'Uzun menzilli (business)' }
  ];

  function cizHane() {
    return [
      sayiAlani({
        etiket: 'Hanedeki kişi sayısı',
        birim: 'kişi',
        deger: durum.girdi.hane.kisi,
        min: 1, max: 30, adim: 1,
        yardim: 'Elektrik, ısınma, atık ve su hane ortak tüketimidir; bu sayıya bölünerek kişi başı ayak izine çevrilir. Ulaşım, uçuş ve beslenme kişiseldir, bölünmez.',
        degisti: function (n) { durum.girdi.hane.kisi = n; guncelle(); }
      })
    ];
  }

  function cizElektrik() {
    var e = durum.girdi.elektrik;
    var yillik = (e.kwh_ay || 0) * 12;
    return [
      sayiAlani({
        etiket: 'Aylık elektrik tüketimi',
        birim: 'kWh/ay',
        deger: e.kwh_ay,
        adim: 10,
        yardim: 'Elektrik faturanızdaki aylık tüketim. Yıllık karşılığı: ' + s0(yillik) + ' kWh.',
        degisti: function (n) { e.kwh_ay = n; guncelle(); }
      }),
      kaydiriciAlani({
        etiket: 'Çatı GES ile karşılanan oran',
        deger: Math.round((e.ges_orani || 0) * 100),
        min: 0, max: 100, adim: 5,
        bicim: function (n) { return '%' + s0(n); },
        yardim: 'Kendi çatınızdaki fotovoltaik sistemden karşıladığınız pay. Bu kısım için şebeke faktörü yerine PV yaşam döngüsü değeri (41 g CO₂e/kWh) kullanılır.',
        degisti: function (n) { e.ges_orani = n / 100; guncelle(); }
      }),
      kaydiriciAlani({
        etiket: 'YEK-G belgeli yeşil tarife oranı',
        deger: Math.round((e.yesil_orani || 0) * 100),
        min: 0, max: 100, adim: 5,
        bicim: function (n) { return '%' + s0(n); },
        yardim: 'Yalnızca tedarikçinizle YEK-G kapsamlı sözleşmeniz varsa artırın. Piyasa temelli muhasebede bu pay sıfır emisyonlu sayılır.',
        degisti: function (n) { e.yesil_orani = n / 100; guncelle(); }
      })
    ];
  }

  function cizIsinma() {
    var i = durum.girdi.isinma;
    var birimler = {
      dogalgaz: 'm³/yıl', dogalgaz_kwh: 'kWh/yıl', lpg: 'kg/yıl',
      komur: 'kg/yıl', odun: 'kg/yıl', elektrik: 'kWh/yıl', yok: ''
    };
    var yardimlar = {
      dogalgaz: 'Doğal gaz faturalarınızdaki yıllık toplam m³. Türkiye\'de ortalama bir daire için 1.000–1.600 m³/yıl tipiktir.',
      dogalgaz_kwh: 'Merkezî sistemde pay ölçer kWh değerini girin.',
      lpg: 'Yıl boyunca tükettiğiniz tüpgaz. Standart tüp 12 kg\'dır.',
      komur: 'Yıllık kömür tüketimi. Kömür ayrıca PM2.5 ve SO₂ kaynağıdır; hava kalitesi etkisi bu hesaba dahil değildir.',
      odun: 'Biyojenik CO₂ net sıfır kabul edilir; yalnızca eksik yanmadan doğan CH₄/N₂O sayılır.',
      elektrik: 'Elektrikli ısıtıcı/klima ile ısınma. Isı pompası kullanıyorsanız elektrik tüketimini girin.',
      yok: ''
    };
    var alanlar = [
      secimAlani({
        etiket: 'Isınma yakıtı',
        deger: i.tur,
        secenekler: [
          { deger: 'dogalgaz', etiket: 'Doğal gaz (m³)' },
          { deger: 'dogalgaz_kwh', etiket: 'Doğal gaz · pay ölçer (kWh)' },
          { deger: 'lpg', etiket: 'LPG / tüpgaz' },
          { deger: 'komur', etiket: 'Kömür' },
          { deger: 'odun', etiket: 'Yakacak odun' },
          { deger: 'elektrik', etiket: 'Elektrikli ısıtma / ısı pompası' },
          { deger: 'yok', etiket: 'Isınma gideri yok / bilmiyorum' }
        ],
        degisti: function (v) { i.tur = v; bolumYenile('isinma'); guncelle(); }
      })
    ];
    if (i.tur !== 'yok') {
      alanlar.push(sayiAlani({
        etiket: 'Yıllık tüketim',
        birim: birimler[i.tur],
        deger: i.miktar_yil,
        adim: 10,
        yardim: yardimlar[i.tur],
        degisti: function (n) { i.miktar_yil = n; guncelle(); }
      }));
    }
    return alanlar;
  }

  function satirKarti(p) {
    var f = V.faktorler[p.satir.tur];
    var aracBasli = f && f.birim_faaliyet === 'araç-km';
    var litre = f && f.birim_faaliyet === 'litre';

    var katki = h('div', { sinif: 'satir-katki' });
    function katkiYaz() {
      if (!durum.sonuc) { katki.textContent = ''; return; }
      var k = durum.sonuc.kategoriler[p.kategoriIndeks];
      var bulunan = k.satirlar[p.satirSira];
      katki.textContent = bulunan ? '≈ ' + kgTam(bulunan.kg) : '—';
    }

    var kart = h('div', { sinif: 'satir' }, [
      h('div', { sinif: 'satir-ust' }, [
        secimAlani({
          etiket: 'Tür', etiketGizli: true, deger: p.satir.tur,
          gruplar: p.gruplar,
          secenekler: p.secenekler,
          degisti: function (v) { p.satir.tur = v; p.yenile(); guncelle(); }
        }),
        h('button', {
          type: 'button', sinif: 'satir-sil', 'aria-label': 'Satırı kaldır',
          onclick: function () { p.sil(); }
        }, ikon('sil'))
      ]),
      h('div', { sinif: 'satir-alt' }, [
        sayiAlani({
          etiket: p.miktarEtiket,
          birim: p.miktarBirim,
          deger: p.miktarDeger,
          adim: 5,
          degisti: p.miktarDegisti
        }),
        aracBasli ? sayiAlani({
          etiket: 'Araçtaki kişi',
          birim: 'kişi',
          deger: p.satir.yolcu || 1,
          min: 1, max: 9, adim: 1,
          degisti: function (n) { p.satir.yolcu = Math.max(1, n); guncelle(); }
        }) : null
      ]),
      katki
    ]);

    kart.katkiYaz = katkiYaz;
    if (litre) {
      kart.appendChild(h('p', {
        sinif: 'alan-yardim',
        metin: 'Yakıt miktarı yöntemi en doğrudur: pompadan aldığınız litre doğrudan emisyona çevrilir, araç ve sürüş varsayımı gerekmez.'
      }));
    }
    return kart;
  }

  function cizUlasim() {
    var liste = h('div', { sinif: 'satir-liste' });

    function yenile() { bolumYenile('ulasim'); }

    durum.girdi.ulasim.forEach(function (sat, i) {
      var f = V.faktorler[sat.tur];
      var birim = f.birim_faaliyet === 'litre' ? 'L/hafta' : 'km/hafta';
      var etiket = f.birim_faaliyet === 'litre' ? 'Haftalık yakıt' : 'Haftalık mesafe';
      liste.appendChild(satirKarti({
        satir: sat,
        kategoriIndeks: 2,
        satirSira: i,
        gruplar: ULASIM_GRUPLARI,
        miktarEtiket: etiket,
        miktarBirim: birim,
        miktarDeger: sat.miktar_hafta,
        miktarDegisti: function (n) { sat.miktar_hafta = n; guncelle(); },
        yenile: yenile,
        sil: function () { durum.girdi.ulasim.splice(i, 1); yenile(); guncelle(); }
      }));
    });

    if (!durum.girdi.ulasim.length) {
      liste.appendChild(h('p', { sinif: 'alan-yardim', metin: 'Henüz ulaşım satırı eklenmedi.' }));
    }

    return [
      liste,
      h('button', {
        type: 'button', sinif: 'dugme ikincil ince',
        onclick: function () {
          durum.girdi.ulasim.push({ tur: 'otobus_sehirici_km', miktar_hafta: 0, yolcu: 1 });
          yenile(); guncelle();
        }
      }, [ikon('ekle'), 'Ulaşım türü ekle']),
      h('p', {
        sinif: 'alan-yardim',
        metin: 'Birden çok satır ekleyerek haftanızı bölebilirsiniz: örneğin 60 km otomobil + 50 km metro. Özel araç faktörleri araç-km başınadır ve araçtaki kişi sayısına bölünür; toplu taşıma faktörleri zaten yolcu-km bazlıdır.'
      })
    ];
  }

  function cizUcus() {
    var liste = h('div', { sinif: 'satir-liste' });
    function yenile() { bolumYenile('ucus'); }

    durum.girdi.ucus.forEach(function (sat, i) {
      liste.appendChild(satirKarti({
        satir: sat,
        kategoriIndeks: 3,
        satirSira: i,
        secenekler: UCUS_SECENEKLERI,
        miktarEtiket: 'Yıllık mesafe',
        miktarBirim: 'yolcu-km/yıl',
        miktarDeger: sat.km_yil,
        miktarDegisti: function (n) { sat.km_yil = n; guncelle(); },
        yenile: yenile,
        sil: function () { durum.girdi.ucus.splice(i, 1); yenile(); guncelle(); }
      }));
    });

    if (!durum.girdi.ucus.length) {
      liste.appendChild(h('p', { sinif: 'alan-yardim', metin: 'Uçuş yapmadıysanız bu bölümü boş bırakın.' }));
    }

    return [
      liste,
      h('button', {
        type: 'button', sinif: 'dugme ikincil ince',
        onclick: function () {
          durum.girdi.ucus.push({ tur: 'ucus_ichat_km', km_yil: 0 });
          yenile(); guncelle();
        }
      }, [ikon('ekle'), 'Uçuş ekle']),
      h('div', { sinif: 'yontem' }, [
        h('div', { sinif: 'yontem-bas', metin: 'Yaklaşık tek yön mesafeler' }),
        h('p', {
          html: 'İstanbul–İzmir <b>330 km</b> · İstanbul–Ankara <b>350 km</b> · '
            + 'İstanbul–Antalya <b>480 km</b> · İstanbul–Trabzon <b>900 km</b> · '
            + 'İstanbul–Londra <b>2.500 km</b> · İstanbul–New York <b>8.060 km</b>.<br>'
            + 'Gidiş-dönüş için iki katını girin. Faktörler yüksek irtifa (radyatif zorlama) etkisini içerir.'
        })
      ])
    ];
  }

  function cizBeslenme() {
    var b = durum.girdi.beslenme;
    var profiller = Object.keys(V.beslenme.hazir_profiller).map(function (k) {
      return { deger: k, etiket: V.beslenme.hazir_profiller[k].etiket };
    });

    var cikti = [
      cipGrubu({
        etiket: 'Beslenme düzeni',
        deger: durum.beslenmeAyrintili ? null : b.profil,
        secenekler: profiller,
        yardim: 'Hazır bir düzen seçin ya da aşağıdan haftalık porsiyonlarınızı tek tek girin.',
        degisti: function (v) {
          b.profil = v;
          b.porsiyonlar = null;
          durum.beslenmeAyrintili = false;
          bolumYenile('beslenme');
          guncelle();
        }
      }),
      h('button', {
        type: 'button', sinif: 'dugme ikincil ince',
        onclick: function () {
          durum.beslenmeAyrintili = !durum.beslenmeAyrintili;
          if (durum.beslenmeAyrintili && !b.porsiyonlar) {
            var kaynak = V.beslenme.hazir_profiller[b.profil || 'dengeli'].carpanlar;
            b.porsiyonlar = {};
            Object.keys(kaynak).forEach(function (k) { b.porsiyonlar[k] = kaynak[k]; });
          }
          bolumYenile('beslenme');
          guncelle();
        }
      }, [ikon(durum.beslenmeAyrintili ? 'ok' : 'catal'),
          durum.beslenmeAyrintili ? 'Hazır düzene dön' : 'Porsiyonları tek tek gir'])
    ];

    if (durum.beslenmeAyrintili && b.porsiyonlar) {
      V.beslenme.kalemler.forEach(function (k) {
        cikti.push(kaydiriciAlani({
          etiket: k.etiket + ' · ' + k.porsiyon_g + ' g/porsiyon',
          deger: b.porsiyonlar[k.anahtar] || 0,
          min: 0, max: 28, adim: 1,
          bicim: function (n) { return s0(n) + '/hafta'; },
          degisti: function (n) { b.porsiyonlar[k.anahtar] = n; guncelle(); }
        }));
      });
      cikti.push(h('p', {
        sinif: 'alan-yardim',
        metin: 'Porsiyon ağırlıkları TÜBER (Türkiye Beslenme Rehberi) standart porsiyonlarına dayanır. '
          + V.beslenme.sebze_meyve_notu
      }));
    }

    return cikti;
  }

  function cizAtikSu() {
    var a = durum.girdi.atik;
    var depolama = Math.max(0, 1 - (a.geri_donusum_orani || 0) - (a.kompost_orani || 0) - (a.yakma_orani || 0));

    return [
      sayiAlani({
        etiket: 'Haftalık hane atığı',
        birim: 'kg/hafta',
        deger: a.kg_hafta,
        adim: 1,
        yardim: 'Tartmıyorsanız yaklaşık girin: dolu bir poşet ortalama 4–6 kg\'dır.',
        degisti: function (n) { a.kg_hafta = n; guncelle(); }
      }),
      kaydiriciAlani({
        etiket: 'Geri dönüşüme ayrılan',
        deger: Math.round((a.geri_donusum_orani || 0) * 100),
        min: 0, max: 100, adim: 5,
        bicim: function (n) { return '%' + s0(n); },
        degisti: function (n) { a.geri_donusum_orani = n / 100; bolumYenile('atiksu'); guncelle(); }
      }),
      kaydiriciAlani({
        etiket: 'Kompostlanan organik atık',
        deger: Math.round((a.kompost_orani || 0) * 100),
        min: 0, max: 100, adim: 5,
        bicim: function (n) { return '%' + s0(n); },
        degisti: function (n) { a.kompost_orani = n / 100; bolumYenile('atiksu'); guncelle(); }
      }),
      h('div', { sinif: 'yontem' }, [
        h('div', { sinif: 'yontem-bas', metin: 'Kalan atık' }),
        h('p', {
          html: 'Ayrılmayan <b>%' + s0(depolama * 100) + '</b> düzenli depolamaya (çöp sahası) gider ve '
            + 'kg başına <b>' + faktorBicim(V.faktorler.atik_depolama_kg.deger) + ' kg CO₂e</b> ile en yoğun bertaraf yoludur — '
            + 'kompostun yaklaşık 55 katı. Organik ayrışma metan üretir.'
        })
      ]),
      sayiAlani({
        etiket: 'Aylık su tüketimi',
        birim: 'm³/ay',
        deger: durum.girdi.su.m3_ay,
        adim: 1,
        yardim: 'Su faturanızdaki aylık m³. Temin ve atıksu arıtma enerjisi birlikte sayılır.',
        degisti: function (n) { durum.girdi.su.m3_ay = n; guncelle(); }
      })
    ];
  }

  var BOLUM_TANIMI = [
    { anahtar: 'hane', ad: 'Hane', ikonAd: 'ev', alt: 'Ortak tüketimin bölüşümü', ciz: cizHane, kategori: null },
    { anahtar: 'elektrik', ad: 'Elektrik', ikonAd: 'fis', alt: 'Tüketim ve yenilenebilir pay', ciz: cizElektrik, kategori: 'elektrik' },
    { anahtar: 'isinma', ad: 'Isınma', ikonAd: 'alev', alt: 'Yakıt türü ve miktarı', ciz: cizIsinma, kategori: 'isinma' },
    { anahtar: 'ulasim', ad: 'Ulaşım', ikonAd: 'araba', alt: 'Günlük yolculuklar', ciz: cizUlasim, kategori: 'ulasim' },
    { anahtar: 'ucus', ad: 'Uçuş', ikonAd: 'ucak', alt: 'Yıllık uçuş mesafesi', ciz: cizUcus, kategori: 'ucus' },
    { anahtar: 'beslenme', ad: 'Beslenme', ikonAd: 'catal', alt: 'Haftalık porsiyonlar', ciz: cizBeslenme, kategori: 'beslenme' },
    { anahtar: 'atiksu', ad: 'Atık ve su', ikonAd: 'cop', alt: 'Bertaraf yöntemi ve su', ciz: cizAtikSu, kategori: 'atiksu' }
  ];

  var bolumKaplari = {};

  function bolumCiz(tanim) {
    var acik = !!durum.acikBolum[tanim.anahtar];
    var payEl = h('span', { sinif: 'bolum-pay', metin: '—' });
    var icerik = h('div', { sinif: 'bolum-icerik' + (acik ? '' : ' gizli'), id: 'bolum-' + tanim.anahtar });

    var bas = h('button', {
      type: 'button',
      sinif: 'bolum-bas',
      'aria-expanded': acik ? 'true' : 'false',
      'aria-controls': 'bolum-' + tanim.anahtar,
      onclick: function () {
        var yeni = !durum.acikBolum[tanim.anahtar];
        durum.acikBolum[tanim.anahtar] = yeni;
        this.setAttribute('aria-expanded', yeni ? 'true' : 'false');
        icerik.classList.toggle('gizli', !yeni);
      }
    }, [
      h('span', { sinif: 'bolum-ikon' }, ikon(tanim.ikonAd)),
      h('span', { sinif: 'bolum-yazi' }, [
        h('span', { sinif: 'bolum-ad', metin: tanim.ad }),
        h('span', { sinif: 'bolum-alt', metin: tanim.alt })
      ]),
      tanim.kategori ? payEl : null,
      h('span', { sinif: 'bolum-ok' }, ikon('ok'))
    ]);

    ekle(icerik, tanim.ciz());

    var kart = h('section', { sinif: 'kart' }, [bas, icerik]);
    bolumKaplari[tanim.anahtar] = { kart: kart, icerik: icerik, pay: payEl, tanim: tanim };
    return kart;
  }

  function bolumYenile(anahtar) {
    var k = bolumKaplari[anahtar];
    if (!k) return;
    bos(k.icerik);
    ekle(k.icerik, k.tanim.ciz());
  }

  function hesaplaPaneli() {
    var kap = h('div', null, [
      h('div', { sinif: 'uyari-kutu', style: 'margin-bottom:12px' }, [
        ikon('bilgi'),
        h('div', {
          html: '<strong>Başlangıç değerleri Türkiye ortalamasına yakın seçildi.</strong> '
            + 'Kendi faturalarınızdaki değerlerle değiştirdikçe sonuç anında güncellenir — '
            + 'ayrı bir hesapla adımı yoktur.'
        })
      ])
    ]);

    BOLUM_TANIMI.forEach(function (t) { kap.appendChild(bolumCiz(t)); });

    kap.appendChild(h('div', { sinif: 'dugme-sat', style: 'margin-top:4px' }, [
      h('button', {
        type: 'button', sinif: 'dugme',
        onclick: function () { sekmeAc('sonuc'); }
      }, [ikon('sonuc'), 'Sonuçları gör']),
      h('button', {
        type: 'button', sinif: 'dugme ikincil',
        onclick: function () {
          if (!window.confirm('Tüm girdiler başlangıç değerlerine döndürülecek. Devam edilsin mi?')) return;
          durum.girdi = varsayilanGirdi();
          durum.beslenmeAyrintili = false;
          D.girdiSil();
          panelHesapYenile();
          guncelle();
          bildir('Girdiler sıfırlandı');
        }
      }, [ikon('yenile'), 'Başlangıca dön'])
    ]));

    return kap;
  }

  function panelHesapYenile() {
    var p = $('#panel-hesapla');
    bos(p);
    bolumKaplari = {};
    p.appendChild(hesaplaPaneli());
    bolumPaylariGuncelle();
  }

  function bolumPaylariGuncelle() {
    if (!durum.sonuc) return;
    var harita = {};
    durum.sonuc.kategoriler.forEach(function (k) { harita[k.anahtar] = k; });
    Object.keys(bolumKaplari).forEach(function (a) {
      var k = bolumKaplari[a];
      if (!k.tanim.kategori) return;
      var kat = harita[k.tanim.kategori];
      k.pay.textContent = kat ? kgBicim(kat.kg_yil) : '—';
    });
    // satır katkıları
    Object.keys(bolumKaplari).forEach(function (a) {
      var kutu = bolumKaplari[a].icerik;
      var satirlar = kutu.querySelectorAll('.satir');
      for (var i = 0; i < satirlar.length; i++) {
        if (satirlar[i].katkiYaz) satirlar[i].katkiYaz();
      }
    });
  }

  /* ======================================================================= *
   * SONUÇ sekmesi
   * ======================================================================= */

  function durumSinifi(oran) {
    if (oran <= 1) return 'iyi';
    if (oran <= 1.8) return 'uyari';
    if (oran <= 3) return 'ciddi';
    return 'kritik';
  }

  function sonucPaneli() {
    var s = durum.sonuc;
    var kap = h('div');

    if (!s || s.toplam_kg_yil <= 0) {
      kap.appendChild(h('div', { sinif: 'kart' }, h('div', { sinif: 'bos-durum' }, [
        ikon('sonuc'),
        h('p', { metin: 'Henüz girdi yok. "Hesapla" sekmesinden tüketim bilgilerinizi girin.' })
      ])));
      return kap;
    }

    var hedefOran = s.kiyaslama.hedef.oran;
    var sinif = durumSinifi(hedefOran);
    var rozetMetin = hedefOran <= 1
      ? '1,5 °C hedefinin altında'
      : '1,5 °C hedefinin ' + s2(hedefOran) + ' katı';

    /* ---- Kahraman sayı ---- */
    kap.appendChild(h('section', { sinif: 'kahraman' }, [
      h('div', { sinif: 'kahraman-ust', metin: 'Kişi başı yıllık karbon ayak izi' }),
      h('div', { sinif: 'kahraman-sayi' }, [
        h('b', { metin: s2(s.toplam_ton_yil) }),
        h('span', { metin: 'ton CO₂e/yıl' })
      ]),
      h('div', { sinif: 'kahraman-alt' }, [
        h('span', { html: 'Aylık <span class="rakam">' + s0(s.toplam_kg_ay) + '</span> kg · ' }),
        h('span', { html: 'Yıllık <span class="rakam">' + s0(s.toplam_kg_yil) + '</span> kg' })
      ]),
      h('div', { style: 'margin-top:12px' },
        h('span', { sinif: 'rozet ' + sinif }, [
          ikon(hedefOran <= 1 ? 'onay' : 'uyari'),
          rozetMetin
        ]))
    ]));

    /* ---- Kıyaslama ---- */
    var kiyasKart = h('section', { sinif: 'kart' }, h('div', { sinif: 'kart-govde' }, [
      h('div', { sinif: 'blok-bas' }, [
        h('h2', { metin: 'Nerede duruyorsunuz?' })
      ]),
      kiyasCiz(s)
    ]));
    kap.appendChild(kiyasKart);

    /* ---- Kategori dağılımı ---- */
    var siraliKat = s.kategoriler.slice().sort(function (a, b) { return b.kg_yil - a.kg_yil; });
    var grafikKutu = h('div');
    var tabloKutu = h('div', { sinif: 'gizli' });

    var degisKart = h('section', { sinif: 'kart' }, h('div', { sinif: 'kart-govde' }, [
      h('div', { sinif: 'blok-bas' }, [
        h('h2', { metin: 'Kategori dağılımı' }),
        h('div', { sinif: 'gorunum-degis', role: 'group', 'aria-label': 'Görünüm' }, [
          h('button', {
            type: 'button', metin: 'Grafik',
            'aria-pressed': durum.gorunum === 'grafik' ? 'true' : 'false',
            onclick: function () { gorunumDegis('grafik'); }
          }),
          h('button', {
            type: 'button', metin: 'Tablo',
            'aria-pressed': durum.gorunum === 'tablo' ? 'true' : 'false',
            onclick: function () { gorunumDegis('tablo'); }
          })
        ])
      ]),
      grafikKutu,
      tabloKutu
    ]));

    function gorunumDegis(g) {
      durum.gorunum = g;
      D.ayarYaz({ gorunum: g });
      grafikKutu.classList.toggle('gizli', g !== 'grafik');
      tabloKutu.classList.toggle('gizli', g !== 'tablo');
      var dugmeler = degisKart.querySelectorAll('.gorunum-degis button');
      dugmeler[0].setAttribute('aria-pressed', g === 'grafik' ? 'true' : 'false');
      dugmeler[1].setAttribute('aria-pressed', g === 'tablo' ? 'true' : 'false');
      if (g === 'grafik') grafikleriCiz();
    }

    // Halka + gösterge
    var halkaKab = h('div', { sinif: 'grafik-kab' });
    var gosterge = h('div', { sinif: 'gosterge' });
    siraliKat.forEach(function (k) {
      gosterge.appendChild(h('div', { sinif: 'gosterge-sat' }, [
        h('span', { sinif: 'gosterge-nokta', style: 'background:' + G.seriRengi(k.yuva) }),
        h('span', { sinif: 'gosterge-ad', metin: k.etiket }),
        h('span', { sinif: 'gosterge-deger', metin: kgBicim(k.kg_yil) }),
        h('span', { sinif: 'gosterge-pay', metin: '%' + s1(k.pay * 100) })
      ]));
    });
    grafikKutu.appendChild(h('div', { sinif: 'halka-sarma' }, [halkaKab, gosterge]));

    var cubukKab = h('div', { sinif: 'grafik-kab', style: 'margin-top:14px' });
    grafikKutu.appendChild(cubukKab);

    function grafikleriCiz() {
      G.halka(halkaKab, siraliKat.map(function (k) {
        return { etiket: k.etiket, deger: k.kg_yil, yuva: k.yuva };
      }), {
        bicimle: kgTam,
        merkezUst: s2(s.toplam_ton_yil),
        merkezAlt: 'ton CO₂e/yıl',
        erisimEtiket: 'Kategori paylarını gösteren halka grafik'
      });
      G.yatayCubuk(cubukKab, siraliKat.map(function (k) {
        return { etiket: k.etiket, deger: k.kg_yil, yuva: k.yuva };
      }), {
        bicimle: function (v) { return s0(v) + ' kg'; },
        erisimEtiket: 'Kategori başına yıllık emisyon, kg CO₂e'
      });
    }

    // Tablo görünümü (erişilebilir ikiz)
    tabloKutu.appendChild(kategoriTablosu(s, siraliKat));

    kap.appendChild(degisKart);
    requestAnimationFrame(grafikleriCiz);

    /* ---- Ayrıntı: her kategorinin satırları ---- */
    kap.appendChild(ayrintiKart(s));

    /* ---- Öneriler ---- */
    var oneriler = H.onerileriGetir(V, s, 6);
    if (oneriler.length) {
      kap.appendChild(h('section', { sinif: 'kart' }, h('div', { sinif: 'kart-govde' }, [
        h('div', { sinif: 'blok-bas' }, [
          h('h2', { metin: 'En etkili adımlar' }),
          h('span', { sinif: 'blok-not', metin: 'azaltım potansiyeline göre' })
        ]),
        h('div', { sinif: 'oneri-liste' }, oneriler.map(function (o, i) {
          return h('div', { sinif: 'oneri' }, [
            h('span', { sinif: 'oneri-sira', metin: String(i + 1) }),
            h('div', { sinif: 'oneri-govde' }, [
              h('div', { sinif: 'oneri-bas' }, [
                h('strong', { metin: o.baslik }),
                h('span', { sinif: 'oneri-kazanc', metin: '−' + s0(o.tahmini_azaltim_kg) + ' kg/yıl' })
              ]),
              h('p', { sinif: 'oneri-metin', metin: o.metin })
            ])
          ]);
        })),
        h('p', {
          sinif: 'alan-yardim',
          metin: 'Azaltım tahminleri, ilgili kategorinin mevcut emisyonuna literatürdeki tipik iyileştirme oranları uygulanarak hesaplanır. '
            + 'Adımlar birbiriyle kısmen örtüşebilir; toplamları doğrudan toplanamaz.'
        })
      ])));
    }

    /* ---- Kaydet / paylaş ---- */
    kap.appendChild(h('section', { sinif: 'kart' }, h('div', { sinif: 'kart-govde' }, [
      h('div', { sinif: 'blok-bas' }, h('h2', { metin: 'Sonucu sakla ve paylaş' })),
      h('div', { sinif: 'dugme-sat' }, [
        h('button', {
          type: 'button', sinif: 'dugme',
          onclick: function () {
            var not = window.prompt('Bu ölçüm için kısa bir not (isteğe bağlı):', '') || '';
            D.gecmiseEkle(durum.sonuc, durum.girdi, not);
            bildir('Geçmişe kaydedildi');
            gecmisPaneliYenile();
          }
        }, [ikon('kaydet'), 'Geçmişe kaydet']),
        h('button', {
          type: 'button', sinif: 'dugme ikincil',
          onclick: raporPaylas
        }, [ikon('paylas'), 'Özeti paylaş']),
        h('button', {
          type: 'button', sinif: 'dugme ikincil',
          onclick: raporKaydet
        }, [ikon('indir'), 'HTML rapor'])
      ]),
      h('p', {
        sinif: 'alan-yardim',
        metin: 'HTML rapor, kaynakça ve tüm ara değerleri içeren tek dosyalık bir çıktıdır; tarayıcıda açılır, yazdırılabilir ve PDF\'e dönüştürülebilir.'
      })
    ])));

    return kap;
  }

  function kiyasCiz(s) {
    var satirlar = [
      { ad: 'Siz', deger: s.toplam_ton_yil, renk: 'var(--brand)', vurgu: true },
      { ad: V.kiyaslama.turkiye_kisi_basi.etiket, deger: V.kiyaslama.turkiye_kisi_basi.deger, renk: 'var(--ink-3)' },
      { ad: V.kiyaslama.dunya_kisi_basi.etiket, deger: V.kiyaslama.dunya_kisi_basi.deger, renk: 'var(--ink-3)' },
      { ad: V.kiyaslama.paris_hedefi.etiket, deger: V.kiyaslama.paris_hedefi.deger, renk: 'var(--durum-iyi)' }
    ];
    var enBuyuk = satirlar.reduce(function (m, x) { return Math.max(m, x.deger); }, 0) || 1;

    return h('div', { sinif: 'kiyas' }, satirlar.map(function (x) {
      return h('div', { sinif: 'kiyas-sat' }, [
        h('div', { sinif: 'kiyas-ust' }, [
          h('span', { sinif: 'kiyas-ad', metin: x.ad }),
          h('span', { sinif: 'kiyas-deger', metin: s2(x.deger) + ' t' })
        ]),
        h('div', { sinif: 'kiyas-ray' },
          h('div', {
            sinif: 'kiyas-dolgu',
            style: 'width:' + ((x.deger / enBuyuk) * 100).toFixed(1) + '%;background:' + x.renk
          }))
      ]);
    }));
  }

  function kategoriTablosu(s, sirali) {
    var govde = h('tbody', null, sirali.map(function (k) {
      return h('tr', null, [
        h('td', { sinif: 'ad' }, [
          h('span', { sinif: 'renk-nokta', style: 'background:' + G.seriRengi(k.yuva) }),
          k.etiket
        ]),
        h('td', { sinif: 'sag', metin: s0(k.kg_yil) }),
        h('td', { sinif: 'sag', metin: s0(k.kg_yil / 12) }),
        h('td', { sinif: 'sag', metin: '%' + s1(k.pay * 100) })
      ]);
    }));

    return h('div', { sinif: 'tablo-sarma' },
      h('table', null, [
        h('thead', null, h('tr', null, [
          h('th', { metin: 'Kategori' }),
          h('th', { sinif: 'sag', metin: 'kg/yıl' }),
          h('th', { sinif: 'sag', metin: 'kg/ay' }),
          h('th', { sinif: 'sag', metin: 'Pay' })
        ])),
        govde,
        h('tfoot', null, h('tr', null, [
          h('td', { metin: 'Toplam' }),
          h('td', { sinif: 'sag', metin: s0(s.toplam_kg_yil) }),
          h('td', { sinif: 'sag', metin: s0(s.toplam_kg_ay) }),
          h('td', { sinif: 'sag', metin: '%100' })
        ]))
      ]));
  }

  function ayrintiKart(s) {
    var satirlar = [];
    s.kategoriler.forEach(function (k) {
      if (!k.satirlar.length) return;
      satirlar.push(h('tr', null, h('td', {
        colspan: 5,
        style: 'background:var(--surface-3);font-weight:680;color:var(--ink);font-size:11.5px;'
          + 'letter-spacing:.04em;text-transform:uppercase'
      }, [
        h('span', { sinif: 'renk-nokta', style: 'background:' + G.seriRengi(k.yuva) }),
        k.etiket + (k.hane_bazli ? ' · hane ÷ ' + k.kisi_bolen + ' kişi' : '')
      ])));
      k.satirlar.forEach(function (r) {
        satirlar.push(h('tr', null, [
          h('td', { sinif: 'ad', metin: r.etiket }),
          h('td', { sinif: 'sag', metin: s1(r.faaliyet) }),
          h('td', { metin: r.faaliyet_birim }),
          h('td', { sinif: 'sag', metin: faktorBicim(r.faktor) }),
          h('td', { sinif: 'sag', metin: s0(r.kg) })
        ]));
      });
    });

    if (!satirlar.length) {
      return h('section', { sinif: 'kart' }, h('div', { sinif: 'bos-durum' },
        h('p', { metin: 'Ayrıntı için en az bir faaliyet girin.' })));
    }

    return h('section', { sinif: 'kart' }, h('div', { sinif: 'kart-govde' }, [
      h('div', { sinif: 'blok-bas' }, [
        h('h2', { metin: 'Hesap ayrıntısı' }),
        h('span', { sinif: 'blok-not', metin: 'faaliyet × faktör' })
      ]),
      h('div', { sinif: 'tablo-sarma' }, h('table', null, [
        h('thead', null, h('tr', null, [
          h('th', { metin: 'Kalem' }),
          h('th', { sinif: 'sag', metin: 'Faaliyet' }),
          h('th', { metin: 'Birim' }),
          h('th', { sinif: 'sag', metin: 'Faktör' }),
          h('th', { sinif: 'sag', metin: 'kg CO₂e/yıl' })
        ])),
        h('tbody', null, satirlar)
      ])),
      h('p', {
        sinif: 'alan-yardim',
        metin: 'Faktör birimleri kg CO₂e / faaliyet birimidir. Hane bazlı kategorilerde gösterilen emisyon kişi sayısına bölünmüş değerdir.'
      })
    ]));
  }

  /* ======================================================================= *
   * GES sekmesi
   * ======================================================================= */

  function gesPaneli() {
    var kap = h('div');
    var g = durum.ges;

    var elektrikYillik = (durum.girdi.elektrik.kwh_ay || 0) * 12;
    var r = H.gesHesapla(V, {
      bolge: g.bolge,
      kwp: g.kwp,
      ozgul_uretim_override: g.ozgul_override,
      elektrik_kwh_yil: elektrikYillik,
      maliyet_tl_kwp: g.maliyet,
      elektrik_fiyat_tl_kwh: g.fiyat
    });
    var hedef = durum.sonuc ? H.gesHedefKwp(V, durum.sonuc, g.bolge, g.ozgul_override) : null;

    /* ---- Giriş kartı ---- */
    kap.appendChild(h('section', { sinif: 'kart' }, h('div', { sinif: 'kart-govde' }, [
      h('div', { sinif: 'blok-bas' }, [
        h('h2', { metin: 'Çatı GES tasarımı' }),
        h('span', { sinif: 'blok-not', metin: 'yenilenebilir telafi' })
      ]),
      cipGrubu({
        etiket: 'Bölge',
        deger: g.bolge,
        secenekler: V.gunes.bolgeler.map(function (b) {
          return { deger: b.anahtar, etiket: b.etiket };
        }),
        degisti: function (v) { g.bolge = v; D.ayarYaz({ bolge: v }); gesPaneliYenile(); }
      }),
      h('p', {
        sinif: 'alan-yardim',
        metin: V.gunes.bolgeler.filter(function (b) { return b.anahtar === g.bolge; })[0].ornek_iller
      }),
      kaydiriciAlani({
        etiket: 'Kurulu güç',
        deger: g.kwp,
        min: 0, max: 20, adim: 0.5,
        bicim: function (n) { return s1(n) + ' kWp'; },
        yardim: 'Konut çatılarında yaygın aralık 3–10 kWp\'dir.',
        degisti: function (n) { g.kwp = n; gesPaneliYenile(); }
      }),
      h('div', { sinif: 'ikili' }, [
        sayiAlani({
          etiket: 'Özgül üretim (elle)',
          birim: 'kWh/kWp·yıl',
          deger: g.ozgul_override || '',
          adim: 10,
          yertutucu: s0(r.ozgul_uretim_kwh_kwp),
          yardim: 'PVGIS veya GEPA\'dan aldığınız değeri girerek bölge varsayımını geçersiz kılabilirsiniz.',
          degisti: function (n) { g.ozgul_override = n; gesPaneliYenile(); }
        }),
        sayiAlani({
          etiket: 'Birim yatırım maliyeti',
          birim: '₺/kWp',
          deger: g.maliyet === null ? '' : g.maliyet,
          adim: 500,
          yertutucu: s0(V.gunes.yontem.ozgul_maliyet_tl_kwp),
          yardim: 'Güncel teklifinizi girin.',
          degisti: function (n) { g.maliyet = n || null; gesPaneliYenile(); }
        })
      ]),
      sayiAlani({
        etiket: 'Elektrik birim fiyatı (geri ödeme için)',
        birim: '₺/kWh',
        deger: g.fiyat === null ? '' : g.fiyat,
        adim: 0.1,
        yertutucu: 'örn. 3,00',
        yardim: 'Faturanızdaki tüm vergi ve fonlar dahil birim fiyatı girerseniz geri ödeme süresi hesaplanır.',
        degisti: function (n) { g.fiyat = n || null; gesPaneliYenile(); }
      })
    ])));

    /* ---- Çıktı kartı ---- */
    var olcumler = [
      { ad: 'Yıllık üretim', deger: s0(r.uretim_kwh_yil), birim: 'kWh', not: s0(r.uretim_kwh_ay) + ' kWh/ay' },
      { ad: 'CO₂ telafisi', deger: s2(r.telafi_ton_yil), birim: 't/yıl', not: s0(r.telafi_kg_yil) + ' kg/yıl', vurgu: true },
      { ad: 'Panel sayısı', deger: r.panel_adet === null ? '—' : s0(r.panel_adet), birim: '× ' + r.panel_wp + ' Wp', not: '≈ ' + s0(r.gereken_alan_m2) + ' m² çatı' },
      { ad: 'Özgül üretim', deger: s0(r.ozgul_uretim_kwh_kwp), birim: 'kWh/kWp', not: r.ozgul_uretim_elle_girildi ? 'elle girildi' : (r.bolge ? r.bolge.etiket : '') },
      { ad: 'Yatırım', deger: s0(r.yatirim_tl), birim: '₺', not: s0(r.maliyet_tl_kwp) + ' ₺/kWp' },
      {
        ad: 'Geri ödeme',
        deger: r.geri_odeme_yil === null ? '—' : s1(r.geri_odeme_yil),
        birim: r.geri_odeme_yil === null ? '' : 'yıl',
        not: r.geri_odeme_yil === null ? 'birim fiyat girin' : s0(r.yillik_tasarruf_tl) + ' ₺/yıl tasarruf'
      },
      { ad: '25 yıllık telafi', deger: s1(r.omur_boyu_telafi_ton), birim: 't CO₂e', not: 'modül ömrü boyunca' }
    ];

    var olcerKab = h('div', { sinif: 'grafik-kab' });
    var karsilama = r.karsilama_orani === null ? 0 : r.karsilama_orani;

    var ciktiKart = h('section', { sinif: 'kart' }, h('div', { sinif: 'kart-govde' }, [
      h('div', { sinif: 'blok-bas' }, h('h2', { metin: 'Sistem çıktısı' })),
      h('div', { sinif: 'ges-kutular' }, olcumler.map(function (o) {
        return h('div', { sinif: 'olcum' + (o.vurgu ? ' vurgu' : '') }, [
          h('div', { sinif: 'olcum-ad', metin: o.ad }),
          h('div', { sinif: 'olcum-deger' }, [o.deger, o.birim ? h('small', { metin: ' ' + o.birim }) : null]),
          o.not ? h('div', { sinif: 'olcum-not', metin: o.not }) : null
        ]);
      }))
    ]));
    kap.appendChild(ciktiKart);

    /* ---- Karşılama ---- */
    if (elektrikYillik > 0) {
      var ikiliKab = h('div', { sinif: 'grafik-kab', style: 'margin-top:10px' });
      kap.appendChild(h('section', { sinif: 'kart' }, h('div', { sinif: 'kart-govde' }, [
        h('div', { sinif: 'blok-bas' }, [
          h('h2', { metin: 'Tüketimin ne kadarını karşılar?' }),
          h('span', { sinif: 'blok-not', metin: 'yıllık, hane toplamı' })
        ]),
        h('div', { sinif: 'olcer-sarma' }, olcerKab),
        ikiliKab,
        h('div', { sinif: 'yontem', style: 'margin-top:12px' }, [
          h('div', { sinif: 'yontem-bas', metin: 'Hedef kurulu güç' }),
          h('p', {
            html: 'Yıllık <b>' + s0(elektrikYillik) + ' kWh</b> tüketimi tamamen karşılamak için '
              + '<b>' + s1(r.gereken_kwp || 0) + ' kWp</b> gerekir'
              + (hedef && hedef.toplami_telafi_eden_kwp
                ? '. Toplam ayak izinizin tamamını (tüm kategoriler dahil) şebekeye verilen fazla üretimle telafi etmek için ise '
                  + '<b>' + s1(hedef.toplami_telafi_eden_kwp) + ' kWp</b> gerekirdi.'
                : '.')
          }),
          hedef ? h('p', {
            metin: 'İkinci değer kavramsal bir karşılaştırmadır: fotovoltaik üretim yalnızca elektrik tüketimini ikame eder, '
              + 'ulaşım veya beslenme emisyonunu doğrudan azaltmaz. Elektrifikasyon (elektrikli araç, ısı pompası) '
              + 'bu kategorileri elektriğe taşıdığı ölçüde GES onları da kapsamaya başlar.'
          }) : null
        ])
      ])));

      requestAnimationFrame(function () {
        G.olcer(olcerKab, karsilama, {
          erisimEtiket: 'Tüketimi karşılama oranı',
          ustYazi: '%' + s0(karsilama * 100),
          altYazi: karsilama >= 1 ? 'tüketimin tamamı' : 'yıllık tüketimin'
        });
        G.ikiliCubuk(ikiliKab, [
          { etiket: 'Hane elektrik tüketimi', deger: elektrikYillik, renk: 'var(--seri-1)' },
          { etiket: 'GES üretimi', deger: r.uretim_kwh_yil, renk: 'var(--brand)' }
        ], { bicimle: function (v) { return s0(v) + ' kWh'; }, erisimEtiket: 'Tüketim ve üretim karşılaştırması' });
      });
    }

    /* ---- Yöntem ---- */
    var y = V.gunes.yontem;
    var bolgeNesne = V.gunes.bolgeler.filter(function (b) { return b.anahtar === g.bolge; })[0];
    kap.appendChild(h('section', { sinif: 'kart' }, h('div', { sinif: 'kart-govde' }, [
      h('div', { sinif: 'blok-bas' }, h('h2', { metin: 'Hesap yöntemi' })),
      h('div', { sinif: 'yontem' }, [
        h('div', { sinif: 'yontem-bas', metin: 'Özgül üretim' }),
        h('code', {
          sinif: 'formul',
          metin: 'E = GHI × K_eğim × PR\n'
            + '  = ' + s0(bolgeNesne.ghi) + ' × ' + s2(y.k_egim) + ' × ' + s2(y.pr) + '\n'
            + '  = ' + s0(bolgeNesne.ghi * y.k_egim * y.pr) + ' kWh/kWp·yıl'
        }),
        h('p', { metin: 'GHI: ' + bolgeNesne.etiket + ' bölgesi yıllık yatay global ışınım, ' + s0(bolgeNesne.ghi) + ' kWh/m²·yıl (GEPA). Güneşlenme süresi ' + s0(bolgeNesne.guneslenme_saat) + ' saat/yıl.' }),
        h('p', { metin: 'K_eğim = ' + s2(y.k_egim) + ' — ' + y.k_egim_aciklama }),
        h('p', { metin: 'PR = ' + s2(y.pr) + ' — ' + y.pr_aciklama })
      ]),
      h('div', { sinif: 'yontem', style: 'margin-top:11px' }, [
        h('div', { sinif: 'yontem-bas', metin: 'Net CO₂ telafisi' }),
        h('code', {
          sinif: 'formul',
          metin: 'net = f_şebeke − f_PV\n'
            + '    = ' + B3.format(r.sebeke_faktoru) + ' − ' + B3.format(r.ges_faktoru) + '\n'
            + '    = ' + B3.format(r.net_telafi_kg_kwh) + ' kg CO₂e/kWh'
        }),
        h('p', {
          metin: 'Fotovoltaik elektriğin kendi yaşam döngüsü emisyonu (modül üretimi, kurulum, bertaraf) '
            + 'düşülmeden hesaplanan telafi, gerçek kazancı olduğundan yüksek gösterir. Bu yüzden şebeke '
            + 'faktöründen PV faktörü çıkarılır.'
        })
      ]),
      h('div', { sinif: 'uyari-kutu', style: 'margin-top:11px' }, [
        ikon('uyari'),
        h('div', { html: '<strong>Belirsizlik:</strong> ' + y.belirsizlik })
      ])
    ])));

    return kap;
  }

  function gesPaneliYenile() {
    var p = $('#panel-ges');
    if (!p) return;
    var kaydirma = window.scrollY;
    bos(p);
    p.appendChild(gesPaneli());
    window.scrollTo(0, kaydirma);
  }

  /* ======================================================================= *
   * GEÇMİŞ sekmesi
   * ======================================================================= */

  function gecmisPaneli() {
    var liste = D.gecmisOku();
    var kap = h('div');

    if (!liste.length) {
      kap.appendChild(h('section', { sinif: 'kart' }, h('div', { sinif: 'bos-durum' }, [
        ikon('gecmis'),
        h('p', {
          metin: 'Kayıtlı ölçüm yok. Sonuç sekmesindeki "Geçmişe kaydet" düğmesiyle '
            + 'ölçümlerinizi saklayıp zaman içindeki değişimi izleyebilirsiniz.'
        })
      ])));
      return kap;
    }

    /* Eğilim grafiği — en az iki kayıt varsa */
    if (liste.length >= 2) {
      var ters = liste.slice().reverse();
      var cubukKab = h('div', { sinif: 'grafik-kab' });
      kap.appendChild(h('section', { sinif: 'kart' }, h('div', { sinif: 'kart-govde' }, [
        h('div', { sinif: 'blok-bas' }, [
          h('h2', { metin: 'Ölçümler' }),
          h('span', { sinif: 'blok-not', metin: 'eskiden yeniye' })
        ]),
        cubukKab
      ])));
      requestAnimationFrame(function () {
        G.yatayCubuk(cubukKab, ters.map(function (k) {
          var d = new Date(k.zaman);
          var et;
          try {
            et = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(d);
          } catch (e) { et = k.zaman.slice(0, 10); }
          return { etiket: k.not ? k.not.slice(0, 13) : et, deger: k.toplam_kg_yil, yuva: 1 };
        }), {
          tekRenk: true,
          bicimle: function (v) { return s2(v / 1000) + ' t'; },
          erisimEtiket: 'Kaydedilen ölçümlerin toplam ayak izi'
        });
      });
    }

    var ogeler = h('div', { sinif: 'gecmis-liste' }, liste.map(function (k) {
      var serit = h('div', { sinif: 'gecmis-serit' },
        k.kategoriler.filter(function (c) { return c.kg_yil > 0; }).map(function (c) {
          return h('i', {
            style: 'flex:' + (c.pay * 100).toFixed(2) + ';background:' + G.seriRengi(c.yuva),
            title: c.etiket
          });
        }));

      return h('div', { sinif: 'gecmis-ogesi' }, [
        h('div', { sinif: 'gecmis-govde' }, [
          h('div', { sinif: 'gecmis-tarih', metin: tarihBicim(k.zaman) + (k.not ? ' · ' + k.not : '') }),
          h('div', { sinif: 'gecmis-deger' }, [
            s2(k.toplam_ton_yil),
            h('small', { metin: ' t CO₂e/yıl · ' + k.hane_kisi + ' kişilik hane' })
          ]),
          serit
        ]),
        h('div', { sinif: 'gecmis-islem' }, [
          h('button', {
            type: 'button', sinif: 'dugme ikincil ince',
            onclick: function () {
              if (!k.girdi) { bildir('Bu kayıtta girdi verisi yok'); return; }
              durum.girdi = JSON.parse(JSON.stringify(k.girdi));
              durum.beslenmeAyrintili = !!(durum.girdi.beslenme && durum.girdi.beslenme.porsiyonlar);
              panelHesapYenile();
              guncelle();
              sekmeAc('hesapla');
              bildir('Girdiler bu kayıttan yüklendi');
            }
          }, 'Yükle'),
          h('button', {
            type: 'button', sinif: 'dugme tehlike ince', 'aria-label': 'Kaydı sil',
            onclick: function () {
              D.gecmistenSil(k.kimlik);
              gecmisPaneliYenile();
              bildir('Kayıt silindi');
            }
          }, ikon('sil'))
        ])
      ]);
    }));

    kap.appendChild(h('section', { sinif: 'kart' }, h('div', { sinif: 'kart-govde' }, [
      h('div', { sinif: 'blok-bas' }, [
        h('h2', { metin: 'Kayıtlı ölçümler' }),
        h('span', { sinif: 'blok-not', metin: liste.length + ' / ' + D.GECMIS_SINIR })
      ]),
      ogeler,
      h('div', { sinif: 'dugme-sat', style: 'margin-top:12px' }, [
        h('button', {
          type: 'button', sinif: 'dugme ikincil',
          onclick: function () {
            var y = D.yedekUret();
            dosyaVer('karbonpusula-yedek.json', JSON.stringify(y, null, 2), 'application/json');
          }
        }, [ikon('indir'), 'Yedek al']),
        h('button', {
          type: 'button', sinif: 'dugme tehlike',
          onclick: function () {
            if (!window.confirm('Tüm geçmiş kayıtlar silinecek. Devam edilsin mi?')) return;
            D.gecmisTemizle();
            gecmisPaneliYenile();
            bildir('Geçmiş temizlendi');
          }
        }, [ikon('sil'), 'Tümünü sil'])
      ]),
      D.kullanilabilir ? null : h('div', { sinif: 'uyari-kutu', style: 'margin-top:11px' }, [
        ikon('uyari'),
        h('div', { metin: 'Bu ortamda kalıcı depolama kapalı. Kayıtlar yalnızca uygulama açık kaldığı sürece tutulur.' })
      ])
    ])));

    return kap;
  }

  function gecmisPaneliYenile() {
    var p = $('#panel-gecmis');
    if (!p) return;
    bos(p);
    p.appendChild(gecmisPaneli());
  }

  /* ======================================================================= *
   * BİLGİ sekmesi
   * ======================================================================= */

  var KATEGORI_ADLARI = {
    elektrik: 'Elektrik', isinma: 'Isınma', ulasim: 'Ulaşım',
    ucus: 'Uçuş', atik: 'Atık', su: 'Su'
  };

  function bilgiPaneli() {
    var kap = h('div');

    /* ---- Yöntem ---- */
    kap.appendChild(h('section', { sinif: 'kart' }, h('div', { sinif: 'kart-govde' }, [
      h('div', { sinif: 'blok-bas' }, h('h2', { metin: 'Hesap yöntemi' })),
      h('code', {
        sinif: 'formul',
        metin: 'emisyon = faaliyet verisi × emisyon faktörü'
      }),
      h('ul', { sinif: 'madde-liste', style: 'margin-top:11px' }, [
        h('li', { html: '<strong>Kapsam.</strong> Hesap, hane ve bireyin tüketimine bağlı doğrudan (Kapsam 1) ve satın alınan enerjiden gelen (Kapsam 2) emisyonları, ayrıca ulaşım, beslenme, atık ve su için yukarı akış (Kapsam 3) emisyonlarını içerir.' }),
        h('li', { html: '<strong>Küresel ısınma potansiyeli.</strong> Tüm faktörler ' + V.meta.gwp_temeli + ' temelinde CO₂ eşdeğerine çevrilmiştir.' }),
        h('li', { html: '<strong>Hane paylaşımı.</strong> Elektrik, ısınma, atık ve su hane düzeyinde ölçülür ve kişi sayısına bölünür. Ulaşım, uçuş ve beslenme kişiseldir.' }),
        h('li', { html: '<strong>Yıllıklandırma.</strong> Aylık ve haftalık girdiler sabit kabul edilerek yıla çevrilir (1 yıl = 12 ay = 52,1429 hafta).' }),
        h('li', { html: '<strong>Araç paylaşımı.</strong> Araç-km bazlı faktörler araçtaki kişi sayısına bölünerek kişi başı paya dönüştürülür; yolcu-km bazlı toplu taşıma faktörleri bölünmez.' }),
        h('li', { html: '<strong>Elektrikli araç ve yeşil tarife.</strong> Elektrik içeren faktörler Birleşik Krallık değerleriyle değil, Türkiye şebeke faktörüyle yeniden türetilmiştir.' })
      ])
    ])));

    /* ---- Sınırlamalar ---- */
    kap.appendChild(h('section', { sinif: 'kart' }, h('div', { sinif: 'kart-govde' }, [
      h('div', { sinif: 'blok-bas' }, h('h2', { metin: 'Sınırlamalar' })),
      h('ul', { sinif: 'madde-liste' }, [
        h('li', { metin: 'Satın alınan mal ve hizmetler (giyim, elektronik, mobilya), konut inşaatının gömülü karbonu ve kamu hizmetlerinin payı kapsam dışıdır. Gerçek tüketim temelli ayak izi bu nedenle hesaplanandan bir miktar yüksektir.' }),
        h('li', { metin: 'Yakıt faktörleri doğrudan yanmayı temel alır; yakıtın çıkarılması ve taşınmasından gelen yukarı akış (well-to-tank) emisyonları ayrı sayılmamıştır.' }),
        h('li', { metin: 'Gıda faktörleri küresel ortalamalardır; Türkiye üretim koşullarına özgü değerler kullanılmamıştır. Gıda israfı ayrı bir kalem olarak modellenmemiştir.' }),
        h('li', { metin: 'Kömür ve odun yakımının hava kalitesi etkisi (PM2.5, SO₂, NOₓ) sera gazı hesabına dahil değildir; bu etkiler sağlık açısından ayrıca önemlidir.' }),
        h('li', { metin: 'Geri dönüşüm faktörü yalnızca toplama ve taşımayı içerir; ikincil hammaddenin birincil üretimin yerini almasından doğan kazanç sayılmaz. Geri dönüşümün gerçek faydası hesaplanandan büyüktür.' }),
        h('li', { metin: 'GES bölgesel özgül üretim değerleri ±%10–15 belirsizlik taşır. Kesin fizibilite için koordinat bazlı PVGIS/GEPA sorgusu gerekir.' })
      ])
    ])));

    /* ---- Faktör tablosu ---- */
    var gruplar = {};
    Object.keys(V.faktorler).forEach(function (k) {
      var f = V.faktorler[k];
      if (!gruplar[f.kategori]) gruplar[f.kategori] = [];
      gruplar[f.kategori].push(f);
    });

    /* Faktörler tablo yerine yığılmış liste olarak gösterilir: açıklama ve
       türetme metinleri uzundur ve dar ekranda yatay kaydırmaya zorlar. */
    function kurumKisa(kaynakAnahtar) {
      var k = V.kaynaklar[kaynakAnahtar];
      return k ? k.kurum.split(/[—(,]/)[0].trim() : kaynakAnahtar;
    }

    var faktorKutu = h('div');
    Object.keys(gruplar).forEach(function (kat) {
      faktorKutu.appendChild(h('div', { sinif: 'faktor-grup' }, [
        h('div', { sinif: 'faktor-grup-bas' }, [
          KATEGORI_ADLARI[kat] || kat,
          h('span', { style: 'font-weight:600;color:var(--ink-3)', metin: '· ' + gruplar[kat].length })
        ]),
        h('div', { sinif: 'faktor-liste' }, gruplar[kat].map(function (f) {
          return h('div', { sinif: 'faktor-ogesi' }, [
            h('div', { sinif: 'faktor-ust' }, [
              h('span', { sinif: 'faktor-ad', metin: f.etiket }),
              h('span', { sinif: 'faktor-deger' }, [
                faktorBicim(f.deger),
                h('small', { metin: ' kg CO₂e/' + f.birim_faaliyet })
              ])
            ]),
            h('p', { sinif: 'faktor-kapsam', metin: f.kapsam }),
            h('div', { sinif: 'faktor-alt' }, [
              h('span', {
                sinif: 'kaynak-cip' + (f.tur === 'turetilmis' ? ' turetilmis' : ''),
                metin: kurumKisa(f.kaynak) + (f.tur === 'turetilmis' ? ' · türetilmiş' : '')
              })
            ]),
            f.turetme ? h('p', { sinif: 'faktor-turetme', metin: f.turetme }) : null,
            f.alternatif_not ? h('p', { sinif: 'faktor-turetme', metin: f.alternatif_not }) : null
          ]);
        }))
      ]));
    });

    kap.appendChild(h('section', { sinif: 'kart' }, h('div', { sinif: 'kart-govde' }, [
      h('div', { sinif: 'blok-bas' }, [
        h('h2', { metin: 'Emisyon faktörleri' }),
        h('span', { sinif: 'blok-not', metin: Object.keys(V.faktorler).length + ' kalem' })
      ]),
      h('p', {
        sinif: 'alan-yardim',
        style: 'margin-bottom:12px',
        metin: 'Sarı işaretli "türetilmiş" değerler, kaynaktaki bir faktörden açıklanan bir dönüşümle elde edilmiştir. '
          + 'Dönüşüm adımı her satırın altında yazılıdır.'
      }),
      faktorKutu
    ])));

    /* ---- Beslenme faktörleri ---- */
    kap.appendChild(h('section', { sinif: 'kart' }, h('div', { sinif: 'kart-govde' }, [
      h('div', { sinif: 'blok-bas' }, [
        h('h2', { metin: 'Gıda faktörleri' }),
        h('span', { sinif: 'blok-not', metin: 'Poore & Nemecek (2018)' })
      ]),
      h('div', { sinif: 'tablo-sarma' }, h('table', null, [
        h('thead', null, h('tr', null, [
          h('th', { metin: 'Gıda' }),
          h('th', { sinif: 'sag', metin: 'kg CO₂e/kg' }),
          h('th', { sinif: 'sag', metin: 'Porsiyon' })
        ])),
        h('tbody', null, V.beslenme.kalemler.slice().sort(function (a, b) {
          return b.faktor - a.faktor;
        }).map(function (k) {
          return h('tr', null, [
            h('td', { sinif: 'ad', metin: k.etiket }),
            h('td', { sinif: 'sag', metin: s1(k.faktor) }),
            h('td', { sinif: 'sag', metin: k.porsiyon_g + ' g' })
          ]);
        }))
      ])),
      h('p', { sinif: 'alan-yardim', metin: V.beslenme.aciklama }),
      h('p', { sinif: 'alan-yardim', metin: V.beslenme.sebze_meyve_notu })
    ])));

    /* ---- Kıyaslama değerleri ---- */
    kap.appendChild(h('section', { sinif: 'kart' }, h('div', { sinif: 'kart-govde' }, [
      h('div', { sinif: 'blok-bas' }, h('h2', { metin: 'Kıyaslama değerleri' })),
      h('div', { sinif: 'tablo-sarma' }, h('table', null, [
        h('thead', null, h('tr', null, [
          h('th', { metin: 'Ölçüt' }),
          h('th', { sinif: 'sag', metin: 'ton CO₂e/kişi·yıl' })
        ])),
        h('tbody', null, Object.keys(V.kiyaslama).map(function (k) {
          var o = V.kiyaslama[k];
          var kurum = V.kaynaklar[o.kaynak]
            ? V.kaynaklar[o.kaynak].kurum.split(/[—(,]/)[0].trim() : o.kaynak;
          return h('tr', null, [
            h('td', { sinif: 'ad' }, [
              o.etiket,
              h('div', { style: 'font-weight:400;color:var(--ink-3);font-size:11px;margin-top:3px;white-space:normal', metin: 'Kaynak: ' + kurum }),
              o.not ? h('div', { style: 'font-weight:400;color:var(--ink-3);font-size:11px;margin-top:3px;white-space:normal', metin: o.not }) : null
            ]),
            h('td', { sinif: 'sag', metin: s1(o.deger) })
          ]);
        }))
      ]))
    ])));

    /* ---- Kaynakça ---- */
    var kaynakAnahtarlari = Object.keys(V.kaynaklar);
    kap.appendChild(h('section', { sinif: 'kart' }, h('div', { sinif: 'kart-govde' }, [
      h('div', { sinif: 'blok-bas' }, [
        h('h2', { metin: 'Kaynakça' }),
        h('span', { sinif: 'blok-not', metin: kaynakAnahtarlari.length + ' kaynak' })
      ]),
      h('div', { sinif: 'kaynak-liste' }, kaynakAnahtarlari.map(function (k, i) {
        var s = V.kaynaklar[k];
        return h('div', { sinif: 'kaynak' }, [
          h('div', { sinif: 'kaynak-ad' }, [
            h('span', { sinif: 'kaynak-no', metin: '[' + (i + 1) + ']' }),
            s.ad
          ]),
          h('div', { sinif: 'kaynak-kurum', metin: s.kurum + ' · ' + s.yil }),
          h('div', { sinif: 'kaynak-kapsam', metin: s.kapsam }),
          h('a', { sinif: 'kaynak-url', href: s.url, target: '_blank', rel: 'noopener', metin: s.url })
        ]);
      })),
      h('p', {
        sinif: 'alan-yardim',
        style: 'margin-top:12px',
        metin: 'Bağlantılar cihazın tarayıcısında açılır ve internet bağlantısı gerektirir. '
          + 'Uygulamanın hesap yapması için bağlantı gerekmez.'
      })
    ])));

    /* ---- Hakkında ---- */
    kap.appendChild(h('section', { sinif: 'kart' }, h('div', { sinif: 'kart-govde' }, [
      h('div', { sinif: 'blok-bas' }, h('h2', { metin: 'Uygulama hakkında' })),
      h('ul', { sinif: 'madde-liste' }, [
        h('li', { html: '<strong>KarbonPusula</strong> sürüm ' + V.meta.surum + ' · veri güncellemesi ' + V.meta.guncelleme }),
        h('li', { metin: 'Yenilenebilir Enerji Teknikerliği bitirme projesi olarak geliştirilmiştir.' }),
        h('li', { metin: 'Tamamen çevrimdışı çalışır. Girdileriniz yalnızca bu cihazda saklanır, hiçbir sunucuya gönderilmez. Uygulama internet izni talep etmez.' }),
        h('li', { metin: 'Sonuçlar tahmindir ve resmî sera gazı raporlaması yerine geçmez. Kurumsal raporlama için ISO 14064 / GHG Protocol uyumlu doğrulanmış envanter gerekir.' })
      ]),
      h('div', { sinif: 'dugme-sat', style: 'margin-top:12px' }, [
        h('button', {
          type: 'button', sinif: 'dugme ikincil',
          onclick: function () {
            dosyaVer('emisyon_faktorleri.json', JSON.stringify(V, null, 2), 'application/json');
          }
        }, [ikon('indir'), 'Faktör veri setini indir'])
      ])
    ])));

    return kap;
  }

  /* ======================================================================= *
   * Rapor üretimi
   * ======================================================================= */

  function metinRapor() {
    var s = durum.sonuc;
    if (!s) return '';
    var sat = [];
    sat.push('KARBONPUSULA — KARBON AYAK İZİ ÖZETİ');
    sat.push('='.repeat(42));
    sat.push('Tarih: ' + tarihBicim(s.zaman));
    sat.push('Hane: ' + s.hane_kisi + ' kişi');
    sat.push('');
    sat.push('KİŞİ BAŞI YILLIK AYAK İZİ: ' + s2(s.toplam_ton_yil) + ' ton CO₂e');
    sat.push('(' + s0(s.toplam_kg_yil) + ' kg/yıl · ' + s0(s.toplam_kg_ay) + ' kg/ay)');
    sat.push('');
    sat.push('KATEGORİLER');
    s.kategoriler.slice().sort(function (a, b) { return b.kg_yil - a.kg_yil; }).forEach(function (k) {
      sat.push('  ' + k.etiket + ': ' + s0(k.kg_yil) + ' kg/yıl (%' + s1(k.pay * 100) + ')');
    });
    sat.push('');
    sat.push('KIYASLAMA');
    sat.push('  Türkiye ortalaması: ' + s1(V.kiyaslama.turkiye_kisi_basi.deger) + ' t → sizin değeriniz %' + s0(s.kiyaslama.turkiye.oran * 100));
    sat.push('  Dünya ortalaması:   ' + s1(V.kiyaslama.dunya_kisi_basi.deger) + ' t → %' + s0(s.kiyaslama.dunya.oran * 100));
    sat.push('  1,5 °C hedefi:      ' + s1(V.kiyaslama.paris_hedefi.deger) + ' t → ' + s2(s.kiyaslama.hedef.oran) + ' katı');
    sat.push('');
    var oneriler = H.onerileriGetir(V, s, 4);
    if (oneriler.length) {
      sat.push('EN ETKİLİ ADIMLAR');
      oneriler.forEach(function (o, i) {
        sat.push('  ' + (i + 1) + '. ' + o.baslik + ' (≈ −' + s0(o.tahmini_azaltim_kg) + ' kg/yıl)');
      });
      sat.push('');
    }
    sat.push('Hesap yöntemi: emisyon = faaliyet verisi × emisyon faktörü');
    sat.push('Faktör kaynakları: Ember, DEFRA/DESNZ, ETKB, IPCC, Poore & Nemecek, TÜİK, MGM, World Bank/ESMAP');
    sat.push('KarbonPusula ' + V.meta.surum + ' — tahmini değerlerdir, resmî raporlama yerine geçmez.');
    return sat.join('\n');
  }

  function htmlRapor() {
    var s = durum.sonuc;
    if (!s) return '';
    var sirali = s.kategoriler.slice().sort(function (a, b) { return b.kg_yil - a.kg_yil; });
    var seriHex = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'];

    function kacis(t) {
      return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    var p = [];
    p.push('<!doctype html><html lang="tr"><head><meta charset="utf-8">');
    p.push('<meta name="viewport" content="width=device-width,initial-scale=1">');
    p.push('<title>KarbonPusula raporu — ' + kacis(tarihBicim(s.zaman)) + '</title>');
    p.push('<style>'
      + '*{box-sizing:border-box}'
      + 'body{margin:0;padding:32px 20px;background:#f7faf8;color:#0c1715;'
      + 'font:15px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}'
      + '.sarma{max-width:780px;margin:0 auto;background:#fff;border:1px solid #e1e8e4;'
      + 'border-radius:16px;padding:32px 28px}'
      + 'h1{margin:0 0 4px;font-size:26px;letter-spacing:-.02em}'
      + 'h2{margin:30px 0 12px;font-size:16px;letter-spacing:-.01em;'
      + 'padding-bottom:7px;border-bottom:1px solid #e1e8e4}'
      + '.ust{color:#51625e;font-size:13px}'
      + '.kahraman{margin:22px 0;padding:20px;border:1px solid #e1e8e4;border-radius:12px;'
      + 'background:linear-gradient(135deg,#f0f9f4,#fbfdfc)}'
      + '.kahraman b{display:block;font-size:44px;font-weight:700;letter-spacing:-.03em;line-height:1}'
      + '.kahraman span{color:#51625e;font-size:13px}'
      + 'table{width:100%;border-collapse:collapse;font-size:13px;font-variant-numeric:tabular-nums}'
      + 'th{text-align:left;padding:8px 10px;background:#f3f6f4;border-bottom:1px solid #e1e8e4;'
      + 'font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#7b8c87}'
      + 'td{padding:8px 10px;border-bottom:1px solid #eef3f0;color:#51625e}'
      + 'td.ad{color:#0c1715;font-weight:600}.sag{text-align:right}'
      + 'tfoot td{font-weight:700;color:#0c1715;background:#f7faf8}'
      + '.nokta{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:7px}'
      + '.serit{display:flex;height:11px;border-radius:999px;overflow:hidden;gap:2px;margin:14px 0 6px}'
      + '.serit i{display:block}'
      + 'ol{padding-left:22px;font-size:13.5px}ol li{margin-bottom:7px}'
      + 'ul.kay{padding-left:20px;font-size:12px;color:#51625e}ul.kay li{margin-bottom:5px}'
      + '.dip{margin-top:28px;padding-top:14px;border-top:1px solid #e1e8e4;'
      + 'font-size:11.5px;color:#7b8c87}'
      + 'code{background:#f3f6f4;padding:2px 6px;border-radius:4px;font-size:12px}'
      + '@media print{body{background:#fff;padding:0}.sarma{border:0;border-radius:0;padding:0}}'
      + '</style></head><body><div class="sarma">');

    p.push('<h1>Karbon ayak izi raporu</h1>');
    p.push('<div class="ust">KarbonPusula ' + kacis(V.meta.surum) + ' · '
      + kacis(tarihBicim(s.zaman)) + ' · ' + s.hane_kisi + ' kişilik hane</div>');

    p.push('<div class="kahraman"><b>' + s2(s.toplam_ton_yil) + '</b>'
      + '<span>ton CO₂e / kişi · yıl &nbsp;—&nbsp; ' + s0(s.toplam_kg_yil) + ' kg/yıl · '
      + s0(s.toplam_kg_ay) + ' kg/ay</span></div>');

    p.push('<div class="serit">');
    sirali.filter(function (k) { return k.kg_yil > 0; }).forEach(function (k) {
      p.push('<i style="flex:' + (k.pay * 100).toFixed(2) + ';background:'
        + seriHex[k.yuva - 1] + '" title="' + kacis(k.etiket) + '"></i>');
    });
    p.push('</div>');

    p.push('<h2>Kategori dağılımı</h2><table><thead><tr><th>Kategori</th>'
      + '<th class="sag">kg/yıl</th><th class="sag">kg/ay</th><th class="sag">Pay</th>'
      + '</tr></thead><tbody>');
    sirali.forEach(function (k) {
      p.push('<tr><td class="ad"><span class="nokta" style="background:' + seriHex[k.yuva - 1]
        + '"></span>' + kacis(k.etiket) + '</td><td class="sag">' + s0(k.kg_yil)
        + '</td><td class="sag">' + s0(k.kg_yil / 12) + '</td><td class="sag">%'
        + s1(k.pay * 100) + '</td></tr>');
    });
    p.push('</tbody><tfoot><tr><td>Toplam</td><td class="sag">' + s0(s.toplam_kg_yil)
      + '</td><td class="sag">' + s0(s.toplam_kg_ay) + '</td><td class="sag">%100</td></tr></tfoot></table>');

    p.push('<h2>Kıyaslama</h2><table><thead><tr><th>Ölçüt</th>'
      + '<th class="sag">ton CO₂e/kişi·yıl</th><th class="sag">Sizin oranınız</th></tr></thead><tbody>');
    [['Siz', s.toplam_ton_yil, '—'],
     [V.kiyaslama.turkiye_kisi_basi.etiket, V.kiyaslama.turkiye_kisi_basi.deger, '%' + s0(s.kiyaslama.turkiye.oran * 100)],
     [V.kiyaslama.dunya_kisi_basi.etiket, V.kiyaslama.dunya_kisi_basi.deger, '%' + s0(s.kiyaslama.dunya.oran * 100)],
     [V.kiyaslama.paris_hedefi.etiket, V.kiyaslama.paris_hedefi.deger, s2(s.kiyaslama.hedef.oran) + '×']
    ].forEach(function (r) {
      p.push('<tr><td class="ad">' + kacis(r[0]) + '</td><td class="sag">' + s2(r[1])
        + '</td><td class="sag">' + kacis(r[2]) + '</td></tr>');
    });
    p.push('</tbody></table>');

    p.push('<h2>Hesap ayrıntısı</h2><table><thead><tr><th>Kalem</th>'
      + '<th class="sag">Faaliyet</th><th>Birim</th><th class="sag">Faktör</th>'
      + '<th class="sag">kg CO₂e/yıl</th></tr></thead><tbody>');
    s.kategoriler.forEach(function (k) {
      if (!k.satirlar.length) return;
      p.push('<tr><td colspan="5" style="background:#f3f6f4;font-weight:700;color:#0c1715;'
        + 'font-size:11.5px;text-transform:uppercase;letter-spacing:.04em">'
        + '<span class="nokta" style="background:' + seriHex[k.yuva - 1] + '"></span>'
        + kacis(k.etiket) + (k.hane_bazli ? ' · hane ÷ ' + k.kisi_bolen + ' kişi' : '') + '</td></tr>');
      k.satirlar.forEach(function (r) {
        p.push('<tr><td class="ad">' + kacis(r.etiket) + '</td><td class="sag">'
          + s1(r.faaliyet) + '</td><td>' + kacis(r.faaliyet_birim) + '</td><td class="sag">'
          + faktorBicim(r.faktor) + '</td><td class="sag">' + s0(r.kg) + '</td></tr>');
      });
    });
    p.push('</tbody></table>');

    var oneriler = H.onerileriGetir(V, s, 6);
    if (oneriler.length) {
      p.push('<h2>En etkili azaltım adımları</h2><ol>');
      oneriler.forEach(function (o) {
        p.push('<li><strong>' + kacis(o.baslik) + '</strong> — yaklaşık <strong>'
          + s0(o.tahmini_azaltim_kg) + ' kg CO₂e/yıl</strong> azaltım potansiyeli.<br>'
          + kacis(o.metin) + '</li>');
      });
      p.push('</ol>');
    }

    p.push('<h2>Yöntem ve kaynaklar</h2>');
    p.push('<p style="font-size:13px">Her kategori için <code>emisyon = faaliyet verisi × emisyon faktörü</code>. '
      + 'Tüm faktörler ' + kacis(V.meta.gwp_temeli) + ' temelinde CO₂ eşdeğerine çevrilmiştir. '
      + 'Elektrik, ısınma, atık ve su hane düzeyinde ölçülüp kişi sayısına bölünmüştür.</p>');
    p.push('<ul class="kay">');
    Object.keys(V.kaynaklar).forEach(function (k, i) {
      var kay = V.kaynaklar[k];
      p.push('<li>[' + (i + 1) + '] ' + kacis(kay.ad) + '. ' + kacis(kay.kurum)
        + ', ' + kacis(kay.yil) + '. &lt;' + kacis(kay.url) + '&gt;</li>');
    });
    p.push('</ul>');

    p.push('<div class="dip">Bu rapor KarbonPusula ' + kacis(V.meta.surum)
      + ' tarafından üretilmiştir. Sonuçlar tahmindir ve resmî sera gazı raporlaması yerine geçmez. '
      + 'Yenilenebilir Enerji Teknikerliği bitirme projesi.</div>');
    p.push('</div></body></html>');
    return p.join('');
  }

  /* ---- Paylaşım ve dosya ---- */

  function androidKopru() {
    return (typeof window.Kopru !== 'undefined' && window.Kopru) ? window.Kopru : null;
  }

  function raporPaylas() {
    var metin = metinRapor();
    if (!metin) { bildir('Paylaşılacak sonuç yok'); return; }
    var k = androidKopru();
    if (k && k.paylas) {
      try { k.paylas('KarbonPusula — karbon ayak izi özeti', metin); return; } catch (e) { /* devam */ }
    }
    if (navigator.share) {
      navigator.share({ title: 'KarbonPusula', text: metin }).catch(function () { panoyaKopyala(metin); });
      return;
    }
    panoyaKopyala(metin);
  }

  function panoyaKopyala(metin) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(metin).then(function () {
        bildir('Özet panoya kopyalandı');
      }).catch(function () { bildir('Kopyalanamadı'); });
      return;
    }
    try {
      var t = document.createElement('textarea');
      t.value = metin;
      t.style.position = 'fixed';
      t.style.opacity = '0';
      document.body.appendChild(t);
      t.select();
      document.execCommand('copy');
      document.body.removeChild(t);
      bildir('Özet panoya kopyalandı');
    } catch (e) {
      bildir('Kopyalanamadı');
    }
  }

  function raporKaydet() {
    var html = htmlRapor();
    if (!html) { bildir('Kaydedilecek sonuç yok'); return; }
    var ad = 'karbonpusula-rapor-' + new Date().toISOString().slice(0, 10) + '.html';
    dosyaVer(ad, html, 'text/html');
  }

  function dosyaVer(dosyaAdi, icerik, tur) {
    var k = androidKopru();
    if (k && k.dosyaKaydet) {
      try {
        k.dosyaKaydet(dosyaAdi, icerik, tur || 'text/plain');
        return;
      } catch (e) { /* tarayıcı yoluna düş */ }
    }
    try {
      var blob = new Blob([icerik], { type: (tur || 'text/plain') + ';charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = dosyaAdi;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      bildir(dosyaAdi + ' indirildi');
    } catch (e) {
      bildir('Dosya oluşturulamadı');
    }
  }

  /* ======================================================================= *
   * Sekmeler
   * ======================================================================= */

  var SEKMELER = [
    { anahtar: 'hesapla', ad: 'Hesapla', ikonAd: 'hesap' },
    { anahtar: 'sonuc', ad: 'Sonuç', ikonAd: 'sonuc' },
    { anahtar: 'ges', ad: 'GES', ikonAd: 'gunes' },
    { anahtar: 'gecmis', ad: 'Geçmiş', ikonAd: 'gecmis' },
    { anahtar: 'bilgi', ad: 'Bilgi', ikonAd: 'bilgi' }
  ];

  var aktifSekme = 'hesapla';
  var bilgiCizildi = false;

  function sekmeAc(anahtar) {
    aktifSekme = anahtar;
    SEKMELER.forEach(function (s) {
      var panel = document.getElementById('panel-' + s.anahtar);
      var dugme = document.getElementById('sekme-' + s.anahtar);
      var acik = s.anahtar === anahtar;
      if (panel) panel.classList.toggle('gizli', !acik);
      if (dugme) dugme.setAttribute('aria-selected', acik ? 'true' : 'false');
    });
    G.ipucuGizle();
    window.scrollTo(0, 0);

    if (anahtar === 'sonuc') sonucPaneliYenile();
    if (anahtar === 'ges') gesPaneliYenile();
    if (anahtar === 'gecmis') gecmisPaneliYenile();
    if (anahtar === 'bilgi' && !bilgiCizildi) {
      // Kaynakça ve faktör tabloları büyüktür; ilk açılışta bir kez çizilir.
      var pb = $('#panel-bilgi');
      bos(pb);
      pb.appendChild(bilgiPaneli());
      bilgiCizildi = true;
    }

    // Yüzen toplam yalnızca girdi düzenlenirken anlamlıdır; diğer sekmelerde
    // zaten sonuç gösterildiği için gizlenir ve dikey alan kazanılır.
    var yt = $('#yuzen-toplam');
    if (yt) yt.classList.toggle('gizli', anahtar !== 'hesapla');
    document.body.classList.toggle('yuzen-yok', anahtar !== 'hesapla');
    yuzenPayiOlc();

    try { history.replaceState(null, '', '#' + anahtar); } catch (e) { /* yoksay */ }
  }

  function sonucPaneliYenile() {
    var p = $('#panel-sonuc');
    if (!p) return;
    bos(p);
    p.appendChild(sonucPaneli());
  }

  /* ======================================================================= *
   * Tema
   * ======================================================================= */

  function temaUygula(tema) {
    var kok = document.documentElement;
    if (tema === 'acik') kok.setAttribute('data-tema', 'acik');
    else if (tema === 'koyu') kok.setAttribute('data-tema', 'koyu');
    else kok.removeAttribute('data-tema');

    var k = androidKopru();
    if (k && k.temaBildir) {
      try { k.temaBildir(etkinTema()); } catch (e) { /* yoksay */ }
    }
    temaDugmesiYenile();
  }

  function etkinTema() {
    var t = durum.ayar.tema;
    if (t === 'acik' || t === 'koyu') return t;
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'koyu' : 'acik';
    } catch (e) { return 'acik'; }
  }

  function temaDugmesiYenile() {
    var d = $('#tema-dugme');
    if (!d) return;
    bos(d);
    var k = etkinTema();
    d.appendChild(ikon(k === 'koyu' ? 'gunesKucuk' : 'ay'));
    d.setAttribute('aria-label', k === 'koyu' ? 'Açık temaya geç' : 'Koyu temaya geç');
  }

  /* ======================================================================= *
   * Güncelleme döngüsü
   * ======================================================================= */

  var kaydetZaman = null;

  function guncelle() {
    var hatalar = H.dogrula(durum.girdi);
    if (hatalar.length) {
      durum.sonuc = null;
      yuzenToplamYaz(null, hatalar[0]);
      return;
    }
    try {
      durum.sonuc = H.hesapla(V, durum.girdi);
    } catch (e) {
      durum.sonuc = null;
      yuzenToplamYaz(null, e.message.split('\n')[0]);
      return;
    }

    yuzenToplamYaz(durum.sonuc, null);
    bolumPaylariGuncelle();

    if (aktifSekme === 'sonuc') sonucPaneliYenile();
    if (aktifSekme === 'ges') gesPaneliYenile();

    if (kaydetZaman) clearTimeout(kaydetZaman);
    kaydetZaman = setTimeout(function () { D.girdiKaydet(durum.girdi); }, 400);
  }

  /**
   * Sayfanın alt boşluğunu, yüzen toplam çubuğunun gerçek yüksekliğine göre
   * ayarlar.
   *
   * Çubuk `position: fixed` olduğu için akıştan çıkar ve kendi yerini açmaz;
   * alt boşluk yetersiz kalırsa sayfanın son öğelerinin (örneğin "Sonuçları
   * gör" ve "Başlangıca dön" düğmelerinin) üstüne biner. Yükseklik sabit
   * değildir: metin sarabilir, kullanıcı sistem yazı tipi boyutunu büyütmüş
   * olabilir. Bu yüzden ölçülerek belirlenir.
   */
  function yuzenPayiOlc() {
    var kutu = $('#yuzen-toplam');
    var gorunur = kutu && !kutu.classList.contains('gizli');
    var pay = 22;                                   // çubuk yokken yeterli
    if (gorunur) {
      // 12px çubuğun sekme çubuğuna uzaklığı + 16px nefes payı
      pay = kutu.offsetHeight + 28;
    }
    document.documentElement.style.setProperty('--yuzen-pay', pay + 'px');
  }

  function yuzenToplamYaz(s, hata) {
    var kutu = $('#yuzen-toplam');
    if (!kutu) return;
    var deger = kutu.querySelector('.yt-deger');
    var ust = kutu.querySelector('.yt-ust');

    if (hata) {
      ust.textContent = 'Girdi hatası';
      bos(deger);
      deger.appendChild(document.createTextNode(hata));
      // Hata metni uzundur ve sarar; çubuk yükselir, boşluk yeniden ölçülmeli.
      yuzenPayiOlc();
      return;
    }
    ust.textContent = 'Kişi başı yıllık ayak izi';
    bos(deger);
    deger.appendChild(document.createTextNode(s2(s.toplam_ton_yil)));
    deger.appendChild(h('small', { metin: ' t CO₂e/yıl' }));
    yuzenPayiOlc();
  }

  /* ======================================================================= *
   * Kurulum
   * ======================================================================= */

  function kabukCiz() {
    var kok = $('#uygulama');

    /* Üst bar */
    kok.appendChild(h('header', { sinif: 'ust-bar' }, [
      h('div', { sinif: 'ust-marka' }, [
        markaLogo(),
        h('span', { sinif: 'ust-ad', metin: 'KarbonPusula' })
      ]),
      h('div', { sinif: 'ust-bosluk' }),
      h('button', {
        type: 'button', sinif: 'ikon-dugme', id: 'tema-dugme',
        onclick: function () {
          var sira = ['sistem', 'acik', 'koyu'];
          var i = sira.indexOf(durum.ayar.tema);
          durum.ayar.tema = sira[(i + 1) % sira.length];
          D.ayarYaz({ tema: durum.ayar.tema });
          temaUygula(durum.ayar.tema);
          bildir(durum.ayar.tema === 'sistem' ? 'Tema: sistem'
            : durum.ayar.tema === 'acik' ? 'Tema: açık' : 'Tema: koyu');
        }
      })
    ]));

    /* Paneller */
    var ana = h('main');
    SEKMELER.forEach(function (s) {
      ana.appendChild(h('div', {
        id: 'panel-' + s.anahtar,
        sinif: 'panel' + (s.anahtar === 'hesapla' ? '' : ' gizli'),
        role: 'tabpanel',
        'aria-labelledby': 'sekme-' + s.anahtar
      }));
    });
    kok.appendChild(ana);

    /* Yüzen toplam */
    kok.appendChild(h('div', { sinif: 'yuzen-toplam', id: 'yuzen-toplam' }, [
      h('div', { sinif: 'yt-metin' }, [
        h('div', { sinif: 'yt-ust', metin: 'Kişi başı yıllık ayak izi' }),
        h('div', { sinif: 'yt-deger', metin: '—' })
      ]),
      h('button', {
        type: 'button', sinif: 'dugme ince',
        onclick: function () { sekmeAc(aktifSekme === 'sonuc' ? 'hesapla' : 'sonuc'); }
      }, 'Ayrıntı')
    ]));

    /* Alt sekme çubuğu */
    kok.appendChild(h('nav', { sinif: 'alt-bar', role: 'tablist', 'aria-label': 'Ana gezinme' },
      SEKMELER.map(function (s) {
        return h('button', {
          type: 'button',
          id: 'sekme-' + s.anahtar,
          sinif: 'sekme',
          role: 'tab',
          'aria-selected': s.anahtar === 'hesapla' ? 'true' : 'false',
          'aria-controls': 'panel-' + s.anahtar,
          onclick: function () { sekmeAc(s.anahtar); }
        }, [ikon(s.ikonAd), h('span', { metin: s.ad })]);
      })));
  }

  function markaLogo() {
    var sv = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    sv.setAttribute('viewBox', '0 0 32 32');
    sv.setAttribute('class', 'ust-logo');
    sv.setAttribute('aria-hidden', 'true');
    sv.innerHTML =
      '<circle cx="16" cy="16" r="14" fill="none" stroke="var(--brand)" stroke-width="2"/>'
      + '<circle cx="16" cy="16" r="9.5" fill="none" stroke="var(--hairline-strong)" stroke-width="1.2"/>'
      + '<path d="M16 6.5 19.4 16 16 25.5 12.6 16Z" fill="var(--brand)"/>'
      + '<circle cx="16" cy="16" r="2" fill="var(--surface)"/>';
    return sv;
  }

  function baslat() {
    durum.ayar = D.ayarOku();
    durum.gorunum = durum.ayar.gorunum;
    durum.ges.bolge = durum.ayar.bolge;

    var kayitli = D.girdiOku(null);
    durum.girdi = kayitli && typeof kayitli === 'object' ? kayitli : varsayilanGirdi();

    /* Eksik alanları varsayılanlarla tamamla (eski sürüm uyumluluğu) */
    var v = varsayilanGirdi();
    ['hane', 'elektrik', 'isinma', 'atik', 'su', 'beslenme'].forEach(function (k) {
      if (!durum.girdi[k] || typeof durum.girdi[k] !== 'object') durum.girdi[k] = v[k];
    });
    if (!Array.isArray(durum.girdi.ulasim)) durum.girdi.ulasim = v.ulasim;
    if (!Array.isArray(durum.girdi.ucus)) durum.girdi.ucus = v.ucus;
    durum.beslenmeAyrintili = !!(durum.girdi.beslenme && durum.girdi.beslenme.porsiyonlar);

    kabukCiz();
    temaUygula(durum.ayar.tema);
    panelHesapYenile();
    guncelle();

    /* Sistem teması değişirse düğme simgesini güncelle */
    try {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
        if (durum.ayar.tema === 'sistem') temaUygula('sistem');
      });
    } catch (e) { /* eski WebView — yoksay */ }

    /* Ekran döndüğünde veya pencere yeniden boyutlandığında yüzen çubuğun
       yüksekliği değişebilir (metin sarması); alt boşluk yeniden ölçülür. */
    var olcumZaman = null;
    window.addEventListener('resize', function () {
      if (olcumZaman) clearTimeout(olcumZaman);
      olcumZaman = setTimeout(yuzenPayiOlc, 120);
    });
    window.addEventListener('orientationchange', function () {
      setTimeout(yuzenPayiOlc, 220);
    });
    yuzenPayiOlc();

    /* Açılış sekmesi (adres çubuğundaki #) */
    var ad = (location.hash || '').replace('#', '');
    if (SEKMELER.some(function (s) { return s.anahtar === ad; })) sekmeAc(ad);

    /* Android geri tuşu: Hesapla dışındaysa oraya dön */
    window.KarbonPusula = {
      geriTusu: function () {
        if (aktifSekme !== 'hesapla') { sekmeAc('hesapla'); return true; }
        return false;
      },
      sekmeAc: sekmeAc,
      durum: durum
    };

    document.body.classList.add('hazir');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', baslat);
  } else {
    baslat();
  }
})();
