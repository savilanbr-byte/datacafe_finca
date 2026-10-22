import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  num, factor, proyeccionExcelso, puntajeCatacion, perfilTexto, areaHa, productividadMes, resumenAnual, serieMensual,
  pendienteRecolector, carenciasVigentes, reingresosVigentes, disponibleCafe, nombreCafe, sumarDias, mesesHasta, fmtNum, fmtKg,
} from '../js/calc.js';

const cerca = (a, b, d = 0.01) => assert.ok(Math.abs(a - b) < d, `${a} ≠ ${b}`);

test('num entiende formatos colombianos', () => {
  assert.equal(num('10,8'), 10.8);
  assert.equal(num('1.200'), 1200);
  assert.equal(num('1.200,5'), 1200.5);
  assert.equal(num('$2.500'), 2500);
  assert.equal(num(''), 0);
  assert.equal(num('abc'), 0);
});

test('factor UGQ igual que en Laboratorio: 120, 8, 135, 6 en 300 g = 87,14', () => {
  const c = { gramos: 300, m15: 120, p15: 8, m14: 135, p14: 6, m0: 20 };
  cerca(factor(c, 'UGQ'), 87.14);
});

test('factor EP = 70 / ((malla 15 − pasilla 15) / gramos)', () => {
  cerca(factor({ gramos: 300, m15: 120, p15: 8, m14: 135, p14: 6 }, 'EP'), 187.5);
});

test('la malla 0 no cambia el factor', () => {
  const a = { gramos: 300, m15: 120, p15: 8, m14: 135, p14: 6, m0: 0 };
  assert.equal(factor(a), factor({ ...a, m0: 40 }));
});

test('factor sin datos = null', () => {
  assert.equal(factor({}), null);
  assert.equal(factor({ gramos: 300 }), null);
});

test('proyección de excelso', () => {
  cerca(proyeccionExcelso(100, 87.5), 80);
});

test('puntaje de catación del Excel = 86,5', () => {
  const c = {
    atributos: { aroma: 8.25, sabor: 8.25, residual: 8, acidez: 7.75, balance: 7.75, cuerpo: 8, general: 8.5 },
    uniformidad: 5, tazaLimpia: 5, dulzura: 5, defectos: 0,
  };
  assert.equal(puntajeCatacion(c), 86.5);
});

test('perfil marca descriptores repetidos', () => {
  assert.equal(perfilTexto([{ descriptores: ['Panela', 'Mora'] }, { descriptores: ['panela'] }]), 'Panela (x2), Mora');
});

test('área a hectáreas con equivalencias', () => {
  assert.equal(areaHa(2, 'ha'), 2);
  assert.equal(areaHa(5000, 'm2'), 0.5);
  assert.equal(areaHa(1, 'cuadra'), 0.64);
  assert.equal(areaHa(1, 'fanegada', { fanegada: 10000 }), 1);
});

const lote = { id: 'L1', area: 2, unidad: 'ha', arboles: 10000 };
const recs = [
  { loteId: 'L1', fecha: '2026-10-02', kg: 300 },
  { loteId: 'L1', fecha: '2026-10-20', kg: 100 },
  { loteId: 'L1', fecha: '2026-05-10', kg: 200 },
  { loteId: 'L2', fecha: '2026-10-02', kg: 999 },
  { loteId: 'L1', fecha: '2025-10-02', kg: 50 },
];

test('productividad del mes = kg del mes / ha', () => {
  assert.equal(productividadMes(lote, recs, '2026-10'), 200);
  assert.equal(productividadMes({ id: 'L1' }, recs, '2026-10'), null);
});

test('resumen anual separa cosecha principal y mitaca', () => {
  const r = resumenAnual(lote, recs, 2026, undefined, [9, 10, 11, 12]);
  assert.equal(r.kg, 600);
  assert.equal(r.principal, 400);
  assert.equal(r.mitaca, 200);
  assert.equal(r.kgHa, 300);
  assert.equal(r.kgArbol, 0.06);
});

test('serie mensual de 12 meses termina en el mes pedido', () => {
  const s = serieMensual(lote, recs, undefined, '2026-10', 12);
  assert.equal(s.length, 12);
  assert.equal(s[0].mes, '2025-11');
  assert.equal(s[11].kgHa, 200);
  assert.deepEqual(mesesHasta('2026-02', 3), ['2025-12', '2026-01', '2026-02']);
});

test('pendiente por pagar a un recolector', () => {
  const r = [
    { recolectorId: 'a', kg: 50, precioKg: 1000 },
    { recolectorId: 'a', kg: 20, precioKg: 1200, pagoId: 'p1' },
    { recolectorId: 'b', kg: 10, precioKg: 1000 },
    { recolectorId: 'a', kg: 30, precioKg: 1100 },
  ];
  const p = pendienteRecolector(r, 'a');
  assert.equal(p.n, 2);
  assert.equal(p.kg, 80);
  assert.equal(p.valor, 50 * 1000 + 30 * 1100);
});

test('carencia vigente después de una aplicación', () => {
  const controles = [{ fecha: '2026-10-10', loteIds: ['L1', 'L3'], productos: [{ nombre: 'Fungicida', carenciaDias: 14, reingresoHoras: 24 }, { nombre: 'Urea' }] }];
  assert.equal(carenciasVigentes(controles, 'L1', '2026-10-15').length, 1);
  assert.equal(carenciasVigentes(controles, 'L1', '2026-10-15')[0].hasta, '2026-10-24');
  assert.equal(carenciasVigentes(controles, 'L1', '2026-10-24').length, 0);
  assert.equal(carenciasVigentes(controles, 'L2', '2026-10-15').length, 0);
  assert.equal(carenciasVigentes(controles, 'L1', '2026-10-09').length, 0);
  assert.equal(reingresosVigentes(controles, 'L3', '2026-10-10').length, 1);
  assert.equal(reingresosVigentes(controles, 'L3', '2026-10-11').length, 0);
});

test('sumar días cruza meses y años', () => {
  assert.equal(sumarDias('2026-12-25', 10), '2027-01-04');
});

test('kg disponibles de un café = ingresados − salidas', () => {
  const cafe = { id: 'C-0001', kgPergamino: 500 };
  const salidas = [{ id: 's1', cafeId: 'C-0001', kg: 125 }, { id: 's2', cafeId: 'C-0001', kg: 75 }, { id: 's3', cafeId: 'C-0002', kg: 10 }];
  assert.equal(disponibleCafe(cafe, salidas), 300);
  assert.equal(disponibleCafe(cafe, salidas, 's2'), 375);
});

test('nombre del café = Finca - Variedad - Proceso', () => {
  assert.equal(nombreCafe({ variedades: ['Castillo', 'Caturra'], proceso: 'Lavado' }, ['La Esperanza', 'La Esperanza']), 'La Esperanza - Castillo, Caturra - Lavado');
});

test('formato colombiano', () => {
  assert.equal(fmtNum(1234567.891, 2), '1.234.567,89');
  assert.equal(fmtKg(12.5), '12,5');
  assert.equal(fmtKg(1200), '1.200');
});
