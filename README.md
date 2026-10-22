# DataCafé|Finca

App para que productores y productoras de café lleven en su finca el registro de **lotes, controles y labores, recolección, pago a recolectores, café en bodega, catación y salidas**. Botones grandes, lenguaje sencillo y **funciona sin internet**.

Es un prototipo de **Sancocho Glorioso** (versión 0.1.1), cuarta app de la familia DataCafé.

👉 **Probar la app:** https://savilanbr-byte.github.io/datacafe_finca/

## Instalarla en un celular Android

1. Abre el enlace de arriba en **Chrome**.
2. Toca el menú ⋮ y elige **Instalar app** (o **Agregar a la pantalla principal**).
3. Queda con su propio ícono y abre sin internet.

También funciona en el **computador**: en pantallas anchas el menú pasa a una barra lateral.

Para conocerla sin escribir nada: en Inicio toca **Ver con datos de ejemplo**. Después se borran en **Ajustes → Borrar toda la información**.

## Qué hace

| Pantalla | Qué permite |
|---|---|
| **Inicio** | Cereza recogida en el mes, productividad, lo que se debe a recolectores, pergamino en bodega, lotes en carencia, kilos por lote y últimos controles. Si hay varias fincas, se puede ver una o todas. |
| **Lotes** | Lotes agrupados por finca: área (ha, m², cuadra, plaza o fanegada), altitud, fecha de siembra, variedades, número de árboles y estado (activo, zoca o renovación, inactivo). Pestaña **Productividad**: kg/ha del mes, del mes pasado, del año, cosecha principal, mitaca y kg por árbol. |
| **Ficha del lote** | Avisos de carencia y reingreso, gráfica de 12 meses, resumen del año, controles y recogidas. |
| **Controles** | Aplicaciones (fertilización, fungicida, insecticida, herbicida, encalado, bioinsumos…) y labores (desyerba, poda, re-re, monitoreo de broca, análisis de suelo…). Uno o varios lotes, uno o varios productos con dosis, carencia y reingreso, costo, quién lo hizo y observaciones. |
| **Recolección** | Pensada para anotar una pesada tras otra: deja lote, fecha y precio, y solo pide recolector y kilos. Avisa si el lote está en carencia. Pestaña **Historial** por mes. |
| **Recolectores** | Lo que se le debe a cada uno. **Registrar pago** marca como pagadas sus recogidas pendientes; se puede deshacer. La cuenta se comparte por WhatsApp. |
| **Bodega** | Pergamino seco que sale del beneficio: lotes de origen, variedades, kg, humedad, proceso, fermentación, secado y análisis físico con los factores calculados en vivo. |
| **Catación** | Formato SCA clásico, igual que en DataCafé\|Laboratorio. El puntaje del café es el promedio de sus cataciones. |
| **Salidas** | Ventas, muestras, consumo propio u otras. Comprador, kg, precio por kg (y por carga), factor pagado y recibo. No deja sacar más de lo disponible. |
| **Ajustes** | Tema, tamaño de letra, fincas y meses de cosecha principal, equivalencias de área, lista de productos, exportar a Excel (CSV), respaldo y restauración. |

## Fórmulas

- **Área en hectáreas** = área × m² de la unidad ÷ 10.000. Cuadra, plaza y fanegada valen 6.400 m² por defecto y se cambian en Ajustes.
- **Productividad del mes** = kg de cereza del mes ÷ hectáreas → (kg/ha)/mes, con corte a fin de mes.
- **Productividad del año** = kg de cereza del año ÷ hectáreas, separada en cosecha principal (meses que se eligen por finca) y mitaca (los demás).
- **Kg por árbol** = kg de cereza del año ÷ número de árboles.
- **Precio total de una recogida** = kg de cereza × precio por kg.
- **Pendiente con un recolector** = suma de sus recogidas sin pagar.
- **Carencia** = fecha de la aplicación + días de carencia del producto. **Reingreso** = fecha + horas de reingreso.
- **Factor UGQ** = 70 ÷ ((malla 15 + malla 14 − pasilla 15 − pasilla 14) ÷ gramos de análisis). La malla 0 se registra pero no entra.
  Ejemplo: 120, 8, 135, 6 en 300 g → **87,14**
- **Factor EP** = 70 ÷ ((malla 15 − pasilla 15) ÷ gramos de análisis). ⚠️ *Por confirmar, igual que en Laboratorio.*
- **Excelso proyectado** = kg de pergamino × 70 ÷ factor
- **Nombre del café** = Finca - Variedad - Proceso
- **Puntaje de catación** = suma de los 7 atributos + 2 × (uniformidad + taza limpia + dulzura) − defectos
- **Kg disponibles en bodega** = kg de pergamino − salidas

Las fórmulas están en [`js/calc.js`](js/calc.js) y tienen pruebas en [`tests/calc.test.mjs`](tests/calc.test.mjs).

## Limitaciones del prototipo

- **La información se guarda solo en el celular** (IndexedDB del navegador), sin sincronización. Conviene descargar respaldos desde Ajustes.
- La cereza llega hasta Recolección y el pergamino se inscribe aparte en Bodega, sin un enlace fijo entre los dos (cada finca hace el beneficio distinto).
- Todavía no calcula costos de producción; el costo de cada control sí se anota.

## Estructura del código

HTML, CSS y JavaScript puros, sin librerías ni compilación. GitHub Pages lo publica tal cual.

```
index.html              Página única con el menú e íconos
css/styles.css          Estilo "Patio de secado" (el mismo de Laboratorio), tema oscuro y escala de letra
js/app.js               Arranque y navegación (#/inicio, #/lotes, ...)
js/db.js                Base de datos local (IndexedDB "datacafe-finca")
js/calc.js              Fórmulas (sin dependencias, con pruebas)
js/model.js             Datos derivados: productividad, pendientes, tablero
js/views/*.js           Una pantalla por archivo
js/seed.js              Datos de ejemplo
js/listas.js            Variedades, tipos de control, descriptores
sw.js                   Modo sin conexión (service worker)
manifest.webmanifest    Datos para instalar la app
```

## Trabajar en el código

```bash
npx serve .                      # abre http://localhost:3000
node --test tests/*.test.mjs     # pruebas de las fórmulas
```

**Para publicar una versión nueva**, ejecuta `node scripts/version.mjs 0.2.0` (con el número nuevo) y sube los cambios a `main`. Así los equipos que ya tienen la app descargan la versión completa y ven el aviso **Actualizar**.

## Siguientes pasos

1. Mostrarla a productores y decidir qué sigue (costos de producción, enlace cereza → pergamino).
2. Confirmar la fórmula del factor EP.
3. Empaquetar para Play Store (por ejemplo, con Capacitor) usando este mismo código.
