export interface CatalogDevice {
  brand: string;
  model: string;
  colors: string[];
  storages: string[];
}

export const DEVICE_CATALOG: CatalogDevice[] = [
  // Apple
  { brand: 'Apple', model: 'iPhone 11', colors: ['Negro', 'Blanco', 'Rojo', 'Verde', 'Amarillo', 'Púrpura'], storages: ['64GB', '128GB', '256GB'] },
  { brand: 'Apple', model: 'iPhone 11 Pro', colors: ['Gris Espacial', 'Plata', 'Oro', 'Verde Noche'], storages: ['64GB', '256GB', '512GB'] },
  { brand: 'Apple', model: 'iPhone 11 Pro Max', colors: ['Gris Espacial', 'Plata', 'Oro', 'Verde Noche'], storages: ['64GB', '256GB', '512GB'] },
  { brand: 'Apple', model: 'iPhone 12', colors: ['Negro', 'Blanco', 'Rojo', 'Azul', 'Verde', 'Púrpura'], storages: ['64GB', '128GB', '256GB'] },
  { brand: 'Apple', model: 'iPhone 12 Mini', colors: ['Negro', 'Blanco', 'Azul', 'Verde', 'Rojo', 'Púrpura'], storages: ['64GB', '128GB', '256GB'] },
  { brand: 'Apple', model: 'iPhone 12 Pro', colors: ['Grafito', 'Plata', 'Oro', 'Azul Pacífico'], storages: ['128GB', '256GB', '512GB'] },
  { brand: 'Apple', model: 'iPhone 12 Pro Max', colors: ['Grafito', 'Plata', 'Oro', 'Azul Pacífico'], storages: ['128GB', '256GB', '512GB'] },
  { brand: 'Apple', model: 'iPhone 13', colors: ['Negro', 'Blanco', 'Rojo', 'Azul', 'Rosa', 'Verde'], storages: ['128GB', '256GB', '512GB'] },
  { brand: 'Apple', model: 'iPhone 13 Mini', colors: ['Medianoche', 'Blanco Estelar', 'Azul', 'Rosa', 'Verde', 'Rojo'], storages: ['128GB', '256GB', '512GB'] },
  { brand: 'Apple', model: 'iPhone 13 Pro', colors: ['Grafito', 'Plata', 'Oro', 'Azul Sierra'], storages: ['128GB', '256GB', '512GB', '1TB'] },
  { brand: 'Apple', model: 'iPhone 13 Pro Max', colors: ['Grafito', 'Plata', 'Oro', 'Azul Sierra', 'Verde Alpino'], storages: ['128GB', '256GB', '512GB', '1TB'] },
  { brand: 'Apple', model: 'iPhone 14', colors: ['Negro', 'Blanco', 'Rojo', 'Azul', 'Púrpura', 'Amarillo'], storages: ['128GB', '256GB', '512GB'] },
  { brand: 'Apple', model: 'iPhone 14 Pro', colors: ['Negro Espacial', 'Plata', 'Oro', 'Púrpura Oscuro'], storages: ['128GB', '256GB', '512GB', '1TB'] },
  { brand: 'Apple', model: 'iPhone 14 Pro Max', colors: ['Negro Espacial', 'Plata', 'Oro', 'Púrpura Oscuro'], storages: ['128GB', '256GB', '512GB', '1TB'] },
  { brand: 'Apple', model: 'iPhone 14 Plus', colors: ['Medianoche', 'Blanco Estelar', 'Azul', 'Púrpura', 'Amarillo', 'Rojo'], storages: ['128GB', '256GB', '512GB'] },
  { brand: 'Apple', model: 'iPhone 15', colors: ['Negro', 'Azul', 'Verde', 'Amarillo', 'Rosa'], storages: ['128GB', '256GB', '512GB'] },
  { brand: 'Apple', model: 'iPhone 15 Plus', colors: ['Negro', 'Azul', 'Verde', 'Amarillo', 'Rosa'], storages: ['128GB', '256GB', '512GB'] },
  { brand: 'Apple', model: 'iPhone 15 Pro', colors: ['Titanio Negro', 'Titanio Blanco', 'Titanio Azul', 'Titanio Natural'], storages: ['128GB', '256GB', '512GB', '1TB'] },
  { brand: 'Apple', model: 'iPhone 15 Pro Max', colors: ['Titanio Negro', 'Titanio Blanco', 'Titanio Azul', 'Titanio Natural'], storages: ['256GB', '512GB', '1TB'] },
  { brand: 'Apple', model: 'iPhone 16', colors: ['Negro', 'Blanco', 'Rosa', 'Verde Azulado', 'Ultramarino'], storages: ['128GB', '256GB', '512GB'] },
  { brand: 'Apple', model: 'iPhone 16 Plus', colors: ['Negro', 'Blanco', 'Rosa', 'Verde Azulado', 'Ultramarino'], storages: ['128GB', '256GB', '512GB'] },
  { brand: 'Apple', model: 'iPhone 16 Pro', colors: ['Titanio Negro', 'Titanio Blanco', 'Titanio Natural', 'Titanio Desierto'], storages: ['128GB', '256GB', '512GB', '1TB'] },
  { brand: 'Apple', model: 'iPhone 16 Pro Max', colors: ['Titanio Negro', 'Titanio Blanco', 'Titanio Natural', 'Titanio Desierto'], storages: ['256GB', '512GB', '1TB'] },
  { brand: 'Apple', model: 'iPhone SE', colors: ['Negro', 'Blanco', 'Rojo'], storages: ['64GB', '128GB', '256GB'] },
  { brand: 'Apple', model: 'iPhone 16e', colors: ['Blanco', 'Negro'], storages: ['128GB', '256GB', '512GB'] },
  { brand: 'Apple', model: 'iPhone 17', colors: ['Negro', 'Blanco', 'Azul Neblina', 'Verde Salvia', 'Lavanda'], storages: ['256GB', '512GB'] },
  { brand: 'Apple', model: 'iPhone Air', colors: ['Negro Espacial', 'Blanco Nube', 'Dorado Claro', 'Azul Cielo'], storages: ['256GB', '512GB', '1TB'] },
  { brand: 'Apple', model: 'iPhone 17 Pro', colors: ['Plata', 'Naranja Cósmico', 'Azul Profundo'], storages: ['256GB', '512GB', '1TB'] },
  { brand: 'Apple', model: 'iPhone 17 Pro Max', colors: ['Plata', 'Naranja Cósmico', 'Azul Profundo'], storages: ['256GB', '512GB', '1TB', '2TB'] },
  // Samsung
  { brand: 'Samsung', model: 'Galaxy S23', colors: ['Negro', 'Crema', 'Verde', 'Lavanda'], storages: ['128GB', '256GB'] },
  { brand: 'Samsung', model: 'Galaxy S23 Ultra', colors: ['Negro', 'Crema', 'Verde', 'Lavanda'], storages: ['256GB', '512GB', '1TB'] },
  { brand: 'Samsung', model: 'Galaxy S24', colors: ['Negro', 'Violeta', 'Ámbar', 'Gris'], storages: ['128GB', '256GB'] },
  { brand: 'Samsung', model: 'Galaxy S24 Ultra', colors: ['Negro', 'Gris', 'Violeta', 'Ámbar'], storages: ['256GB', '512GB', '1TB'] },
  { brand: 'Samsung', model: 'Galaxy S25', colors: ['Negro', 'Plateado', 'Azul', 'Verde Menta'], storages: ['128GB', '256GB'] },
  { brand: 'Samsung', model: 'Galaxy S25 Ultra', colors: ['Negro', 'Plateado', 'Azul', 'Verde'], storages: ['256GB', '512GB', '1TB'] },
  { brand: 'Samsung', model: 'Galaxy A05', colors: ['Negro', 'Plata', 'Verde Claro'], storages: ['64GB', '128GB'] },
  { brand: 'Samsung', model: 'Galaxy A15', colors: ['Negro', 'Azul', 'Amarillo Claro'], storages: ['128GB', '256GB'] },
  { brand: 'Samsung', model: 'Galaxy A25', colors: ['Negro', 'Azul', 'Amarillo'], storages: ['128GB', '256GB'] },
  { brand: 'Samsung', model: 'Galaxy A35', colors: ['Negro', 'Lila', 'Amarillo Hielo'], storages: ['128GB', '256GB'] },
  { brand: 'Samsung', model: 'Galaxy A55', colors: ['Negro', 'Lila', 'Azul Hielo', 'Lima'], storages: ['128GB', '256GB'] },
  // Xiaomi
  { brand: 'Xiaomi', model: 'Redmi Note 13', colors: ['Negro', 'Azul', 'Verde Menta'], storages: ['128GB', '256GB'] },
  { brand: 'Xiaomi', model: 'Redmi 13C', colors: ['Negro', 'Azul', 'Verde'], storages: ['128GB', '256GB'] },
  { brand: 'Xiaomi', model: 'Xiaomi 14', colors: ['Negro', 'Blanco', 'Verde'], storages: ['256GB', '512GB'] },
  { brand: 'Xiaomi', model: 'Poco X6', colors: ['Negro', 'Azul'], storages: ['128GB', '256GB'] },
  { brand: 'Xiaomi', model: 'Poco M6', colors: ['Negro', 'Púrpura', 'Plata'], storages: ['128GB', '256GB'] },
  // Motorola
  { brand: 'Motorola', model: 'Moto G34', colors: ['Negro', 'Azul Hielo'], storages: ['128GB', '256GB'] },
  { brand: 'Motorola', model: 'Moto G54', colors: ['Negro', 'Azul', 'Menta'], storages: ['128GB', '256GB'] },
  { brand: 'Motorola', model: 'Moto G84', colors: ['Negro', 'Azul', 'Marshmallow'], storages: ['256GB'] },
  { brand: 'Motorola', model: 'Moto E14', colors: ['Negro', 'Azul'], storages: ['64GB', '128GB'] },
];

export const ACCESSORY_CATEGORIES = [
  'Cover / Funda',
  'Protector de Pantalla',
  'Cargador',
  'Audífonos',
  'Cable USB',
  'Soporte / Holder',
  'Power Bank',
  'Memoria SD',
  'Adaptador',
  'Otro',
];

export const SPARE_PART_CATEGORIES = [
  'Baterías',
  'Pantallas',
  'Tapas Traseras',
  'Cámaras',
  'Flex de Carga',
  'Altavoces',
  'Micrófonos',
  'Botones / Flex',
  'Conectores',
  'Marcos / Chasis',
  'Cristal Trasero',
  'Sensores',
  'Otro',
];

export const CATALOG_BRANDS = [...new Set(DEVICE_CATALOG.map((d) => d.brand))];

export function findCatalogDevice(brand: string, model: string): CatalogDevice | undefined {
  return DEVICE_CATALOG.find((d) => d.brand === brand && d.model === model);
}

