// "Nuestro acuerdo": lo que Kimanke promete y lo que pide a quien aprende.
// Nace de la encuesta "Construyendo juntos Kimanke" (oct-nov 2026): gratuidad,
// no reemplazar la enseñanza tradicional, respetar las variantes y reconocer
// que el contenido aún está en revisión.
//
// Si cambias el texto de forma importante, sube la versión: así se vuelve a
// pedir a todas las personas que lo lean y lo acepten.
export const VERSION_ACUERDO = 'v1';
export const CLAVE_ACUERDO = 'kimanke_acuerdo';

export interface PuntoAcuerdo {
  icono: string;
  titulo: string;
  texto: string;
}

export const ACUERDO: PuntoAcuerdo[] = [
  {
    icono: '💛',
    titulo: 'Gratuita y sin publicidad',
    texto: 'Kimanke no cobra ni muestra anuncios. Es un proyecto sin fines de lucro.',
  },
  {
    icono: '🤝',
    titulo: 'Un apoyo, no un reemplazo',
    texto: 'La lengua vive en las personas y en el territorio. Esta app te ayuda a practicar, pero aprender con hablantes y kimeltuchefe sigue siendo el camino.',
  },
  {
    icono: '🗺️',
    titulo: 'Una lengua con variantes',
    texto: 'El mapuzugun cambia según el territorio. Lo que veas aquí es una forma de decirlo, no la única. Las lecciones usan el grafemario Unificado.',
  },
  {
    icono: '🔍',
    titulo: 'Contenido en revisión',
    texto: 'Todavía puede haber errores. Si encuentras uno, avísanos: las correcciones de la comunidad van primero.',
  },
  {
    icono: '🌱',
    titulo: 'Aprender con respeto',
    texto: 'Aprender mapuzugun es también acercarse a la historia y la cultura de un pueblo. Te pedimos hacerlo con respeto.',
  },
];

export function acuerdoAceptado(): boolean {
  try {
    return localStorage.getItem(CLAVE_ACUERDO) === VERSION_ACUERDO;
  } catch {
    return false;
  }
}

export function aceptarAcuerdo(): void {
  try {
    localStorage.setItem(CLAVE_ACUERDO, VERSION_ACUERDO);
  } catch {}
}
