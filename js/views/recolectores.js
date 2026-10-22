// Recolectores: lo que se le debe a cada uno, pagos e historial.
import { data, put, putMany, del, uid } from '../db.js';
import { num, fmtKg, fmtCOP, fmtFecha, hoyISO, totalRecoleccion } from '../calc.js';
import { esc, icon, field, toast, go, shareText, norm } from '../ui.js';
import { recolectoresInfo, totalPendiente, nombreLoteId, recolector as getRecolector } from '../model.js';
import { pestanas } from './recoleccion.js';

export async function render(root, { parts }) {
  if (parts[0] === 'recolector') return ficha(root, decodeURIComponent(parts[1] || ''));
  const info = recolectoresInfo();
  const t = totalPendiente();
  const activos = info.filter((i) => i.recolector.activo !== false);
  const inactivos = info.filter((i) => i.recolector.activo === false);

  root.innerHTML = `
    <header class="page-head"><div><h1>Recolectores</h1><p class="sub">Por pagar: <strong style="color:${t.valor > 0 ? 'var(--accent)' : 'inherit'}">${fmtCOP(t.valor)}</strong> · ${fmtKg(t.kg)} kg</p></div></header>
    <div class="stack">
      ${pestanas('recolectores')}
      <form id="nuevo" class="card stack-sm" novalidate>
        <h2>Agregar recolector</h2>
        <div style="display:flex;gap:.5rem;align-items:flex-end">
          <div class="field" style="flex:1"><label for="nombre">Nombre</label><input class="input" id="nombre" autocomplete="off"></div>
          <button class="btn" type="submit">${icon('plus', 'ic-sm')}Agregar</button>
        </div>
      </form>
      <div class="cards-grid stack-sm">
        ${activos.length ? activos.map(tarjeta).join('') : '<p class="empty">Aún no hay recolectores. También se agregan al anotar una recogida.</p>'}
      </div>
      ${inactivos.length ? `<h2 style="font-size:1.125rem" class="muted mt">Inactivos</h2><div class="cards-grid stack-sm">${inactivos.map(tarjeta).join('')}</div>` : ''}
    </div>`;

  root.querySelector('#nuevo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = root.querySelector('#nombre').value.trim();
    if (!nombre) return;
    if (data.recolectores.some((r) => norm(r.nombre) === norm(nombre))) { toast('Ya hay un recolector con ese nombre'); return; }
    await put('recolectores', { id: uid('r'), nombre, telefono: '', activo: true });
    toast(`${nombre} agregado`);
    render(root, { parts });
  });
}

function tarjeta(i) {
  const r = i.recolector;
  return `<a class="item" href="#/recolector/${encodeURIComponent(r.id)}">
    <div class="item-top"><span>${i.n ? `${i.n} ${i.n === 1 ? 'recogida' : 'recogidas'} sin pagar · ${fmtKg(i.kg)} kg` : 'Al día'}</span>
      ${i.valor > 0 ? '<span class="badge warn">Pendiente</span>' : '<span class="badge">Al día</span>'}</div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;gap:.5rem">
      <span class="item-name">${esc(r.nombre)}</span><strong style="font-size:1.125rem">${fmtCOP(i.valor)}</strong></div>
  </a>`;
}

