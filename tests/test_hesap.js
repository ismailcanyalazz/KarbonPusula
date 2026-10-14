/*!
 * KarbonPusula — Hesap motoru testleri
 * Çalıştırmak için:  node tests/test_hesap.js
 *
 * Hiçbir harici paket gerektirmez; Node.js'in kendi assert modülünü kullanır.
 */
'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const KOK = path.resolve(__dirname, '..');
const veri = JSON.parse(fs.readFileSync(path.join(KOK, 'veriler/emisyon_faktorleri.json'), 'utf8'));
const KP = require(path.join(KOK, 'android/app/src/main/assets/js/hesap.js'));

let gecen = 0;
let kalan = [];

function test(ad, fn) {
  try {
    fn();
    gecen++;
    console.log('  ✓ ' + ad);
  } catch (e) {
    kalan.push({ ad: ad, hata: e });
    console.log('  ✗ ' + ad + '\n      ' + e.message.split('\n').join('\n      '));
  }
}

function yakin(a, b, tolerans, mesaj) {
  const t = tolerans === undefined ? 1e-6 : tolerans;
  assert.ok(Math.abs(a - b) <= t,
    (mesaj || 'değer uyuşmuyor') + ': ' + a + ' ≈ ' + b + ' değil (tolerans ' + t + ')');
}

/** Tüm alanları sıfır olan temel bir girdi. */
function bosGirdi(kisi) {
  return {
    hane: { kisi: kisi === undefined ? 1 : kisi },
    elektrik: { kwh_ay: 0 },
    isinma: { tur: 'yok', miktar_yil: 0 },
    ulasim: [],
    ucus: [],
    beslenme: { porsiyonlar: {} },
    atik: { kg_hafta: 0 },
    su: { m3_ay: 0 }
  };
}

console.log('\nKarbonPusula hesap motoru testleri\n' + '='.repeat(42));

/* ------------------------------------------------------------------ */
console.log('\nDoğrulama');

test('boş girdi geçerlidir ve sıfır üretir', function () {
  assert.deepStrictEqual(KP.dogrula(bosGirdi()), []);
  const s = KP.hesapla(veri, bosGirdi());
  yakin(s.toplam_kg_yil, 0);
  assert.strictEqual(s.kategoriler.length, 6);
});

test('negatif değer reddedilir', function () {
  const g = bosGirdi();
  g.elektrik.kwh_ay = -5;
  const h = KP.dogrula(g);
  assert.ok(h.length > 0, 'hata beklendi');
  assert.ok(/negatif/i.test(h[0]), 'hata metni negatif demiyor: ' + h[0]);
  assert.throws(function () { KP.hesapla(veri, g); }, /negatif/i);
});

test('kişi sayısı 1\'den küçük olamaz', function () {
  const g = bosGirdi(0);
  assert.ok(KP.dogrula(g).some(function (x) { return /kişi sayısı/i.test(x); }));
});

test('sayı olmayan girdi reddedilir', function () {
  const g = bosGirdi();
  g.su.m3_ay = 'onbeş';
  assert.ok(KP.dogrula(g).some(function (x) { return /geçerli bir sayı/i.test(x); }));
});

test('sonsuz değer reddedilir', function () {
  const g = bosGirdi();
  g.elektrik.kwh_ay = Infinity;
  assert.ok(KP.dogrula(g).some(function (x) { return /sonlu/i.test(x); }));
});

test('boolean sayı olarak kabul edilmez', function () {
  const g = bosGirdi();
  g.atik.kg_hafta = true;
  assert.ok(KP.dogrula(g).some(function (x) { return /geçerli bir sayı/i.test(x); }));
});

test('atık oranları toplamı %100\'ü aşamaz', function () {
  const g = bosGirdi();
  g.atik = { kg_hafta: 10, geri_donusum_orani: 0.6, kompost_orani: 0.6 };
  assert.ok(KP.dogrula(g).some(function (x) { return /%100/.test(x); }));
});

/* ------------------------------------------------------------------ */
console.log('\nElektrik');

