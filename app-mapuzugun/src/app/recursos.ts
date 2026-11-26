// Las cuatro palabras del juego: qué significan y para qué sirven.
// Se usan en la barra de la lección, en la intro y en «Acerca de Kimanke».

export type IdRecurso = 'kutral' | 'kimun' | 'llanka' | 'newen';

export interface Recurso {
  id: IdRecurso;
  palabra: string;
  significado: string;  // traducción corta
  uso: string;          // qué es dentro de la app
}

export const RECURSOS: Recurso[] = [
  {
    id: 'kutral',
    palabra: 'Kütral',
    significado: 'fuego',
    uso: 'Es tu racha: los días seguidos que practicas. Mantén encendido el fogón. Con un Kütral de reserva, un día sin practicar no la apaga.',
  },
  {
    id: 'kimun',
    palabra: 'Kimün',
    significado: 'conocimiento',
    uso: 'Son los puntos que ganas con cada respuesta correcta. Crecen con lo que aprendes.',
  },
  {
    id: 'llanka',
    palabra: 'Llanka',
    significado: 'piedra verde preciosa',
    uso: 'Las ganas al completar una etapa por primera vez. Sirven para recargar tu Newen.',
  },
  {
    id: 'newen',
    palabra: 'Newen',
    significado: 'fuerza',
    uso: 'Son tus vidas. Pierdes una al equivocarte y se recupera una cada 10 minutos.',
  },
];

export function recurso(id: IdRecurso): Recurso {
  return RECURSOS.find(r => r.id === id)!;
}
