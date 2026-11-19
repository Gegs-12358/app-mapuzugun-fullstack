// Frases del compañero durante la lección.
// Por ahora en español. Si se agregan frases en mapuzugun, deben pasar por la
// misma revisión con hablantes que el resto del contenido.

export type EstadoCompanero = 'quieto' | 'feliz' | 'animando' | 'saltito';

export const FRASES = {
  inicio: ['¡Tú puedes!', 'Vamos con calma.', '¡Aquí estoy contigo!'],
  feliz: ['¡Muy bien!', '¡Eso es!', '¡Excelente!', '¡Sigue así!', '¡Lo lograste!'],
  animando: [
    'Casi, ¡vamos de nuevo!',
    'Equivocarse también es aprender.',
    'Tranquilidad, la repasaremos más adelante.',
  ],
  toque: ['¡Hola!', '¡Me hiciste cosquillas!', 'Aprendamos juntos.', '¡Vamos, vamos!'],
};

export function fraseAlAzar(lista: string[], anterior = ''): string {
  const opciones = lista.length > 1 ? lista.filter(f => f !== anterior) : lista;
  return opciones[Math.floor(Math.random() * opciones.length)];
}

// Confeti para celebrar el fin de la etapa, con los colores de la paleta
const COLORES_CONFETI = ['#C8303D', '#FFB703', '#1D4FBF', '#5B2A86', '#1E7D47', '#FFFFFF'];

export interface PiezaConfeti {
  izquierda: number;  // %
  retraso: number;    // s
  duracion: number;   // s
  color: string;
  giro: number;       // grados
}

export function crearConfeti(cantidad = 28): PiezaConfeti[] {
  return Array.from({ length: cantidad }, (_, i) => ({
    izquierda: Math.random() * 100,
    retraso: Math.random() * 0.8,
    duracion: 1.8 + Math.random() * 1.4,
    color: COLORES_CONFETI[i % COLORES_CONFETI.length],
    giro: Math.floor(Math.random() * 360),
  }));
}