test('şebeke elektriği: 100 kWh/ay → 1200 × 0,47573', function () {
  const g = bosGirdi();
  g.elektrik.kwh_ay = 100;
  const s = KP.hesapla(veri, g);
  yakin(s.kategoriler[0].kg_yil, 1200 * 0.47573, 1e-6);
});

test('tamamen YEK-G yeşil tarife → sıfır', function () {
  const g = bosGirdi();
  g.elektrik = { kwh_ay: 300, yesil_orani: 1 };
  const s = KP.hesapla(veri, g);
  yakin(s.kategoriler[0].kg_yil, 0);
});

test('yarısı çatı GES → şebeke yarısı + GES yaşam döngüsü yarısı', function () {
  const g = bosGirdi();
  g.elektrik = { kwh_ay: 100, ges_orani: 0.5 };
  const s = KP.hesapla(veri, g);
  const beklenen = 600 * 0.47573 + 600 * 0.041;
  yakin(s.kategoriler[0].kg_yil, beklenen, 1e-6);
});

test('GES + yeşil oranları toplamı 1\'i aşarsa kırpılır', function () {
  const g = bosGirdi();
  g.elektrik = { kwh_ay: 100, ges_orani: 0.8, yesil_orani: 0.8 };
  const s = KP.hesapla(veri, g);
  // ges 0,8 + yeşil 0,2 (kırpıldı) + şebeke 0
  yakin(s.kategoriler[0].kg_yil, 1200 * 0.8 * 0.041, 1e-6);
});

/* ------------------------------------------------------------------ */
console.log('\nIsınma');

test('doğal gaz: 1200 m³/yıl', function () {
  const g = bosGirdi();
  g.isinma = { tur: 'dogalgaz', miktar_yil: 1200 };
  const s = KP.hesapla(veri, g);
  yakin(s.kategoriler[1].kg_yil, 1200 * 2.02633, 1e-6);
});

test('kömür ve odun farklı faktör kullanır', function () {
  const komur = bosGirdi(); komur.isinma = { tur: 'komur', miktar_yil: 1000 };
  const odun = bosGirdi(); odun.isinma = { tur: 'odun', miktar_yil: 1000 };
  const a = KP.hesapla(veri, komur).kategoriler[1].kg_yil;
  const b = KP.hesapla(veri, odun).kategoriler[1].kg_yil;
  yakin(a, 1000 * 2.90495, 1e-6);
  yakin(b, 1000 * 0.0477, 1e-6);
  assert.ok(a > b * 50, 'kömür odundan çok daha yoğun olmalı');
});

test('tanımsız ısınma türü hata verir', function () {
  const g = bosGirdi();
  g.isinma = { tur: 'nukleer', miktar_yil: 10 };
  assert.throws(function () { KP.hesapla(veri, g); }, /Tanımsız ısınma türü/);
});

/* ------------------------------------------------------------------ */
console.log('\nUlaşım');

test('benzinli otomobil 200 km/hafta, tek kişi', function () {
  const g = bosGirdi();
  g.ulasim = [{ tur: 'otomobil_benzin_km', miktar_hafta: 200, yolcu: 1 }];
  const s = KP.hesapla(veri, g);
  yakin(s.kategoriler[2].kg_yil, 200 * KP.HAFTA_YIL * 0.16152, 1e-6);
});

test('araç paylaşımı kişi başı emisyonu böler', function () {
  const tek = bosGirdi(); tek.ulasim = [{ tur: 'otomobil_benzin_km', miktar_hafta: 200, yolcu: 1 }];
  const dort = bosGirdi(); dort.ulasim = [{ tur: 'otomobil_benzin_km', miktar_hafta: 200, yolcu: 4 }];
  const a = KP.hesapla(veri, tek).kategoriler[2].kg_yil;
  const b = KP.hesapla(veri, dort).kategoriler[2].kg_yil;
  yakin(b, a / 4, 1e-6);
});

test('toplu taşıma yolcu-km bazlıdır, yolcu sayısına bölünmez', function () {
  const bir = bosGirdi(); bir.ulasim = [{ tur: 'metro_km', miktar_hafta: 100, yolcu: 1 }];
  const bes = bosGirdi(); bes.ulasim = [{ tur: 'metro_km', miktar_hafta: 100, yolcu: 5 }];
  yakin(KP.hesapla(veri, bir).kategoriler[2].kg_yil,
        KP.hesapla(veri, bes).kategoriler[2].kg_yil, 1e-9);
});

