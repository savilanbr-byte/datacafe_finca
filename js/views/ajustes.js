// Ajustes: apariencia, fincas y cosechas, unidades de área, productos, exportar, respaldo y datos de ejemplo.
import { data, put, del, uid, exportAll, importAll, clearAll, setMeta } from '../db.js';
import { esc, icon, topbar, seg, bindSeg, chipsMulti, bindChips, toast, download, toCSV, pref, setPref, norm } from '../ui.js';
import {
  num, hoyISO, MESES_CORTOS, UNIDADES_AREA, ATRIBUTOS, TAZAS, puntajeCatacion, totalRecoleccion, areaHa, precioCarga,
} from '../calc.js';
import { fincasOrdenadas, equivalencias, fincaNombre, nombreLoteId, nombreRecolector, cafeInfo, loteInfo, anualLote } from '../model.js';
import { esAplicacion } from '../listas.js';
import { cargarEjemplo } from '../seed.js';
import { VERSION } from '../version.js';
import { etiquetaEstado } from './lotes.js';

export function aplicarTema(t) {
  if (t === 'auto') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}

export async function render(root) {
  const tema = pref('tema', 'auto');
  const escala = pref('escala', '1');
  const eq = equivalencias();

  root.innerHTML = `
    ${topbar('Ajustes', '#/inicio')}
    <div class="stack flow-2">
      <section class="card stack">
        <h2>Apariencia</h2>
        <div class="field"><div class="label">Tema</div>${seg('tema', [['light', 'Claro'], ['dark', 'Oscuro'], ['auto', 'Automático']], tema)}
          <div class="hint">Automático cambia a oscuro cuando el celular está en modo oscuro.</div></div>
        <div class="field"><div class="label">Tamaño de letra</div>${seg('escala', [['1', 'Normal'], ['1.2', 'Grande'], ['1.4', 'Muy grande']], escala)}</div>
      </section>

      <section class="card stack-sm">
        <h2>Fincas y cosechas</h2>
        <p class="small muted">Marca los meses de la cosecha principal de cada finca. Los demás cuentan como mitaca.</p>
        <div id="fincas" class="stack"></div>
        <div style="display:flex;gap:.5rem">
          <label class="sr" for="nueva-finca">Nueva finca</label>
          <input class="input" id="nueva-finca" placeholder="Nombre de la nueva finca" autocomplete="off">
          <button class="btn" type="button" id="add-finca">Agregar</button>
        </div>
      </section>

      <section class="card stack-sm">
        <h2>Unidades de área</h2>
        <p class="small muted">Cuánto mide cada unidad en tu región, en metros cuadrados. 1 hectárea = 10.000 m².</p>
        <div class="grid-3">${UNIDADES_AREA.filter(([k]) => !['ha', 'm2'].includes(k)).map(([k, n]) => `<div class="field"><label for="eq-${k}">${n} (m²)</label><input class="input" id="eq-${k}" data-eq="${k}" inputmode="numeric" value="${esc(String(eq[k]))}"></div>`).join('')}</div>
        <button class="btn" type="button" id="guardar-eq">Guardar equivalencias</button>
      </section>

      <section class="card stack-sm">
        <h2>Productos</h2>
        <p class="small muted">Se agregan solos al anotar controles. Pon aquí la carencia y el reingreso que dice la etiqueta, para que se llenen solos la próxima vez.</p>
        <div id="productos" class="stack-sm"></div>
      </section>

      <section class="card stack-sm">
        <h2>Exportar a Excel</h2>
        <p class="small muted">Descarga archivos .csv que se abren en Excel o Google Sheets.</p>
        <div class="grid-2">
          ${[['lotes', 'Lotes'], ['controles', 'Controles'], ['recoleccion', 'Recolección'], ['pagos', 'Pagos'], ['bodega', 'Bodega'], ['cataciones', 'Cataciones'], ['salidas', 'Salidas']]
            .map(([k, n]) => `<button class="btn" type="button" data-exp="${k}">${icon('download', 'ic-sm')}${n}</button>`).join('')}
        </div>
      </section>

      <section class="card stack-sm">
        <h2>Respaldo</h2>
        <p class="note">La información se guarda <strong>solo en este celular</strong>. Si borras los datos del navegador o cambias de celular, se pierde. Descarga un respaldo de vez en cuando y guárdalo en otro lado (por ejemplo, envíatelo por WhatsApp o correo).</p>
        <button class="btn" type="button" id="respaldo">${icon('download', 'ic-sm')}Descargar respaldo</button>
        <label class="btn" for="restaurar" style="cursor:pointer">${icon('upload', 'ic-sm')}Restaurar un respaldo</label>
        <input type="file" id="restaurar" accept=".json,application/json" class="sr">
      </section>

      <section class="card stack-sm">
        <h2>Datos</h2>
        <button class="btn" type="button" id="demo">Cargar datos de ejemplo</button>
        <button class="btn btn-danger" type="button" id="borrar">${icon('trash', 'ic-sm')}Borrar toda la información</button>
      </section>

      <p class="small muted center span-all">DataCafé|Finca · versión ${esc(VERSION)} (prototipo)<br>Hecho por Sancocho Glorioso</p>
    </div>`;

  const $ = (s) => root.querySelector(s);

  bindSeg(root, 'tema', (val) => { setPref('tema', val); aplicarTema(val); });
  bindSeg(root, 'escala', (val) => { setPref('escala', val); document.documentElement.style.setProperty('--scale', val); });

  function pintarFincas() {
    const fs = fincasOrdenadas();
    $('#fincas').innerHTML = fs.length ? fs.map((f) => {
      const n = data.lotes.filter((l) => l.fincaId === f.id).length;
      return `<div class="sub-card stack-sm" data-finca="${esc(f.id)}">
        <div class="grid-2">
          <div class="field"><label for="fn-${esc(f.id)}">Nombre</label><input class="input" id="fn-${esc(f.id)}" data-k="nombre" value="${esc(f.nombre)}"></div>
          <div class="field"><label for="fm-${esc(f.id)}">Municipio</label><input class="input" id="fm-${esc(f.id)}" data-k="municipio" value="${esc(f.municipio || '')}"></div>
        </div>
        <div class="field"><div class="label">Meses de cosecha principal</div>${chipsMulti('meses-' + f.id, MESES_CORTOS.map((m, i) => [String(i + 1), m]), (f.mesesPrincipal || []).map(String), 'meses')}</div>
        <div style="display:flex;gap:.5rem;align-items:center">
          <button class="btn" type="button" data-guardar="${esc(f.id)}">Guardar</button>
          <span class="small muted" style="flex:1">${n} ${n === 1 ? 'lote' : 'lotes'}</span>
          ${n === 0 ? `<button class="icon-btn" type="button" data-delf="${esc(f.id)}" aria-label="Borrar ${esc(f.nombre)}">${icon('trash', 'ic-sm')}</button>` : ''}
        </div>
      </div>`;
    }).join('') : '<p class="muted">Aún no hay fincas. También se crean al crear el primer lote.</p>';
    for (const f of fs) {
      const sel = (f.mesesPrincipal || []).map(String);
      bindChips(root, 'meses-' + f.id, sel);
    }
  }
  $('#fincas').addEventListener('click', async (e) => {
    const g = e.target.closest('[data-guardar]');
    if (g) {
      const f = data.fincas.find((x) => x.id === g.dataset.guardar);
      const box = g.closest('[data-finca]');
      const nombre = box.querySelector('[data-k="nombre"]').value.trim();
      if (!nombre) { toast('Escribe el nombre de la finca'); return; }
      const meses = [...box.querySelectorAll('.meses [aria-pressed="true"]')].map((b) => Number(b.dataset.val)).sort((a, b) => a - b);
      await put('fincas', { ...f, nombre, municipio: box.querySelector('[data-k="municipio"]').value.trim(), mesesPrincipal: meses });
      toast(`Finca "${nombre}" guardada`);
      pintarFincas();
      return;
    }
    const d = e.target.closest('[data-delf]');
    if (d && confirm('¿Borrar esta finca?')) { await del('fincas', d.dataset.delf); pintarFincas(); }
  });
  $('#add-finca').addEventListener('click', async () => {
    const nombre = $('#nueva-finca').value.trim();
    if (!nombre) return;
    await put('fincas', { id: uid('f'), nombre, municipio: '', mesesPrincipal: [] });
    $('#nueva-finca').value = '';
    pintarFincas();
    toast(`Finca "${nombre}" agregada`);
  });

  $('#guardar-eq').addEventListener('click', async () => {
    const nuevo = {};
    for (const inp of root.querySelectorAll('[data-eq]')) {
      const n = num(inp.value);
      if (!(n > 0)) { toast('Las equivalencias deben ser números mayores que cero'); return; }
      nuevo[inp.dataset.eq] = n;
    }
    await setMeta('equivalencias', nuevo);
    toast('Equivalencias guardadas');
  });

  function pintarProductos() {
    const ps = [...data.productos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    $('#productos').innerHTML = ps.length ? ps.map((p) => `<div class="sub-card" data-prod="${esc(p.id)}">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem"><strong>${esc(p.nombre)}</strong>
        <button class="icon-btn" type="button" data-delp="${esc(p.id)}" aria-label="Quitar ${esc(p.nombre)} de la lista">${icon('trash', 'ic-sm')}</button></div>
      <div class="grid-2">
        <div class="field"><label for="pc-${esc(p.id)}">Carencia (días)</label><input class="input" id="pc-${esc(p.id)}" data-k="carenciaDias" inputmode="numeric" value="${esc(p.carenciaDias ?? '')}"></div>
        <div class="field"><label for="pr-${esc(p.id)}">Reingreso (horas)</label><input class="input" id="pr-${esc(p.id)}" data-k="reingresoHoras" inputmode="numeric" value="${esc(p.reingresoHoras ?? '')}"></div>
      </div></div>`).join('') : '<p class="muted">Aún no hay productos.</p>';
  }
  $('#productos').addEventListener('change', async (e) => {
    const box = e.target.closest('[data-prod]');
    if (!box || !e.target.dataset.k) return;
    const p = data.productos.find((x) => x.id === box.dataset.prod);
    await put('productos', { ...p, [e.target.dataset.k]: num(e.target.value) || '' });
    toast(`${p.nombre}: guardado`);
  });
  $('#productos').addEventListener('click', async (e) => {
    const d = e.target.closest('[data-delp]');
    if (!d || !confirm('¿Quitar este producto de la lista? Los controles ya anotados no cambian.')) return;
    await del('productos', d.dataset.delp);
    pintarProductos();
  });

  root.querySelectorAll('[data-exp]').forEach((b) => b.addEventListener('click', () => exportar(b.dataset.exp)));

  $('#respaldo').addEventListener('click', () => {
    download(`datacafe-finca-respaldo-${hoyISO()}.json`, JSON.stringify(exportAll(), null, 2), 'application/json');
  });
  $('#restaurar').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const obj = JSON.parse(await file.text());
      if (!obj || !Array.isArray(obj.lotes) || !Array.isArray(obj.recolecciones)) throw new Error('El archivo no parece un respaldo de DataCafé|Finca.');
      if (!confirm('Esto reemplaza toda la información de este celular por la del respaldo. ¿Continuar?')) return;
      await importAll(obj);
      toast('Respaldo restaurado');
      render(root);
    } catch (er) { toast('No se pudo restaurar: ' + er.message); }
  });

  $('#demo').addEventListener('click', async () => {
    if (data.lotes.length && !confirm('Esto reemplaza la información actual por datos de ejemplo. ¿Continuar?')) return;
    await cargarEjemplo();
    toast('Datos de ejemplo cargados');
    render(root);
  });
  $('#borrar').addEventListener('click', async () => {
    if (!confirm('¿Borrar TODA la información de este celular? No se puede deshacer.')) return;
    if (!confirm('¿Seguro? Te recomendamos descargar un respaldo antes.')) return;
    await clearAll();
    setPref('finca', 'todas');
    toast('Información borrada');
    render(root);
  });

  pintarFincas();
  pintarProductos();
}

