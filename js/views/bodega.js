// Bodega: el café en pergamino seco que ya salió del beneficio.
import { data } from '../db.js';
import { cafeInfo, cafesOrdenados, fincaFiltro } from '../model.js';
import { num, fmtKg, fmt2, fmtFecha } from '../calc.js';
import { esc, icon, tabs, norm } from '../ui.js';
import { filtroFincas, bindFiltroFincas } from './inicio.js';

const filtro = { q: '', agotados: false };

export function pestanasBodega(activa) {
  return tabs([['#/bodega', 'Inventario', activa === 'bodega'], ['#/catacion', 'Catación', activa === 'catacion'], ['#/salidas', 'Salidas', activa === 'salidas']]);
}

export async function render(root) {
  const fincaId = fincaFiltro();
  const todos = cafesOrdenados().map(cafeInfo).filter((c) => fincaId === 'todas' || c.fincaIds.includes(fincaId) || !c.fincaIds.length);

  root.innerHTML = `
    <header class="page-head">
      <div><h1>Bodega</h1><p class="sub" id="resumen" aria-live="polite"></p></div>
      <a class="icon-btn add" href="#/cafe-form" aria-label="Ingresar café">${icon('plus')}</a>
    </header>
    <div class="stack">
      ${pestanasBodega('bodega')}
      ${filtroFincas(fincaId)}
      <div class="stack-sm filters-row">
        <div class="search">
          <label class="sr" for="q">Buscar café</label>
          ${icon('search')}
          <input class="input" id="q" type="search" placeholder="Buscar por código, lote, variedad o proceso" value="${esc(filtro.q)}">
        </div>
        <label class="check small"><input type="checkbox" id="agotados" ${filtro.agotados ? 'checked' : ''}> Mostrar cafés agotados</label>
      </div>
      <div class="cards-grid stack-sm" id="lista"></div>
    </div>`;
  bindFiltroFincas(root, () => render(root));

  const lista = root.querySelector('#lista');
  const resumen = root.querySelector('#resumen');

  function pintar() {
    const q = norm(filtro.q);
    const rows = todos.filter((c) => (filtro.agotados || c.disponible > 0.001)
      && (!q || norm([c.cafe.id, c.nombre, c.lotes.map((l) => l.nombre).join(' ')].join(' ')).includes(q)));
    const kg = rows.reduce((s, c) => s + Math.max(0, c.disponible), 0);
    resumen.textContent = `${fmtKg(kg)} kg de pergamino seco · ${rows.length} ${rows.length === 1 ? 'café' : 'cafés'}`;
    if (!data.cafes.length) {
      lista.innerHTML = `<div class="empty"><p>Cuando termines el beneficio, ingresa aquí el pergamino seco.</p><a class="btn btn-accent mt" href="#/cafe-form">${icon('plus')}Ingresar café</a></div>`;
      return;
    }
    if (!rows.length) { lista.innerHTML = '<p class="empty">No hay cafés que coincidan.</p>'; return; }
    lista.innerHTML = rows.map((c) => {
      const total = num(c.cafe.kgPergamino);
      const pct = total > 0 ? Math.max(0, Math.min(100, (100 * c.disponible) / total)) : 0;
      return `<a class="item" href="#/cafe/${encodeURIComponent(c.cafe.id)}">
        <div class="item-top"><span>${esc(c.cafe.id)} · ${esc(fmtFecha(c.cafe.fechaIngreso))}</span>
          ${c.puntaje !== null ? `<span class="badge">${icon('cup-plain', 'ic-sm')}${fmt2(c.puntaje)}</span>` : '<span class="badge warn">Sin catar</span>'}</div>
        <div class="item-name">${esc(c.nombre)}</div>
        <div class="small muted">${esc(c.lotes.map((l) => l.nombre).join(', ') || 'Sin lote')}${c.factorUGQ ? ` · Factor ${fmt2(c.factorUGQ)}` : ' · Sin análisis físico'}${num(c.cafe.humedad) ? ` · ${fmtKg(num(c.cafe.humedad))}% humedad` : ''}</div>
        ${c.disponible > 0.001
          ? `<div class="item-bar"><div class="bar"><span style="width:${pct}%"></span></div><span><strong>${fmtKg(c.disponible)}</strong> de ${fmtKg(total)} kg</span></div>`
          : `<div class="small muted">Agotado · salieron los ${fmtKg(total)} kg</div>`}
      </a>`;
    }).join('');
  }

  root.querySelector('#q').addEventListener('input', (e) => { filtro.q = e.target.value; pintar(); });
  root.querySelector('#agotados').addEventListener('change', (e) => { filtro.agotados = e.target.checked; pintar(); });
  pintar();
}
