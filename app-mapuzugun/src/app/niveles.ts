// Niveles del camino: agrupan las unidades de lo básico a lo más complejo.
// Para agregar unidades nuevas a un nivel, suma su id a la lista. Una unidad
// que no esté en ninguna lista queda en el último nivel.
export interface Nivel {
  numero: number;
  nombre: string;
  descripcion: string;
  unidades: number[];
}

export const NIVELES: Nivel[] = [
  { numero: 1, nombre: 'Primeros pasos', descripcion: 'Saludar, presentarse y contar', unidades: [1, 2, 3] },
  { numero: 2, nombre: 'Vida diaria', descripcion: 'Acciones, familia, animales y comida', unidades: [4, 5, 6] },
  { numero: 3, nombre: 'Territorio y cosmovisión', descripcion: 'Naturaleza, tiempo y espiritualidad', unidades: [7, 8] },
];

export function nivelDeUnidad(unitId: number): Nivel {
  return NIVELES.find(n => n.unidades.includes(unitId)) ?? NIVELES[NIVELES.length - 1];
}