test('yakıt litre modu benzin faktörünü kullanır', function () {
  const g = bosGirdi();
  g.ulasim = [{ tur: 'benzin_litre', miktar_hafta: 20 }];
  const s = KP.hesapla(veri, g);
  yakin(s.kategoriler[2].kg_yil, 20 * KP.HAFTA_YIL * 2.075, 1e-6);
});

test('ulaşım türleri beklenen sırada: metro < tren < otobüs < otomobil', function () {
  function kg(tur) {
    const g = bosGirdi();
    g.ulasim = [{ tur: tur, miktar_hafta: 100, yolcu: 1 }];
    return KP.hesapla(veri, g).kategoriler[2].kg_yil;
  }
  const m = kg('metro_km'), t = kg('tren_km'),
        o = kg('otobus_sehirici_km'), a = kg('otomobil_benzin_km');
  assert.ok(m < t && t < o && o < a, 'sıralama bozuk: ' + [m, t, o, a].join(' < '));
});

test('elektrikli otomobil benzinliden az, Türkiye şebekesiyle türetilmiş', function () {
  function kg(tur) {
    const g = bosGirdi();
    g.ulasim = [{ tur: tur, miktar_hafta: 100, yolcu: 1 }];
    return KP.hesapla(veri, g).kategoriler[2].kg_yil;
  }
  assert.ok(kg('otomobil_elektrik_km') < kg('otomobil_benzin_km'));
  // 0,47573 × 0,18 = 0,085631...
  yakin(veri.faktorler.otomobil_elektrik_km.deger, 0.47573 * 0.18, 1e-5);
});

/* ------------------------------------------------------------------ */
console.log('\nUçuş');

test('iç hat 2000 yolcu-km/yıl', function () {
  const g = bosGirdi();
  g.ucus = [{ tur: 'ucus_ichat_km', km_yil: 2000 }];
  const s = KP.hesapla(veri, g);
  yakin(s.kategoriler[3].kg_yil, 2000 * 0.22928, 1e-6);
});

test('business uzun menzilli ekonomiden yaklaşık 2,9 kat', function () {
  const oran = veri.faktorler.ucus_uzun_business_km.deger / veri.faktorler.ucus_uzun_km.deger;
  assert.ok(oran > 2.5 && oran < 3.2, 'oran beklenenden farklı: ' + oran);
});

test('iç hat uçuş trenden belirgin biçimde yoğun', function () {
  assert.ok(veri.faktorler.ucus_ichat_km.deger > veri.faktorler.tren_km.deger * 6);
});

/* ------------------------------------------------------------------ */
console.log('\nBeslenme');

test('hazır profiller artan sırada: vegan < vejetaryen < az etli < dengeli < et ağırlıklı', function () {
  function kg(profil) {
    const g = bosGirdi();
    g.beslenme = { profil: profil };
    return KP.hesapla(veri, g).kategoriler[4].kg_yil;
  }
  const v = kg('vegan'), ve = kg('vejetaryen'), a = kg('az_et'),
        d = kg('dengeli'), y = kg('yuksek_et');
  assert.ok(v < ve, 'vegan < vejetaryen değil: ' + v + ' / ' + ve);
  assert.ok(ve < a, 'vejetaryen < az etli değil: ' + ve + ' / ' + a);
  assert.ok(a < d, 'az etli < dengeli değil: ' + a + ' / ' + d);
  assert.ok(d < y, 'dengeli < et ağırlıklı değil: ' + d + ' / ' + y);
});

test('tek kalem porsiyon hesabı elle doğrulanır', function () {
  const g = bosGirdi();
  g.beslenme = { porsiyonlar: { kirmizi_et: 2 } };
  const s = KP.hesapla(veri, g);
  // 2 porsiyon/hafta × 52,1429 hafta × 100 g = 10,4286 kg/yıl × 60 kg CO₂e/kg
  const kgGida = (2 * KP.HAFTA_YIL * 100) / 1000;
  yakin(s.kategoriler[4].kg_yil, kgGida * 60, 1e-6);
});

