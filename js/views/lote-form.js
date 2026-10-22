// Crear o editar un lote (y, si hace falta, su finca).
import { data, put, del, uid } from '../db.js';
import { num, fmtNum, areaHa, UNIDADES_AREA } from '../calc.js';
import { VARIEDADES, ESTADOS_LOTE } from '../listas.js';
import { esc, icon, field, seg, bindSeg, toast, go } from '../ui.js';
import { htmlCombo, montarCombo } from '../combo.js';
import { fincasOrdenadas, equivalencias } from '../model.js';

const NUEVA = '__nueva';

export async function render(root, { q }) {
  const editId = q.get('id');
  const existente = editId ? data.lotes.find((l) => l.id === editId) : null;
  if (editId && !existente) { root.innerHTML = `<p class="empty">No se encontró el lote.</p>`; return; }
  const fincas = fincasOrdenadas();
  const v = {
    fincaId: q.get('finca') || (fincas[0] ? fincas[0].id : NUEVA), nombre: '', area: '', unidad: 'ha', altitud: '', fechaSiembra: '',
    variedades: [], arboles: '', estado: 'activo',
    ...(existente ? JSON.parse(JSON.stringify(existente)) : {}),
  };
  const salir = existente ? `#/lote/${encodeURIComponent(existente.id)}` : '#/lotes';
  const usadas = [...new Set(data.lotes.flatMap((l) => l.variedades || []))].filter((x) => !VARIEDADES.includes(x));

  root.innerHTML = `<div class="form-narrow">
    <header class="topbar">
      <a class="icon-btn" href="${salir}" aria-label="Cancelar">${icon('close')}</a>
      <h1>${existente ? 'Editar lote' : 'Nuevo lote'}</h1>
    </header>
    <form id="form" class="stack" novalidate>
      <section class="card stack-sm">
        <h2>Finca</h2>
        ${fincas.length ? seg('fincaId', [...fincas.map((f) => [f.id, f.nombre]), [NUEVA, '+ Nueva finca']], v.fincaId, 'wrap') : ''}
        <div id="nueva-finca" class="stack-sm" ${v.fincaId === NUEVA ? '' : 'hidden'}>
          ${field('fincaNombre', 'Nombre de la finca', '', 'autocomplete="off" placeholder="Ej.: La Esperanza"')}
          ${field('fincaMunicipio', 'Municipio (opcional)', '', 'autocomplete="off"')}
        </div>
      </section>

      <section class="card stack-sm">
        <h2>El lote</h2>
        ${field('nombre', 'Nombre del lote', v.nombre, 'autocomplete="off" placeholder="Ej.: La Loma, Lote 3"')}
        <div class="field"><div class="label">Unidad del área</div>${seg('unidad', UNIDADES_AREA, v.unidad, 'wrap')}</div>
        ${field('area', 'Área', v.area === '' ? '' : String(v.area).replace('.', ','), 'inputmode="decimal"', ' ')}
        <div class="grid-2">
          ${field('altitud', 'Altitud (msnm)', v.altitud === '' ? '' : String(v.altitud), 'inputmode="numeric"')}
          ${field('fechaSiembra', 'Fecha de siembra', v.fechaSiembra, 'type="date"')}
        </div>
        ${htmlCombo('var', 'Variedades', 'Escribe para buscar: Castillo, Geisha…', 'Elige todas las que tenga el lote. Si no está, escríbela y presiona Enter.')}
        ${field('arboles', 'Número de árboles (opcional)', v.arboles === '' ? '' : String(v.arboles), 'inputmode="numeric"', 'Sirve para calcular kilos por árbol.')}
        <div class="field"><div class="label">Estado</div>${seg('estado', ESTADOS_LOTE, v.estado, 'wrap')}
          <div class="hint">Solo se puede anotar recolección en lotes activos.</div></div>
      </section>

      <div id="errores" aria-live="assertive"></div>
      <button type="submit" class="btn btn-accent btn-lg btn-block">${existente ? 'Guardar cambios' : 'Crear lote'}</button>
      ${existente ? `<button type="button" class="btn btn-danger btn-block" id="borrar">${icon('trash', 'ic-sm')}Borrar lote</button>` : ''}
    </form></div>`;

  const $ = (s) => root.querySelector(s);
  const areaHint = $('#area').parentElement.querySelector('.hint');

  function pintarHa() {
    const ha = areaHa(num($('#area').value), v.unidad, equivalencias());
    areaHint.textContent = v.unidad === 'ha' ? ' ' : (num($('#area').value) > 0 ? `= ${fmtNum(ha, 2)} ha (1 ${UNIDADES_AREA.find(([k]) => k === v.unidad)[1].toLowerCase()} = ${fmtNum(equivalencias()[v.unidad])} m², se cambia en Ajustes)` : `1 ${UNIDADES_AREA.find(([k]) => k === v.unidad)[1].toLowerCase()} = ${fmtNum(equivalencias()[v.unidad])} m² (se cambia en Ajustes)`);
  }

  bindSeg(root, 'fincaId', (val) => { v.fincaId = val; $('#nueva-finca').hidden = val !== NUEVA; if (val === NUEVA) $('#fincaNombre').focus(); });
  bindSeg(root, 'unidad', (val) => { v.unidad = val; pintarHa(); });
  bindSeg(root, 'estado', (val) => { v.estado = val; });
  $('#area').addEventListener('input', pintarHa);
  montarCombo(root, 'var', {
    grupos: usadas.length ? [{ grupo: 'Usadas en tus lotes', items: usadas }, { grupo: 'Variedades', items: VARIEDADES }] : [{ grupo: 'Variedades', items: VARIEDADES }],
    seleccion: v.variedades, vacio: 'Aún no has elegido variedades.',
  });
  pintarHa();

  $('#form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = [];
    const nombre = $('#nombre').value.trim();
    const area = num($('#area').value);
    if (v.fincaId === NUEVA && !$('#fincaNombre').value.trim()) err.push('Escribe el nombre de la finca.');
    if (!nombre) err.push('Escribe el nombre del lote.');
    if (!(area > 0)) err.push('Escribe el área del lote: se usa para la productividad.');
    if (!v.variedades.length) err.push('Elige al menos una variedad.');
    if (err.length) { $('#errores').innerHTML = `<div class="alert" role="alert">${err.map(esc).join('<br>')}</div>`; return; }

    let fincaId = v.fincaId;
    if (fincaId === NUEVA) {
      const f = await put('fincas', { id: uid('f'), nombre: $('#fincaNombre').value.trim(), municipio: $('#fincaMunicipio').value.trim(), mesesPrincipal: [] });
      fincaId = f.id;
    }
    const lote = {
      id: existente ? existente.id : uid('l'), fincaId, nombre, area, unidad: v.unidad,
      altitud: num($('#altitud').value) || '', fechaSiembra: $('#fechaSiembra').value, variedades: v.variedades,
      arboles: num($('#arboles').value) || '', estado: v.estado,
    };
    await put('lotes', lote);
    toast(existente ? 'Lote actualizado' : `Lote "${nombre}" creado`);
    go(`#/lote/${encodeURIComponent(lote.id)}`);
  });

  if (existente) {
    $('#borrar').addEventListener('click', async () => {
      const usos = data.recolecciones.filter((r) => r.loteId === existente.id).length
        + data.controles.filter((c) => (c.loteIds || []).includes(existente.id)).length
        + data.cafes.filter((c) => (c.loteIds || []).includes(existente.id)).length;
      if (usos) { toast('Este lote tiene registros. Márcalo como Inactivo en vez de borrarlo.'); return; }
      if (!confirm('¿Borrar este lote?')) return;
      await del('lotes', existente.id);
      toast('Lote borrado');
      go('#/lotes');
    });
  }
}
