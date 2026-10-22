// Punto de entrada: carga los datos, enruta según la dirección (#/...) y registra el modo sin conexión.
import { loadAll } from './db.js';
import { getParams, toast } from './ui.js';
import * as inicio from './views/inicio.js';
import * as lotes from './views/lotes.js';
import * as loteFicha from './views/lote.js';
import * as loteForm from './views/lote-form.js';
import * as controles from './views/controles.js';
import * as controlForm from './views/control-form.js';
import * as recoleccion from './views/recoleccion.js';
import * as recolectores from './views/recolectores.js';
import * as bodega from './views/bodega.js';
import * as cafeFicha from './views/cafe.js';
import * as cafeForm from './views/cafe-form.js';
import * as catacion from './views/catacion.js';
import * as salidas from './views/salidas.js';
import * as ajustes from './views/ajustes.js';

// ruta -> [vista, pestaña del menú inferior (celular), pestaña del menú lateral (computador), mostrar menú]
const ROUTES = {
  inicio: [inicio, 'inicio', 'inicio', true],
  lotes: [lotes, 'lotes', 'lotes', true],
  lote: [loteFicha, 'lotes', 'lotes', true],
  'lote-form': [loteForm, 'lotes', 'lotes', false],
  controles: [controles, 'controles', 'controles', true],
  'control-form': [controlForm, 'controles', 'controles', false],
  recoleccion: [recoleccion, 'recoleccion', 'recoleccion', true],
  recolectores: [recolectores, 'recoleccion', 'recolectores', true],
  recolector: [recolectores, 'recoleccion', 'recolectores', true],
  bodega: [bodega, 'bodega', 'bodega', true],
  cafe: [cafeFicha, 'bodega', 'bodega', true],
  'cafe-form': [cafeForm, 'bodega', 'bodega', false],
  catacion: [catacion, 'bodega', 'catacion', true],
  salidas: [salidas, 'bodega', 'salidas', true],
  ajustes: [ajustes, 'inicio', 'ajustes', true],
};

const app = document.getElementById('app');
const ancho = window.matchMedia('(min-width: 64rem)');

async function render() {
  const { parts, q } = getParams();
  const [view, tabMovil, tabPC, showNav] = ROUTES[parts[0]] || ROUTES.inicio;
  const tab = ancho.matches ? tabPC : tabMovil;
  document.body.classList.toggle('no-nav', !showNav);
  document.querySelectorAll('#nav a').forEach((a) => {
    if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  try {
    await view.render(app, { parts, q });
  } catch (e) {
    console.error(e);
    app.innerHTML = `<div class="empty"><p>Algo salió mal al abrir esta pantalla.</p><p class="small mt-sm">${String(e.message || e)}</p><a class="btn mt" href="#/inicio">Volver al inicio</a></div>`;
  }
  window.scrollTo(0, 0);
}

async function init() {
  await loadAll();
  window.addEventListener('hashchange', render);
  ancho.addEventListener('change', render);
  if (!location.hash) history.replaceState(null, '', '#/inicio');
  render();
  registerSW();
}

function registerSW() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then((reg) => {
    if (reg.waiting && navigator.serviceWorker.controller) {
      toast('Hay una versión nueva de la app.', { label: 'Actualizar', run: () => reg.waiting.postMessage('skipWaiting') });
    }
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      if (!w) return;
      w.addEventListener('statechange', () => {
        if (w.state === 'installed' && navigator.serviceWorker.controller) {
          toast('Hay una versión nueva de la app.', { label: 'Actualizar', run: () => w.postMessage('skipWaiting') });
        }
      });
    });
  }).catch((e) => console.warn('Sin modo offline:', e));
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded) return; reloaded = true; location.reload();
  });
}

init().catch((e) => {
  console.error(e);
  app.innerHTML = `<div class="empty"><p>No se pudo abrir la base de datos del celular.</p><p class="small mt-sm">Revisa que el navegador no esté en modo incógnito.</p></div>`;
});