test('beslenme satırları büyükten küçüğe sıralanır', function () {
  const g = bosGirdi();
  g.beslenme = { profil: 'dengeli' };
  const satirlar = KP.hesapla(veri, g).kategoriler[4].satirlar;
  for (let i = 1; i < satirlar.length; i++) {
    assert.ok(satirlar[i - 1].kg >= satirlar[i].kg, 'sıralama bozuk ' + i);
  }
});

test('tanımsız profil hata verir', function () {
  const g = bosGirdi();
  g.beslenme = { profil: 'etobur' };
  assert.throws(function () { KP.hesapla(veri, g); }, /Tanımsız beslenme profili/);
});

/* ------------------------------------------------------------------ */
console.log('\nAtık ve su');

test('oran verilmezse tamamı düzenli depolama sayılır', function () {
  const g = bosGirdi();
  g.atik = { kg_hafta: 10 };
  const s = KP.hesapla(veri, g);
  yakin(s.kategoriler[5].kg_yil, 10 * KP.HAFTA_YIL * 0.49729, 1e-6);
});

test('geri dönüşüm oranı arttıkça atık emisyonu düşer', function () {
  function kg(oran) {
    const g = bosGirdi();
    g.atik = { kg_hafta: 10, geri_donusum_orani: oran };
    return KP.hesapla(veri, g).kategoriler[5].kg_yil;
  }
  assert.ok(kg(0) > kg(0.5) && kg(0.5) > kg(1));
});

test('kompost, depolamaya göre yaklaşık 55 kat az', function () {
  const oran = veri.faktorler.atik_depolama_kg.deger / veri.faktorler.atik_kompost_kg.deger;
  assert.ok(oran > 50 && oran < 60, 'oran: ' + oran);
});

test('su: temin + atıksu arıtma birlikte sayılır', function () {
  const g = bosGirdi();
  g.su = { m3_ay: 10 };
  const s = KP.hesapla(veri, g);
  yakin(s.kategoriler[5].kg_yil, 120 * (0.1913 + 0.17088), 1e-6);
});

/* ------------------------------------------------------------------ */
console.log('\nHane paylaşımı');

test('hane bazlı kategoriler kişi sayısına bölünür', function () {
  const bir = bosGirdi(1); bir.elektrik.kwh_ay = 400;
  const dort = bosGirdi(4); dort.elektrik.kwh_ay = 400;
  const a = KP.hesapla(veri, bir).kategoriler[0].kg_yil;
  const b = KP.hesapla(veri, dort).kategoriler[0].kg_yil;
  yakin(b, a / 4, 1e-6);
});

test('kişisel kategoriler kişi sayısına bölünmez', function () {
  const bir = bosGirdi(1); bir.beslenme = { profil: 'dengeli' };
  const dort = bosGirdi(4); dort.beslenme = { profil: 'dengeli' };
  yakin(KP.hesapla(veri, bir).kategoriler[4].kg_yil,
        KP.hesapla(veri, dort).kategoriler[4].kg_yil, 1e-9);
});

test('hane bazlı satırlarda hem hane hem kişi başı değer bulunur', function () {
  const g = bosGirdi(2);
  g.elektrik.kwh_ay = 300;
  const k = KP.hesapla(veri, g).kategoriler[0];
  yakin(k.kg_yil_hane, k.kg_yil * 2, 1e-6);
  yakin(k.satirlar[0].kg_yil_hane, k.satirlar[0].kg * 2, 1e-6);
});

/* ------------------------------------------------------------------ */
console.log('\nToplam ve kıyaslama');

test('toplam, kategori toplamlarına eşittir', function () {
  const g = gercekciGirdi();
  const s = KP.hesapla(veri, g);
  const toplam = s.kategoriler.reduce(function (t, k) { return t + k.kg_yil; }, 0);
  yakin(s.toplam_kg_yil, toplam, 1e-9);
});

test('paylar toplamı 1\'dir', function () {
  const s = KP.hesapla(veri, gercekciGirdi());
  const pay = s.kategoriler.reduce(function (t, k) { return t + k.pay; }, 0);
  yakin(pay, 1, 1e-9);
});

