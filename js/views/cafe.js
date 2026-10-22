// Ficha de un café en bodega: origen, proceso, análisis físico, taza y salidas.
import { data } from '../db.js';
import { cafeInfo, fincaNombre } from '../model.js';
import { num, fmtKg, fmt2, fmtCOP, fmtFecha, clasificacion, proyeccionExcelso, puntajeCatacion } from '../calc.js';
import { esc, icon, shareText } from '../ui.js';

export async function render(root, { parts }) {
  const cafe = data.cafes.find((c) => c.id === decodeURIComponent(parts[1] || ''));
  if (!cafe) { root.innerHTML = `<div class="empty"><p>No se encontró el café.</p><a class="btn mt" href="#/bodega">Volver a bodega</a></div>`; return; }
  const i = cafeInfo(cafe);
  const total = num(cafe.kgPergamino);
  const pct = total > 0 ? Math.max(0, Math.min(100, (100 * i.disponible) / total)) : 0;
  const fila = (k, val) => `<div class="row"><span>${k}</span><span>${val || '—'}</span></div>`;

  root.innerHTML = `
    <header class="topbar">
      <a class="icon-btn" href="#/bodega" aria-label="Volver">${icon('back')}</a>
      <div style="flex:1;min-width:0"><h1>${esc(cafe.id)}</h1><div class="small muted">${esc(i.nombre)}</div></div>
      <a class="icon-btn boxed" href="#/cafe-form?id=${encodeURIComponent(cafe.id)}" aria-label="Editar café">${icon('edit')}</a>
    </header>
    <div class="stack flow-2">
      <section class="hero">
        <div class="label">Disponible en bodega</div>
        <div class="big-num">${fmtKg(i.disponible)} <small>de ${fmtKg(total)} kg</small></div>
        <div class="bar" style="background:rgba(255,255,255,.25);margin-top:.5rem"><span style="width:${pct}%;background:var(--hero-ink)"></span></div>
      </section>

      <div class="btn-row">
        <a class="btn btn-green" href="#/catacion?cafe=${encodeURIComponent(cafe.id)}">${icon('cup', 'ic-sm')}Catar</a>
        ${i.disponible > 0.001 ? `<a class="btn btn-accent" href="#/salidas?cafe=${encodeURIComponent(cafe.id)}">${icon('truck', 'ic-sm')}Salida</a>` : ''}
        <button class="btn" type="button" id="compartir" aria-label="Compartir ficha por WhatsApp">${icon('share', 'ic-sm')}</button>
      </div>

      ${i.factorUGQ === null || !i.cataciones.length ? `<div class="note">${[i.factorUGQ === null ? `Falta el <a href="#/cafe-form?id=${encodeURIComponent(cafe.id)}">análisis físico</a>.` : '', !i.cataciones.length ? `Falta <a href="#/catacion?cafe=${encodeURIComponent(cafe.id)}">catarlo</a>.` : ''].filter(Boolean).join(' ')}</div>` : ''}

      <section class="card">
        <div class="card-title">${icon('cup')}<h2>Taza</h2></div>
        ${i.puntaje !== null ? `<div style="display:flex;align-items:baseline;gap:.75rem"><span class="mid-num">${fmt2(i.puntaje)}</span><span class="muted">${esc(clasificacion(i.puntaje))}${i.cataciones.length > 1 ? ` · promedio de ${i.cataciones.length} cataciones` : ''}</span></div>
          ${i.perfil.length ? `<div class="chips mt-sm">${i.perfil.map((d) => `<span class="chip static">${esc(d.label)}${d.count > 1 ? ` <span class="muted small">x${d.count}</span>` : ''}</span>`).join('')}</div>` : ''}
          <div class="mt-sm">${i.cataciones.map((k) => `<div class="row"><span>${esc(fmtFecha(k.fecha))} · Mesa ${esc(k.mesa || '1')}${k.comentarios ? `<br><span class="small">${esc(k.comentarios)}</span>` : ''}</span><strong>${fmt2(puntajeCatacion(k))}</strong></div>`).join('')}</div>`
          : '<p class="muted">Aún no se ha catado.</p>'}
      </section>

      <section class="card">
        <h2 style="margin-bottom:.5rem">Origen</h2>
        ${fila('Fecha de ingreso', esc(fmtFecha(cafe.fechaIngreso)))}
        ${fila('Finca', esc([...new Set(i.lotes.map((l) => fincaNombre(l.fincaId)))].join(', ')))}
        ${fila('Lotes', i.lotes.map((l) => `<a href="#/lote/${encodeURIComponent(l.id)}">${esc(l.nombre)}</a>`).join(', '))}
        ${fila('Variedades', esc((cafe.variedades || []).join(', ')))}
        ${fila('Humedad', num(cafe.humedad) ? esc(fmtKg(num(cafe.humedad))) + ' %' : '')}
      </section>

      <section class="card">
        <h2 style="margin-bottom:.5rem">Proceso</h2>
        ${fila('Proceso', esc(cafe.proceso))}
        ${fila('Fermentación', esc([cafe.tipoFermentacion, cafe.tiempoFermentacion].filter(Boolean).join(' · ')))}
        ${fila('Secado', esc([cafe.tipoSecado, cafe.tiempoSecado].filter(Boolean).join(' · ')))}
        ${cafe.comentarios ? `<p class="small mt-sm">${esc(cafe.comentarios)}</p>` : ''}
      </section>

      <section class="card">
        <h2 style="margin-bottom:.5rem">Análisis físico</h2>
        ${i.factorUGQ !== null ? `
          ${fila('Gramos de análisis', fmtKg(num(cafe.gramos)) + ' g')}
          ${fila('Malla 15 / pasilla 15', `${fmtKg(num(cafe.m15))} / ${fmtKg(num(cafe.p15))} g`)}
          ${fila('Malla 14 / pasilla 14', `${fmtKg(num(cafe.m14))} / ${fmtKg(num(cafe.p14))} g`)}
          ${fila('Malla 0', fmtKg(num(cafe.m0)) + ' g')}
          <div class="grid-2 mt-sm">
            <div class="result"><div class="small" style="opacity:.9">Factor UGQ</div><div class="mid-num">${fmt2(i.factorUGQ)}</div><div class="small" style="opacity:.9">≈ ${fmtKg(Math.round(proyeccionExcelso(i.disponible, i.factorUGQ)))} kg excelso</div></div>
            <div class="result"><div class="small" style="opacity:.9">Factor EP*</div><div class="mid-num">${i.factorEP ? fmt2(i.factorEP) : '—'}</div><div class="small" style="opacity:.9">${i.factorEP ? `≈ ${fmtKg(Math.round(proyeccionExcelso(i.disponible, i.factorEP)))} kg excelso` : ''}</div></div>
          </div>
          <p class="small muted mt-sm">Excelso calculado sobre los kilos disponibles. *Fórmula EP por confirmar.</p>` : `<p class="muted">Sin análisis físico. <a href="#/cafe-form?id=${encodeURIComponent(cafe.id)}">Agregarlo</a></p>`}
      </section>

      <section class="card">
        <div class="card-title">${icon('truck')}<h2>Salidas</h2></div>
        ${i.salidas.length ? i.salidas.map((s) => `<div class="row plain"><span>${esc(fmtFecha(s.fecha))} · ${esc(s.tipo)}${s.comprador ? `<br><span class="small muted">${esc(s.comprador)}</span>` : ''}</span>
          <span>${fmtKg(num(s.kg))} kg${num(s.precioKg) ? `<br><span class="small muted">${fmtCOP(num(s.kg) * num(s.precioKg))}</span>` : ''}</span></div>`).join('') : '<p class="muted">Aún no ha salido café.</p>'}
      </section>
    </div>`;

  root.querySelector('#compartir').addEventListener('click', () => {
    const l = [
      `☕ ${i.nombre}`, `Código: ${cafe.id}`,
      `Lotes: ${i.lotes.map((x) => x.nombre).join(', ')}`,
      `Disponible: ${fmtKg(i.disponible)} kg de pergamino seco`,
      num(cafe.humedad) ? `Humedad: ${fmtKg(num(cafe.humedad))} %` : '',
      [cafe.tipoFermentacion, cafe.tiempoFermentacion].some(Boolean) ? `Fermentación: ${[cafe.tipoFermentacion, cafe.tiempoFermentacion].filter(Boolean).join(', ')}` : '',
      [cafe.tipoSecado, cafe.tiempoSecado].some(Boolean) ? `Secado: ${[cafe.tipoSecado, cafe.tiempoSecado].filter(Boolean).join(', ')}` : '',
      i.factorUGQ ? `Factor UGQ: ${fmt2(i.factorUGQ)}` : '',
      i.puntaje !== null ? `Puntaje: ${fmt2(i.puntaje)} (${clasificacion(i.puntaje)})` : '',
      i.perfilTexto ? `Perfil: ${i.perfilTexto}` : '',
      '', 'Enviado desde DataCafé|Finca',
    ].filter((x, n, a) => x !== '' || n === a.length - 2);
    shareText(i.nombre, l.join('\n'));
  });
}
