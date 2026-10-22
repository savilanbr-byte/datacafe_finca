// Vistas derivadas de los datos guardados (lo que la app calcula sola).
import { data, getMeta } from './db.js';
import {
  num, areaHa, kgLote, productividadMes, resumenAnual, serieMensual, pendienteRecolector, carenciasVigentes, reingresosVigentes,
  disponibleCafe, nombreCafe, promedioPuntaje, perfil, perfilTexto, factor, hoyISO, EQUIVALENCIAS_DEFECTO, totalRecoleccion,
} from './calc.js';
import { pref } from './ui.js';

export const equivalencias = () => ({ ...EQUIVALENCIAS_DEFECTO, ...getMeta('equivalencias', {}) });
export const mesActual = () => hoyISO().slice(0, 7);
export function mesAnterior(mes) {
  let [y, m] = mes.split('-').map(Number);
  m--; if (m === 0) { m = 12; y--; }
  return `${y}-${String(m).padStart(2, '0')}`;
}

// ---------- Fincas y lotes ----------

export const fincasOrdenadas = () => [...data.fincas].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
export const finca = (id) => data.fincas.find((f) => f.id === id) || null;
export const fincaNombre = (id) => (finca(id) || {}).nombre || 'Sin finca';
export const lote = (id) => data.lotes.find((l) => l.id === id) || null;

/** Finca elegida en Inicio y Lotes ("todas" o el id de una finca). */
export function fincaFiltro() {
  const f = pref('finca', 'todas');
  return f === 'todas' || data.fincas.some((x) => x.id === f) ? f : 'todas';
}

