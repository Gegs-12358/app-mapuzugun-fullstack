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
    es = es.charAt(0).toUpperCase() + es.slice(1);
    if (!mapu || !es || mapu === 'COMPLETE') return;
    const clave = mapu.toLowerCase();
    if (vistas.has(clave)) {
      // Si la palabra ya estaba, queda la traducción más corta: «Canelo»
      // en vez de «El árbol sagrado mapuche» (que viene de una pregunta cultural)
      const previa = lista.find(p => p.mapu.toLowerCase() === clave);
      if (previa && es.length < previa.es.length) previa.es = es;
      return;
    }
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

// Dibujos (emoji) para palabras que se pueden mostrar sin ambigüedad.
// Solo se usan para el castellano: la palabra en mapuzugun sale del contenido.
const DIBUJOS: Record<string, string> = {
  'uno': '1️⃣', 'dos': '2️⃣', 'tres': '3️⃣', 'cuatro': '4️⃣', 'cinco': '5️⃣',
  'seis': '6️⃣', 'siete': '7️⃣', 'ocho': '8️⃣', 'nueve': '9️⃣', 'diez': '🔟',
  'rojo': '🟥', 'azul': '🟦', 'verde': '🟩', 'negro': '⬛', 'blanco': '⬜', 'amarillo': '🟨',
  'perro': '🐕', 'vaca': '🐄', 'caballo': '🐎', 'gallina': '🐔', 'zorro': '🦊', 'puma': '🐆', 'oveja': '🐑',
  'pan': '🍞', 'agua': '💧', 'papa': '🥔', 'sopa': '🍲',
  'mano': '✋', 'corazón': '❤️', 'ojo': '👁️', 'pie': '🦶',
  'sol': '☀️', 'luna': '🌙', 'lluvia': '🌧️', 'nieve': '❄️', 'fuego': '🔥', 'noche': '🌃',
  'comer': '🍽️', 'beber': '🥤', 'dormir': '😴', 'reír': '😄', 'llorar': '😢', 'ver': '👀',
};

function mezclar<T>(lista: T[]): T[] {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/**
 * Un ejercicio de los tipos nuevos (con dibujos, ordenar palabras o verdadero o falso),
 * elegido al azar entre los que se pueden armar con las palabras de la etapa.
 * Uno por etapa, para que las etapas varíen sin hacerse largas.
 */
export function ejercicioNuevoDePractica(ejercicios: any[], palabras: Palabra[]): any | null {
  const posibles: (() => any)[] = [];

  // Con dibujos: "¿Cuál es «Kalfu»?" y se elige el dibujo
  const conDibujo = palabras.filter(p => DIBUJOS[p.es.toLowerCase()]);
  if (conDibujo.length >= 3) {
    posibles.push(() => {
      const opciones = mezclar(conDibujo).slice(0, 4);
      const buena = opciones[0];
      return {
        ...base(ejercicios), type: 'multiple_choice', dibujos: true, sinPista: true,
        question: `¿Cuál es "${buena.mapu}"?`, correct_answer: DIBUJOS[buena.es.toLowerCase()],
        options: opciones.map(p => DIBUJOS[p.es.toLowerCase()]), palabra: buena.mapu,
        nombresDibujos: Object.fromEntries(opciones.map(p => [DIBUJOS[p.es.toLowerCase()], p.es])),
        cultural_note: `«${buena.mapu}» significa «${buena.es}».`,
      };
    });
  }

  // Ordenar palabras: una expresión de 2 a 4 palabras distintas, con una ficha de más
  const frases = palabras.filter(p => {
    const partes = p.mapu.replace(/[?¿!¡.,]/g, '').split(/\s+/);
    return partes.length >= 2 && partes.length <= 4 && new Set(partes.map(w => w.toLowerCase())).size === partes.length;
  });
  if (frases.length) {
    posibles.push(() => {
      const f = frases[Math.floor(Math.random() * frases.length)];
      const partes = f.mapu.split(/\s+/);
      const sobrante = palabras.map(p => p.mapu).find(m => !m.includes(' ') && !partes.some(w => w.toLowerCase() === m.toLowerCase()));
      return {
        ...base(ejercicios), type: 'ordenar', question: `Arma «${f.es}» en mapuzugun`,
        correct_answer: f.mapu, piezas: mezclar(sobrante ? [...partes, sobrante] : partes), palabra: f.mapu, options: [],
        cultural_note: `«${f.mapu}» significa «${f.es}».`,
      };
    });
  }

  // Verdadero o falso: "¿«Küla» significa «Tres»?"
  if (palabras.length >= 2) {
    posibles.push(() => {
      const [p, otra] = mezclar(palabras);
      const verdad = Math.random() < 0.5;
      return {
        ...base(ejercicios), type: 'multiple_choice', sinPista: true, verdaderoFalso: true,
        question: `¿"${p.mapu}" significa «${verdad ? p.es : otra.es}»?`,
        correct_answer: verdad ? 'Sí' : 'No', options: ['Sí', 'No'], palabra: p.mapu,
        cultural_note: `«${p.mapu}» significa «${p.es}».`,
      };
    });
  }

  if (!posibles.length) return null;
  return posibles[Math.floor(Math.random() * posibles.length)]();
}

export function sinTildes(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
}
