// Anotar o editar un control agronómico o una labor.
import { data, put, del, uid } from '../db.js';
import { num, hoyISO, fmtFecha, sumarDias } from '../calc.js';
import { TIPOS_APLICACION, TIPOS_LABOR, UNIDADES_DOSIS, esAplicacion } from '../listas.js';
import { esc, icon, field, textarea, seg, chipsMulti, bindChips, toast, go, norm } from '../ui.js';
import { fincasOrdenadas, lotesOrdenados } from '../model.js';

const filaVacia = () => ({ nombre: '', dosis: '', unidad: 'kg', carenciaDias: '', reingresoHoras: '' });

export async function render(root, { q }) {
  const editId = q.get('id');
  const existente = editId ? data.controles.find((c) => c.id === editId) : null;
  if (editId && !existente) { root.innerHTML = `<p class="empty">No se encontró el control.</p>`; return; }
  if (!data.lotes.length) {
    root.innerHTML = `<div class="empty"><p>Para anotar un control primero crea un lote.</p><a class="btn btn-accent mt" href="#/lote-form">${icon('plus')}Crear lote</a></div>`;
    return;
  }
  const loteParam = q.get('lote');
  const c = existente ? JSON.parse(JSON.stringify(existente)) : {
    fecha: hoyISO(), tipo: '', loteIds: loteParam ? [loteParam] : [], productos: [], costo: '', responsable: '', observaciones: '',
  };
  const salir = loteParam ? `#/lote/${encodeURIComponent(loteParam)}` : '#/controles';
  const responsables = [...new Set(data.controles.map((x) => x.responsable).filter(Boolean))];

  const fincas = fincasOrdenadas();
  const bloquesLotes = fincas.map((f) => {
    const ls = lotesOrdenados(f.id).filter((l) => (l.estado || 'activo') !== 'inactivo' || c.loteIds.includes(l.id));
    if (!ls.length) return '';
    return `<div class="stack-sm">${fincas.length > 1 ? `<div class="small muted">${esc(f.nombre)}</div>` : ''}${chipsMulti('lotes', ls.map((l) => [l.id, l.nombre]), c.loteIds)}</div>`;
  }).join('');

  root.innerHTML = `<div class="form-narrow">
    <header class="topbar">
      <a class="icon-btn" href="${salir}" aria-label="Cancelar">${icon('close')}</a>
      <h1>${existente ? 'Editar control' : 'Anotar control'}</h1>
    </header>
    <form id="form" class="stack" novalidate>
      <section class="card stack-sm">
        ${field('fecha', 'Fecha', c.fecha, 'type="date"')}
        <div class="field"><div class="label">Aplicaciones</div>${seg('tipoA', TIPOS_APLICACION, c.tipo, 'wrap')}</div>
        <div class="field"><div class="label">Labores</div>${seg('tipoL', TIPOS_LABOR, c.tipo, 'wrap')}</div>
      </section>

      <section class="card stack-sm">
        <h2>¿En qué lotes?</h2>
        <p class="small muted">Puedes elegir varios.</p>
        ${bloquesLotes}
      </section>

      <section class="card stack-sm" id="sec-prod">
        <h2>Productos <span class="small muted" id="prod-opc" style="font-family:var(--font-body);font-weight:400"></span></h2>
        <div id="productos" class="stack-sm"></div>
        <button type="button" class="btn btn-dashed" id="add-prod">${icon('plus', 'ic-sm')}Agregar producto</button>
        <datalist id="dl-prod">${data.productos.map((p) => `<option value="${esc(p.nombre)}"></option>`).join('')}</datalist>
        <p class="small muted">Carencia: días que deben pasar antes de cosechar. Reingreso: horas antes de volver a entrar al lote. Revisa la etiqueta del producto.</p>
      </section>

      <section class="card stack-sm">
        <div class="grid-2">
          ${field('costo', 'Costo total (opcional)', c.costo === '' ? '' : String(c.costo), 'inputmode="numeric" placeholder="$"')}
          ${field('responsable', '¿Quién lo hizo?', c.responsable, 'list="dl-resp" autocomplete="off"')}
        </div>
        <datalist id="dl-resp">${responsables.map((r) => `<option value="${esc(r)}"></option>`).join('')}</datalist>
        ${textarea('observaciones', 'Observaciones', c.observaciones)}
      </section>

      <div id="errores" aria-live="assertive"></div>
      <button type="submit" class="btn btn-accent btn-lg btn-block">${existente ? 'Guardar cambios' : 'Guardar control'}</button>
      ${existente ? `<button type="button" class="btn btn-danger btn-block" id="borrar">${icon('trash', 'ic-sm')}Borrar control</button>` : ''}
    </form></div>`;

  const $ = (s) => root.querySelector(s);
  const prodBox = $('#productos');

  function pintarProductos() {
    prodBox.innerHTML = c.productos.map((p, i) => `<div class="prod-row" data-i="${i}">
      <div style="display:flex;gap:.5rem;align-items:flex-end">
        <div class="field" style="flex:1"><label for="pn-${i}">Producto ${c.productos.length > 1 ? i + 1 : ''}</label>
          <input class="input" id="pn-${i}" data-k="nombre" value="${esc(p.nombre)}" list="dl-prod" autocomplete="off" placeholder="Nombre del producto"></div>
        <button type="button" class="icon-btn" data-quitar="${i}" aria-label="Quitar producto ${i + 1}">${icon('trash', 'ic-sm')}</button>
      </div>
      <div class="grid-2">
        <div class="field"><label for="pd-${i}">Dosis o cantidad</label><input class="input" id="pd-${i}" data-k="dosis" value="${esc(p.dosis)}" inputmode="decimal"></div>
        <div class="field"><label for="pu-${i}">Unidad</label><select class="input" id="pu-${i}" data-k="unidad">${[...new Set([...UNIDADES_DOSIS, p.unidad].filter(Boolean))].map((u) => `<option ${u === p.unidad ? 'selected' : ''}>${esc(u)}</option>`).join('')}</select></div>
        <div class="field"><label for="pc-${i}">Carencia (días)</label><input class="input" id="pc-${i}" data-k="carenciaDias" value="${esc(p.carenciaDias)}" inputmode="numeric" placeholder="Si aplica"></div>
        <div class="field"><label for="pr-${i}">Reingreso (horas)</label><input class="input" id="pr-${i}" data-k="reingresoHoras" value="${esc(p.reingresoHoras)}" inputmode="numeric" placeholder="Si aplica"></div>
      </div>
    </div>`).join('<div class="divider"></div>');
  }

  function ajustarTipo() {
    const apl = esAplicacion(c.tipo);
    $('#prod-opc').textContent = c.tipo && !apl ? '(opcional)' : '';
    if (apl && !c.productos.length) { c.productos.push(filaVacia()); pintarProductos(); }
  }

  // Los dos grupos de tipo funcionan como uno solo.
  ['tipoA', 'tipoL'].forEach((name) => {
    const box = root.querySelector(`[data-seg="${name}"]`);
    box.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-val]');
      if (!b) return;
      c.tipo = b.dataset.val;
      root.querySelectorAll('[data-seg="tipoA"] button, [data-seg="tipoL"] button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      ajustarTipo();
    });
  });
  bindChips(root, 'lotes', c.loteIds);

  prodBox.addEventListener('input', (e) => {
    const row = e.target.closest('.prod-row');
    if (!row || !e.target.dataset.k) return;
    const p = c.productos[Number(row.dataset.i)];
    p[e.target.dataset.k] = e.target.value;
    if (e.target.dataset.k === 'nombre') {
      const cat = data.productos.find((x) => norm(x.nombre) === norm(e.target.value));
      if (cat) {
        const i = row.dataset.i;
        if (cat.unidad) { p.unidad = cat.unidad; const sel = $('#pu-' + i); if (![...sel.options].some((o) => o.value === cat.unidad)) sel.add(new Option(cat.unidad)); sel.value = cat.unidad; }
        if (cat.carenciaDias !== '' && cat.carenciaDias !== undefined) { p.carenciaDias = String(cat.carenciaDias); $('#pc-' + i).value = p.carenciaDias; }
        if (cat.reingresoHoras !== '' && cat.reingresoHoras !== undefined) { p.reingresoHoras = String(cat.reingresoHoras); $('#pr-' + i).value = p.reingresoHoras; }
      }
    }
  });
  prodBox.addEventListener('change', (e) => {
    const row = e.target.closest('.prod-row');
    if (row && e.target.dataset.k) c.productos[Number(row.dataset.i)][e.target.dataset.k] = e.target.value;
  });
  prodBox.addEventListener('click', (e) => {
    const b = e.target.closest('[data-quitar]');
    if (!b) return;
    c.productos.splice(Number(b.dataset.quitar), 1);
    pintarProductos();
  });
  $('#add-prod').addEventListener('click', () => {
    c.productos.push(filaVacia());
    pintarProductos();
    $('#pn-' + (c.productos.length - 1)).focus();
  });

  $('#form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const productos = c.productos.filter((p) => p.nombre.trim()).map((p) => ({
      nombre: p.nombre.trim(), dosis: String(p.dosis).trim(), unidad: p.unidad,
      carenciaDias: num(p.carenciaDias) || '', reingresoHoras: num(p.reingresoHoras) || '',
    }));
    const err = [];
    if (!c.tipo) err.push('Elige el tipo de control o labor.');
    if (!c.loteIds.length) err.push('Elige al menos un lote.');
    if (esAplicacion(c.tipo) && !productos.length) err.push('Escribe el producto que se aplicó.');
    if (err.length) { $('#errores').innerHTML = `<div class="alert" role="alert">${err.map(esc).join('<br>')}</div>`; return; }

    const fecha = $('#fecha').value || hoyISO();
    const reg = {
      id: existente ? existente.id : uid('c'), fecha, tipo: c.tipo, loteIds: c.loteIds, productos,
      costo: num($('#costo').value) || '', responsable: $('#responsable').value.trim(), observaciones: $('#observaciones').value.trim(),
    };
    await put('controles', reg);

    // El catálogo de productos aprende de lo que se anota.
    for (const p of productos) {
      const cat = data.productos.find((x) => norm(x.nombre) === norm(p.nombre));
      await put('productos', {
        ...(cat || { id: uid('p'), nombre: p.nombre }),
        unidad: p.unidad || (cat && cat.unidad) || '',
        tipo: (cat && cat.tipo) || c.tipo,
        carenciaDias: p.carenciaDias !== '' ? p.carenciaDias : (cat ? cat.carenciaDias : ''),
        reingresoHoras: p.reingresoHoras !== '' ? p.reingresoHoras : (cat ? cat.reingresoHoras : ''),
      });
    }

    const car = productos.filter((p) => num(p.carenciaDias) > 0).map((p) => sumarDias(fecha, p.carenciaDias)).sort().pop();
    toast(car && car > hoyISO() ? `Control guardado. No cosechar hasta el ${fmtFecha(car)}.` : 'Control guardado');
    go(salir);
  });

  if (existente) {
    $('#borrar').addEventListener('click', async () => {
      if (!confirm('¿Borrar este control?')) return;
      await del('controles', existente.id);
      toast('Control borrado');
      go(salir);
    });
  }

  pintarProductos();
  ajustarTipo();
}