export function lotesOrdenados(fincaId = 'todas', { soloActivos = false } = {}) {
  return data.lotes
    .filter((l) => (fincaId === 'todas' || l.fincaId === fincaId) && (!soloActivos || (l.estado || 'activo') === 'activo'))
    .sort((a, b) => fincaNombre(a.fincaId).localeCompare(fincaNombre(b.fincaId), 'es') || a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
}

export const nombreLote = (l) => (l ? (data.fincas.length > 1 ? `${fincaNombre(l.fincaId)} · ${l.nombre}` : l.nombre) : 'Lote borrado');
export const nombreLoteId = (id) => nombreLote(lote(id));

/** Varios lotes en un texto corto: "La Loma, El Guamo" o, con varias fincas, "La Esperanza: La Loma, El Guamo · El Mirador: El Alto". */
export function nombresLotes(ids) {
  const ls = (ids || []).map(lote).filter(Boolean);
  if (data.fincas.length < 2) return ls.map((l) => l.nombre).join(', ');
  const g = new Map();
  for (const l of ls) { const f = fincaNombre(l.fincaId); if (!g.has(f)) g.set(f, []); g.get(f).push(l.nombre); }
  return [...g.entries()].map(([f, ns]) => `${f}: ${ns.join(', ')}`).join(' · ');
}

export function mesesPrincipal(fincaId) {
  const f = finca(fincaId);
  return (f && f.mesesPrincipal) || [];
}

export function loteInfo(l, mes = mesActual()) {
  const eq = equivalencias();
  const hoy = hoyISO();
  const controles = data.controles.filter((c) => (c.loteIds || []).includes(l.id)).sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  return {
    lote: l,
    finca: finca(l.fincaId),
    ha: areaHa(l.area, l.unidad, eq),
    estado: l.estado || 'activo',
    kgMes: kgLote(data.recolecciones, l.id, mes),
    prodMes: productividadMes(l, data.recolecciones, mes, eq),
    prodMesAnterior: productividadMes(l, data.recolecciones, mesAnterior(mes), eq),
    carencias: carenciasVigentes(data.controles, l.id, hoy),
    reingresos: reingresosVigentes(data.controles, l.id, hoy),
    controles,
    ultimoControl: controles[0] || null,
  };
}

export function serieLote(l, n = 12) {
  return serieMensual(l, data.recolecciones, equivalencias(), mesActual(), n);
}

export function anualLote(l, anio) {
  return resumenAnual(l, data.recolecciones, anio, equivalencias(), mesesPrincipal(l.fincaId));
}

/** Años con recolección registrada (más reciente primero); siempre incluye el actual. */
export function aniosConDatos() {
  const s = new Set(data.recolecciones.map((r) => String(r.fecha || '').slice(0, 4)).filter(Boolean));
  s.add(hoyISO().slice(0, 4));
  return [...s].sort().reverse();
}

// ---------- Recolectores ----------

export const recolector = (id) => data.recolectores.find((r) => r.id === id) || null;
export const nombreRecolector = (id) => (recolector(id) || {}).nombre || 'Recolector borrado';

export function recolectoresInfo() {
  return data.recolectores
    .map((r) => ({ recolector: r, ...pendienteRecolector(data.recolecciones, r.id) }))
    .sort((a, b) => b.valor - a.valor || a.recolector.nombre.localeCompare(b.recolector.nombre, 'es'));
}

export function totalPendiente() {
  const info = recolectoresInfo().filter((r) => r.valor > 0 || r.n > 0);
  return { valor: info.reduce((s, r) => s + r.valor, 0), kg: info.reduce((s, r) => s + r.kg, 0), personas: info.length };
}

/** Último precio por kg usado en una recogida (para proponerlo en la siguiente). */
export function ultimoPrecio() {
  const r = [...data.recolecciones].sort((a, b) => ((a.fecha || '') + a.actualizado < (b.fecha || '') + b.actualizado ? 1 : -1))[0];
  return r ? num(r.precioKg) : 0;
}

// ---------- Bodega ----------

export function fincasDeCafe(cafe) {
  return (cafe.loteIds || []).map((id) => lote(id)).filter(Boolean).map((l) => fincaNombre(l.fincaId));
}

export function cafeInfo(cafe) {
  const cats = data.cataciones.filter((c) => c.cafeId === cafe.id).sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  const salidas = data.salidas.filter((s) => s.cafeId === cafe.id).sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  const fincaIds = [...new Set((cafe.loteIds || []).map((id) => (lote(id) || {}).fincaId).filter(Boolean))];
  return {
    cafe,
    nombre: nombreCafe(cafe, fincasDeCafe(cafe)),
    fincaIds,
    lotes: (cafe.loteIds || []).map((id) => lote(id)).filter(Boolean),
    disponible: disponibleCafe(cafe, data.salidas),
    puntaje: promedioPuntaje(cats),
    perfil: perfil(cats),
    perfilTexto: perfilTexto(cats),
    cataciones: cats,
    salidas,
    factorUGQ: factor(cafe, 'UGQ'),
    factorEP: factor(cafe, 'EP'),
  };
}

export const cafesOrdenados = () => [...data.cafes].sort((a, b) => (a.id < b.id ? 1 : -1));
export const nombreCafeId = (id) => { const c = data.cafes.find((x) => x.id === id); return c ? `${c.id} · ${cafeInfo(c).nombre}` : id; };

// ---------- Tablero de Inicio ----------

export function tablero(fincaId = 'todas') {
  const mes = mesActual();
  const ant = mesAnterior(mes);
  const lotes = lotesOrdenados(fincaId);
  const ids = new Set(lotes.map((l) => l.id));
  const recs = data.recolecciones.filter((r) => ids.has(r.loteId));
  const delMes = recs.filter((r) => (r.fecha || '').startsWith(mes));
  const kgMes = delMes.reduce((s, r) => s + num(r.kg), 0);
  const kgAnt = recs.filter((r) => (r.fecha || '').startsWith(ant)).reduce((s, r) => s + num(r.kg), 0);
  const valorMes = delMes.reduce((s, r) => s + totalRecoleccion(r), 0);

  const infos = lotes.map((l) => loteInfo(l, mes));
  const activos = infos.filter((i) => i.estado === 'activo');
  const haActivas = activos.reduce((s, i) => s + i.ha, 0);
  const kgActivos = activos.reduce((s, i) => s + i.kgMes, 0);

  const cafes = data.cafes.map(cafeInfo).filter((c) => fincaId === 'todas' || c.fincaIds.includes(fincaId) || !c.fincaIds.length);
  const conKg = cafes.filter((c) => c.disponible > 0.001);

  const alertas = [];
  for (const i of infos) {
    for (const c of i.carencias) alertas.push({ tipo: 'carencia', lote: i.lote, producto: c.producto, hasta: c.hasta });
    for (const r of i.reingresos) alertas.push({ tipo: 'reingreso', lote: i.lote, producto: r.producto, hasta: r.hasta });
  }

  const controles = data.controles
    .filter((c) => (c.loteIds || []).some((id) => ids.has(id)))
    .sort((a, b) => ((a.fecha || '') + a.actualizado < (b.fecha || '') + b.actualizado ? 1 : -1))
    .slice(0, 4);

  return {
    mes, kgMes, kgAnt, valorMes, nRecogidas: delMes.length,
    prodMes: haActivas > 0 ? kgActivos / haActivas : null,
    haActivas,
    porLote: activos.map((i) => ({ lote: i.lote, kg: i.kgMes, kgHa: i.prodMes })).sort((a, b) => b.kg - a.kg),
    pendiente: totalPendiente(),
    pergamino: conKg.reduce((s, c) => s + c.disponible, 0),
    nCafes: conKg.length,
    alertas,
    controles,
    vacio: data.lotes.length === 0,
  };
}