function ficha(root, id) {
  const r = getRecolector(id);
  if (!r) { root.innerHTML = `<div class="empty"><p>No se encontró el recolector.</p><a class="btn mt" href="#/recolectores">Volver</a></div>`; return; }
  const pend = data.recolecciones.filter((x) => x.recolectorId === id && !x.pagoId).sort((a, b) => (a.fecha < b.fecha ? -1 : 1));
  const kg = pend.reduce((s, x) => s + num(x.kg), 0);
  const valor = pend.reduce((s, x) => s + totalRecoleccion(x), 0);
  const pagos = data.pagos.filter((p) => p.recolectorId === id).sort((a, b) => ((a.fecha || '') + a.actualizado < (b.fecha || '') + b.actualizado ? 1 : -1));
  const todas = data.recolecciones.filter((x) => x.recolectorId === id);
  const kgAnio = todas.filter((x) => (x.fecha || '').startsWith(hoyISO().slice(0, 4))).reduce((s, x) => s + num(x.kg), 0);

  root.innerHTML = `
    <header class="topbar">
      <a class="icon-btn" href="#/recolectores" aria-label="Volver">${icon('back')}</a>
      <div style="flex:1;min-width:0"><h1>${esc(r.nombre)}</h1><div class="small muted">${fmtKg(kgAnio)} kg recogidos este año</div></div>
    </header>
    <div class="stack flow-2">
      <section class="hero">
        <div class="label">Pendiente por pagar</div>
        <div class="big-num">${fmtCOP(valor)}</div>
        <div class="small" style="opacity:.92">${pend.length} ${pend.length === 1 ? 'recogida' : 'recogidas'} · ${fmtKg(kg)} kg de cereza</div>
      </section>
      ${pend.length ? `<div class="btn-row">
        <button class="btn btn-accent btn-lg grow" type="button" id="pagar">${icon('cash')}Registrar pago</button>
        <button class="btn btn-lg" type="button" id="compartir" aria-label="Compartir cuenta">${icon('share')}</button>
      </div>` : ''}

      <section class="card">
        <h2 style="margin-bottom:.5rem">Recogidas sin pagar</h2>
        ${pend.length ? pend.map((x) => `<div class="row plain"><span>${esc(fmtFecha(x.fecha))}<br><span class="small muted">${esc(nombreLoteId(x.loteId))} · ${fmtCOP(num(x.precioKg))}/kg</span></span>
          <span>${fmtKg(num(x.kg))} kg<br><strong>${fmtCOP(totalRecoleccion(x))}</strong></span></div>`).join('') : '<p class="muted">No hay nada pendiente.</p>'}
      </section>

      <section class="card">
        <h2 style="margin-bottom:.5rem">Pagos</h2>
        ${pagos.length ? pagos.map((p, n) => `<div class="row plain" style="align-items:center" ${n >= 6 ? 'data-extra hidden' : ''}>
          <span>${esc(fmtFecha(p.fecha))}<br><span class="small muted">${(p.recoleccionIds || []).length} ${(p.recoleccionIds || []).length === 1 ? 'recogida' : 'recogidas'} · ${fmtKg(num(p.kg))} kg</span></span>
          <span style="display:flex;align-items:center;gap:.25rem"><strong>${fmtCOP(num(p.valor))}</strong>
            <button class="icon-btn" type="button" data-deshacer="${esc(p.id)}" aria-label="Deshacer pago del ${esc(fmtFecha(p.fecha))}">${icon('trash', 'ic-sm')}</button></span></div>`).join('') : '<p class="muted">Aún no hay pagos.</p>'}
        ${pagos.length > 6 ? `<button class="btn btn-block mt-sm" type="button" id="ver-pagos">Ver todos los pagos (${pagos.length})</button>` : ''}
      </section>

      <form class="card stack-sm" id="datos" novalidate>
        <h2>Datos</h2>
        ${field('nombre', 'Nombre', r.nombre, 'autocomplete="off"')}
        ${field('telefono', 'Celular (opcional)', r.telefono || '', 'inputmode="tel" autocomplete="off"')}
        <label class="check"><input type="checkbox" id="activo" ${r.activo !== false ? 'checked' : ''}> Activo (aparece al anotar recogidas)</label>
        <button class="btn" type="submit">Guardar datos</button>
        ${!todas.length ? `<button class="btn btn-danger" type="button" id="borrar">${icon('trash', 'ic-sm')}Borrar recolector</button>` : ''}
      </form>
    </div>`;

  const $ = (s) => root.querySelector(s);

  if (pend.length) {
    $('#pagar').addEventListener('click', async () => {
      if (!confirm(`¿Registrar el pago de ${fmtCOP(valor)} a ${r.nombre}? Las ${pend.length} recogidas quedan como pagadas.`)) return;
      const pago = { id: uid('pg'), fecha: hoyISO(), recolectorId: id, recoleccionIds: pend.map((x) => x.id), kg, valor };
      await put('pagos', pago);
      await putMany('recolecciones', pend.map((x) => ({ ...x, pagoId: pago.id })));
      toast(`Pago registrado: ${fmtCOP(valor)}`);
      ficha(root, id);
    });
    $('#compartir').addEventListener('click', () => {
      const lineas = pend.map((x) => `${fmtFecha(x.fecha)}: ${fmtKg(num(x.kg))} kg × ${fmtCOP(num(x.precioKg))} = ${fmtCOP(totalRecoleccion(x))}`);
      shareText(`Cuenta de ${r.nombre}`, `Cuenta de recolección – ${r.nombre}\n\n${lineas.join('\n')}\n\nTotal: ${fmtKg(kg)} kg · ${fmtCOP(valor)}`);
    });
  }

  const ver = $('#ver-pagos');
  if (ver) ver.addEventListener('click', () => { root.querySelectorAll('[data-extra]').forEach((x) => { x.hidden = false; }); ver.remove(); });

  root.querySelectorAll('[data-deshacer]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('¿Deshacer este pago? Sus recogidas vuelven a quedar pendientes.')) return;
    const p = data.pagos.find((x) => x.id === b.dataset.deshacer);
    const recs = data.recolecciones.filter((x) => x.pagoId === p.id).map((x) => { const c = { ...x }; delete c.pagoId; return c; });
    await putMany('recolecciones', recs);
    await del('pagos', p.id);
    toast('Pago deshecho');
    ficha(root, id);
  }));

  $('#datos').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = $('#nombre').value.trim();
    if (!nombre) { toast('Escribe el nombre'); return; }
    await put('recolectores', { ...r, nombre, telefono: $('#telefono').value.trim(), activo: $('#activo').checked });
    toast('Datos guardados');
    ficha(root, id);
  });
  const borrar = $('#borrar');
  if (borrar) borrar.addEventListener('click', async () => {
    if (!confirm('¿Borrar este recolector?')) return;
    await del('recolectores', id);
    go('#/recolectores');
  });
}
