// Prépare la version web exportée (dist/) pour l'iPhone : installable sur l'écran d'accueil, plein écran,
// icône de l'appli. Usage : node scripts/patch-web.js <dossier exporté> <adresse de base, ex. /cerveau-externe-telechargement>
const fs = require('fs');
const path = require('path');

const dir = process.argv[2];
const base = (process.argv[3] || '').replace(/\/$/, '');
if (!dir) throw new Error('Usage : node scripts/patch-web.js <dossier> [adresse de base]');

fs.copyFileSync(path.join(__dirname, '..', 'assets', 'icon.png'), path.join(dir, 'icon.png'));

const manifest = {
  name: 'LCE, le cerveau externe',
  short_name: 'Cerveau',
  lang: 'fr',
  start_url: `${base}/`,
  scope: `${base}/`,
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#F7F3E8',
  theme_color: '#0C4450',
  icons: [{ src: `${base}/icon.png`, sizes: '1024x1024', type: 'image/png', purpose: 'any' }],
};
fs.writeFileSync(path.join(dir, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));

const head = [
  `<link rel="manifest" href="${base}/manifest.webmanifest">`,
  `<link rel="apple-touch-icon" href="${base}/icon.png">`,
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
  '<meta name="apple-mobile-web-app-title" content="Cerveau">',
].join('\n');

const indexPath = path.join(dir, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace(
  /<meta name="viewport"[^>]*>/,
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
);
if (!html.includes('rel="manifest"')) html = html.replace('</head>', `${head}\n</head>`);
fs.writeFileSync(indexPath, html);
// GitHub Pages : pas de traitement Jekyll (il ignorerait le dossier _expo), et toute adresse inconnue renvoie l'appli.
fs.writeFileSync(path.join(dir, '.nojekyll'), '');
fs.copyFileSync(indexPath, path.join(dir, '404.html'));
console.log('Version web prête dans', dir);
