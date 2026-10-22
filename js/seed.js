// Datos de ejemplo para conocer la app. Todo es inventado (también la carencia de los productos).
import { clearAll, data, put, putMany, uid } from './db.js';
import { hoyISO, sumarDias, puntajeCatacion } from './calc.js';
import { setPref } from './ui.js';

// Generador pseudoaleatorio con semilla: los datos de ejemplo salen iguales cada vez.
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// Peso de cada mes en la cosecha (principal en sep–dic, mitaca en abr–jun).
const PESO_MES = [0.03, 0.01, 0.02, 0.08, 0.12, 0.08, 0.02, 0.02, 0.10, 0.22, 0.20, 0.10];

export async function cargarEjemplo() {
  await clearAll();
  setPref('finca', 'todas');
  const r = rng(20261021);
  const hoy = hoyISO();

  const f1 = { id: 'f-esperanza', nombre: 'La Esperanza', municipio: 'Chinchiná, Caldas', mesesPrincipal: [9, 10, 11, 12] };
  const f2 = { id: 'f-mirador', nombre: 'El Mirador', municipio: 'Andes, Antioquia', mesesPrincipal: [9, 10, 11, 12] };
  for (const f of [f1, f2]) await put('fincas', f);

  const lotes = [
    { id: 'l-loma', fincaId: f1.id, nombre: 'La Loma', area: 2.5, unidad: 'ha', altitud: 1650, fechaSiembra: '2019-04-15', variedades: ['Castillo'], arboles: 12500, estado: 'activo', rinde: 1 },
    { id: 'l-guamo', fincaId: f1.id, nombre: 'El Guamo', area: 3, unidad: 'cuadra', altitud: 1580, fechaSiembra: '2017-10-01', variedades: ['Caturra', 'Colombia'], arboles: 9000, estado: 'activo', rinde: 0.9 },
    { id: 'l-geisha', fincaId: f1.id, nombre: 'Las Geishas', area: 0.8, unidad: 'ha', altitud: 1800, fechaSiembra: '2021-05-20', variedades: ['Geisha'], arboles: 3600, estado: 'activo', rinde: 0.6 },
    { id: 'l-zoca', fincaId: f1.id, nombre: 'Zoca 2025', area: 1.2, unidad: 'ha', altitud: 1600, fechaSiembra: '2014-03-10', variedades: ['Castillo'], arboles: 6000, estado: 'zoca', rinde: 0 },
    { id: 'l-canada', fincaId: f2.id, nombre: 'La Cañada', area: 1.5, unidad: 'ha', altitud: 1720, fechaSiembra: '2020-09-01', variedades: ['Pink Bourbon', 'Castillo'], arboles: 7500, estado: 'activo', rinde: 0.85 },
    { id: 'l-alto', fincaId: f2.id, nombre: 'El Alto', area: 2, unidad: 'ha', altitud: 1850, fechaSiembra: '2018-02-12', variedades: ['Castillo'], arboles: 10000, estado: 'activo', rinde: 0.95 },
  ];
  for (const l of lotes) { const { rinde, ...guardar } = l; await put('lotes', guardar); }

  const nombres = ['Arley Ospina', 'Marleny Cardona', 'Jhon Fredy Ríos', 'Rubiela Giraldo', 'Yeison Arango', 'Luz Dary Henao', 'Wilmar Tabares'];
  const recolectores = nombres.map((nombre, i) => ({ id: 'r-' + (i + 1), nombre, telefono: '', activo: true }));
  for (const x of recolectores) await put('recolectores', x);

  // Recolección de los últimos 13 meses.
  const ha = { 'l-loma': 2.5, 'l-guamo': 1.92, 'l-geisha': 0.8, 'l-canada': 1.5, 'l-alto': 2 };
  const recs = [];
  const [hy, hm] = hoy.split('-').map(Number);
  for (let k = 12; k >= 0; k--) {
    let y = hy, m = hm - k;
    while (m < 1) { m += 12; y--; }
    const w = PESO_MES[m - 1];
    const diasMes = new Date(y, m, 0).getDate();
    const precio = m >= 9 ? 1300 : m >= 4 && m <= 6 ? 1200 : 1100;
    for (const l of lotes.filter((x) => x.rinde > 0)) {
      const meta = 8000 * ha[l.id] * w * l.rinde * (0.85 + 0.3 * r());
      const nDias = Math.max(2, Math.round(3 + (10 * w) / 0.22));
      const paso = Math.max(1, Math.floor(diasMes / nDias));
      for (let d = 1 + Math.floor(r() * paso); d <= diasMes; d += paso) {
        const fecha = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (fecha > hoy) break;
        const personas = Math.max(1, Math.min(6, Math.round(meta / (nDias * 85))));
        const elegidos = [...recolectores].sort(() => r() - 0.5).slice(0, personas);
        for (const p of elegidos) {
          const kg = Math.max(8, Math.round(((meta / (nDias * personas)) * (0.7 + 0.6 * r())) * 2) / 2);
          const variedad = l.variedades.length > 1 ? (r() < 0.6 ? 'Mezcla' : l.variedades[Math.floor(r() * l.variedades.length)]) : l.variedades[0];
          recs.push({ id: uid('rc'), fecha, loteId: l.id, variedad, recolectorId: p.id, kg, precioKg: precio });
        }
      }
    }
  }

  // Pagos semanales los sábados; lo de esta semana queda pendiente.
  const sabadoDe = (iso) => { const [y, m, d] = iso.split('-').map(Number); const dt = new Date(y, m - 1, d); return sumarDias(iso, (6 - dt.getDay() + 7) % 7); };
  const grupos = new Map();
  for (const x of recs) {
    const sab = sabadoDe(x.fecha);
    if (sab >= hoy) continue;
    const key = x.recolectorId + '|' + sab;
    if (!grupos.has(key)) grupos.set(key, []);
    grupos.get(key).push(x);
  }
  const pagos = [];
  for (const [key, lista] of grupos) {
    const [recolectorId, fecha] = key.split('|');
    const pago = { id: uid('pg'), fecha, recolectorId, recoleccionIds: lista.map((x) => x.id), kg: lista.reduce((s, x) => s + x.kg, 0), valor: lista.reduce((s, x) => s + x.kg * x.precioKg, 0) };
    for (const x of lista) x.pagoId = pago.id;
    pagos.push(pago);
  }
  await putMany('recolecciones', recs);
  await putMany('pagos', pagos);

  // Productos y controles.
  const productos = [
    { id: 'p-1', nombre: 'Fertilizante 17-6-18-2', unidad: 'bultos', tipo: 'Fertilización al suelo', carenciaDias: '', reingresoHoras: '' },
    { id: 'p-2', nombre: 'Cal dolomita', unidad: 'kg', tipo: 'Encalado o enmienda', carenciaDias: '', reingresoHoras: '' },
    { id: 'p-3', nombre: 'Fungicida cúprico (ejemplo)', unidad: 'cc/L', tipo: 'Fungicida', carenciaDias: 14, reingresoHoras: 24 },
    { id: 'p-4', nombre: 'Beauveria bassiana', unidad: 'g', tipo: 'Bioinsumo o control biológico', carenciaDias: '', reingresoHoras: '' },
    { id: 'p-5', nombre: 'Fertilizante foliar (ejemplo)', unidad: 'mL/L', tipo: 'Fertilización foliar', carenciaDias: '', reingresoHoras: 4 },
  ];
  await putMany('productos', productos);
  const P = (i, dosis) => { const p = productos[i]; return { nombre: p.nombre, dosis, unidad: p.unidad, carenciaDias: p.carenciaDias, reingresoHoras: p.reingresoHoras }; };
  const controles = [
    { fecha: sumarDias(hoy, -9), tipo: 'Fungicida', loteIds: ['l-loma'], productos: [P(2, '3')], costo: 180000, responsable: 'Arley Ospina', observaciones: 'Roya en hojas bajeras.' },
    { fecha: sumarDias(hoy, -6), tipo: 'Monitoreo de broca', loteIds: ['l-loma', 'l-guamo'], productos: [], costo: '', responsable: 'Mayordomo', observaciones: '30 árboles por lote. La Loma 2,1 %, El Guamo 3,4 % de infestación.' },
    { fecha: sumarDias(hoy, -4), tipo: 'Re-re (repase de broca)', loteIds: ['l-guamo'], productos: [], costo: 120000, responsable: 'Rubiela Giraldo', observaciones: 'Se recogieron frutos secos y del suelo.' },
    { fecha: sumarDias(hoy, -2), tipo: 'Bioinsumo o control biológico', loteIds: ['l-guamo'], productos: [P(3, '500')], costo: 95000, responsable: 'Mayordomo', observaciones: '' },
    { fecha: sumarDias(hoy, -25), tipo: 'Desyerba o plateo', loteIds: ['l-geisha', 'l-loma'], productos: [], costo: 260000, responsable: 'Cuadrilla', observaciones: 'Plateo manual.' },
    { fecha: sumarDias(hoy, -40), tipo: 'Fertilización al suelo', loteIds: ['l-loma', 'l-guamo', 'l-geisha'], productos: [P(0, '18')], costo: 2340000, responsable: 'Cuadrilla', observaciones: 'Segunda fertilización del año.' },
    { fecha: sumarDias(hoy, -55), tipo: 'Fertilización foliar', loteIds: ['l-geisha'], productos: [P(4, '5')], costo: 70000, responsable: 'Arley Ospina', observaciones: '' },
    { fecha: sumarDias(hoy, -70), tipo: 'Poda o zoca', loteIds: ['l-zoca'], productos: [], costo: 600000, responsable: 'Cuadrilla', observaciones: 'Zoca a 30 cm.' },
    { fecha: sumarDias(hoy, -95), tipo: 'Encalado o enmienda', loteIds: ['l-alto', 'l-canada'], productos: [P(1, '700')], costo: 420000, responsable: 'Yeison Arango', observaciones: 'Según análisis de suelo.' },
    { fecha: sumarDias(hoy, -120), tipo: 'Análisis de suelo', loteIds: ['l-alto', 'l-canada'], productos: [], costo: 150000, responsable: '', observaciones: 'pH 4,8. Se recomienda encalar.' },
    { fecha: sumarDias(hoy, -12), tipo: 'Fertilización al suelo', loteIds: ['l-alto', 'l-canada'], productos: [P(0, '14')], costo: 1820000, responsable: 'Yeison Arango', observaciones: '' },
  ];
  await putMany('controles', controles.map((c) => ({ id: uid('c'), ...c })));

  // Bodega, catación y salidas.
  const cafes = [
    { id: 'C-0001', fechaIngreso: sumarDias(hoy, -38), loteIds: ['l-loma'], variedades: ['Castillo'], kgPergamino: 750, humedad: 11, proceso: 'Lavado',
      tipoFermentacion: 'En tanque, sin agua', tiempoFermentacion: '18 h', tipoSecado: 'Marquesina', tiempoSecado: '12 días',
      gramos: 300, m15: 150, p15: 6, m14: 100, p14: 5, m0: 10, comentarios: '' },
    { id: 'C-0002', fechaIngreso: sumarDias(hoy, -20), loteIds: ['l-geisha'], variedades: ['Geisha'], kgPergamino: 120, humedad: 10.5, proceso: 'Natural',
      tipoFermentacion: 'Cereza en bolsa cerrada (anaeróbica)', tiempoFermentacion: '72 h', tipoSecado: 'Camas africanas bajo sombra', tiempoSecado: '24 días',
      gramos: 250, m15: 155, p15: 3, m14: 52, p14: 2, m0: 4, comentarios: 'Microlote para concurso.' },
    { id: 'C-0003', fechaIngreso: sumarDias(hoy, -5), loteIds: ['l-guamo', 'l-loma'], variedades: ['Caturra', 'Colombia', 'Castillo'], kgPergamino: 310, humedad: 11.5, proceso: 'Honey',
      tipoFermentacion: 'Sin fermentación, con mucílago', tiempoFermentacion: '0 h', tipoSecado: 'Marquesina', tiempoSecado: '15 días',
      gramos: '', m15: '', p15: '', m14: '', p14: '', m0: '', comentarios: '' },
  ];
  await putMany('cafes', cafes);
  await put('meta', { id: 'seq-C', value: 3 });

  const cat = (cafeId, dias, at, desc, comentarios, defectos = 0) => {
    const c = {
      id: uid('k'), cafeId, fecha: sumarDias(hoy, dias), mesa: '1',
      atributos: { aroma: at[0], sabor: at[1], residual: at[2], acidez: at[3], balance: at[4], cuerpo: at[5], general: at[6] },
      uniformidad: 5, tazaLimpia: 5, dulzura: 5, defectos, descriptores: desc, comentarios,
    };
    return { ...c, puntaje: puntajeCatacion(c) };
  };
  await putMany('cataciones', [
    cat('C-0001', -30, [7.75, 7.75, 7.5, 7.75, 7.5, 7.75, 7.75], ['Panela', 'Chocolate', 'Naranja'], 'Limpio y dulce.'),
    cat('C-0001', -15, [8, 7.75, 7.5, 7.75, 7.75, 7.75, 8], ['Panela', 'Caramelo'], ''),
    cat('C-0002', -10, [8.5, 8.5, 8.25, 8.25, 8.25, 8, 8.5], ['Jazmín', 'Bergamota', 'Fresa', 'Vino tinto'], 'Muy floral. Para concurso.'),
  ]);
  await putMany('salidas', [
    { id: uid('s'), cafeId: 'C-0001', fecha: sumarDias(hoy, -12), tipo: 'Venta', comprador: 'Cooperativa (ejemplo)', kg: 500, precioKg: 18400, factorPagado: 88, recibo: '00123', comentarios: '' },
    { id: uid('s'), cafeId: 'C-0002', fecha: sumarDias(hoy, -8), tipo: 'Muestra', comprador: 'Tostador en Medellín', kg: 2, precioKg: '', factorPagado: '', recibo: '', comentarios: 'Muestra para cotizar.' },
  ]);
  return data;
}
