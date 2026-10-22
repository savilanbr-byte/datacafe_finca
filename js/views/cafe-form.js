// Ingresar o editar un café en bodega (pergamino seco).
import { data, put, del, nextCode } from '../db.js';
import { num, fmt2, fmtKg, factor, proyeccionExcelso, hoyISO, nombreCafe } from '../calc.js';
import { PROCESOS, VARIEDADES } from '../listas.js';
import { esc, icon, field, textarea, seg, bindSeg, chipsMulti, bindChips, toast, go } from '../ui.js';
import { fincasOrdenadas, lotesOrdenados, fincaNombre } from '../model.js';

export async function render(root, { q }) {
  const editId = q.get('id');
  const existente = editId ? data.cafes.find((c) => c.id === editId) : null;
  if (editId && !existente) { root.innerHTML = `<p class="empty">No se encontró el café.</p>`; return; }
  const v = {
    fechaIngreso: hoyISO(), loteIds: [], variedades: [], kgPergamino: '', humedad: '', proceso: '',
    tipoFermentacion: '', tiempoFermentacion: '', tipoSecado: '', tiempoSecado: '',
    gramos: '', m15: '', p15: '', m14: '', p14: '', m0: '', comentarios: '',
    ...(existente ? JSON.parse(JSON.stringify(existente)) : {}),
  };
  const salir = existente ? `#/cafe/${encodeURIComponent(existente.id)}` : '#/bodega';
  const fincas = fincasOrdenadas();
  const s = (x) => (x === '' || x === undefined || x === null ? '' : String(x).replace('.', ','));
  const yaSalio = existente ? data.salidas.filter((x) => x.cafeId === existente.id).reduce((t, x) => t + num(x.kg), 0) : 0;

  root.innerHTML = `<div class="form-narrow">
    <header class="topbar">
      <a class="icon-btn" href="${salir}" aria-label="Cancelar">${icon('close')}</a>
      <div style="flex:1"><h1>${existente ? 'Editar ' + esc(existente.id) : 'Ingresar café'}</h1><div class="small muted">Pergamino seco, al terminar el beneficio</div></div>
    </header>
    <form id="form" class="stack" novalidate>
      <section class="card stack-sm">
        <h2>Origen</h2>
        ${field('fechaIngreso', 'Fecha de ingreso a bodega', v.fechaIngreso, 'type="date"')}
        <div class="field"><div class="label">Lotes de donde viene</div>
          ${data.lotes.length ? fincas.map((f) => {
            const ls = lotesOrdenados(f.id);
            return ls.length ? `<div class="stack-sm mt-sm">${fincas.length > 1 ? `<div class="small muted">${esc(f.nombre)}</div>` : ''}${chipsMulti('lotes', ls.map((l) => [l.id, l.nombre]), v.loteIds)}</div>` : '';
          }).join('') : '<p class="note">Aún no hay lotes. <a href="#/lote-form">Crear lote</a></p>'}
          <div class="hint">Puede venir de uno o varios lotes.</div></div>
        <div class="field"><div class="label">Variedades</div><div id="variedades"></div></div>
        <div class="note" id="nombre-cafe"></div>
      </section>

      <section class="card stack-sm">
        <h2>Pergamino seco</h2>
        <div class="grid-2">
          ${field('kgPergamino', 'Kg de pergamino', s(v.kgPergamino), 'inputmode="decimal"')}
          ${field('humedad', 'Humedad (%)', s(v.humedad), 'inputmode="decimal"')}
        </div>
        ${yaSalio ? `<p class="small muted">Ya salieron ${fmtKg(yaSalio)} kg de este café.</p>` : ''}
      </section>

      <section class="card stack-sm">
        <h2>Proceso</h2>
        <div class="field"><div class="label">Proceso</div>${seg('proceso', PROCESOS, v.proceso)}</div>
        ${textarea('tipoFermentacion', 'Tipo de fermentación', v.tipoFermentacion, 'placeholder="Ej.: en tanque, con agua, anaeróbica…"')}
        ${field('tiempoFermentacion', 'Tiempo de fermentación', v.tiempoFermentacion, 'autocomplete="off" placeholder="Ej.: 36 h"')}
        ${textarea('tipoSecado', 'Tipo de secado', v.tipoSecado, 'placeholder="Ej.: marquesina, camas africanas, silo…"')}
        ${field('tiempoSecado', 'Tiempo de secado', v.tiempoSecado, 'autocomplete="off" placeholder="Ej.: 12 días"')}
      </section>

      <section class="card stack-sm">
        <h2>Análisis físico <span class="small muted" style="font-family:var(--font-body);font-weight:400">(se puede completar después)</span></h2>
        ${field('gramos', 'Gramos de análisis (pergamino)', s(v.gramos), 'inputmode="numeric"')}
        <div class="grid-2">
          ${field('m15', 'Peso malla 15 (g)', s(v.m15), 'inputmode="decimal"')}
          ${field('p15', 'Pasilla malla 15 (g)', s(v.p15), 'inputmode="decimal"')}
          ${field('m14', 'Peso malla 14 (g)', s(v.m14), 'inputmode="decimal"')}
          ${field('p14', 'Pasilla malla 14 (g)', s(v.p14), 'inputmode="decimal"')}
          ${field('m0', 'Peso malla 0 (g)', s(v.m0), 'inputmode="decimal"', 'Se anota, pero no entra en el factor.')}
        </div>
        <div class="alert warn" id="aviso-mallas" hidden></div>
        <div class="result grid-2" aria-live="polite">
          <div><div class="small" style="opacity:.9">Factor UGQ</div><div class="mid-num" id="f-ugq">—</div><div class="small" style="opacity:.9" id="x-ugq"></div></div>
          <div><div class="small" style="opacity:.9">Factor EP <span title="Fórmula por confirmar">*</span></div><div class="mid-num" id="f-ep">—</div><div class="small" style="opacity:.9" id="x-ep"></div></div>
        </div>
        <p class="small muted">UGQ = 70 ÷ ((malla 15 + malla 14 − pasillas) ÷ gramos). EP = 70 ÷ ((malla 15 − pasilla 15) ÷ gramos). *La del EP está por confirmar.</p>
      </section>

      <section class="card stack-sm">${textarea('comentarios', 'Comentarios', v.comentarios)}</section>

      <div id="errores" aria-live="assertive"></div>
      <button type="submit" class="btn btn-accent btn-lg btn-block">${existente ? 'Guardar cambios' : 'Ingresar a bodega'}</button>
      ${existente ? `<button type="button" class="btn btn-danger btn-block" id="borrar">${icon('trash', 'ic-sm')}Borrar café</button>` : ''}
    </form></div>`;

  const $ = (sel) => root.querySelector(sel);

  function opcionesVariedad() {
    const deLotes = [...new Set(v.loteIds.flatMap((id) => (data.lotes.find((l) => l.id === id) || {}).variedades || []))];
    const base = deLotes.length ? deLotes : VARIEDADES;
    return [...new Set([...base, ...v.variedades])];
  }
  function pintarVariedades() {
    // Si los lotes elegidos tienen una sola variedad, se marca sola.
    const ops = opcionesVariedad();
    if (!v.variedades.length && v.loteIds.length && ops.length === 1) v.variedades.push(ops[0]);
    $('#variedades').innerHTML = chipsMulti('variedades', ops, v.variedades);
    bindChips(root, 'variedades', v.variedades, pintarNombre);
    pintarNombre();
  }
  function pintarNombre() {
    const fs = v.loteIds.map((id) => (data.lotes.find((l) => l.id === id) || {}).fincaId).filter(Boolean).map(fincaNombre);
    $('#nombre-cafe').innerHTML = `Nombre del café: <strong>${esc(nombreCafe(v, fs))}</strong>`;
  }
  function leerAnalisis() {
    for (const k of ['gramos', 'm15', 'p15', 'm14', 'p14', 'm0']) v[k] = $('#' + k).value;
    const u = factor(v, 'UGQ'), e = factor(v, 'EP');
    const kg = num($('#kgPergamino').value);
    $('#f-ugq').textContent = u ? fmt2(u) : '—';
    $('#f-ep').textContent = e ? fmt2(e) : '—';
    $('#x-ugq').textContent = u && kg ? `≈ ${fmtKg(Math.round(proyeccionExcelso(kg, u)))} kg excelso` : '';
    $('#x-ep').textContent = e && kg ? `≈ ${fmtKg(Math.round(proyeccionExcelso(kg, e)))} kg excelso` : '';
    const suma = ['m15', 'm14', 'm0'].reduce((t, k) => t + num(v[k]), 0);
    const aviso = $('#aviso-mallas');
    aviso.hidden = !(num(v.gramos) > 0 && suma > num(v.gramos));
    aviso.textContent = 'Las mallas suman más que los gramos de análisis. Revisa los datos.';
  }

  bindChips(root, 'lotes', v.loteIds, () => { v.variedades = v.variedades.filter((x) => opcionesVariedad().includes(x)); pintarVariedades(); });
  bindSeg(root, 'proceso', (val) => { v.proceso = val; pintarNombre(); });
  ['gramos', 'm15', 'p15', 'm14', 'p14', 'm0', 'kgPergamino'].forEach((k) => $('#' + k).addEventListener('input', leerAnalisis));

  $('#form').addEventListener('submit', async (e) => {
    e.preventDefault();
    leerAnalisis();
    const kg = num($('#kgPergamino').value);
    const err = [];
    if (!v.loteIds.length) err.push('Elige de qué lote o lotes viene el café.');
    if (!v.variedades.length) err.push('Elige al menos una variedad.');
    if (!(kg > 0)) err.push('Escribe los kg de pergamino seco.');
    else if (kg < yaSalio) err.push(`Ya salieron ${fmtKg(yaSalio)} kg de este café: los kg no pueden ser menos.`);
    if (!v.proceso) err.push('Elige el proceso.');
    if (err.length) { $('#errores').innerHTML = `<div class="alert" role="alert">${err.map(esc).join('<br>')}</div>`; return; }

    const id = existente ? existente.id : await nextCode('C', 4);
    const t = (k) => $('#' + k).value.trim();
    await put('cafes', {
      id, fechaIngreso: t('fechaIngreso') || hoyISO(), loteIds: v.loteIds, variedades: v.variedades, kgPergamino: kg,
      humedad: num(t('humedad')) || '', proceso: v.proceso,
      tipoFermentacion: t('tipoFermentacion'), tiempoFermentacion: t('tiempoFermentacion'), tipoSecado: t('tipoSecado'), tiempoSecado: t('tiempoSecado'),
      gramos: num(v.gramos) || '', m15: num(v.m15) || '', p15: num(v.p15) || '', m14: num(v.m14) || '', p14: num(v.p14) || '', m0: num(v.m0) || '',
      comentarios: t('comentarios'),
    });
    toast(existente ? 'Café actualizado' : `Café ${id} ingresado a bodega`);
    go(`#/cafe/${encodeURIComponent(id)}`);
  });

  if (existente) {
    $('#borrar').addEventListener('click', async () => {
      const usos = data.salidas.filter((x) => x.cafeId === existente.id).length + data.cataciones.filter((x) => x.cafeId === existente.id).length;
      if (usos && !confirm('Este café tiene cataciones o salidas, que también se borrarán. ¿Continuar?')) return;
      if (!usos && !confirm('¿Borrar este café?')) return;
      for (const x of data.salidas.filter((y) => y.cafeId === existente.id)) await del('salidas', x.id);
      for (const x of data.cataciones.filter((y) => y.cafeId === existente.id)) await del('cataciones', x.id);
      await del('cafes', existente.id);
      toast('Café borrado');
      go('#/bodega');
    });
  }

  pintarVariedades();
  leerAnalisis();
}
