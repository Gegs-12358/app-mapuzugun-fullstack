// Ajustes de accesibilidad: tamaño de letra y menos movimiento.
// Se guardan en el dispositivo y se aplican como clases en <html>, antes de que
// la app se dibuje (ver main.ts), para que no se vea un salto al abrirla.
//
// El tamaño usa `zoom`, que agranda todo de forma pareja (textos, botones e
// imágenes) y reacomoda la pantalla, igual que el zoom del navegador. Así no hay
// que tocar cada tamaño escrito en píxeles en los estilos.

export type TamanoLetra = 'normal' | 'grande' | 'muy-grande';

export interface AjustesAccesibilidad {
  letra: TamanoLetra;
  menosMovimiento: boolean;
}

const CLAVE = 'kimanke_accesibilidad';

export const TAMANOS: { id: TamanoLetra; nombre: string }[] = [
  { id: 'normal', nombre: 'Normal' },
  { id: 'grande', nombre: 'Grande' },
  { id: 'muy-grande', nombre: 'Muy grande' },
];

export function leerAccesibilidad(): AjustesAccesibilidad {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    if (g && TAMANOS.some(t => t.id === g.letra)) {
      return { letra: g.letra, menosMovimiento: !!g.menosMovimiento };
    }
  } catch {}
  return { letra: 'normal', menosMovimiento: false };
}

export function aplicarAccesibilidad(ajustes: AjustesAccesibilidad = leerAccesibilidad()) {
  const html = document.documentElement;
  html.classList.remove('letra-grande', 'letra-muy-grande');
  if (ajustes.letra !== 'normal') html.classList.add(`letra-${ajustes.letra}`);
  html.classList.toggle('menos-movimiento', ajustes.menosMovimiento);
}

export function guardarAccesibilidad(ajustes: AjustesAccesibilidad) {
  try { localStorage.setItem(CLAVE, JSON.stringify(ajustes)); } catch {}
  aplicarAccesibilidad(ajustes);
}
