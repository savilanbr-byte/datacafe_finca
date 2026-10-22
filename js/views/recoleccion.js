// Recolección: anotar recogidas una tras otra, e historial por mes.
import { data, put, del, uid } from '../db.js';
import { num, fmtKg, fmtCOP, fmtFecha, hoyISO, nombreMes, totalRecoleccion, carenciasVigentes } from '../calc.js';
import { esc, icon, field, seg, bindSeg, toast, tabs, norm } from '../ui.js';
import { lotesOrdenados, nombreLote, nombreLoteId, nombreRecolector, ultimoPrecio, lote as getLote } from '../model.js';

// Se recuerdan entre recogidas para anotar rápido una pesada tras otra.
const ultimo = { fecha: null, loteId: '', variedad: '', precio: null };
let mesHist = null;
const NUEVO = '__nuevo';

export function pestanas(activa) {
  return tabs([['#/recoleccion', 'Anotar', activa === 'anotar'], ['#/recoleccion?vista=historial', 'Historial', activa === 'historial'], ['#/recolectores', 'Recolectores', activa === 'recolectores']]);
}

export async function render(root, { q }) {
  if (q.get('vista') === 'historial') return historial(root);
  const activos = lotesOrdenados('todas', { soloActivos: true });
  if (!activos.length) {
    root.innerHTML = `<header class="page-head"><div><h1>Recolección</h1></div></header>${pestanas('anotar')}
      <div class="empty"><p>${data.lotes.length ? 'No hay lotes activos. Cambia el estado de un lote a Activo para anotar recogidas.' : 'Primero crea un lote.'}</p>
      <a class="btn btn-accent mt" href="${data.lotes.length ? '#/lotes' : '#/lote-form'}">${data.lotes.length ? 'Ver lotes' : 'Crear lote'}</a></div>`;
    return;
  }
  const pedido = q.get('lote');
  if (pedido && activos.some((l) => l.id === pedido)) ultimo.loteId = pedido;
  if (!activos.some((l) => l.id === ultimo.loteId)) ultimo.loteId = activos[0].id;
  if (!ultimo.fecha) ultimo.fecha = hoyISO();
  if (ultimo.precio === null) ultimo.precio = ultimoPrecio() || '';
  const v = { recolectorId: '' };

  root.innerHTML = `
    <header class="page-head"><div><h1>Recolección</h1><p class="sub">Anota cada pesada de cereza</p></div></header>
    <div class="stack">
    ${pestanas('anotar')}
    <div class="split">
    <form id="form" class="stack" novalidate>
      <section class="card stack-sm">
        ${field('fecha', 'Fecha', ultimo.fecha, 'type="date"')}
        <div class="field"><div class="label">Lote</div>${seg('lote', activos.map((l) => [l.id, nombreLote(l)]), ultimo.loteId, 'wrap')}</div>
        <div id="aviso"></div>
        <div class="field"><div class="label">Variedad</div><div id="variedades"></div></div>
      </section>
      <section class="card stack-sm">
        <div class="field"><div class="label">Recolector</div><div id="recolectores"></div></div>
        <div id="nuevo-rec" hidden>${field('nuevoNombre', 'Nombre del nuevo recolector', '', 'autocomplete="off"')}</div>
        <div class="grid-2">
          ${field('kg', 'Kg de cereza', '', 'inputmode="decimal"')}
          ${field('precio', 'Precio por kg', ultimo.precio === '' ? '' : String(ultimo.precio), 'inputmode="numeric"')}
        </div>
        <div class="result" style="display:flex;justify-content:space-between;align-items:center" aria-live="polite">
          <span>Total a pagar</span><span class="mid-num" style="font-size:1.75rem" id="total">$0</span>
        </div>
      </section>
      <div id="errores" aria-live="assertive"></div>
      <button type="submit" class="btn btn-accent btn-lg btn-block">${icon('check')}Guardar recogida</button>
    </form>
    <section class="stack-sm mt" id="hoy"></section>
    </div></div>`;

  const $ = (s) => root.querySelector(s);
  // El campo de kg usa una clase extra para verse más grande.
  $('#kg').classList.add('input-big');

  function pintarVariedades() {
    const l = getLote(ultimo.loteId);
    const vs = (l && l.variedades) || [];
    const ops = vs.length > 1 ? [...vs, 'Mezcla'] : vs.length ? vs : ['Sin variedad'];
    if (!ops.includes(ultimo.variedad)) ultimo.variedad = ops[0];
    $('#variedades').innerHTML = seg('variedad', ops, ultimo.variedad, 'wrap');
    bindSeg(root, 'variedad', (val) => { ultimo.variedad = val; });
  }

  function pintarAviso() {
    const car = carenciasVigentes(data.controles, ultimo.loteId, $('#fecha').value || hoyISO());
    $('#aviso').innerHTML = car.length
      ? `<div class="alert warn" role="status">${icon('alert', 'ic-sm')} Este lote está en periodo de carencia hasta el <strong>${esc(fmtFecha(car[0].hasta))}</strong> por ${esc(car.map((c) => c.producto).join(', '))}. Revisa antes de cosechar.</div>`
      : '';
  }

  function pintarRecolectores() {
    const rs = data.recolectores.filter((r) => r.activo !== false).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    $('#recolectores').innerHTML = seg('recolector', [...rs.map((r) => [r.id, r.nombre]), [NUEVO, '+ Nuevo']], v.recolectorId, 'wrap');
    bindSeg(root, 'recolector', (val) => {
      v.recolectorId = val;
      $('#nuevo-rec').hidden = val !== NUEVO;
      if (val === NUEVO) $('#nuevoNombre').focus(); else $('#kg').focus();
    });
  }

  function calcular() { $('#total').textContent = fmtCOP(num($('#kg').value) * num($('#precio').value)); }

  function pintarHoy() {
    const f = $('#fecha').value || hoyISO();
    const rs = data.recolecciones.filter((r) => r.fecha === f).sort((a, b) => (a.actualizado < b.actualizado ? 1 : -1));
    const kg = rs.reduce((s, r) => s + num(r.kg), 0);
    const val = rs.reduce((s, r) => s + totalRecoleccion(r), 0);
    $('#hoy').innerHTML = `<h2 style="font-size:1.25rem">${f === hoyISO() ? 'Hoy' : esc(fmtFecha(f))}: ${fmtKg(kg)} kg · ${fmtCOP(val)}</h2>
      ${rs.length ? rs.map((r) => `<div class="item" style="flex-direction:row;align-items:center;gap:.5rem">
          <div style="flex:1;min-width:0"><div style="font-weight:600">${esc(nombreRecolector(r.recolectorId))}</div>
            <div class="small muted">${esc(nombreLoteId(r.loteId))} · ${esc(r.variedad || '')} · ${fmtCOP(num(r.precioKg))}/kg</div></div>
          <div style="text-align:right"><strong>${fmtKg(num(r.kg))} kg</strong><div class="small muted">${fmtCOP(totalRecoleccion(r))}</div></div>
          ${r.pagoId ? '<span class="badge">Pagado</span>' : `<button class="icon-btn" type="button" data-del="${esc(r.id)}" aria-label="Borrar recogida de ${esc(nombreRecolector(r.recolectorId))}">${icon('trash', 'ic-sm')}</button>`}
        </div>`).join('') : '<p class="muted">Todavía no hay recogidas este día.</p>'}`;
  }

  bindSeg(root, 'lote', (val) => { ultimo.loteId = val; pintarVariedades(); pintarAviso(); });
  $('#fecha').addEventListener('change', () => { ultimo.fecha = $('#fecha').value || hoyISO(); pintarAviso(); pintarHoy(); });
  $('#kg').addEventListener('input', calcular);
  $('#precio').addEventListener('input', calcular);
  $('#hoy').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-del]');
    if (!b || !confirm('¿Borrar esta recogida?')) return;
    await del('recolecciones', b.dataset.del);
    toast('Recogida borrada');
    pintarHoy();
  });

  $('#form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const kg = num($('#kg').value), precio = num($('#precio').value);
    const nuevoNombre = $('#nuevoNombre').value.trim();
    const err = [];
    if (!v.recolectorId) err.push('Elige quién recogió.');
    if (v.recolectorId === NUEVO && !nuevoNombre) err.push('Escribe el nombre del nuevo recolector.');
    if (!(kg > 0)) err.push('Escribe los kilos de cereza.');
    if (!(precio > 0)) err.push('Escribe el precio por kilo.');
    if (err.length) { $('#errores').innerHTML = `<div class="alert" role="alert">${err.map(esc).join('<br>')}</div>`; return; }
    $('#errores').innerHTML = '';

    let recolectorId = v.recolectorId;
    if (recolectorId === NUEVO) {
      const ya = data.recolectores.find((r) => norm(r.nombre) === norm(nuevoNombre));
      recolectorId = ya ? ya.id : (await put('recolectores', { id: uid('r'), nombre: nuevoNombre, telefono: '', activo: true })).id;
    }
    ultimo.fecha = $('#fecha').value || hoyISO();
    ultimo.precio = precio;
    await put('recolecciones', {
      id: uid('rc'), fecha: ultimo.fecha, loteId: ultimo.loteId, variedad: ultimo.variedad, recolectorId, kg, precioKg: precio,
    });
    toast(`${nombreRecolector(recolectorId)}: ${fmtKg(kg)} kg · ${fmtCOP(kg * precio)}`);
    // Queda listo para la siguiente pesada: mismo lote, fecha y precio.
    v.recolectorId = '';
    $('#kg').value = '';
    $('#nuevoNombre').value = '';
    $('#nuevo-rec').hidden = true;
    pintarRecolectores();
    calcular();
    pintarHoy();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  pintarVariedades();
  pintarAviso();
  pintarRecolectores();
  calcular();
  pintarHoy();
}

