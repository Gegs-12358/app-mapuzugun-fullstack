// Versión que ve la persona que usa la app.
// Al publicar un APK nuevo, súbela aquí y en android/app/build.gradle (versionName).
export const VERSION_APP = '0.10.0';
export const ETAPA_APP = 'beta';
export const VERSION_COMPLETA = `v${VERSION_APP} ${ETAPA_APP}`;

// Contacto del proyecto (el mismo que aparece en «Acerca de Kimanke»)
export const CORREO_CONTACTO = 'kimankeapp@gmail.com';
export const WHATSAPP_CONTACTO = '56998117750';

// Datos que ayudan a reproducir un problema. No incluye nada personal.
function datosTecnicos(): string {
  const pantalla = typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '';
  const navegador = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  return `Versión: ${VERSION_COMPLETA}\nPantalla: ${pantalla}\nDispositivo: ${navegador}`;
}

/** Enlace mailto para reportar un problema, con el contexto ya escrito. */
export function enlaceReporte(contexto = ''): string {
  const asunto = `Kimanke ${VERSION_COMPLETA}: reporte`;
  const cuerpo =
    'Cuéntanos qué pasó o qué está mal:\n\n\n' +
    (contexto ? `--- Dónde ---\n${contexto}\n\n` : '') +
    `--- Datos técnicos (no borrar) ---\n${datosTecnicos()}\n`;
  return `mailto:${CORREO_CONTACTO}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
}
