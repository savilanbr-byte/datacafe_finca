// Service worker: guarda la app en el celular para que abra sin internet.
// Cada versión se guarda completa y por separado. Para publicar una versión nueva usa: node scripts/version.mjs 0.2.0
// Ojo: el dominio savilanbr-byte.github.io lo comparten varias apps de DataCafé, así que solo se borran
// las cachés viejas de esta app (las que empiezan por "datacafe-finca-").
const CACHE = 'datacafe-finca-v0.1.1';
const PREFIJO = 'datacafe-finca-';
const FONTS = 'datacafe-fonts-v1';

const APP = [
  './', './index.html', './manifest.webmanifest', './css/styles.css',
  './js/app.js', './js/version.js', './js/db.js', './js/calc.js', './js/ui.js', './js/model.js', './js/listas.js', './js/seed.js', './js/combo.js',
  './js/views/inicio.js', './js/views/lotes.js', './js/views/lote.js', './js/views/lote-form.js', './js/views/controles.js', './js/views/control-form.js',
  './js/views/recoleccion.js', './js/views/recolectores.js', './js/views/bodega.js', './js/views/cafe.js', './js/views/cafe-form.js',
  './js/views/catacion.js', './js/views/salidas.js', './js/views/ajustes.js',
  './icons/favicon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP.map((u) => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIJO) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      try { const res = await fetch(req); c.put(req, res.clone()); return res; } catch (err) { return Response.error(); }
    }));
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Archivos de la app: siempre los de esta versión. Si alguien borró la caché, se vuelve a llenar sola.
  e.respondWith(caches.open(CACHE).then(async (c) => {
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (req.mode === 'navigate') {
      const index = await c.match('./index.html');
      if (index) return index;
    }
    try {
      const res = await fetch(req);
      if (res.ok && url.pathname.startsWith(new URL('./', self.location).pathname)) c.put(req, res.clone());
      return res;
    } catch (err) { return Response.error(); }
  }));
});
