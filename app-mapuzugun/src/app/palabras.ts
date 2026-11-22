// Palabras de una etapa, para mirarlas antes de empezar.
// Salen de las mismas preguntas (sin inventar contenido): cada pregunta ya
// dice qué palabra en mapuzugun corresponde a qué en castellano.

import { partirPregunta } from './escritura';

export interface Palabra { mapu: string; es: string; }

export function palabrasDeEtapa(ejercicios: any[]): Palabra[] {
  const lista: Palabra[] = [];
  const vistas = new Set<string>();
  const agregar = (mapu: string, es: string) => {
    mapu = (mapu ?? '').trim();
    es = (es ?? '').trim();
    if (!mapu || !es || mapu === 'COMPLETE') return;
    const clave = mapu.toLowerCase();
    if (vistas.has(clave)) return;
    vistas.add(clave);
    lista.push({ mapu, es });
  };

  for (const e of ejercicios ?? []) {
    const texto: string = e?.question ?? '';
    if (Array.isArray(e?.options) && e.options[0]?.mapuche !== undefined) {
      for (const par of e.options) agregar(par.mapuche, par.spanish);
      continue;
    }
    const { clave } = partirPregunta(texto);
    if (/significa/i.test(texto) && clave) {
      agregar(clave, e.correct_answer);          // ¿Qué significa "Peukayal"? → Hasta luego
    } else if (clave) {
      agregar(e.correct_answer, clave);          // ¿Cómo se dice "Hola"? / Escribe "Hola" → Mari mari
    } else if (e?.correct_answer) {
      // Preguntas culturales: «¿Quién es el jefe de la comunidad?» → Lonko
      const descripcion = texto
        .replace(/^¿\s*(?:quién es|cómo se llama|cuál es)\s+/i, '')
        .replace(/^¿\s*qué\s+(\S+)\s+/i, '$1 que ')
        .replace(/[¿?]/g, '')
        .trim();
      if (descripcion) agregar(e.correct_answer, descripcion.charAt(0).toUpperCase() + descripcion.slice(1));
    }
  }
  return lista;
}
