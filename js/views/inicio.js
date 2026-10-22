import { data } from '../db.js';
import { tablero, fincasOrdenadas, fincaFiltro, nombreLote, nombresLotes } from '../model.js';
import { fmtKg, fmtCOP, fmtNum, fmtFecha, nombreMes } from '../calc.js';
import { esc, icon, toast, setPref } from '../ui.js';
import { cargarEjemplo } from '../seed.js';

export function encabezado() {
  return `<header class="appbar">
      <div class="wordmark">DataCafé<span class="pipe">|</span><span class="lab">Finca</span></div>
      <div style="display:flex;align-items:center;gap:.25rem">
        <span class="pill">${icon('phone', 'ic-sm')}Guardado aquí</span>
        <a class="icon-btn" href="#/ajustes" aria-label="Ajustes">${icon('settings')}</a>
      </div>
    </header>`;
}

/** Chips para elegir finca (solo si hay más de una). */
export function filtroFincas(actual) {
  const fincas = fincasOrdenadas();
  if (fincas.length < 2) return '';
  return `<div class="chips" id="fincas" role="group" aria-label="Elegir finca">
    ${[['todas', 'Todas las fincas'], ...fincas.map((f) => [f.id, f.nombre])].map(([id, n]) =>
      `<button type="button" class="chip" data-finca="${esc(id)}" aria-pressed="${actual === id}">${esc(n)}</button>`).join('')}
  </div>`;
}

export function bindFiltroFincas(root, rerender) {
  const box = root.querySelector('#fincas');
  if (!box) return;
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-finca]');
    if (!b) return;
    setPref('finca', b.dataset.finca);
    rerender();
  });
}

