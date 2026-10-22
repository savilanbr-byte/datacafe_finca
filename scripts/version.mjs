// Cambia el número de versión en todos los lugares necesarios.
// Uso: node scripts/version.mjs 0.2.0
import { readFileSync, writeFileSync } from 'node:fs';

const v = process.argv[2];
if (!/^\d+\.\d+\.\d+$/.test(v || '')) { console.error('Uso: node scripts/version.mjs 0.2.0'); process.exit(1); }

const cambios = [
  ['js/version.js', /VERSION = '[^']+'/, `VERSION = '${v}'`],
  ['sw.js', /datacafe-finca-v[\d.]+/, `datacafe-finca-v${v}`],
  ['index.html', /styles\.css\?v=[\d.]+/, `styles.css?v=${v}`],
  ['index.html', /app\.js\?v=[\d.]+/, `app.js?v=${v}`],
  ['package.json', /"version":\s*"[^"]+"/, `"version":"${v}"`],
  ['README.md', /\(versión [\d.]+\)/, `(versión ${v})`],
];
for (const [file, re, rep] of cambios) {
  const s = readFileSync(file, 'utf8');
  if (!re.test(s)) { console.error(`No encontré el número de versión en ${file}`); process.exit(1); }
  writeFileSync(file, s.replace(re, rep));
}
console.log(`Versión ${v} lista. Ahora sube los cambios a main.`);
