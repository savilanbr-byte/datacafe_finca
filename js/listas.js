// Listas de apoyo. Los campos que las usan también aceptan texto libre.

export const VARIEDADES = ['Castillo', 'Caturra', 'Colombia', 'Cenicafé 1', 'Típica', 'Borbón', 'Borbón rosado', 'Pink Bourbon', 'Geisha', 'Tabi', 'Maragogipe', 'Sidra', 'Wush Wush', 'Java', 'SL28', 'Pacamara'];

export const PROCESOS = ['Lavado', 'Honey', 'Natural'];

export const ESTADOS_LOTE = [
  ['activo', 'Activo', 'En producción'],
  ['zoca', 'Zoca o renovación', 'No se recoge por ahora'],
  ['inactivo', 'Inactivo', 'Ya no se usa'],
];

// Tipos de control. Las aplicaciones llevan producto; en las labores el producto es opcional.
export const TIPOS_APLICACION = [
  'Fertilización al suelo', 'Fertilización foliar', 'Encalado o enmienda', 'Fungicida', 'Insecticida', 'Herbicida', 'Bioinsumo o control biológico',
];
export const TIPOS_LABOR = [
  'Desyerba o plateo', 'Guadañada', 'Poda o zoca', 'Deschuponada', 'Siembra o resiembra', 'Re-re (repase de broca)',
  'Monitoreo de broca', 'Análisis de suelo', 'Manejo de sombrío', 'Otra labor',
];
export const esAplicacion = (tipo) => TIPOS_APLICACION.includes(tipo);

export const UNIDADES_DOSIS = ['kg', 'g', 'bultos', 'L', 'mL', 'cc', 'g/árbol', 'mL/L', 'cc/L', 'kg/ha', 'L/ha'];

export const TIPOS_SALIDA = [
  ['Venta', 'Venta'], ['Muestra', 'Muestra'], ['Consumo', 'Consumo propio'], ['Otra', 'Otra'],
];

// Sabores y aromas para catación, basados en la rueda de sabores de la SCA, con frutas y dulces colombianos.
export const DESCRIPTORES_GRUPOS = [
  { grupo: 'Frutos rojos y bayas', items: ['Frutos rojos', 'Fresa', 'Frambuesa', 'Mora', 'Arándano', 'Cereza', 'Grosella', 'Agraz'] },
  { grupo: 'Frutas', items: ['Manzana roja', 'Manzana verde', 'Pera', 'Durazno', 'Albaricoque', 'Ciruela', 'Uva', 'Uva verde', 'Granada', 'Melón', 'Sandía', 'Banano', 'Coco', 'Higo', 'Dátil', 'Kiwi'] },
  { grupo: 'Frutas tropicales', items: ['Piña', 'Mango', 'Maracuyá', 'Papaya', 'Guayaba', 'Lulo', 'Tomate de árbol', 'Uchuva', 'Gulupa', 'Curuba', 'Feijoa', 'Guanábana', 'Lichi', 'Tamarindo', 'Frutas tropicales'] },
  { grupo: 'Cítricos', items: ['Cítrico', 'Naranja', 'Mandarina', 'Limón', 'Lima', 'Toronja', 'Bergamota', 'Cáscara de naranja'] },
  { grupo: 'Frutas secas y maduras', items: ['Pasas', 'Ciruela pasa', 'Uva pasa', 'Fruta madura', 'Mermelada', 'Fruta confitada', 'Dátil seco'] },
  { grupo: 'Fermentado y vinoso', items: ['Vino', 'Vino tinto', 'Vino blanco', 'Vinoso', 'Licor', 'Ron', 'Whisky', 'Brandy', 'Amareto', 'Sidra', 'Kombucha', 'Fermentado', 'Champaña'] },
  { grupo: 'Dulces', items: ['Panela', 'Caramelo', 'Miel', 'Melaza', 'Azúcar morena', 'Azúcar de caña', 'Jarabe de arce', 'Vainilla', 'Arequipe', 'Dulce de leche', 'Toffee', 'Bocadillo', 'Malvavisco', 'Galleta'] },
  { grupo: 'Chocolate y cacao', items: ['Chocolate', 'Chocolate negro', 'Chocolate con leche', 'Cacao', 'Cacao nibs', 'Brownie'] },
  { grupo: 'Nueces y granos', items: ['Nuez', 'Avellana', 'Almendra', 'Maní', 'Macadamia', 'Nuez de nogal', 'Cereal', 'Malta', 'Pan tostado', 'Granola'] },
  { grupo: 'Florales', items: ['Floral', 'Jazmín', 'Rosa', 'Azahar', 'Flor de café', 'Manzanilla', 'Lavanda', 'Hibisco', 'Violeta', 'Madreselva', 'Té negro', 'Té verde', 'Té de limoncillo'] },
  { grupo: 'Especias', items: ['Canela', 'Clavo', 'Nuez moscada', 'Pimienta', 'Anís', 'Cardamomo', 'Jengibre', 'Especiado'] },
  { grupo: 'Lácteos y textura', items: ['Mantequilla', 'Crema', 'Yogur', 'Cremoso', 'Sedoso', 'Jugoso'] },
  { grupo: 'Tostado y otros', items: ['Tostado', 'Tabaco', 'Ahumado', 'Madera', 'Cedro', 'Terroso', 'Herbal', 'Hierbabuena', 'Menta', 'Pasto', 'Vegetal', 'Verde', 'Astringente', 'Amargo', 'Quemado'] },
];

export const DESCRIPTORES = DESCRIPTORES_GRUPOS.flatMap((g) => g.items);