function exportar(cual) {
  const f = hoyISO();
  const anio = f.slice(0, 4);
  const eq = equivalencias();
  const archivo = (nombre, h, rows) => download(`datacafe-finca-${nombre}-${f}.csv`, toCSV(h, rows), 'text/csv');
  if (cual === 'lotes') {
    archivo('lotes', ['Finca', 'Lote', 'Estado', 'Área', 'Unidad', 'Área (ha)', 'Altitud (msnm)', 'Fecha de siembra', 'Variedades', 'Árboles', 'Kg cereza este mes', 'Productividad este mes (kg/ha)', `Kg cereza ${anio}`, `Productividad ${anio} (kg/ha)`, 'Principal (kg)', 'Mitaca (kg)', 'Kg por árbol'],
      data.lotes.map((l) => {
        const i = loteInfo(l), a = anualLote(l, anio);
        return [fincaNombre(l.fincaId), l.nombre, etiquetaEstado(l.estado || 'activo'), num(l.area), l.unidad, areaHa(l.area, l.unidad, eq), num(l.altitud) || '', l.fechaSiembra, (l.variedades || []).join(', '), num(l.arboles) || '',
          i.kgMes, i.prodMes, a.kg, a.kgHa, a.principal, a.mitaca, a.kgArbol];
      }));
  }
  if (cual === 'controles') {
    const rows = [];
    for (const c of data.controles) {
      const prods = (c.productos || []).length ? c.productos : [{}];
      for (const p of prods) {
        rows.push([c.fecha, esAplicacion(c.tipo) ? 'Aplicación' : 'Labor', c.tipo, (c.loteIds || []).map(nombreLoteId).join(', '), p.nombre || '', p.dosis || '', p.unidad || '', num(p.carenciaDias) || '', num(p.reingresoHoras) || '', num(c.costo) || '', c.responsable, c.observaciones]);
      }
    }
    archivo('controles', ['Fecha', 'Clase', 'Tipo', 'Lotes', 'Producto', 'Dosis', 'Unidad', 'Carencia (días)', 'Reingreso (horas)', 'Costo total', 'Responsable', 'Observaciones'], rows);
  }
  if (cual === 'recoleccion') {
    archivo('recoleccion', ['Fecha', 'Finca', 'Lote', 'Variedad', 'Recolector', 'Kg cereza', 'Precio kg', 'Precio total', 'Pagado', 'Fecha de pago'],
      data.recolecciones.map((r) => {
        const l = data.lotes.find((x) => x.id === r.loteId);
        const p = r.pagoId ? data.pagos.find((x) => x.id === r.pagoId) : null;
        return [r.fecha, l ? fincaNombre(l.fincaId) : '', l ? l.nombre : '', r.variedad, nombreRecolector(r.recolectorId), num(r.kg), num(r.precioKg), totalRecoleccion(r), r.pagoId ? 'Sí' : 'No', p ? p.fecha : ''];
      }));
  }
  if (cual === 'pagos') {
    archivo('pagos', ['Fecha', 'Recolector', 'Recogidas', 'Kg cereza', 'Valor'], data.pagos.map((p) => [p.fecha, nombreRecolector(p.recolectorId), (p.recoleccionIds || []).length, num(p.kg), num(p.valor)]));
  }
  if (cual === 'bodega') {
    archivo('bodega', ['Código', 'Fecha de ingreso', 'Nombre del café', 'Lotes', 'Variedades', 'Kg pergamino', 'Kg disponibles', 'Humedad (%)', 'Proceso', 'Tipo de fermentación', 'Tiempo de fermentación', 'Tipo de secado', 'Tiempo de secado',
      'Peso malla 15', 'Peso malla 14', 'Peso malla 0', 'Pasilla malla 15', 'Pasilla malla 14', 'Gramos de análisis', 'Factor EP', 'Factor UGQ', 'Puntaje', 'Perfil', 'Comentarios'],
      data.cafes.map(cafeInfo).map((i) => {
        const c = i.cafe;
        return [c.id, c.fechaIngreso, i.nombre, i.lotes.map((l) => l.nombre).join(', '), (c.variedades || []).join(', '), num(c.kgPergamino), i.disponible, num(c.humedad) || '', c.proceso, c.tipoFermentacion, c.tiempoFermentacion, c.tipoSecado, c.tiempoSecado,
          num(c.m15), num(c.m14), num(c.m0), num(c.p15), num(c.p14), num(c.gramos), i.factorEP, i.factorUGQ, i.puntaje, i.perfilTexto, c.comentarios];
      }));
  }
  if (cual === 'cataciones') {
    archivo('cataciones', ['Código', 'Café', 'Fecha', 'Mesa', ...ATRIBUTOS.map((a) => a[1]), ...TAZAS.map((t) => t[1]), 'Defectos', 'Descriptores', 'Comentarios', 'Puntaje final'],
      data.cataciones.map((k) => {
        const c = data.cafes.find((x) => x.id === k.cafeId);
        return [k.cafeId, c ? cafeInfo(c).nombre : '', k.fecha, k.mesa, ...ATRIBUTOS.map(([a]) => num((k.atributos || {})[a])), ...TAZAS.map(([t]) => num(k[t])), num(k.defectos), (k.descriptores || []).join(', '), k.comentarios, puntajeCatacion(k)];
      }));
  }
  if (cual === 'salidas') {
    archivo('salidas', ['Fecha', 'Tipo', 'Código', 'Café', 'Comprador o destino', 'Kg', 'Precio kg', 'Precio carga (125 kg)', 'Valor total', 'Factor pagado', 'Recibo o factura', 'Comentarios'],
      data.salidas.map((s) => {
        const c = data.cafes.find((x) => x.id === s.cafeId);
        return [s.fecha, s.tipo, s.cafeId, c ? cafeInfo(c).nombre : '', s.comprador, num(s.kg), num(s.precioKg) || '', num(s.precioKg) ? precioCarga(s.precioKg) : '', num(s.kg) * num(s.precioKg) || '', num(s.factorPagado) || '', s.recibo, s.comentarios];
      }));
  }
  toast('Archivo descargado');
}
