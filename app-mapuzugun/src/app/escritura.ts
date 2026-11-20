// Grafemarios (alfabetos) del mapuzugun que la app sabe nombrar.
// La clave es la que se guarda en la columna exercises.grafemario.
export const GRAFEMARIOS: Record<string, string> = {
  unificado: 'Unificado',
  azumchefe: 'Azümchefe',
  raguileo: 'Raguileo',
};

// Grafemario que usa la app por defecto. Se eligió el Unificado porque es el que
// se usa en los cursos de mapuzugun de quienes participan en el proyecto.
export const GRAFEMARIO_APP = 'unificado';

export function nombreGrafemario(clave?: string | null): string {
  return GRAFEMARIOS[clave ?? GRAFEMARIO_APP] ?? GRAFEMARIOS[GRAFEMARIO_APP];
}

// Letras del grafemario Unificado que no están en la mayoría de los teclados
// de celular. Se ofrecen como botones en los ejercicios de escritura.
export const LETRAS_ESPECIALES = ['ü'];

// Compara respuestas escritas: sin espacios extra, sin mayúsculas y con la misma
// codificación Unicode (una "ü" puede llegar como un solo carácter o como u + ¨).
export function normalizarRespuesta(texto: string): string {
  return texto.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
}

/**
 * Separa la pregunta para resaltar la palabra clave con otro color.
 * «¿Cómo se dice "Sí"?» → antes «¿Cómo se dice "», clave «Sí», después «"?».
 * Sin comillas, toma lo que viene después de «se dice», «se escribe» o «significa».
 * Si no encuentra nada claro, devuelve la pregunta entera sin resaltar.
 */
export function partirPregunta(pregunta: string): { antes: string; clave: string; despues: string } {
  const texto = pregunta ?? '';
  const comillas = texto.match(/^(.*?["«“])([^"»”]+)(["»”].*)$/s);
  if (comillas) return { antes: comillas[1], clave: comillas[2], despues: comillas[3] };

  const verbo = texto.match(/^(.*?\b(?:se dice|se escribe|significa)\s+)(.+?)(\s*[?:.!]*\s*)$/is);
  if (verbo && verbo[2].trim()) return { antes: verbo[1], clave: verbo[2], despues: verbo[3] };

  return { antes: texto, clave: '', despues: '' };
}