export async function render(root) {
  const fincaId = fincaFiltro();
  const t = tablero(fincaId);

  if (t.vacio) {
    root.innerHTML = `${encabezado()}
      <div class="stack form-narrow">
        <div><h1 style="font-size:2.125rem">Inicio</h1><p class="sub">Aún no hay lotes registrados.</p></div>
        <div class="card stack-sm">
          <h2>Empecemos</h2>
          <p class="muted">Crea tu finca y su primer lote. Con eso ya puedes anotar controles, labores y recolección.</p>
          <a class="btn btn-accent btn-lg btn-block mt-sm" href="#/lote-form">${icon('plus')}Crear finca y lote</a>
          <button class="btn btn-block" type="button" id="demo">Ver con datos de ejemplo</button>
          <p class="small muted">Los datos de ejemplo se borran desde Ajustes.</p>
        </div>
      </div>`;
    root.querySelector('#demo').onclick = async () => {
      await cargarEjemplo();
      toast('Datos de ejemplo cargados');
      render(root);
    };
    return;
  }

  const dif = t.kgAnt > 0 ? Math.round((100 * (t.kgMes - t.kgAnt)) / t.kgAnt) : null;
  const maxL = Math.max(1, ...t.porLote.map((l) => l.kg));
  const p = t.pendiente;

  root.innerHTML = `${encabezado()}
    <div class="stack dash">
      <div class="full stack-sm"><div><h1 style="font-size:2.125rem">Inicio</h1><p class="sub">Así va ${fincaId === 'todas' ? (data.fincas.length > 1 ? 'tu café' : esc((data.fincas[0] || {}).nombre || 'tu finca')) : esc((data.fincas.find((f) => f.id === fincaId) || {}).nombre)} en ${esc(nombreMes(t.mes).toLowerCase())}</p></div>
        ${filtroFincas(fincaId)}</div>

      <a class="hero" href="#/recoleccion?vista=historial">
        <div class="label">Cereza recogida este mes</div>
        <div class="big-num">${fmtKg(t.kgMes)} <small>kg</small></div>
        <div class="small" style="opacity:.92">${t.nRecogidas} ${t.nRecogidas === 1 ? 'recogida' : 'recogidas'} · ${fmtCOP(t.valorMes)} en recolección${dif !== null ? ` · ${dif >= 0 ? '+' : ''}${dif}% frente al mes pasado` : ''}</div>
      </a>

      <div class="grid-2 span-2">
        <a class="card" href="#/lotes?vista=productividad">
          <div class="small muted">Productividad del mes</div>
          <div class="mid-num">${t.prodMes !== null ? fmtNum(t.prodMes, 0) : '—'} <small>kg/ha</small></div>
          <div class="small muted">${fmtNum(t.haActivas, 2)} ha en producción</div>
        </a>
        <a class="card" href="#/recolectores">
          <div class="small muted">Por pagar a recolectores</div>
          <div class="mid-num" ${p.valor > 0 ? 'style="color:var(--accent)"' : ''}>${fmtCOP(p.valor)}</div>
          <div class="small muted">${p.personas ? `${p.personas} ${p.personas === 1 ? 'persona' : 'personas'} · ${fmtKg(p.kg)} kg` : 'Todo al día'}</div>
        </a>
      </div>

      ${t.alertas.length ? `<section class="card alert-card">
        <div class="card-title">${icon('alert')}<h2>Cuidado en estos lotes</h2></div>
        <div class="stack-sm">${t.alertas.map((a) => `<a class="alerta" href="#/lote/${encodeURIComponent(a.lote.id)}">
          <strong>${esc(nombreLote(a.lote))}</strong>
          <span>${a.tipo === 'carencia' ? 'No cosechar' : 'No entrar'} hasta el ${esc(fmtFecha(a.hasta).slice(0, 5))} · ${esc(a.producto)}</span></a>`).join('')}</div>
      </section>` : ''}

      <a class="card" href="#/bodega">
        <div class="card-title">${icon('warehouse')}<h2>Bodega</h2></div>
        <div class="mid-num">${fmtKg(t.pergamino)} <small>kg de pergamino seco</small></div>
        <div class="small muted">${t.nCafes} ${t.nCafes === 1 ? 'café disponible' : 'cafés disponibles'}</div>
      </a>

      <section class="card ${t.alertas.length ? '' : 'span-2'}">
        <div class="card-title">${icon('leaf')}<h2>Cereza por lote este mes</h2></div>
        ${t.porLote.length ? `<div class="stack-sm">${t.porLote.map((l) => `<a href="#/lote/${encodeURIComponent(l.lote.id)}" style="text-decoration:none;color:inherit">
            <div style="display:flex;justify-content:space-between;gap:.5rem;font-size:.9375rem;margin-bottom:.375rem"><span>${esc(nombreLote(l.lote))}</span>
              <span><strong style="font-weight:600">${fmtKg(l.kg)} kg</strong> <span class="muted small">· ${l.kgHa !== null ? fmtNum(l.kgHa, 0) + ' kg/ha' : 'sin área'}</span></span></div>
            <div class="bar" role="img" aria-label="${esc(nombreLote(l.lote))}: ${fmtKg(l.kg)} kg"><span style="width:${(100 * l.kg) / maxL}%"></span></div>
          </a>`).join('')}</div>` : '<p class="muted">No hay lotes activos.</p>'}
      </section>

      <section class="card">
        <div class="card-title">${icon('spray')}<h2>Últimos controles</h2></div>
        ${t.controles.length ? t.controles.map((c) => `<a class="row plain" href="#/control-form?id=${encodeURIComponent(c.id)}" style="text-decoration:none;color:inherit">
            <span>${esc(c.tipo)}<br><span class="small muted">${esc(nombresLotes(c.loteIds))}</span></span>
            <span class="small muted">${esc(fmtFecha(c.fecha))}</span></a>`).join('') : '<p class="muted">Aún no hay controles registrados.</p>'}
      </section>

      <div class="btn-row full">
        <a class="btn btn-accent btn-lg" href="#/recoleccion">${icon('basket')}Anotar recogida</a>
        <a class="btn btn-lg" href="#/control-form">${icon('spray')}Anotar control</a>
      </div>
    </div>`;

  bindFiltroFincas(root, () => render(root));
}