test('ton ve aylık dönüşümleri tutarlı', function () {
  const s = KP.hesapla(veri, gercekciGirdi());
  yakin(s.toplam_ton_yil, s.toplam_kg_yil / 1000, 1e-9);
  yakin(s.toplam_kg_ay * 12, s.toplam_kg_yil, 1e-9);
});

test('kıyaslama oranları doğru hesaplanır', function () {
  const s = KP.hesapla(veri, gercekciGirdi());
  yakin(s.kiyaslama.turkiye.oran, s.toplam_ton_yil / 6.8, 1e-9);
  yakin(s.kiyaslama.hedef.oran, s.toplam_ton_yil / 2.3, 1e-9);
});

test('gerçekçi bir hane profili makul aralıkta sonuç verir', function () {
  const s = KP.hesapla(veri, gercekciGirdi());
  assert.ok(s.toplam_ton_yil > 1 && s.toplam_ton_yil < 25,
    'beklenmeyen toplam: ' + s.toplam_ton_yil + ' ton');
});

/* ------------------------------------------------------------------ */
console.log('\nÖneriler');

test('öneriler azaltım potansiyeline göre sıralanır', function () {
  const s = KP.hesapla(veri, gercekciGirdi());
  const o = KP.onerileriGetir(veri, s, 6);
  assert.ok(o.length > 0, 'öneri üretilmedi');
  for (let i = 1; i < o.length; i++) {
    assert.ok(o[i - 1].tahmini_azaltim_kg >= o[i].tahmini_azaltim_kg, 'sıralama bozuk');
  }
});

test('sıfır girdide öneri üretilmez', function () {
  const s = KP.hesapla(veri, bosGirdi());
  assert.strictEqual(KP.onerileriGetir(veri, s).length, 0);
});

test('öneri sayısı istenen limiti aşmaz', function () {
  const s = KP.hesapla(veri, gercekciGirdi());
  assert.ok(KP.onerileriGetir(veri, s, 3).length <= 3);
});

/* ------------------------------------------------------------------ */
console.log('\nGüneş enerjisi (GES) modülü');

test('özgül üretim formülü: GHI × K_eğim × PR', function () {
  const r = KP.ozgulUretim(veri, 'akdeniz');
  yakin(r.kwh_kwp_yil, 1390 * 1.15 * 0.8, 1e-6);
});

test('bölgeler ışınıma göre doğru sırada', function () {
  const sira = ['gda', 'akdeniz', 'dogu', 'icanadolu', 'ege', 'marmara', 'karadeniz'];
  const degerler = sira.map(function (b) { return KP.ozgulUretim(veri, b).kwh_kwp_yil; });
  for (let i = 1; i < degerler.length; i++) {
    assert.ok(degerler[i - 1] >= degerler[i], 'bölge sırası bozuk: ' + sira[i]);
  }
});

test('JSON\'daki ozgul_uretim alanı formülle tutarlı', function () {
  veri.gunes.bolgeler.forEach(function (b) {
    yakin(b.ozgul_uretim, Math.round(b.ghi * 1.15 * 0.8), 1.0,
      b.etiket + ' özgül üretim');
  });
});

test('tanımsız bölge hata verir', function () {
  assert.throws(function () { KP.ozgulUretim(veri, 'kibris'); }, /Tanımsız bölge/);
});

test('5 kWp Akdeniz kurulumu: üretim ve telafi', function () {
  const r = KP.gesHesapla(veri, { bolge: 'akdeniz', kwp: 5 });
  const ozgul = 1390 * 1.15 * 0.8;
  yakin(r.uretim_kwh_yil, 5 * ozgul, 1e-6);
  yakin(r.net_telafi_kg_kwh, 0.47573 - 0.041, 1e-9);
  yakin(r.telafi_kg_yil, 5 * ozgul * (0.47573 - 0.041), 1e-6);
});

test('panel adedi ve çatı alanı hesaplanır', function () {
  const r = KP.gesHesapla(veri, { bolge: 'icanadolu', kwp: 5.5 });
  assert.strictEqual(r.panel_adet, Math.ceil(5500 / 550));   // 10
  yakin(r.gereken_alan_m2, 5.5 * 6.0, 1e-9);
});

