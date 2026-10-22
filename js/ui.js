// Utilidades de pantalla compartidas por todas las vistas.

/** Escapa texto del usuario antes de ponerlo en HTML. */
export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const icon = (name, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

export function go(hash) {
  if (location.hash === hash) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = hash;
}

let toastTimer = null;
export function toast(msg, action) {
  const el = document.getElementById('toast');
  el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button type="button">${esc(action.label)}</button>` : ''}`;
  el.hidden = false;
  if (action) el.querySelector('button').onclick = () => { el.hidden = true; action.run(); };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, action ? 10000 : 3000);
}

export function download(filename, content, mime = 'text/plain') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** CSV que Excel en español abre bien: separador ";" y BOM UTF-8. */
export function toCSV(headers, rows) {
  const cell = (v) => {
    if (v === null || v === undefined) return '';
    let s = typeof v === 'number' ? String(Math.round(v * 100) / 100).replace('.', ',') : String(v);
    if (/[";\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  return '﻿' + [headers, ...rows].map((r) => r.map(cell).join(';')).join('\r\n');
}

export async function shareText(title, text) {
  if (navigator.share) {
    try { await navigator.share({ title, text }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
  }
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
}

/** Barra superior con botón de volver. */
export function topbar(title, backHref, right = '') {
  return `<header class="topbar">
    <a class="icon-btn" href="${backHref}" aria-label="Volver">${icon('back')}</a>
    <h1>${esc(title)}</h1>${right}
  </header>`;
}

/** Selector de opción única (botones grandes). */
export function seg(name, options, value, cls = '') {
  return `<div class="seg ${cls}" role="group" data-seg="${name}">${options.map((o) => {
    const [val, label, sub] = Array.isArray(o) ? o : [o, o];
    return `<button type="button" class="opt ${sub ? 'left' : ''}" data-val="${esc(val)}" aria-pressed="${String(val) === String(value)}">${
      sub ? `${String(val) === String(value) ? icon('check', 'ic-sm') : ''}<span class="opt-main"><span>${esc(label)}</span><span class="opt-sub">${esc(sub)}</span></span>` : esc(label)
    }</button>`;
  }).join('')}</div>`;
}

/** Conecta un selector creado con seg(): llama onPick(valor) y actualiza el estado visual. */
export function bindSeg(root, name, onPick) {
  const box = root.querySelector(`[data-seg="${name}"]`);
  if (!box) return;
  box.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-val]');
    if (!b) return;
    box.querySelectorAll('button[data-val]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    onPick(b.dataset.val);
  });
}

export function field(id, label, value = '', attrs = '', hint = '') {
  return `<div class="field"><label for="${id}">${esc(label)}</label>
    <input class="input" id="${id}" name="${id}" value="${esc(value)}" ${attrs}>
    ${hint ? `<div class="hint">${esc(hint)}</div>` : ''}</div>`;
}

export function textarea(id, label, value = '', attrs = '') {
  return `<div class="field"><label for="${id}">${esc(label)}</label>
    <textarea class="input" id="${id}" name="${id}" rows="2" ${attrs}>${esc(value)}</textarea></div>`;
}

export function getParams() {
  const h = location.hash.replace(/^#\/?/, '');
  const [path, qs] = h.split('?');
  return { parts: path.split('/').filter(Boolean), q: new URLSearchParams(qs || '') };
}

/** Selector de varias opciones (chips). options: [valor, texto] o texto. */
export function chipsMulti(name, options, selected = [], cls = '') {
  return `<div class="chips ${cls}" role="group" data-chips="${name}">${options.map((o) => {
    const [val, label] = Array.isArray(o) ? o : [o, o];
    return `<button type="button" class="chip" data-val="${esc(val)}" aria-pressed="${selected.includes(val)}">${esc(label)}</button>`;
  }).join('')}</div>`;
}

/** Conecta chipsMulti(): `seleccion` es un arreglo que se modifica; onChange(seleccion) opcional. */
export function bindChips(root, name, seleccion, onChange = () => {}) {
  root.querySelectorAll(`[data-chips="${name}"]`).forEach((box) => box.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-val]');
    if (!b) return;
    const v = b.dataset.val;
    const i = seleccion.indexOf(v);
    if (i >= 0) seleccion.splice(i, 1); else seleccion.push(v);
    b.setAttribute('aria-pressed', String(i < 0));
    onChange(seleccion);
  }));
}

/** Pestañas dentro de una sección (enlaces). items: [[href, texto, activo]]. */
export function tabs(items) {
  return `<nav class="tabs" aria-label="Secciones">${items.map(([href, label, on]) =>
    `<a href="${href}" ${on ? 'aria-current="page"' : ''}>${esc(label)}</a>`).join('')}</nav>`;
}

/** Lee y guarda preferencias de este equipo (no críticas). */
export function pref(k, def) { try { return localStorage.getItem('dcf-' + k) ?? def; } catch (e) { return def; } }
export function setPref(k, v) { try { localStorage.setItem('dcf-' + k, v); } catch (e) { /* sin almacenamiento */ } }

/**
 * Baja el tamaño de las cifras grandes (.big-num, .mid-num) que no caben en su recuadro,
 * por ejemplo "$2.884.000" en un celular angosto o con letra grande.
 */
export function ajustarNumeros(root = document) {
  root.querySelectorAll('.big-num, .mid-num').forEach((el) => {
    if (el.dataset.fs === undefined) el.dataset.fs = el.style.fontSize || '';
    el.style.fontSize = el.dataset.fs;
    for (let i = 0; i < 3 && el.clientWidth && el.scrollWidth > el.clientWidth + 1; i++) {
      const base = parseFloat(getComputedStyle(el).fontSize);
      el.style.fontSize = Math.max(base * 0.5, (base * el.clientWidth * 0.97) / el.scrollWidth) + 'px';
    }
  });
}

export const norm = (s) => String(s || '').toLocaleLowerCase('es').normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
