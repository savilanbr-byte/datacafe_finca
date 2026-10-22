// Salidas de bodega: ventas, muestras, consumo propio y otras.
import { data, put, del, uid } from '../db.js';
import { num, fmtKg, fmtCOP, fmt2, fmtFecha, hoyISO, precioCarga } from '../calc.js';
import { TIPOS_SALIDA } from '../listas.js';
import { esc, icon, seg, bindSeg, field, textarea, toast } from '../ui.js';
import { cafesOrdenados, cafeInfo, nombreCafeId } from '../model.js';
import { pestanasBodega } from './bodega.js';

let ultimoTipo = 'Venta';

export async function render(root, { q } = {}) {
  const pedido = q && q.get('cafe');
  const fuentes = cafesOrdenados().map(cafeInfo).filter((c) => c.disponible > 0.001);
  const v = { cafeId: pedido && fuentes.some((f) => f.cafe.id === pedido) ? pedido : (fuentes[0] ? fuentes[0].cafe.id : ''), tipo: ultimoTipo };
  const mes = hoyISO().slice(0, 7);
  const ventasMes = data.salidas.filter((s) => s.tipo === 'Venta' && (s.fecha || '').startsWith(mes));
  const lista = [...data.salidas].sort((a, b) => ((a.fecha || '') + a.actualizado < (b.fecha || '') + b.actualizado ? 1 : -1));
  const compradores = [...new Set(data.salidas.map((s) => s.comprador).filter(Boolean))];

  root.innerHTML = `
    <header class="page-head"><div><h1>Salidas</h1><p class="sub">Ventas este mes: ${fmtCOP(ventasMes.reduce((s, x) => s + num(x.kg) * num(x.precioKg), 0))} · ${fmtKg(ventasMes.reduce((s, x) => s + num(x.kg), 0))} kg</p></div></header>
    <div class="stack">
    ${pestanasBodega('salidas')}
    <div class="split">
    <form id="form" class="card stack" novalidate>
      <h2>Nueva salida</h2>
      ${fuentes.length ? `
        <div class="field"><div class="label">¿Qué café sale?</div>
          ${seg('cafe', fuentes.map((f) => [f.cafe.id, `${f.cafe.id} — ${fmtKg(f.disponible)} kg`, f.nombre]), v.cafeId, 'wrap').replace('class="seg wrap"', 'class="seg wrap" style="grid-template-columns:1fr"')}</div>
        <div class="field"><div class="label">Tipo de salida</div>${seg('tipo', TIPOS_SALIDA, v.tipo, 'wrap')}</div>
        ${field('fecha', 'Fecha', hoyISO(), 'type="date"')}
        ${field('comprador', 'Comprador', '', 'list="dl-comp" autocomplete="off" placeholder="Cooperativa, particular, tostador…"')}
        <datalist id="dl-comp">${compradores.map((c) => `<option value="${esc(c)}"></option>`).join('')}</datalist>
        <div class="field"><label for="kg">Kilos de pergamino</label>
          <div style="display:flex;gap:.5rem"><input class="input" id="kg" inputmode="decimal"><button type="button" class="btn" id="todo">Todo</button></div></div>
        <div id="precio-box" class="stack-sm">
          ${field('precioKg', 'Precio por kilo', '', 'inputmode="numeric"', ' ')}
          <div class="grid-2">
            ${field('factorPagado', 'Factor pagado (opcional)', '', 'inputmode="decimal"')}
            ${field('recibo', 'N.º de recibo o factura', '', 'autocomplete="off"')}
          </div>
        </div>
        ${textarea('comentarios', 'Comentarios', '')}
        <div class="alert" id="excede" hidden></div>
        <div class="result" id="total-box" style="display:flex;justify-content:space-between;align-items:center" aria-live="polite">
          <span>Total de la venta</span><span class="mid-num" style="font-size:1.75rem" id="total">$0</span>
        </div>
        <div id="errores" aria-live="assertive"></div>
        <button type="submit" class="btn btn-accent btn-lg btn-block">Registrar salida</button>`
        : `<p class="note">No hay café disponible en bodega.</p><a class="btn" href="#/cafe-form">${icon('plus', 'ic-sm')}Ingresar café</a>`}
    </form>

    <section class="stack-sm mt" id="lista">
      <h2 style="font-size:1.25rem">Últimas salidas</h2>
      ${lista.length ? lista.slice(0, 40).map((s) => `
        <div class="item" style="flex-direction:row;align-items:center;gap:.5rem">
          <div style="flex:1;min-width:0"><div style="font-weight:600">${esc(s.tipo === 'Consumo' ? 'Consumo propio' : s.tipo)}${s.comprador ? ' · ' + esc(s.comprador) : ''}</div>
            <div class="small muted">${esc(fmtFecha(s.fecha))} · ${esc(nombreCafeId(s.cafeId).split(' · ')[0])} · ${fmtKg(num(s.kg))} kg${num(s.factorPagado) ? ` · factor ${fmtKg(num(s.factorPagado))}` : ''}${s.recibo ? ` · recibo ${esc(s.recibo)}` : ''}</div></div>
          ${num(s.precioKg) ? `<strong>${fmtCOP(num(s.kg) * num(s.precioKg))}</strong>` : ''}
          <button class="icon-btn" type="button" data-del="${esc(s.id)}" aria-label="Borrar salida">${icon('trash', 'ic-sm')}</button>
        </div>`).join('') : '<p class="empty">Aún no hay salidas.</p>'}
    </section>
    </div></div>`;

  const $ = (s) => root.querySelector(s);

  root.querySelector('#lista').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-del]');
    if (!b || !confirm('¿Borrar esta salida? Los kilos vuelven a la bodega.')) return;
    await del('salidas', b.dataset.del);
    toast('Salida borrada');
    render(root, { q });
  });
  if (!fuentes.length) return;

  const disp = () => (fuentes.find((f) => f.cafe.id === v.cafeId) || { disponible: 0 }).disponible;
  function pintarTipo() {
    const venta = v.tipo === 'Venta';
    $('#precio-box').hidden = !venta;
    $('#total-box').hidden = !venta;
    root.querySelector('label[for="comprador"]').textContent = venta ? 'Comprador' : (v.tipo === 'Muestra' ? '¿Para quién es la muestra?' : 'Destino (opcional)');
    calcular();
  }
  function calcular() {
    const kg = num($('#kg').value), pr = num($('#precioKg').value);
    $('#total').textContent = fmtCOP(kg * pr);
    $('#precioKg').parentElement.querySelector('.hint').textContent = pr > 0 ? `= ${fmtCOP(precioCarga(pr))} por carga de 125 kg` : ' ';
    const ex = $('#excede');
    ex.hidden = !(kg > disp() + 0.001);
    ex.textContent = `Solo hay ${fmtKg(disp())} kg disponibles de este café.`;
  }

  bindSeg(root, 'cafe', (val) => { v.cafeId = val; calcular(); });
  bindSeg(root, 'tipo', (val) => { v.tipo = val; ultimoTipo = val; pintarTipo(); });
  $('#kg').addEventListener('input', calcular);
  $('#precioKg').addEventListener('input', calcular);
  $('#todo').addEventListener('click', () => { $('#kg').value = String(Math.round(disp() * 100) / 100).replace('.', ','); calcular(); });

  $('#form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const kg = num($('#kg').value), pr = num($('#precioKg').value);
    const venta = v.tipo === 'Venta';
    const err = [];
    if (!v.cafeId) err.push('Elige qué café sale.');
    if (!(kg > 0)) err.push('Escribe los kilos.');
    else if (kg > disp() + 0.001) err.push(`Solo hay ${fmtKg(disp())} kg disponibles.`);
    if (venta && !(pr > 0)) err.push('Escribe el precio por kilo.');
    if (err.length) { $('#errores').innerHTML = `<div class="alert" role="alert">${err.map(esc).join('<br>')}</div>`; return; }
    await put('salidas', {
      id: uid('s'), cafeId: v.cafeId, fecha: $('#fecha').value || hoyISO(), tipo: v.tipo, comprador: $('#comprador').value.trim(), kg,
      precioKg: venta ? pr : '', factorPagado: venta ? (num($('#factorPagado').value) || '') : '', recibo: venta ? $('#recibo').value.trim() : '',
      comentarios: $('#comentarios').value.trim(),
    });
    toast(venta ? `Venta registrada: ${fmtCOP(kg * pr)}` : 'Salida registrada');
    render(root, { q });
  });

  pintarTipo();
}
