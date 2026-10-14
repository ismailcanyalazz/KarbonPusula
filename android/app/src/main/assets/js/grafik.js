/*!
 * KarbonPusula — Grafik modülü
 * ---------------------------------------------------------------------------
 * Tüm grafikler elle yazılmış SVG'dir: harici kütüphane yoktur, uygulama
 * internet bağlantısı olmadan çalışır.
 *
 * Tasarım kuralları (uygulanan):
 *   · İnce işaretler, saç teli kalınlığında ızgara ve eksen.
 *   · Dolgular arasında 2 px yüzey boşluğu — çerçeve çizgisi yok.
 *   · Veri uçlarında 4 px yuvarlatma, taban çizgisine sabit.
 *   · Seçici doğrudan etiket; her noktaya sayı yazılmaz.
 *   · İki ve daha fazla seride gösterge her zaman vardır (renk tek başına
 *     kimlik taşımaz) ve her grafiğin tablo görünümü ikizi bulunur.
 *   · Dokunma/fare ile ipucu balonu; dokunma hedefi işaretten büyük.
 */
(function (global) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';

  /* ----------------------------------------------------------------------- *
   * Yardımcılar
   * ----------------------------------------------------------------------- */

  function el(ad, ozellikler) {
    var d = document.createElementNS(NS, ad);
    if (ozellikler) {
      for (var k in ozellikler) {
        if (Object.prototype.hasOwnProperty.call(ozellikler, k)) {
          d.setAttribute(k, ozellikler[k]);
        }
      }
    }
    return d;
  }

  function temizle(kap) {
    while (kap.firstChild) kap.removeChild(kap.firstChild);
  }

  function seriRengi(yuva) {
    return 'var(--seri-' + yuva + ')';
  }

  /** Kutupsal → kartezyen (0° = saat 12, saat yönünde) */
  function nokta(cx, cy, r, derece) {
    var rad = ((derece - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  /** Halka dilimi yolu (iç ve dış yarıçap arası) */
  function halkaYolu(cx, cy, rIc, rDis, bas, bit) {
    var buyuk = bit - bas > 180 ? 1 : 0;
    var d1 = nokta(cx, cy, rDis, bas);
    var d2 = nokta(cx, cy, rDis, bit);
    var i2 = nokta(cx, cy, rIc, bit);
    var i1 = nokta(cx, cy, rIc, bas);
    return [
      'M', d1.x.toFixed(2), d1.y.toFixed(2),
      'A', rDis, rDis, 0, buyuk, 1, d2.x.toFixed(2), d2.y.toFixed(2),
      'L', i2.x.toFixed(2), i2.y.toFixed(2),
      'A', rIc, rIc, 0, buyuk, 0, i1.x.toFixed(2), i1.y.toFixed(2),
      'Z'
    ].join(' ');
  }

  /** Yalnızca sol ucu düz, sağ ucu yuvarlatılmış yatay çubuk yolu */
  function cubukYolu(x, y, g, y2, r) {
    var yr = Math.min(r, g, y2 / 2);
    if (g <= 0.5) return 'M' + x + ' ' + y + ' h0.5 v' + y2 + ' h-0.5 Z';
    return [
      'M', x, y + 0,
      'h', (g - yr).toFixed(2),
      'a', yr, yr, 0, 0, 1, yr, yr,
      'v', (y2 - 2 * yr).toFixed(2),
      'a', yr, yr, 0, 0, 1, -yr, yr,
      'H', x,
      'Z'
    ].join(' ');
  }

  /* ----------------------------------------------------------------------- *
   * İpucu balonu — tek örnek, tüm grafikler paylaşır
   * ----------------------------------------------------------------------- */

  var ipucuEl = null;
  var ipucuZaman = null;

  function ipucuKur() {
    if (ipucuEl) return ipucuEl;
    ipucuEl = document.createElement('div');
    ipucuEl.className = 'ipucu';
    ipucuEl.setAttribute('role', 'status');
    document.body.appendChild(ipucuEl);
    return ipucuEl;
  }

  function ipucuGoster(x, y, baslik, metin) {
    var e = ipucuKur();
    e.innerHTML = '';
    var b = document.createElement('b');
    b.textContent = baslik;
    var s = document.createElement('span');
    s.textContent = metin;
    e.appendChild(b);
    e.appendChild(s);
    e.style.left = Math.round(x) + 'px';
    e.style.top = Math.round(y) + 'px';
    e.classList.add('acik');
    if (ipucuZaman) clearTimeout(ipucuZaman);
    ipucuZaman = setTimeout(ipucuGizle, 2600);
  }

  function ipucuGizle() {
    if (ipucuEl) ipucuEl.classList.remove('acik');
  }

  /** Bir SVG öğesine dokunma/fare ipucu bağlar. */
  function ipucuBagla(hedef, baslik, metin) {
    function ac(olay) {
      var kutu = hedef.getBoundingClientRect();
      var x = olay && olay.clientX ? olay.clientX : kutu.left + kutu.width / 2;
      var y = kutu.top;
      ipucuGoster(x, y, baslik, metin);
      if (olay) olay.stopPropagation();
    }
    hedef.addEventListener('click', ac);
    hedef.addEventListener('mouseenter', ac);
    hedef.addEventListener('mouseleave', ipucuGizle);
    hedef.setAttribute('tabindex', '0');
    hedef.setAttribute('role', 'img');
    hedef.setAttribute('aria-label', baslik + ': ' + metin);
    hedef.addEventListener('focus', function () { ac(null); });
    hedef.addEventListener('blur', ipucuGizle);
  }

  document.addEventListener('click', function (o) {
    if (!o.target || !o.target.closest || !o.target.closest('svg')) ipucuGizle();
  });
  window.addEventListener('scroll', ipucuGizle, { passive: true });

  /* ----------------------------------------------------------------------- *
   * Halka grafik — kategori payları
   * ----------------------------------------------------------------------- */

  /**
   * @param {Element} kap
   * @param {Array} seriler  [{ etiket, deger, yuva }]
   * @param {Object} secenek { bicimle: fn(deger) -> string, merkezUst, merkezAlt }
   */
  function halka(kap, seriler, secenek) {
    secenek = secenek || {};
    temizle(kap);

    var veri = seriler.filter(function (s) { return s.deger > 0; });
    var toplam = veri.reduce(function (t, s) { return t + s.deger; }, 0);

    var B = 200;                      // viewBox kenarı
    var cx = B / 2, cy = B / 2;
    var rDis = 92, rIc = 60;

    var svg = el('svg', {
      viewBox: '0 0 ' + B + ' ' + B,
      role: 'img',
      'aria-label': secenek.erisimEtiket || 'Kategori paylarını gösteren halka grafik'
    });

    if (toplam <= 0) {
      svg.appendChild(el('circle', {
        cx: cx, cy: cy, r: (rDis + rIc) / 2,
        fill: 'none', stroke: 'var(--surface-3)', 'stroke-width': rDis - rIc
      }));
      kap.appendChild(svg);
      return;
    }

    // 2 px yüzey boşluğu → dış yarıçapta dereceye çevir
    var bosluk = veri.length > 1 ? (2 / (2 * Math.PI * rDis)) * 360 : 0;
    var aci = 0;

    veri.forEach(function (s) {
      var tam = (s.deger / toplam) * 360;
      var bas = aci + bosluk / 2;
      var bit = aci + tam - bosluk / 2;
      aci += tam;
      if (bit <= bas) bit = bas + 0.35;      // çok küçük dilim de görünür kalsın

      var yol = el('path', {
        d: halkaYolu(cx, cy, rIc, rDis, bas, bit),
        fill: seriRengi(s.yuva)
      });
      var bicim = secenek.bicimle ? secenek.bicimle(s.deger) : String(s.deger);
      ipucuBagla(yol, s.etiket, bicim + '  ·  %' + ((s.deger / toplam) * 100).toFixed(1));
      svg.appendChild(yol);
    });

    // Merkez yazısı — metin belirteçleriyle, seri rengiyle değil
    if (secenek.merkezUst) {
      var t1 = el('text', {
        x: cx, y: cy - 5,
        'text-anchor': 'middle',
        fill: 'var(--ink)',
        'font-size': '26',
        'font-weight': '700',
        'letter-spacing': '-0.8'
      });
      t1.textContent = secenek.merkezUst;
      svg.appendChild(t1);
    }
    if (secenek.merkezAlt) {
      var t2 = el('text', {
        x: cx, y: cy + 15,
        'text-anchor': 'middle',
        fill: 'var(--ink-3)',
        'font-size': '11.5',
        'font-weight': '600'
      });
      t2.textContent = secenek.merkezAlt;
      svg.appendChild(t2);
    }

    kap.appendChild(svg);
  }

  /* ----------------------------------------------------------------------- *
   * Yatay çubuk grafik
   * ----------------------------------------------------------------------- */

  /**
   * @param {Element} kap
   * @param {Array} seriler  [{ etiket, deger, yuva }]  (çağıran sıralar)
   * @param {Object} secenek { bicimle, birim, tekRenk }
   */
  function yatayCubuk(kap, seriler, secenek) {
    secenek = secenek || {};
    temizle(kap);

    var veri = seriler.slice();
    var enBuyuk = veri.reduce(function (m, s) { return Math.max(m, s.deger); }, 0);

    var satirY = 30;              // satır yüksekliği
    var cubukY = 15;              // çubuk kalınlığı (ince işaret)
    var etiketG = 104;            // sol etiket alanı
    var sagPay = 72;              // sağdaki doğrudan etiket alanı
    var G = 520;                  // viewBox genişliği
    var ustPay = 4;
    var Y = veri.length * satirY + ustPay + 14;
    var alanG = G - etiketG - sagPay;

    var svg = el('svg', {
      viewBox: '0 0 ' + G + ' ' + Y,
      role: 'img',
      'aria-label': secenek.erisimEtiket || 'Kategori başına emisyonu gösteren yatay çubuk grafik'
    });

    if (enBuyuk <= 0) {
      var bos = el('text', {
        x: G / 2, y: Y / 2, 'text-anchor': 'middle',
        fill: 'var(--ink-3)', 'font-size': '13'
      });
      bos.textContent = 'Veri girilmedi';
      svg.appendChild(bos);
      kap.appendChild(svg);
      return;
    }

    // Izgara: düz saç teli çizgiler (kesikli değil)
    var adimSayi = 4;
    for (var i = 0; i <= adimSayi; i++) {
      var gx = etiketG + (alanG * i) / adimSayi;
      svg.appendChild(el('line', {
        x1: gx.toFixed(1), y1: ustPay,
        x2: gx.toFixed(1), y2: Y - 14,
        stroke: i === 0 ? 'var(--taban)' : 'var(--izgara)',
        'stroke-width': 1
      }));
      var tik = el('text', {
        x: gx.toFixed(1), y: Y - 3,
        'text-anchor': i === 0 ? 'start' : (i === adimSayi ? 'end' : 'middle'),
        fill: 'var(--ink-3)', 'font-size': '9.5',
        'font-variant-numeric': 'tabular-nums'
      });
      tik.textContent = Math.round((enBuyuk * i) / adimSayi).toLocaleString('tr-TR');
      svg.appendChild(tik);
    }

    veri.forEach(function (s, idx) {
      var y = ustPay + idx * satirY + (satirY - cubukY) / 2;
      var g = Math.max(0, (s.deger / enBuyuk) * alanG);

      // sol etiket
      var ad = el('text', {
        x: etiketG - 9, y: y + cubukY / 2 + 3.6,
        'text-anchor': 'end',
        fill: 'var(--ink-2)', 'font-size': '11.5', 'font-weight': '600'
      });
      ad.textContent = s.etiket.length > 15 ? s.etiket.slice(0, 14) + '…' : s.etiket;
      svg.appendChild(ad);

      // çubuk
      var yol = el('path', {
        d: cubukYolu(etiketG, y, g, cubukY, 4),
        fill: secenek.tekRenk ? 'var(--seri-1)' : seriRengi(s.yuva)
      });
      var bicim = secenek.bicimle ? secenek.bicimle(s.deger) : String(s.deger);
      ipucuBagla(yol, s.etiket, bicim);
      svg.appendChild(yol);

      // dokunma hedefi — işaretten büyük, şeffaf
      var hedef = el('rect', {
        x: etiketG, y: ustPay + idx * satirY,
        width: alanG, height: satirY,
        fill: 'transparent', style: 'cursor:pointer'
      });
      ipucuBagla(hedef, s.etiket, bicim);
      svg.appendChild(hedef);

      // doğrudan değer etiketi — çubuğun dışında, kırpılmaz
      var deg = el('text', {
        x: (etiketG + g + 8).toFixed(1), y: y + cubukY / 2 + 3.6,
        fill: 'var(--ink)', 'font-size': '11', 'font-weight': '650',
        'font-variant-numeric': 'tabular-nums'
      });
      deg.textContent = bicim;
      svg.appendChild(deg);
    });

    kap.appendChild(svg);
  }

  /* ----------------------------------------------------------------------- *
   * Ölçer (yay) — tek değer; "karşılama oranı" gibi
   * ----------------------------------------------------------------------- */

  /**
   * @param {Element} kap
   * @param {Number} oran  0..1+ (1'in üzerinde değerler kırpılarak gösterilir)
   * @param {Object} secenek { ustYazi, altYazi, erisimEtiket }
   *
   * Yazı HTML katmanı yerine SVG içine konur: böylece yay ile hiçbir koşulda
   * üst üste binmez ve ölçekleme sırasında hizası bozulmaz.
   */
  function olcer(kap, oran, secenek) {
    secenek = secenek || {};
    temizle(kap);

    var G = 220, Y = 124;
    var cx = G / 2, cy = 108;
    var r = 86, kal = 15;

    var svg = el('svg', {
      viewBox: '0 0 ' + G + ' ' + Y,
      role: 'img',
      'aria-label': (secenek.erisimEtiket || 'Karşılama oranı') + ': %' + Math.round(oran * 100)
    });

    function yay(bas, bit, renk, kalinlik) {
      var b = nokta(cx, cy, r, bas);
      var s = nokta(cx, cy, r, bit);
      var buyuk = bit - bas > 180 ? 1 : 0;
      return el('path', {
        d: ['M', b.x.toFixed(2), b.y.toFixed(2), 'A', r, r, 0, buyuk, 1, s.x.toFixed(2), s.y.toFixed(2)].join(' '),
        fill: 'none',
        stroke: renk,
        'stroke-width': kalinlik || kal,
        'stroke-linecap': 'round'
      });
    }

    // Yarım daire: -90° → +90° (üstte açık)
    svg.appendChild(yay(-90, 90, 'var(--surface-3)'));

    var kirpik = Math.max(0, Math.min(1, oran));
    if (kirpik > 0.001) {
      var renk = kirpik >= 1 ? 'var(--durum-iyi)'
        : kirpik >= 0.6 ? 'var(--brand)'
        : kirpik >= 0.3 ? 'var(--durum-uyari)'
        : 'var(--durum-ciddi)';
      svg.appendChild(yay(-90, -90 + 180 * kirpik, renk));
    }

    // %100 işareti (oran 1'i aşıyorsa görünür kalır)
    if (oran > 1.02) {
      var ucN = nokta(cx, cy, r + kal / 2 + 4, 90);
      var ucI = nokta(cx, cy, r - kal / 2 - 4, 90);
      svg.appendChild(el('line', {
        x1: ucI.x.toFixed(2), y1: ucI.y.toFixed(2),
        x2: ucN.x.toFixed(2), y2: ucN.y.toFixed(2),
        stroke: 'var(--ink-3)', 'stroke-width': 1.5
      }));
    }

    // Merkez yazısı — yayın iç boşluğunda, metin belirteçleriyle
    if (secenek.ustYazi) {
      var u = el('text', {
        x: cx, y: cy - 26, 'text-anchor': 'middle',
        fill: 'var(--ink)', 'font-size': '30', 'font-weight': '700',
        'letter-spacing': '-1'
      });
      u.textContent = secenek.ustYazi;
      svg.appendChild(u);
    }
    if (secenek.altYazi) {
      var a = el('text', {
        x: cx, y: cy - 7, 'text-anchor': 'middle',
        fill: 'var(--ink-3)', 'font-size': '11', 'font-weight': '600'
      });
      a.textContent = secenek.altYazi;
      svg.appendChild(a);
    }

    kap.appendChild(svg);
  }

  /* ----------------------------------------------------------------------- *
   * İki değerin karşılaştırması (tüketim ↔ üretim)
   * ----------------------------------------------------------------------- */

  function ikiliCubuk(kap, seriler, secenek) {
    secenek = secenek || {};
    temizle(kap);

    var enBuyuk = seriler.reduce(function (m, s) { return Math.max(m, s.deger); }, 0);
    var G = 520, satirY = 46, ustPay = 6;
    var Y = seriler.length * satirY + ustPay + 6;
    var etiketG = 0, cubukY = 18;

    var svg = el('svg', {
      viewBox: '0 0 ' + G + ' ' + Y,
      role: 'img',
      'aria-label': secenek.erisimEtiket || 'Karşılaştırma grafiği'
    });

    if (enBuyuk <= 0) { kap.appendChild(svg); return; }

    seriler.forEach(function (s, i) {
      var y = ustPay + i * satirY;
      var g = (s.deger / enBuyuk) * G;

      var ad = el('text', {
        x: 0, y: y + 11,
        fill: 'var(--ink-2)', 'font-size': '11.5', 'font-weight': '600'
      });
      ad.textContent = s.etiket;
      svg.appendChild(ad);

      var bicim = secenek.bicimle ? secenek.bicimle(s.deger) : String(s.deger);
      var deg = el('text', {
        x: G, y: y + 11, 'text-anchor': 'end',
        fill: 'var(--ink)', 'font-size': '12', 'font-weight': '680',
        'font-variant-numeric': 'tabular-nums'
      });
      deg.textContent = bicim;
      svg.appendChild(deg);

      svg.appendChild(el('path', {
        d: cubukYolu(etiketG, y + 18, G, cubukY, 4),
        fill: 'var(--surface-3)'
      }));
      var yol = el('path', {
        d: cubukYolu(etiketG, y + 18, Math.max(1, g), cubukY, 4),
        fill: s.renk || seriRengi(s.yuva || 1)
      });
      ipucuBagla(yol, s.etiket, bicim);
      svg.appendChild(yol);
    });

    kap.appendChild(svg);
  }

  /* ----------------------------------------------------------------------- *
   * Dışa aktarım
   * ----------------------------------------------------------------------- */

  global.KPGrafik = {
    halka: halka,
    yatayCubuk: yatayCubuk,
    olcer: olcer,
    ikiliCubuk: ikiliCubuk,
    ipucuGizle: ipucuGizle,
    seriRengi: seriRengi
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
