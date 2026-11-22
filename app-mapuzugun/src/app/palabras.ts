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

// ---------------------------------------------------------------------------
// Ejercicios de práctica armados con las palabras de la etapa.
// Así toda etapa tiene al menos un emparejamiento, uno para escribir y uno
// para completar la frase. Usan solo pares que ya están en las preguntas.
// No tienen número de ejercicio (id null) ni dan o quitan puntos.

const SIMPLE = /^[\p{L}][\p{L} ]*$/u;
const ARTICULO = /^(el|la|los|las|un|una)\s/i;

function base(ejercicios: any[]) {
  const b = ejercicios[0] ?? {};
  return {
    id: null, calentamiento: true, unit_id: b.unit_id, stage: b.stage,
    estado: b.estado, grafemario: b.grafemario, variante: b.variante,
  };
}

export function ejerciciosDePractica(ejercicios: any[], palabras: Palabra[]): any[] {
  const extra: any[] = [];
  if (palabras.length === 0) return extra;
  const tiene = (tipo: string) => ejercicios.some(e => e.type === tipo);
  const usadas = new Set<string>(
    ejercicios.filter(e => e.type === 'write' || e.type === 'fill_blank')
      .map(e => String(e.correct_answer ?? '').toLowerCase())
  );
  const libres = () => palabras.filter(p => !usadas.has(p.mapu.toLowerCase()) && !p.mapu.includes('?'));

  if (!tiene('match') && palabras.length >= 2) {
    extra.push({
      ...base(ejercicios), type: 'match', question: 'Empareja las palabras', correct_answer: 'COMPLETE',
      options: palabras.slice(0, 5).map(p => ({ mapuche: p.mapu, spanish: p.es })),
    });
  }

  if (!tiene('write')) {
    const p = libres().sort((a, b) => a.mapu.length - b.mapu.length)[0];
    if (p) {
      usadas.add(p.mapu.toLowerCase());
      extra.push({
        ...base(ejercicios), type: 'write', question: `Escribe "${p.es}" en mapuzugun:`,
        correct_answer: p.mapu, palabra: p.mapu, options: [],
      });
    }
  }

  if (!tiene('fill_blank')) {
    // 1) Una expresión de varias palabras en mapuzugun: se completa la última
    const frase = libres().find(p => {
      const partes = p.mapu.split(/\s+/);
      return partes.length >= 2 && partes.length <= 3 && partes.every(w => w.length >= 2);
    });
    if (frase) {
      const partes = frase.mapu.split(/\s+/);
      const falta = partes.pop()!;
      extra.push({
        ...base(ejercicios), type: 'fill_blank', question: 'Completa la frase',
        frase: `${partes.join(' ')} ___  (${frase.es})`, correct_answer: falta, palabra: frase.mapu, options: [],
      });
    } else {
      // 2) Qué significa: se completa en castellano, sin exigir tildes.
      // Mejor una palabra que la etapa pregunta al revés («¿Cómo se dice…?»),
      // para no repetir una pregunta que ya está.
      const yaSignifica = new Set(ejercicios.filter(e => /significa/i.test(e?.question ?? ''))
        .map(e => partirPregunta(e.question).clave.toLowerCase()));
      const sirve = (x: Palabra) => SIMPLE.test(x.es) && !ARTICULO.test(x.es) && x.es.split(' ').length <= 2;
      const p = palabras.find(x => sirve(x) && !yaSignifica.has(x.mapu.toLowerCase()) && !usadas.has(x.mapu.toLowerCase()))
        ?? palabras.find(x => sirve(x) && !yaSignifica.has(x.mapu.toLowerCase()))
        ?? palabras.find(x => sirve(x) && !usadas.has(x.mapu.toLowerCase()))
        ?? palabras.find(sirve);
      if (p) {
        extra.push({
          ...base(ejercicios), type: 'fill_blank', question: 'Completa la frase',
          frase: `«${p.mapu}» significa ___`, correct_answer: p.es, sinTildes: true, palabra: p.mapu, options: [],
        });
      }
    }
  }
  return extra;
}

export function sinTildes(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
}
