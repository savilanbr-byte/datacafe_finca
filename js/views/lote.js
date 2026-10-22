// Ficha de un lote: datos, alertas, productividad, controles y recolección.
import { data } from '../db.js';
import { loteInfo, serieLote, anualLote, nombreRecolector, cafeInfo, mesActual, fincaNombre } from '../model.js';
import { num, fmtKg, fmtNum, fmtCOP, fmtFecha, nombreMes, mesCorto, totalRecoleccion, hoyISO } from '../calc.js';
import { esc, icon } from '../ui.js';
import { etiquetaEstado, areaTexto } from './lotes.js';

export async function render(root, { parts }) {
  const l = data.lotes.find((x) => x.id === decodeURIComponent(parts[1] || ''));
  if (!l) { root.innerHTML = `<div class="empty"><p>No se encontró el lote.</p><a class="btn mt" href="#/lotes">Volver a lotes</a></div>`; return; }
  const i = loteInfo(l);
  const serie = serieLote(l, 12);
  const max = Math.max(1, ...serie.map((s) => s.kgHa || 0));
  const anio = hoyISO().slice(0, 4);
  const a = anualLote(l, anio);
  const recs = data.recolecciones.filter((r) => r.loteId === l.id).sort((x, y) => ((x.fecha || '') + x.actualizado < (y.fecha || '') + y.actualizado ? 1 : -1));
  const cafes = data.cafes.filter((c) => (c.loteIds || []).includes(l.id)).map(cafeInfo);
  const edad = l.fechaSiembra ? (Date.now() - new Date(l.fechaSiembra).getTime()) / (365.25 * 864e5) : null;
  const activo = i.estado === 'activo';

  root.innerHTML = `
    <header class="topbar">
      <a class="icon-btn" href="#/lotes" aria-label="Volver">${icon('back')}</a>
      <div style="flex:1;min-width:0"><h1>${esc(l.nombre)}</h1><div class="small muted">${esc(fincaNombre(l.fincaId))} · ${esc(etiquetaEstado(i.estado))}</div></div>
      <a class="icon-btn boxed" href="#/lote-form?id=${encodeURIComponent(l.id)}" aria-label="Editar lote">${icon('edit')}</a>
    </header>
    <div class="stack flow-2">
      ${[...i.carencias.map((c) => `<div class="alert warn" role="status">${icon('alert', 'ic-sm')} <strong>En carencia hasta el ${esc(fmtFecha(c.hasta))}</strong> por ${esc(c.producto)} (aplicado el ${esc(fmtFecha(c.control.fecha))}). Revisa antes de cosechar.</div>`),
        ...i.reingresos.map((r) => `<div class="alert warn" role="status">${icon('alert', 'ic-sm')} <strong>No entrar al lote</strong> hasta pasadas ${fmtNum(r.horas)} horas de la aplicación de ${esc(r.producto)} (${esc(fmtFecha(r.control.fecha))}).</div>`)].join('')}

      <div class="btn-row">
        ${activo ? `<a class="btn btn-accent" href="#/recoleccion?lote=${encodeURIComponent(l.id)}">${icon('basket', 'ic-sm')}Recogida</a>` : ''}
        <a class="btn" href="#/control-form?lote=${encodeURIComponent(l.id)}">${icon('spray', 'ic-sm')}Control</a>
      </div>

      <section class="hero">
        <div class="label">Productividad de ${esc(nombreMes(mesActual()).toLowerCase())}</div>
        <div class="big-num">${i.prodMes !== null ? fmtNum(i.prodMes, 0) : '—'} <small>kg/ha</small></div>
        <div class="small" style="opacity:.92">${fmtKg(i.kgMes)} kg de cereza en ${fmtNum(i.ha, 2)} ha</div>
      </section>

      <section class="card">
        <div class="card-title">${icon('chart')}<h2>Últimos 12 meses</h2></div>
        <div class="chart" role="img" aria-label="Kilos de cereza por hectárea en cada uno de los últimos 12 meses">
          ${serie.map((s) => `<div class="col"><div class="bw"><span class="val">${s.kgHa ? fmtNum(s.kgHa, 0) : ''}</span><span class="b" style="height:${s.kgHa ? Math.max(3, (100 * s.kgHa) / max) : 0}%"></span></div><span class="m">${mesCorto(s.mes)}</span></div>`).join('')}
        </div>
        <p class="small muted mt-sm">kg de cereza por hectárea, con corte a fin de mes.</p>
      </section>

      <section class="card">
        <h2 style="margin-bottom:.5rem">Año ${esc(anio)}</h2>
        <div class="row"><span>Cereza recogida</span><strong>${fmtKg(a.kg)} kg</strong></div>
        <div class="row"><span>Productividad</span><strong>${a.kgHa !== null ? fmtNum(a.kgHa, 0) + ' kg/ha' : '—'}</strong></div>
        <div class="row"><span>Cosecha principal</span><span>${fmtKg(a.principal)} kg${a.principalHa !== null ? ` · ${fmtNum(a.principalHa, 0)} kg/ha` : ''}</span></div>
        <div class="row"><span>Mitaca</span><span>${fmtKg(a.mitaca)} kg${a.mitacaHa !== null ? ` · ${fmtNum(a.mitacaHa, 0)} kg/ha` : ''}</span></div>
        ${a.kgArbol !== null ? `<div class="row"><span>Por árbol</span><span>${fmtNum(a.kgArbol, 2)} kg</span></div>` : ''}
        ${!(data.fincas.find((f) => f.id === l.fincaId) || {}).mesesPrincipal?.length ? '<p class="small muted mt-sm">Para separar principal y mitaca, elige los meses de cosecha principal de la finca en Ajustes.</p>' : ''}
      </section>

      <section class="card">
        <h2 style="margin-bottom:.5rem">Datos del lote</h2>
        <div class="row"><span>Área</span><span>${fmtNum(i.ha, 2)} ha${l.unidad && l.unidad !== 'ha' ? ` (${esc(areaTexto(l.area, l.unidad))})` : ''}</span></div>
        <div class="row"><span>Altitud</span><span>${l.altitud ? fmtNum(num(l.altitud)) + ' msnm' : '—'}</span></div>
        <div class="row"><span>Fecha de siembra</span><span>${l.fechaSiembra ? `${esc(fmtFecha(l.fechaSiembra))}${edad !== null && edad >= 0 ? ` · ${fmtNum(edad, 1)} años` : ''}` : '—'}</span></div>
        <div class="row"><span>Variedades</span><span>${esc((l.variedades || []).join(', ') || '—')}</span></div>
        <div class="row"><span>Árboles</span><span>${l.arboles ? fmtNum(num(l.arboles)) : '—'}${l.arboles && i.ha > 0 ? ` <span class="small muted">· ${fmtNum(num(l.arboles) / i.ha)} por ha</span>` : ''}</span></div>
      </section>

      <section class="card">
        <div class="card-title">${icon('spray')}<h2>Controles y labores</h2></div>
        ${i.controles.length ? i.controles.slice(0, 12).map((c) => `<a class="row plain" href="#/control-form?id=${encodeURIComponent(c.id)}" style="text-decoration:none;color:inherit">
            <span>${esc(c.tipo)}${(c.productos || []).length ? `<br><span class="small muted">${esc(c.productos.map((p) => [p.nombre, p.dosis ? `${p.dosis} ${p.unidad || ''}`.trim() : ''].filter(Boolean).join(' ')).join(' · '))}</span>` : ''}</span>
            <span class="small muted">${esc(fmtFecha(c.fecha))}</span></a>`).join('') : '<p class="muted">Aún no hay controles en este lote.</p>'}
      </section>

      <section class="card">
        <div class="card-title">${icon('basket')}<h2>Últimas recogidas</h2></div>
        ${recs.length ? recs.slice(0, 10).map((r) => `<div class="row plain">
            <span>${esc(nombreRecolector(r.recolectorId))}<br><span class="small muted">${esc(fmtFecha(r.fecha))} · ${esc(r.variedad || '')}</span></span>
            <span>${fmtKg(num(r.kg))} kg<br><span class="small muted">${fmtCOP(totalRecoleccion(r))}</span></span></div>`).join('') : '<p class="muted">Aún no hay recogidas en este lote.</p>'}
      </section>

      ${cafes.length ? `<section class="card">
        <div class="card-title">${icon('warehouse')}<h2>En bodega</h2></div>
        ${cafes.map((c) => `<a class="row plain" href="#/cafe/${encodeURIComponent(c.cafe.id)}" style="text-decoration:none;color:inherit"><span>${esc(c.cafe.id)} · ${esc(c.cafe.proceso || '')}</span><span>${fmtKg(c.disponible)} kg</span></a>`).join('')}
      </section>` : ''}
    </div>`;
}