function historial(root) {
  if (!mesHist) mesHist = hoyISO().slice(0, 7);
  const rs = data.recolecciones.filter((r) => (r.fecha || '').startsWith(mesHist)).sort((a, b) => ((a.fecha || '') + a.actualizado < (b.fecha || '') + b.actualizado ? 1 : -1));
  const kg = rs.reduce((s, r) => s + num(r.kg), 0);
  const val = rs.reduce((s, r) => s + totalRecoleccion(r), 0);
  const pend = rs.filter((r) => !r.pagoId).reduce((s, r) => s + totalRecoleccion(r), 0);
  const porLote = new Map();
  for (const r of rs) porLote.set(r.loteId, (porLote.get(r.loteId) || 0) + num(r.kg));
  const dias = new Map();
  for (const r of rs) { if (!dias.has(r.fecha)) dias.set(r.fecha, []); dias.get(r.fecha).push(r); }

  root.innerHTML = `
    <header class="page-head"><div><h1>Recolección</h1><p class="sub">${esc(nombreMes(mesHist))}</p></div></header>
    <div class="stack">
      ${pestanas('historial')}
      <div class="field" style="max-width:16rem"><label for="mes">Mes</label><input class="input" type="month" id="mes" value="${mesHist}"></div>
      <section class="card">
        <div class="row"><span>Cereza recogida</span><strong>${fmtKg(kg)} kg</strong></div>
        <div class="row"><span>Valor de la recolección</span><strong>${fmtCOP(val)}</strong></div>
        <div class="row"><span>Sin pagar</span><strong ${pend > 0 ? 'style="color:var(--accent)"' : ''}>${fmtCOP(pend)}</strong></div>
      </section>
      ${porLote.size ? `<section class="card"><h2 style="margin-bottom:.5rem">Por lote</h2>${[...porLote.entries()].sort((a, b) => b[1] - a[1]).map(([id, k]) => `<div class="row"><span>${esc(nombreLoteId(id))}</span><strong>${fmtKg(k)} kg</strong></div>`).join('')}</section>` : ''}
      <div class="stack" id="dias">
        ${dias.size ? [...dias.entries()].map(([f, lista]) => `<section class="stack-sm">
          <h2 style="font-size:1.125rem">${esc(fmtFecha(f))} <span class="small muted" style="font-family:var(--font-body);font-weight:400">· ${fmtKg(lista.reduce((s, r) => s + num(r.kg), 0))} kg</span></h2>
          ${lista.map((r) => `<div class="item" style="flex-direction:row;align-items:center;gap:.5rem">
            <div style="flex:1;min-width:0"><div style="font-weight:600">${esc(nombreRecolector(r.recolectorId))}</div>
              <div class="small muted">${esc(nombreLoteId(r.loteId))} · ${esc(r.variedad || '')}</div></div>
            <div style="text-align:right"><strong>${fmtKg(num(r.kg))} kg</strong><div class="small muted">${fmtCOP(totalRecoleccion(r))}</div></div>
            ${r.pagoId ? '<span class="badge">Pagado</span>' : `<button class="icon-btn" type="button" data-del="${esc(r.id)}" aria-label="Borrar recogida">${icon('trash', 'ic-sm')}</button>`}
          </div>`).join('')}</section>`).join('') : '<p class="empty">No hay recogidas en este mes.</p>'}
      </div>
    </div>`;
  root.querySelector('#mes').addEventListener('change', (e) => { if (e.target.value) { mesHist = e.target.value; historial(root); } });
  root.querySelector('#dias').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-del]');
    if (!b || !confirm('¿Borrar esta recogida?')) return;
    await del('recolecciones', b.dataset.del);
    toast('Recogida borrada');
    historial(root);
  });
}
