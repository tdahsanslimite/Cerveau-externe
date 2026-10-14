// Appelé par la fabrication automatique (GitHub Actions) après `expo prebuild`.
// 1. Signe l'appli avec NOTRE clé (toujours la même), pour que chaque nouvelle
//    version s'installe par-dessus l'ancienne sans perdre les données.
// 2. Donne un numéro de version croissant à chaque fabrication.
const fs = require('fs');
const path = 'android/app/build.gradle';
let g = fs.readFileSync(path, 'utf8');

const release = `
        release {
            storeFile file(System.getenv('CE_KEYSTORE_PATH'))
            storePassword System.getenv('CE_KEYSTORE_PASSWORD')
            keyAlias System.getenv('CE_KEY_ALIAS')
            keyPassword System.getenv('CE_KEY_PASSWORD')
        }`;
g = g.replace(/signingConfigs \{\n(\s+debug \{[\s\S]*?\n\s+\})/, (m) => m + release);
g = g.replace(/(release \{\n(?:\s*\/\/.*\n)*\s*)signingConfig signingConfigs\.debug/, '$1signingConfig signingConfigs.release');

const code = parseInt(process.env.CE_VERSION_CODE || '1', 10);
g = g.replace(/versionCode \d+/, `versionCode ${code}`);

if (!g.includes('signingConfig signingConfigs.release') || !g.includes("System.getenv('CE_KEYSTORE_PATH')")) {
  console.error('Impossible de configurer la signature : build.gradle a changé de forme.');
  process.exit(1);
}
fs.writeFileSync(path, g);
console.log(`Signature configurée, versionCode ${code}`);
