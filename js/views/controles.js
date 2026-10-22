// Lista de controles agronómicos y labores.
import { data } from '../db.js';
import { fincaFiltro, nombresLotes, lotesOrdenados } from '../model.js';
import { num, fmtCOP, fmtFecha, nombreMes, hoyISO } from '../calc.js';
import { esAplicacion } from '../listas.js';
import { esc, icon } from '../ui.js';
import { filtroFincas, bindFiltroFincas } from './inicio.js';

let clase = 'todos';

export async function render(root) {
  const fincaId = fincaFiltro();
  const ids = new Set(lotesOrdenados(fincaId).map((l) => l.id));
  const mes = hoyISO().slice(0, 7);
  const todos = data.controles
    .filter((c) => fincaId === 'todas' || (c.loteIds || []).some((id) => ids.has(id)))
    .sort((a, b) => ((a.fecha || '') + a.actualizado < (b.fecha || '') + b.actualizado ? 1 : -1));
  const delMes = todos.filter((c) => (c.fecha || '').startsWith(mes));

  root.innerHTML = `
    <header class="page-head">
      <div><h1>Controles</h1><p class="sub">${delMes.length} este mes · ${fmtCOP(delMes.reduce((s, c) => s + num(c.costo), 0))} en costos anotados</p></div>
      <a class="icon-btn add" href="#/control-form" aria-label="Nuevo control">${icon('plus')}</a>
    </header>
    <div class="stack">
      ${filtroFincas(fincaId)}
      <div class="chips" id="clase" role="group" aria-label="Tipo">
        ${[['todos', 'Todos'], ['aplicacion', 'Aplicaciones'], ['labor', 'Labores']].map(([k, n]) => `<button type="button" class="chip" data-clase="${k}" aria-pressed="${clase === k}">${n}</button>`).join('')}
      </div>
      <div id="lista" class="stack"></div>
    </div>`;
  bindFiltroFincas(root, () => render(root));

  const lista = root.querySelector('#lista');
  function pintar() {
    const rows = todos.filter((c) => clase === 'todos' || (clase === 'aplicacion') === esAplicacion(c.tipo));
    if (!data.lotes.length) { lista.innerHTML = `<div class="empty"><p>Primero crea un lote.</p><a class="btn btn-accent mt" href="#/lote-form">${icon('plus')}Crear lote</a></div>`; return; }
    if (!rows.length) { lista.innerHTML = `<div class="empty"><p>No hay controles${clase !== 'todos' ? ' de este tipo' : ''} todavía.</p><a class="btn btn-accent mt" href="#/control-form">${icon('plus')}Anotar control</a></div>`; return; }
    const grupos = new Map();
    for (const c of rows) { const m = (c.fecha || '').slice(0, 7); if (!grupos.has(m)) grupos.set(m, []); grupos.get(m).push(c); }
    lista.innerHTML = [...grupos.entries()].map(([m, cs]) => `<section class="stack-sm">
      <h2 style="font-size:1.125rem" class="muted">${m ? esc(nombreMes(m)) : 'Sin fecha'}</h2>
      <div class="cards-grid stack-sm">${cs.map(tarjeta).join('')}</div></section>`).join('');
  }
  root.querySelector('#clase').addEventListener('click', (e) => {
    const b = e.target.closest('[data-clase]');
    if (!b) return;
    clase = b.dataset.clase;
    root.querySelectorAll('#clase .chip').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    pintar();
  });
  pintar();
}

function tarjeta(c) {
  const prods = (c.productos || []).filter((p) => p.nombre);
  return `<a class="item" href="#/control-form?id=${encodeURIComponent(c.id)}">
    <div class="item-top"><span>${esc(fmtFecha(c.fecha))}${c.responsable ? ' · ' + esc(c.responsable) : ''}</span>
      <span class="badge ${esAplicacion(c.tipo) ? '' : 'plain'}">${esAplicacion(c.tipo) ? 'Aplicación' : 'Labor'}</span></div>
    <div class="item-name">${esc(c.tipo)}</div>
    <div class="small">${esc(nombresLotes(c.loteIds))}</div>
    ${prods.length ? `<div class="small muted">${esc(prods.map((p) => [p.nombre, p.dosis ? `${p.dosis} ${p.unidad || ''}`.trim() : ''].filter(Boolean).join(' ')).join(' · '))}</div>` : ''}
    ${num(c.costo) > 0 ? `<div class="small muted">Costo: ${fmtCOP(num(c.costo))}</div>` : ''}
  </a>`;
}
