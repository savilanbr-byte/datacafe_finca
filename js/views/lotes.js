// Lotes de la finca (agrupados por finca) y su productividad.
import { data } from '../db.js';
import { lotesOrdenados, loteInfo, fincasOrdenadas, fincaFiltro, anualLote, serieLote, mesActual, mesAnterior, equivalencias } from '../model.js';
import { num, fmtKg, fmtNum, nombreMes, mesCorto, UNIDADES_AREA, areaHa } from '../calc.js';
import { ESTADOS_LOTE } from '../listas.js';
import { esc, icon, tabs } from '../ui.js';
import { filtroFincas, bindFiltroFincas } from './inicio.js';

let anioSel = null;

export const etiquetaEstado = (e) => (ESTADOS_LOTE.find(([k]) => k === e) || ESTADOS_LOTE[0])[1];
export const unidadTexto = (u) => (UNIDADES_AREA.find(([k]) => k === u) || UNIDADES_AREA[0])[1];
/** "3 cuadras", "1 plaza", "5.000 m²" */
export const areaTexto = (area, u) => {
  const n = num(area);
  const t = unidadTexto(u).toLowerCase();
  return `${fmtNum(n, Number.isInteger(n) ? 0 : 2)} ${u === 'm2' || n === 1 ? t : t + 's'}`;
};

export async function render(root, { q }) {
  const vista = q.get('vista') === 'productividad' ? 'productividad' : 'lotes';
  const fincaId = fincaFiltro();
  const fincas = fincasOrdenadas().filter((f) => fincaId === 'todas' || f.id === fincaId);

  root.innerHTML = `
    <header class="page-head">
      <div><h1>Lotes</h1><p class="sub">${data.lotes.length} ${data.lotes.length === 1 ? 'lote' : 'lotes'} en ${data.fincas.length} ${data.fincas.length === 1 ? 'finca' : 'fincas'}</p></div>
      <a class="icon-btn add" href="#/lote-form" aria-label="Nuevo lote">${icon('plus')}</a>
    </header>
    <div class="stack">
      ${tabs([['#/lotes', 'Lotes', vista === 'lotes'], ['#/lotes?vista=productividad', 'Productividad', vista === 'productividad']])}
      ${filtroFincas(fincaId)}
      <div id="cuerpo" class="stack"></div>
    </div>`;
  bindFiltroFincas(root, () => render(root, { q }));
  const cuerpo = root.querySelector('#cuerpo');

  if (!data.lotes.length) {
    cuerpo.innerHTML = `<div class="empty"><p>Todavía no hay lotes.</p><a class="btn btn-accent mt" href="#/lote-form">${icon('plus')}Crear lote</a></div>`;
    return;
  }

  if (vista === 'lotes') {
    const mes = mesActual();
    cuerpo.innerHTML = fincas.map((f) => {
      const ls = lotesOrdenados(f.id).map((l) => loteInfo(l, mes));
      const ha = ls.reduce((s, i) => s + i.ha, 0);
      return `<section class="stack-sm">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:.5rem">
          <h2 style="font-size:1.375rem">${esc(f.nombre)}</h2><span class="small muted">${fmtNum(ha, 2)} ha${f.municipio ? ' · ' + esc(f.municipio) : ''}</span></div>
        ${ls.length ? `<div class="cards-grid stack-sm">${ls.map(tarjetaLote).join('')}</div>` : `<p class="note">Esta finca aún no tiene lotes. <a href="#/lote-form?finca=${encodeURIComponent(f.id)}">Crear uno</a></p>`}
      </section>`;
    }).join('');
    return;
  }

  // Productividad
  const anios = [...new Set([String(new Date().getFullYear()), ...data.recolecciones.map((r) => String(r.fecha || '').slice(0, 4)).filter(Boolean)])].sort().reverse();
  if (!anioSel || !anios.includes(anioSel)) anioSel = anios[0];
  const mes = mesActual(), ant = mesAnterior(mes);
  cuerpo.innerHTML = `
    <p class="note">Productividad = kg de cereza ÷ hectáreas, con corte a fin de mes. La cosecha principal y la mitaca dependen de los meses que pusiste para cada finca en Ajustes.</p>
    <div class="chips" id="anios" role="group" aria-label="Año">${anios.map((a) => `<button type="button" class="chip" data-anio="${a}" aria-pressed="${a === anioSel}">${a}</button>`).join('')}</div>
    ${fincas.map((f) => {
      const ls = lotesOrdenados(f.id);
      if (!ls.length) return '';
      return `<section class="stack-sm"><h2 style="font-size:1.375rem">${esc(f.nombre)}</h2>
        <div class="cards-grid stack-sm">${ls.map((l) => tarjetaProductividad(l, anioSel, mes, ant)).join('')}</div></section>`;
    }).join('')}`;
  cuerpo.querySelector('#anios').addEventListener('click', (e) => {
    const b = e.target.closest('[data-anio]');
    if (b) { anioSel = b.dataset.anio; render(root, { q }); }
  });
}

