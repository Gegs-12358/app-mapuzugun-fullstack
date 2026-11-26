// Avance hecho sin conexión: se guarda en el teléfono y se envía al volver internet.
// Solo para lo que no se puede perder (terminar lecciones y repasos, respuestas
// para el repaso, Newen gastado y hasta qué pregunta se llegó).
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const CLAVE = 'kimanke_pendientes';
const MAX = 300;

interface Pendiente { url: string; body: any; cuando: number; }

function leer(): Pendiente[] {
  try { return JSON.parse(localStorage.getItem(CLAVE) || '[]'); } catch { return []; }
}

function guardar(lista: Pendiente[]) {
  try { localStorage.setItem(CLAVE, JSON.stringify(lista.slice(-MAX))); } catch {}
}

/** ¿El error fue por falta de conexión (y no porque el servidor rechazó la petición)? */
export function esSinConexion(err: any): boolean {
  return err instanceof HttpErrorResponse ? err.status === 0 : !navigator.onLine;
}

export function guardarPendiente(url: string, body: any) {
  guardar([...leer(), { url, body, cuando: Date.now() }]);
}

export function hayPendientes(): number {
  return leer().length;
}

let enviando = false;

/**
 * Envía lo pendiente, en orden. Si se corta la conexión, para y sigue la próxima vez.
 * Si el servidor rechaza algo (por ejemplo, datos viejos que ya no valen), se descarta.
 * Devuelve cuántos se enviaron.
 */
export async function enviarPendientes(http: HttpClient): Promise<number> {
  if (enviando || !navigator.onLine) return 0;
  enviando = true;
  let enviados = 0;
  try {
    let lista = leer();
    while (lista.length) {
      const [primero, ...resto] = lista;
      try {
        await firstValueFrom(http.post(primero.url, primero.body));
        enviados++;
      } catch (err) {
        if (esSinConexion(err) || (err as HttpErrorResponse)?.status >= 500 || (err as HttpErrorResponse)?.status === 429) break;
        // 400, 403, 404: no vale la pena reintentar
      }
      lista = resto;
      guardar(lista);
    }
  } finally {
    enviando = false;
  }
  if (enviados) window.dispatchEvent(new CustomEvent('kimanke:avance-guardado'));
  return enviados;
}

/** Al cerrar sesión: se intenta enviar lo pendiente y después se olvida. */
export async function cerrarPendientes(http: HttpClient) {
  await Promise.race([enviarPendientes(http), new Promise(r => setTimeout(r, 3000))]);
  try { localStorage.removeItem(CLAVE); } catch {}
}