test('özgül üretim elle girilebilir ve bölgeyi geçersiz kılar', function () {
  const r = KP.gesHesapla(veri, { bolge: 'karadeniz', kwp: 1, ozgul_uretim_override: 1600 });
  yakin(r.uretim_kwh_yil, 1600, 1e-9);
  assert.strictEqual(r.ozgul_uretim_elle_girildi, true);
});

test('karşılama oranı ve gereken kWp', function () {
  const ozgul = 1314 * 1.15 * 0.8;
  const r = KP.gesHesapla(veri, { bolge: 'icanadolu', kwp: 3, elektrik_kwh_yil: 3600 });
  yakin(r.karsilama_orani, (3 * ozgul) / 3600, 1e-9);
  yakin(r.gereken_kwp, 3600 / ozgul, 1e-9);
});

test('geri ödeme süresi yatırım/tasarruf oranına eşit', function () {
  const r = KP.gesHesapla(veri, {
    bolge: 'ege', kwp: 5, maliyet_tl_kwp: 20000, elektrik_fiyat_tl_kwh: 3.0
  });
  yakin(r.yatirim_tl, 100000, 1e-9);
  yakin(r.yillik_tasarruf_tl, r.uretim_kwh_yil * 3.0, 1e-6);
  yakin(r.geri_odeme_yil, 100000 / (r.uretim_kwh_yil * 3.0), 1e-9);
});

test('elektrik fiyatı girilmezse geri ödeme hesaplanmaz', function () {
  const r = KP.gesHesapla(veri, { bolge: 'ege', kwp: 5 });
  assert.strictEqual(r.yillik_tasarruf_tl, null);
  assert.strictEqual(r.geri_odeme_yil, null);
});

test('25 yıllık ömür boyu telafi hesaplanır', function () {
  const r = KP.gesHesapla(veri, { bolge: 'gda', kwp: 10 });
  yakin(r.omur_boyu_telafi_ton, (r.telafi_kg_yil * 25) / 1000, 1e-9);
});

test('hedef kWp: elektriği sıfırlayan değer tüketimle tutarlı', function () {
  const g = bosGirdi();
  g.elektrik.kwh_ay = 300;             // 3600 kWh/yıl
  const s = KP.hesapla(veri, g);
  const h = KP.gesHedefKwp(veri, s, 'icanadolu');
  // elektrik kg = 3600 × 0,47573 ; net = 0,47573 − 0,041
  const net = 0.47573 - 0.041;
  const ozgul = 1314 * 1.15 * 0.8;
  yakin(h.elektrigi_sifirlayan_kwp, (3600 * 0.47573 / net) / ozgul, 1e-6);
  assert.ok(h.elektrigi_sifirlayan_kwp > 0);
});

test('GES çıktısı her zaman sayısal ve negatif olmayan', function () {
  const r = KP.gesHesapla(veri, { bolge: 'marmara', kwp: 0 });
  yakin(r.uretim_kwh_yil, 0);
  yakin(r.telafi_kg_yil, 0);
  assert.strictEqual(r.karsilama_orani, null);
});

/* ------------------------------------------------------------------ */
console.log('\nVeri bütünlüğü');

test('tüm faktörlerin kaynağı tanımlı', function () {
  const kaynaklar = Object.keys(veri.kaynaklar);
  Object.keys(veri.faktorler).forEach(function (k) {
    assert.ok(kaynaklar.indexOf(veri.faktorler[k].kaynak) >= 0,
      k + ' için tanımsız kaynak: ' + veri.faktorler[k].kaynak);
  });
  assert.ok(kaynaklar.indexOf(veri.beslenme.kaynak) >= 0);
});

test('türetilmiş faktörlerde türetme açıklaması var', function () {
  Object.keys(veri.faktorler).forEach(function (k) {
    const f = veri.faktorler[k];
    if (f.tur === 'turetilmis') {
      assert.ok(f.turetme && f.turetme.length > 20, k + ' türetme açıklaması eksik');
    }
  });
});

test('tüm faktörler sonlu ve negatif olmayan', function () {
  Object.keys(veri.faktorler).forEach(function (k) {
    const d = veri.faktorler[k].deger;
    assert.ok(typeof d === 'number' && isFinite(d) && d >= 0, k + ' geçersiz: ' + d);
  });
});