function tarjetaLote(i) {
  const l = i.lote;
  const estado = i.estado;
  return `<a class="item" href="#/lote/${encodeURIComponent(l.id)}">
    <div class="item-top"><span>${fmtNum(i.ha, 2)} ha${l.unidad && l.unidad !== 'ha' ? ` (${esc(areaTexto(l.area, l.unidad))})` : ''}${l.altitud ? ` · ${esc(fmtNum(num(l.altitud)))} msnm` : ''}</span>
      ${estado === 'activo' ? (i.carencias.length ? `<span class="badge warn">${icon('alert', 'ic-sm')}En carencia</span>` : '<span class="badge">Activo</span>') : `<span class="badge plain">${esc(etiquetaEstado(estado))}</span>`}</div>
    <div class="item-name">${esc(l.nombre)}</div>
    <div class="small muted">${esc((l.variedades || []).join(', ') || 'Sin variedad')}</div>
    ${estado === 'activo' ? `<div class="item-bar"><span class="small">Este mes: <strong>${fmtKg(i.kgMes)} kg</strong>${i.prodMes !== null ? ` · ${fmtNum(i.prodMes, 0)} kg/ha` : ''}</span></div>` : ''}
  </a>`;
}

function tarjetaProductividad(l, anio, mes, ant) {
  const eq = equivalencias();
  const ha = areaHa(l.area, l.unidad, eq);
  const a = anualLote(l, anio);
  const serie = serieLote(l, 12);
  const max = Math.max(1, ...serie.map((s) => s.kg));
  const info = loteInfo(l, mes);
  const val = (v) => (v === null ? '—' : fmtNum(v, 0));
  return `<a class="item" href="#/lote/${encodeURIComponent(l.id)}">
    <div class="item-top"><span>${fmtNum(ha, 2)} ha</span>${(l.estado || 'activo') !== 'activo' ? `<span class="badge plain">${esc(etiquetaEstado(l.estado))}</span>` : ''}</div>
    <div class="item-name">${esc(l.nombre)}</div>
    <div class="spark" role="img" aria-label="Kilos por mes en los últimos 12 meses">${serie.map((s) => `<span title="${esc(nombreMes(s.mes))}: ${fmtKg(s.kg)} kg" style="height:${Math.max(4, (100 * s.kg) / max)}%" class="${s.kg ? '' : 'cero'}"></span>`).join('')}</div>
    <div class="spark-lbl small muted"><span>${mesCorto(serie[0].mes)}</span><span>${mesCorto(serie[11].mes)}</span></div>
    <div class="grid-2 kv">
      <div><span>${esc(nombreMes(mes).split(' ')[0])}</span><strong>${val(info.prodMes)} <small>kg/ha</small></strong></div>
      <div><span>${esc(nombreMes(ant).split(' ')[0])}</span><strong>${val(info.prodMesAnterior)} <small>kg/ha</small></strong></div>
      <div><span>Año ${esc(anio)}</span><strong>${val(a.kgHa)} <small>kg/ha</small></strong></div>
      <div><span>Kg en ${esc(anio)}</span><strong>${fmtKg(a.kg)}</strong></div>
      <div><span>Principal</span><strong>${val(a.principalHa)} <small>kg/ha</small></strong></div>
      <div><span>Mitaca</span><strong>${val(a.mitacaHa)} <small>kg/ha</small></strong></div>
      ${a.kgArbol !== null ? `<div class="span-2"><span>Por árbol en ${esc(anio)}</span><strong>${fmtNum(a.kgArbol, 2)} <small>kg de cereza</small></strong></div>` : ''}
    </div>
  </a>`;
}
