/*!
 * KarbonPusula — uygulama ikonu üreteci
 * ---------------------------------------------------------------------------
 * API 26 ve üzeri uyarlanabilir ikonu (mipmap-anydpi-v26/ic_launcher.xml) vektör
 * olarak kullanır. API 24–25 ise bitmap ister; bu betik o bitmapleri üretir.
 *
 * Çalıştırma:
 *     node scripts/ikon_uret.js
 *
 * Gereksinim: sharp (yalnızca geliştirme sırasında; uygulamanın çalışması için
 * gerekmez). Üretilen PNG dosyaları depoda tutulur, bu yüzden derleme için bu
 * betiğin çalıştırılması şart değildir.
 */
'use strict';

const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  try {
    sharp = require('/opt/npm-tools/node_modules/sharp');
  } catch (e2) {
    console.error('sharp bulunamadı. Kurulum: npm install sharp');
    process.exit(1);
  }
}

const KOK = path.resolve(__dirname, '..');
const RES = path.join(KOK, 'android/app/src/main/res');

const ZEMIN = '#0C1715';
const MARKA = '#3DD68C';

/** Ölçek adları ve kenar uzunlukları (px). */
const OLCEKLER = [
  { ad: 'mdpi', boy: 48 },
  { ad: 'hdpi', boy: 72 },
  { ad: 'xhdpi', boy: 96 },
  { ad: 'xxhdpi', boy: 144 },
  { ad: 'xxxhdpi', boy: 192 }
];

/**
 * Pusula çizimi. `yuvarlak` true ise zemin daire, değilse yuvarlatılmış karedir.
 * Çizim 108 birimlik tuvalde yapılır; vektör ikonla birebir aynı geometridir.
 */
function svgUret(yuvarlak) {
  const zeminSekli = yuvarlak
    ? '<circle cx="54" cy="54" r="54" fill="' + ZEMIN + '"/>'
    : '<rect x="0" y="0" width="108" height="108" rx="24" fill="' + ZEMIN + '"/>';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="108" height="108" viewBox="0 0 108 108">
  ${zeminSekli}
  <circle cx="54" cy="54" r="31.5" fill="none" stroke="${MARKA}" stroke-width="4.5"/>
  <circle cx="54" cy="54" r="21.4" fill="none" stroke="${MARKA}" stroke-width="2" opacity="0.42"/>
  <path d="M54 32.6 L61.6 54 L54 75.4 L46.4 54 Z" fill="${MARKA}"/>
  <circle cx="54" cy="54" r="4.5" fill="${ZEMIN}"/>
</svg>`;
}

/** Mağaza listelemesi ve belgeler için büyük sürüm. */
function tanitimSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 108 108">
  <rect x="0" y="0" width="108" height="108" fill="${ZEMIN}"/>
  <circle cx="54" cy="54" r="31.5" fill="none" stroke="${MARKA}" stroke-width="4.5"/>
  <circle cx="54" cy="54" r="21.4" fill="none" stroke="${MARKA}" stroke-width="2" opacity="0.42"/>
  <path d="M54 32.6 L61.6 54 L54 75.4 L46.4 54 Z" fill="${MARKA}"/>
  <circle cx="54" cy="54" r="4.5" fill="${ZEMIN}"/>
</svg>`;
}

async function uret() {
  const uretilen = [];

  for (const o of OLCEKLER) {
    const dizin = path.join(RES, 'mipmap-' + o.ad);
    fs.mkdirSync(dizin, { recursive: true });

    for (const [dosya, yuvarlak] of [['ic_launcher.png', false], ['ic_launcher_round.png', true]]) {
      const hedef = path.join(dizin, dosya);
      await sharp(Buffer.from(svgUret(yuvarlak)))
        .resize(o.boy, o.boy)
        .png({ compressionLevel: 9 })
        .toFile(hedef);
      uretilen.push(path.relative(KOK, hedef) + '  ' + o.boy + '×' + o.boy);
    }
  }

  // Belgelerde ve mağaza listelemesinde kullanılacak 512×512 sürüm
  const tanitimDizin = path.join(KOK, 'dokumantasyon', 'gorseller');
  fs.mkdirSync(tanitimDizin, { recursive: true });
  const tanitimHedef = path.join(tanitimDizin, 'ikon-512.png');
  await sharp(Buffer.from(tanitimSvg()))
    .resize(512, 512)
    .png({ compressionLevel: 9 })
    .toFile(tanitimHedef);
  uretilen.push(path.relative(KOK, tanitimHedef) + '  512×512');

  console.log('Üretilen dosyalar:');
  uretilen.forEach(function (u) { console.log('  ' + u); });
}

uret().catch(function (e) {
  console.error('Hata:', e.message);
  process.exit(1);
});
