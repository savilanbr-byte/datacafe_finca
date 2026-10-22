// Almacenamiento local con IndexedDB. Todo queda en el celular y funciona sin internet.
// Para un prototipo con pocos miles de registros, se carga todo en memoria (`data`) al iniciar.
// Ojo: la base se llama distinto a la de DataCafé|Laboratorio porque las dos apps comparten dominio.

const DB_NAME = 'datacafe-finca';
const DB_VERSION = 1;
export const STORES = ['fincas', 'lotes', 'productos', 'controles', 'recolectores', 'recolecciones', 'pagos', 'cafes', 'cataciones', 'salidas', 'meta'];

export const data = Object.fromEntries(STORES.map((s) => [s, []]));

let dbPromise = null;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of STORES) if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(store, mode, fn) {
  return open().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const out = fn(s);
    t.oncomplete = () => resolve(out && 'result' in out ? out.result : out);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

export async function loadAll() {
  for (const s of STORES) data[s] = await tx(s, 'readonly', (st) => st.getAll());
  return data;
}

export async function put(store, obj) {
  const copy = JSON.parse(JSON.stringify(obj));
  copy.actualizado = new Date().toISOString();
  await tx(store, 'readwrite', (st) => st.put(copy));
  const i = data[store].findIndex((x) => x.id === copy.id);
  if (i >= 0) data[store][i] = copy; else data[store].push(copy);
  return copy;
}

/** Guarda varios registros de una vez (por ejemplo, al pagar varias recogidas). */
export async function putMany(store, objs) {
  const now = new Date().toISOString();
  const copies = objs.map((o) => ({ ...JSON.parse(JSON.stringify(o)), actualizado: now }));
  await tx(store, 'readwrite', (st) => { for (const c of copies) st.put(c); });
  for (const c of copies) {
    const i = data[store].findIndex((x) => x.id === c.id);
    if (i >= 0) data[store][i] = c; else data[store].push(c);
  }
}

export async function del(store, id) {
  await tx(store, 'readwrite', (st) => st.delete(id));
  data[store] = data[store].filter((x) => x.id !== id);
}

export async function clearAll() {
  for (const s of STORES) { await tx(s, 'readwrite', (st) => st.clear()); data[s] = []; }
}

/** Reemplaza toda la información por la de un respaldo. */
export async function importAll(obj) {
  await clearAll();
  for (const s of STORES) {
    const rows = obj[s] || [];
    if (rows.length) await tx(s, 'readwrite', (st) => { for (const row of rows) st.put(row); });
  }
  await loadAll();
}

export function exportAll() {
  const out = { app: 'DataCafé|Finca', version: 1, exportado: new Date().toISOString() };
  for (const s of STORES) out[s] = data[s];
  return out;
}

/** Siguiente código consecutivo: C-0001 para los cafés de bodega. */
export async function nextCode(prefix, digits) {
  const key = 'seq-' + prefix;
  const row = data.meta.find((m) => m.id === key);
  const n = (row ? row.value : 0) + 1;
  await put('meta', { id: key, value: n });
  return `${prefix}-${String(n).padStart(digits, '0')}`;
}

export function getMeta(key, def) {
  const row = data.meta.find((m) => m.id === key);
  return row ? row.value : def;
}
export const setMeta = (key, value) => put('meta', { id: key, value });

export function uid(prefix = 'x') {
  return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export const byId = (store) => Object.fromEntries(data[store].map((x) => [x.id, x]));
