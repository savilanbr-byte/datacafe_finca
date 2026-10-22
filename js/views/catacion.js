// Catación (formato SCA clásico), igual que en DataCafé|Laboratorio pero sin catador: la app la usa una persona.
import { data, put, del, uid } from '../db.js';
import { ATRIBUTOS, TAZAS, puntajeCatacion, clasificacion, fmt2, fmtFecha, hoyISO } from '../calc.js';
import { esc, icon, toast, go, field, textarea } from '../ui.js';
import { DESCRIPTORES, DESCRIPTORES_GRUPOS } from '../listas.js';
import { htmlCombo, montarCombo } from '../combo.js';
import { cafesOrdenados, cafeInfo, nombreCafeId } from '../model.js';
import { pestanasBodega } from './bodega.js';

export async function render(root, { q }) {
  let ref = q.get('cafe') || '';
  const fijo = !!ref && data.cafes.some((c) => c.id === ref);
  const c = {
    fecha: hoyISO(), mesa: '1',
    atributos: Object.fromEntries(ATRIBUTOS.map(([k]) => [k, 7.5])),
    uniformidad: 5, tazaLimpia: 5, dulzura: 5, defectos: 0, descriptores: [], comentarios: '',
  };
  const usados = data.cataciones.flatMap((x) => x.descriptores || []);
  const propios = [...new Set(usados)].filter((u) => !DESCRIPTORES.some((d) => d.toLowerCase() === String(u).toLowerCase()));
  const grupos = propios.length ? [{ grupo: 'Usados antes', items: propios }, ...DESCRIPTORES_GRUPOS] : DESCRIPTORES_GRUPOS;
  const cafes = cafesOrdenados().map(cafeInfo);
  if (!fijo) {
    // Por defecto, el café más reciente que aún no se ha catado.
    const sinCatar = cafes.find((x) => x.disponible > 0.001 && !x.cataciones.length);
    ref = ref || (sinCatar || cafes[0] || { cafe: {} }).cafe.id || '';
  }
  const recientes = [...data.cataciones].sort((a, b) => ((a.fecha || '') + a.actualizado < (b.fecha || '') + b.actualizado ? 1 : -1)).slice(0, 8);

  if (!data.cafes.length) {
    root.innerHTML = `<header class="page-head"><div><h1>Catación</h1></div></header>
      <div class="stack">${pestanasBodega('catacion')}
      <div class="empty"><p>Para catar, primero ingresa un café a bodega.</p><a class="btn btn-accent mt" href="#/cafe-form">${icon('plus')}Ingresar café</a></div></div>`;
    return;
  }

  root.innerHTML = `
    ${fijo
      ? `<header class="topbar"><a class="icon-btn" href="#/cafe/${encodeURIComponent(ref)}" aria-label="Volver">${icon('back')}</a><h1>Nueva catación</h1></header>`
      : `<header class="page-head"><div><h1>Catación</h1><p class="sub">Califica un café de tu bodega</p></div></header>${pestanasBodega('catacion')}<div class="mt"></div>`}
    <form id="form" class="stack flow-2" novalidate>
      <section class="card stack-sm">
        ${fijo
          ? `<div class="small muted">Café en bodega · ${esc(ref)}</div><div class="item-name">${esc(nombreCafeId(ref).split(' · ').slice(1).join(' · '))}</div>`
          : `<div class="field"><label for="ref">Café</label><select class="input" id="ref">${cafes.map((x) => `<option value="${esc(x.cafe.id)}" ${x.cafe.id === ref ? 'selected' : ''}>${esc(x.cafe.id)} · ${esc(x.nombre)}${x.cataciones.length ? '' : ' (sin catar)'}</option>`).join('')}</select></div>`}
        <div class="grid-2">
          ${field('fecha', 'Fecha', c.fecha, 'type="date"')}
          ${field('mesa', 'Mesa', c.mesa, 'inputmode="numeric"')}
        </div>
      </section>

      <section class="hero score" aria-live="polite">
        <div><div class="label">Puntaje final</div><div style="font-weight:600;margin-top:.125rem" id="cat"></div></div>
        <div class="val" id="score"></div>
      </section>

      <section class="card">
        <h2>Atributos</h2>
        <p class="small muted" style="margin:.125rem 0 .375rem">Toca − o + para subir o bajar de a 0,25 (de 6 a 10)</p>
        ${ATRIBUTOS.map(([k, label]) => `
          <div class="stepper-row">
            <span class="name">${label}</span>
            <button type="button" class="step-btn" data-attr="${k}" data-d="-0.25" aria-label="Bajar ${label}">−</button>
            <span class="step-val" id="v-${k}">${fmt2(c.atributos[k])}</span>
            <button type="button" class="step-btn" data-attr="${k}" data-d="0.25" aria-label="Subir ${label}">+</button>
          </div>`).join('')}
      </section>

      <section class="card">
        <h2>Tazas buenas</h2>
        <p class="small muted" style="margin:.125rem 0 .375rem">Toca las tazas que salieron bien (de 5)</p>
        ${TAZAS.map(([k, label]) => `
          <div class="cup-row">
            <div class="cup-head"><span>${label}</span><strong id="n-${k}">${c[k]}/5</strong></div>
            <div class="cups">${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="cup" data-taza="${k}" data-n="${n}" aria-label="${label}: taza ${n}" aria-pressed="${n <= c[k]}">${icon('cup-plain')}</button>`).join('')}</div>
          </div>`).join('')}
      </section>

      <section class="card" style="display:flex;align-items:center;gap:.625rem">
        <div style="flex:1"><div>Defectos</div><div class="small muted">Puntos a descontar</div></div>
        <button type="button" class="step-btn" data-def="-1" aria-label="Bajar defectos">−</button>
        <span class="step-val" id="v-def">0</span>
        <button type="button" class="step-btn" data-def="1" aria-label="Subir defectos">+</button>
      </section>

      <section class="card stack-sm">
        <h2>Descriptores</h2>
        ${htmlCombo('desc', 'Sabores y aromas', 'Escribe para buscar: fresa, panela, jazmín…', 'Elige todos los que quieras. Si no está en la lista, escríbelo y presiona Enter.')}
        ${textarea('comentarios', 'Comentarios', '')}
      </section>

      <div id="errores" aria-live="assertive"></div>
      <button type="submit" class="btn btn-green btn-lg btn-block">Guardar catación</button>
    </form>

    ${!fijo && recientes.length ? `<section class="mt stack-sm" id="recientes">
      <h2 style="font-size:1.25rem">Últimas cataciones</h2>
      ${recientes.map((k) => `<div class="item" style="flex-direction:row;align-items:center;gap:.5rem">
        <a href="#/cafe/${encodeURIComponent(k.cafeId)}" style="flex:1;min-width:0;text-decoration:none;color:inherit">
          <div class="small muted">${esc(fmtFecha(k.fecha))} · Mesa ${esc(k.mesa || '1')}</div>
          <div class="item-name">${esc(nombreCafeId(k.cafeId))}</div>
          ${(k.descriptores || []).length ? `<div class="small muted">${esc(k.descriptores.join(', '))}</div>` : ''}</a>
        <span class="badge">${fmt2(puntajeCatacion(k))}</span>
        <button class="icon-btn" type="button" data-del="${esc(k.id)}" aria-label="Borrar catación">${icon('trash', 'ic-sm')}</button>
      </div>`).join('')}
    </section>` : ''}`;

  const $ = (s) => root.querySelector(s);

  function puntaje() {
    const p = puntajeCatacion(c);
    $('#score').textContent = fmt2(p);
    $('#cat').textContent = clasificacion(p);
  }

  if (!fijo) $('#ref').addEventListener('change', (e) => { ref = e.target.value; });

  $('#form').addEventListener('click', (e) => {
    const a = e.target.closest('[data-attr]');
    if (a) {
      const k = a.dataset.attr;
      c.atributos[k] = Math.min(10, Math.max(6, c.atributos[k] + Number(a.dataset.d)));
      $('#v-' + k).textContent = fmt2(c.atributos[k]);
      puntaje(); return;
    }
    const t = e.target.closest('[data-taza]');
    if (t) {
      const k = t.dataset.taza, n = Number(t.dataset.n);
      c[k] = c[k] === n ? n - 1 : n;
      root.querySelectorAll(`[data-taza="${k}"]`).forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.n) <= c[k])));
      $('#n-' + k).textContent = `${c[k]}/5`;
      puntaje(); return;
    }
    const d = e.target.closest('[data-def]');
    if (d) {
      c.defectos = Math.max(0, c.defectos + Number(d.dataset.def));
      $('#v-def').textContent = String(c.defectos);
      puntaje();
    }
  });

  $('#form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!ref) { $('#errores').innerHTML = '<div class="alert" role="alert">Primero elige qué café vas a catar.</div>'; return; }
    c.fecha = $('#fecha').value || hoyISO();
    c.mesa = $('#mesa').value.trim() || '1';
    c.comentarios = $('#comentarios').value.trim();
    await put('cataciones', { id: uid('k'), cafeId: ref, ...c, puntaje: puntajeCatacion(c) });
    toast(`Catación guardada: ${fmt2(puntajeCatacion(c))} puntos`);
    go(`#/cafe/${encodeURIComponent(ref)}`);
  });

  const rec = $('#recientes');
  if (rec) rec.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-del]');
    if (!b || !confirm('¿Borrar esta catación?')) return;
    await del('cataciones', b.dataset.del);
    toast('Catación borrada');
    render(root, { q });
  });

  montarCombo(root, 'desc', { grupos, seleccion: c.descriptores });
  puntaje();
}
