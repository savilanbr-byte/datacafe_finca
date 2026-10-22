// Cálculos de DataCafé|Finca.
// Funciones puras (sin acceso a la pantalla ni a la base de datos) para poder probarlas con `node --test`.

/** Convierte texto del usuario ("10,8", "1.200", "") a número. Vacío o inválido = 0. */
export function num(x) {
  if (x === null || x === undefined || x === '') return 0;
  if (typeof x === 'number') return Number.isFinite(x) ? x : 0;
  let s = String(x).trim().replace(/\s/g, '').replace(/^\$/, '');
  // "1.200,5" -> 1200.5 ; "1200,5" -> 1200.5 ; "1200.5" -> 1200.5 ; "1.200" -> 1200
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

// ---------- Fechas ----------

export function hoyISO(offsetDias = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDias);
  return isoDe(d);
}

function isoDe(d) {
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Suma días a una fecha "AAAA-MM-DD". */
export function sumarDias(iso, dias) {
  const [y, m, d] = iso.split('-').map(Number);
  const f = new Date(y, m - 1, d);
  f.setDate(f.getDate() + Math.ceil(num(dias)));
  return isoDe(f);
}

/** Los n meses que terminan en `mes` ("AAAA-MM"), del más viejo al más reciente. */
export function mesesHasta(mes, n = 12) {
  let [y, m] = mes.split('-').map(Number);
  const out = [];
  for (let i = 0; i < n; i++) {
    out.unshift(`${y}-${String(m).padStart(2, '0')}`);
    m--; if (m === 0) { m = 12; y--; }
  }
  return out;
}

export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
export const nombreMes = (mes) => { const [y, m] = mes.split('-'); return `${MESES[Number(m) - 1]} ${y}`; };
export const mesCorto = (mes) => MESES_CORTOS[Number(mes.split('-')[1]) - 1];

// ---------- Área y productividad ----------

export const UNIDADES_AREA = [['ha', 'Hectárea'], ['m2', 'm²'], ['cuadra', 'Cuadra'], ['plaza', 'Plaza'], ['fanegada', 'Fanegada']];
/** m² que tiene cada unidad. Cuadra, plaza y fanegada cambian según la región: se ajustan en Ajustes. */
export const EQUIVALENCIAS_DEFECTO = { ha: 10000, m2: 1, cuadra: 6400, plaza: 6400, fanegada: 6400 };

/** Área de un lote en hectáreas. */
export function areaHa(area, unidad = 'ha', equivalencias = EQUIVALENCIAS_DEFECTO) {
  const m2 = num((equivalencias || {})[unidad] ?? EQUIVALENCIAS_DEFECTO[unidad] ?? 10000);
  return (num(area) * m2) / 10000;
}

/** Kg de cereza recogidos en un lote; `prefijo` filtra por fecha ("2026-10" = ese mes, "2026" = ese año). */
export function kgLote(recolecciones, loteId, prefijo = '') {
  return (recolecciones || [])
    .filter((r) => r.loteId === loteId && String(r.fecha || '').startsWith(prefijo))
    .reduce((s, r) => s + num(r.kg), 0);
}

/** Productividad del mes = kg de cereza del mes ÷ hectáreas → (kg/ha)/mes. Null si el lote no tiene área. */
export function productividadMes(lote, recolecciones, mes, equivalencias) {
  const ha = areaHa(lote.area, lote.unidad, equivalencias);
  if (!(ha > 0)) return null;
  return kgLote(recolecciones, lote.id, mes) / ha;
}

/** Serie de los últimos n meses: kg y kg/ha de cada mes. */
export function serieMensual(lote, recolecciones, equivalencias, hastaMes, n = 12) {
  const ha = areaHa(lote.area, lote.unidad, equivalencias);
  return mesesHasta(hastaMes, n).map((mes) => {
    const kg = kgLote(recolecciones, lote.id, mes);
    return { mes, kg, kgHa: ha > 0 ? kg / ha : null };
  });
}

/**
 * Resumen de un año para un lote: kg totales, kg/ha, cosecha principal y mitaca, y kg por árbol.
 * `mesesPrincipal` son los números de mes (1–12) de la cosecha principal de la finca; los demás son mitaca.
 */
export function resumenAnual(lote, recolecciones, anio, equivalencias, mesesPrincipal = []) {
  const ha = areaHa(lote.area, lote.unidad, equivalencias);
  let kg = 0, principal = 0;
  for (const r of recolecciones || []) {
    if (r.loteId !== lote.id || !String(r.fecha || '').startsWith(String(anio))) continue;
    const k = num(r.kg);
    kg += k;
    if (mesesPrincipal.includes(Number(r.fecha.slice(5, 7)))) principal += k;
  }
  const arboles = num(lote.arboles);
  return {
    kg, principal, mitaca: kg - principal,
    kgHa: ha > 0 ? kg / ha : null,
    principalHa: ha > 0 ? principal / ha : null,
    mitacaHa: ha > 0 ? (kg - principal) / ha : null,
    kgArbol: arboles > 0 ? kg / arboles : null,
  };
}

// ---------- Recolección y pagos ----------

export const totalRecoleccion = (r) => num(r.kg) * num(r.precioKg);

/** Lo que se le debe a un recolector: recogidas sin pagar. */
export function pendienteRecolector(recolecciones, recolectorId) {
  const pend = (recolecciones || []).filter((r) => r.recolectorId === recolectorId && !r.pagoId);
  return {
    recolecciones: pend,
    n: pend.length,
    kg: pend.reduce((s, r) => s + num(r.kg), 0),
    valor: pend.reduce((s, r) => s + totalRecoleccion(r), 0),
  };
}

// ---------- Controles: carencia y reingreso ----------

/**
 * Productos aplicados en un lote cuyo periodo de carencia sigue vigente en `fecha`.
 * Cada producto del control guarda sus días de carencia y horas de reingreso al momento de aplicarlo.
 */
export function carenciasVigentes(controles, loteId, fecha) {
  const out = [];
  for (const c of controles || []) {
    if (!(c.loteIds || []).includes(loteId) || !c.fecha || c.fecha > fecha) continue;
    for (const p of c.productos || []) {
      const dias = num(p.carenciaDias);
      if (!(dias > 0)) continue;
      const hasta = sumarDias(c.fecha, dias);
      if (fecha < hasta) out.push({ control: c, producto: p.nombre, hasta });
    }
  }
  return out.sort((a, b) => (a.hasta < b.hasta ? 1 : -1));
}

/** Productos aplicados en un lote cuyo tiempo de reingreso no ha terminado en `fecha` (se cuenta por días). */
export function reingresosVigentes(controles, loteId, fecha) {
  const out = [];
  for (const c of controles || []) {
    if (!(c.loteIds || []).includes(loteId) || !c.fecha || c.fecha > fecha) continue;
    for (const p of c.productos || []) {
      const horas = num(p.reingresoHoras);
      if (!(horas > 0)) continue;
      const hasta = sumarDias(c.fecha, horas / 24);
      if (fecha < hasta) out.push({ control: c, producto: p.nombre, horas, hasta });
    }
  }
  return out;
}

// ---------- Bodega: análisis físico y factor de rendimiento ----------
// Iguales a DataCafé|Laboratorio.

/** Gramos de excelso en la muestra según la preparación. La malla 0 (fondo) no entra. */
export function excelsoGramos(c, prep = 'UGQ') {
  const m15 = num(c.m15), p15 = num(c.p15), m14 = num(c.m14), p14 = num(c.p14);
  if (prep === 'EP') return m15 - p15; // POR CONFIRMAR: solo lo retenido en malla 15
  return m15 + m14 - p15 - p14;        // UGQ: mallas 15 y 14 sin pasillas
}

/** Factor de rendimiento = 70 / (gramos de excelso / gramos de análisis). Null si faltan datos. */
export function factor(c, prep = 'UGQ') {
  const g = num(c.gramos);
  const ex = excelsoGramos(c, prep);
  if (!(g > 0) || !(ex > 0)) return null;
  return 70 / (ex / g);
}

/** Kg de excelso esperados a partir de kg de pergamino y un factor. */
export function proyeccionExcelso(kgPergamino, f) {
  return f ? (num(kgPergamino) * 70) / f : 0;
}

export const precioCarga = (precioKg) => num(precioKg) * 125;

/** Kg de pergamino disponibles de un café = kg ingresados − salidas. */
export function disponibleCafe(cafe, salidas, excluirSalidaId = null) {
  const salio = (salidas || [])
    .filter((s) => s.cafeId === cafe.id && s.id !== excluirSalidaId)
    .reduce((t, s) => t + num(s.kg), 0);
  return num(cafe.kgPergamino) - salio;
}

/** Nombre del café = Finca - Variedad - Proceso. */
export function nombreCafe(cafe, fincas = []) {
  const f = [...new Set(fincas.filter(Boolean))].join(' y ');
  const v = (cafe.variedades || []).join(', ');
  return [f || '[finca]', v || '[variedad]', cafe.proceso || '[proceso]'].join(' - ');
}

// ---------- Catación (formato SCA clásico) ----------

export const ATRIBUTOS = [
  ['aroma', 'Aroma'], ['sabor', 'Sabor'], ['residual', 'Residual'], ['acidez', 'Acidez'],
  ['balance', 'Balance'], ['cuerpo', 'Cuerpo'], ['general', 'General'],
];
export const TAZAS = [['uniformidad', 'Uniformidad'], ['tazaLimpia', 'Taza limpia'], ['dulzura', 'Dulzura']];

/** Puntaje final = suma de los 7 atributos + 2 × (uniformidad + taza limpia + dulzura) − defectos. */
export function puntajeCatacion(c) {
  const a = c.atributos || {};
  const suma = ATRIBUTOS.reduce((s, [k]) => s + num(a[k]), 0);
  const tazas = TAZAS.reduce((s, [k]) => s + num(c[k]), 0);
  return suma + 2 * tazas - num(c.defectos);
}

export function clasificacion(p) {
  if (p >= 90) return 'Excepcional';
  if (p >= 85) return 'Excelente';
  if (p >= 80) return 'Muy bueno';
  return 'Por debajo de especialidad';
}

export function promedioPuntaje(cataciones) {
  if (!cataciones || !cataciones.length) return null;
  return cataciones.reduce((s, c) => s + puntajeCatacion(c), 0) / cataciones.length;
}

/** Descriptores de varias cataciones contados; los repetidos se marcan "(xN)". */
export function perfil(cataciones) {
  const map = new Map();
  let orden = 0;
  for (const c of cataciones || []) {
    for (const raw of c.descriptores || []) {
      const label = String(raw).trim();
      if (!label) continue;
      const key = label.toLocaleLowerCase('es').normalize('NFD').replace(/[̀-ͯ]/g, '');
      if (!map.has(key)) map.set(key, { label, count: 0, orden: orden++ });
      map.get(key).count++;
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.orden - b.orden);
}

export function perfilTexto(cataciones) {
  return perfil(cataciones).map((d) => (d.count > 1 ? `${d.label} (x${d.count})` : d.label)).join(', ');
}

// ---------- Formato colombiano ----------

export function fmtNum(n, dec = 0) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  const neg = n < 0;
  const [ent, frac] = Math.abs(n).toFixed(dec).split('.');
  const miles = ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '−' : '') + miles + (frac ? ',' + frac : '');
}
export function fmtKg(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  const c = Math.round(n * 100);
  return fmtNum(n, c % 100 === 0 ? 0 : c % 10 === 0 ? 1 : 2);
}
export const fmtCOP = (n) => (n === null || n === undefined || !Number.isFinite(n) ? '—' : '$' + fmtNum(n, 0));
export const fmt2 = (n) => fmtNum(n, 2);
export const fmt1 = (n) => fmtNum(n, 1);

export function fmtFecha(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