test('her faktörde etiket, birim ve kapsam var', function () {
  Object.keys(veri.faktorler).forEach(function (k) {
    const f = veri.faktorler[k];
    assert.ok(f.etiket, k + ': etiket yok');
    assert.ok(f.birim_faaliyet, k + ': birim yok');
    assert.ok(f.kapsam && f.kapsam.length > 10, k + ': kapsam açıklaması yetersiz');
  });
});

test('hazır beslenme profillerinin anahtarları kalem listesiyle uyuşuyor', function () {
  const kalemler = veri.beslenme.kalemler.map(function (k) { return k.anahtar; });
  Object.keys(veri.beslenme.hazir_profiller).forEach(function (p) {
    Object.keys(veri.beslenme.hazir_profiller[p].carpanlar).forEach(function (a) {
      assert.ok(kalemler.indexOf(a) >= 0, p + ' profilinde tanımsız kalem: ' + a);
    });
  });
});

test('önerilerin kategorileri hesap kategorilerine eşlenebilir', function () {
  const gecerli = ['elektrik', 'isinma', 'ulasim', 'ucus', 'beslenme', 'atik', 'su'];
  veri.oneriler.forEach(function (o) {
    assert.ok(gecerli.indexOf(o.kategori) >= 0, 'tanımsız öneri kategorisi: ' + o.kategori);
    assert.ok(o.azaltim_orani > 0 && o.azaltim_orani <= 1, o.baslik + ': oran hatalı');
  });
});

test('üretilmiş veri.js, JSON ile birebir aynı', function () {
  const uretilmis = require(path.join(KOK, 'android/app/src/main/assets/js/veri.js'));
  assert.deepStrictEqual(uretilmis, veri,
    'veri.js güncel değil — "python3 scripts/veri_uret.py" çalıştırın');
});

/* ------------------------------------------------------------------ */

/** Gerçekçi bir referans hane: 3 kişilik, Ankara, doğal gazlı, otomobilli. */
function gercekciGirdi() {
  return {
    hane: { kisi: 3 },
    elektrik: { kwh_ay: 280 },
    isinma: { tur: 'dogalgaz', miktar_yil: 1400 },
    ulasim: [
      { tur: 'otomobil_benzin_km', miktar_hafta: 180, yolcu: 1 },
      { tur: 'metro_km', miktar_hafta: 40 }
    ],
    ucus: [{ tur: 'ucus_ichat_km', km_yil: 1800 }],
    beslenme: { profil: 'dengeli' },
    atik: { kg_hafta: 12, geri_donusum_orani: 0.2, kompost_orani: 0.05 },
    su: { m3_ay: 14 }
  };
}

/* ------------------------------------------------------------------ */
console.log('\n' + '='.repeat(42));
if (kalan.length === 0) {
  console.log('TÜM TESTLER GEÇTİ — ' + gecen + ' test\n');

  // Referans hane için özet rapor (belgelemede kullanılır)
  const s = KP.hesapla(veri, gercekciGirdi());
  console.log('Referans hane (3 kişi, Ankara, doğal gaz, benzinli otomobil):');
  s.kategoriler.forEach(function (k) {
    console.log('  ' + k.etiket.padEnd(14) +
      String(Math.round(k.kg_yil)).padStart(7) + ' kg/yıl   ' +
      (k.pay * 100).toFixed(1).padStart(5) + '%');
  });
  console.log('  ' + 'TOPLAM'.padEnd(14) +
    String(Math.round(s.toplam_kg_yil)).padStart(7) + ' kg/yıl   = ' +
    s.toplam_ton_yil.toFixed(2) + ' ton CO₂e/kişi·yıl');
  console.log('  Türkiye ortalamasının ' + (s.kiyaslama.turkiye.oran * 100).toFixed(0) + '%\'i · ' +
    '1,5 °C hedefinin ' + s.kiyaslama.hedef.oran.toFixed(2) + ' katı\n');
  process.exit(0);
} else {
  console.log(kalan.length + ' TEST BAŞARISIZ (' + gecen + ' geçti)\n');
  process.exit(1);
}
