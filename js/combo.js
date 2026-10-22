// Buscador con lista desplegable y selección múltiple (etiquetas). Se usa para descriptores y variedades.
import { esc } from './ui.js';

const norm = (s) => String(s || '').toLocaleLowerCase('es').normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

export function htmlCombo(id, label, placeholder, hint) {
  return `<div class="field combo" id="${id}">
    <label for="${id}-q">${esc(label)}</label>
    <div class="tags" id="${id}-tags" aria-live="polite"></div>
    <div class="combo-box">
      <input class="input" id="${id}-q" type="text" role="combobox" aria-expanded="false" aria-controls="${id}-list"
        aria-autocomplete="list" autocomplete="off" placeholder="${esc(placeholder)}">
      <ul class="combo-list" id="${id}-list" role="listbox" aria-label="${esc(label)}" hidden></ul>
    </div>
    ${hint ? `<div class="hint">${esc(hint)}</div>` : ''}
  </div>`;
}

/**
 * grupos: [{grupo, items}] ; seleccion: arreglo que se modifica ; onChange(seleccion) opcional.
 */
export function montarCombo(root, id, { grupos, seleccion, onChange = () => {}, max = 300, vacio = 'Aún no has elegido descriptores.' }) {
  const box = root.querySelector('#' + id);
  const input = box.querySelector(`#${id}-q`);
  const lista = box.querySelector(`#${id}-list`);
  const tags = box.querySelector(`#${id}-tags`);
  let opciones = []; // [{valor, nuevo}]
  let activo = -1;

  const todas = () => grupos.flatMap((g) => g.items);
  const elegido = (v) => seleccion.some((s) => norm(s) === norm(v));

  function pintarTags() {
    tags.innerHTML = seleccion.length
      ? seleccion.map((s, i) => `<button type="button" class="tag" data-quitar="${i}" aria-label="Quitar ${esc(s)}">${esc(s)}<span aria-hidden="true">×</span></button>`).join('')
      : `<span class="small muted">${esc(vacio)}</span>`;
  }

  function abrir(abierta) {
    lista.hidden = !abierta;
    input.setAttribute('aria-expanded', String(abierta));
    if (!abierta) { activo = -1; input.removeAttribute('aria-activedescendant'); }
  }

  // Coincide si alguna palabra empieza por lo escrito; si nada coincide así, busca en cualquier parte.
  const empieza = (it, q) => norm(it).split(/[\s-]+/).some((w) => w.startsWith(q)) || norm(it).startsWith(q);

  function filtrar() {
    const q = norm(input.value);
    opciones = [];
    let html = '';
    let n = 0;
    const hayInicio = q && grupos.some((g) => g.items.some((it) => !elegido(it) && empieza(it, q)));
    const coincide = (it) => !q || (hayInicio ? empieza(it, q) : norm(it).includes(q));
    for (const g of grupos) {
      const items = g.items.filter((it) => !elegido(it) && coincide(it));
      if (!items.length || n >= max) continue;
      html += `<li class="combo-grp" role="presentation">${esc(g.grupo)}</li>`;
      for (const it of items) {
        if (n >= max) break;
        const i = opciones.length;
        opciones.push({ valor: it });
        html += `<li class="combo-opt" role="option" id="${id}-o${i}" data-i="${i}" aria-selected="false">${resaltar(it, q)}</li>`;
        n++;
      }
    }
    const exacto = todas().some((t) => norm(t) === q) || seleccion.some((s) => norm(s) === q);
    if (q && !exacto) {
      const i = opciones.length;
      opciones.push({ valor: input.value.trim(), nuevo: true });
      const li = `<li class="combo-opt nuevo" role="option" id="${id}-o${i}" data-i="${i}" aria-selected="false">Agregar «${esc(input.value.trim())}» como nuevo</li>`;
      html = n ? html + li : li; // si hay coincidencias, "Agregar" va de última
    }
    if (!opciones.length) html = '<li class="combo-vacio" role="presentation">No hay más opciones.</li>';
    lista.innerHTML = html;
    activo = ordenVisible()[0] ?? -1; // la primera opción visible queda lista para Enter
    marcarActivo();
  }

  function resaltar(texto, q) {
    if (!q) return esc(texto);
    const i = norm(texto).indexOf(q);
    if (i < 0) return esc(texto);
    return esc(texto.slice(0, i)) + '<mark>' + esc(texto.slice(i, i + q.length)) + '</mark>' + esc(texto.slice(i + q.length));
  }

  function marcarActivo() {
    lista.querySelectorAll('.combo-opt').forEach((li) => li.setAttribute('aria-selected', String(Number(li.dataset.i) === activo)));
    // La opción "Agregar" va primero en la lista pero al final del arreglo: se ubica por id.
    const li = activo >= 0 ? lista.querySelector(`#${id}-o${activo}`) : null;
    if (li) { input.setAttribute('aria-activedescendant', li.id); li.scrollIntoView({ block: 'nearest' }); }
    else input.removeAttribute('aria-activedescendant');
  }

  function ordenVisible() {
    return [...lista.querySelectorAll('.combo-opt')].map((li) => Number(li.dataset.i));
  }

  function elegir(i) {
    const o = opciones[i];
    if (!o || !o.valor) return;
    if (!elegido(o.valor)) seleccion.push(o.valor);
    input.value = '';
    pintarTags();
    filtrar();
    onChange(seleccion);
  }

  input.addEventListener('focus', () => { filtrar(); abrir(true); });
  input.addEventListener('input', () => { filtrar(); abrir(true); });
  input.addEventListener('blur', () => setTimeout(() => abrir(false), 150));
  input.addEventListener('keydown', (e) => {
    const orden = ordenVisible();
    const pos = orden.indexOf(activo);
    if (e.key === 'ArrowDown') { e.preventDefault(); abrir(true); activo = orden[Math.min(orden.length - 1, pos + 1)] ?? -1; marcarActivo(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activo = orden[Math.max(0, pos - 1)] ?? -1; marcarActivo(); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (!lista.hidden && activo >= 0) elegir(activo);
      else if (input.value.trim()) { filtrar(); elegir(ordenVisible()[0]); }
    } else if (e.key === 'Escape') { abrir(false); }
    else if (e.key === 'Backspace' && !input.value && seleccion.length) { seleccion.pop(); pintarTags(); filtrar(); onChange(seleccion); }
  });
  // mousedown (no click) para que el campo no pierda el foco y la lista siga abierta al elegir varios.
  lista.addEventListener('mousedown', (e) => {
    const li = e.target.closest('.combo-opt');
    if (!li) return;
    e.preventDefault();
    elegir(Number(li.dataset.i));
  });
  tags.addEventListener('click', (e) => {
    const b = e.target.closest('[data-quitar]');
    if (!b) return;
    seleccion.splice(Number(b.dataset.quitar), 1);
    pintarTags();
    if (!lista.hidden) filtrar();
    onChange(seleccion);
  });

  pintarTags();
}
