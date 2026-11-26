// Avisos web (notificaciones del navegador) para la versión web de Kimanke.
// En la APK se usan los recordatorios locales (recordatorio.ts).
// - Android: funcionan en el navegador, con o sin la app agregada al inicio.
// - iPhone (iOS 16.4 o más): solo con la app agregada a la pantalla de inicio y
//   abierta desde ese ícono, y el permiso se pide al tocar un botón.
import { HttpClient } from '@angular/common/http';
import { Capacitor } from '@capacitor/core';
import { firstValueFrom } from 'rxjs';

const CLAVE = 'kimanke_avisos_web';

export interface AjustesAvisosWeb {
  recordatorio: boolean;
  hora: string;      // "HH:MM"
  novedades: boolean;
}

export type EstadoAvisosWeb = 'si' | 'iphone' | 'no';

function esIphone(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function abiertaComoApp(): boolean {
  return (navigator as any).standalone === true || matchMedia('(display-mode: standalone)').matches;
}

export function estadoAvisosWeb(): EstadoAvisosWeb {
  if (Capacitor.isNativePlatform()) return 'no';
  const posible = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (esIphone() && !abiertaComoApp()) return 'iphone';
  return posible ? 'si' : 'no';
}

export function leerAvisosWeb(): AjustesAvisosWeb {
  try {
    const g = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    if (g && typeof g.hora === 'string') return { recordatorio: !!g.recordatorio, hora: g.hora, novedades: !!g.novedades };
  } catch {}
  return { recordatorio: false, hora: '19:00', novedades: false };
}

function guardar(a: AjustesAvisosWeb) {
  try { localStorage.setItem(CLAVE, JSON.stringify(a)); } catch {}
}

function claveABytes(base64url: string): Uint8Array {
  const relleno = '='.repeat((4 - (base64url.length % 4)) % 4);
  const b64 = (base64url + relleno).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

/**
 * Guarda los ajustes y suscribe (o desuscribe) este navegador.
 * Devuelve un texto para mostrar si algo no se pudo, o '' si salió bien.
 * Hay que llamarla desde un toque de la persona (el navegador lo exige para pedir permiso).
 */
export async function cambiarAvisosWeb(http: HttpClient, ajustes: AjustesAvisosWeb): Promise<string> {
  const quiere = ajustes.recordatorio || ajustes.novedades;
  try {
    const registro = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    let sub = await registro.pushManager.getSubscription();

    if (!quiere) {
      if (sub) {
        await firstValueFrom(http.delete('/api/push/suscripcion', { body: { endpoint: sub.endpoint } })).catch(() => {});
        await sub.unsubscribe();
      }
      guardar(ajustes);
      return '';
    }

    const permiso = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    if (permiso !== 'granted') {
      guardar({ ...ajustes, recordatorio: false, novedades: false });
      return 'Para recibir avisos, permite las notificaciones de Kimanke en tu navegador.';
    }

    const { disponible, clave } = await firstValueFrom(http.get<{ disponible: boolean; clave: string }>('/api/push/clave'));
    if (!disponible) return 'Los avisos todavía no están activos en el servidor. Prueba más tarde.';
    // Siempre una suscripción nueva: una antigua puede haber vencido sin que el navegador lo sepa
    // (pasa en Brave si se creó antes de activar su servicio de avisos)
    if (sub) {
      await firstValueFrom(http.delete('/api/push/suscripcion', { body: { endpoint: sub.endpoint } })).catch(() => {});
      await sub.unsubscribe().catch(() => false);
    }
    sub = await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveABytes(clave) as BufferSource });
    await firstValueFrom(http.post('/api/push/suscripcion', { suscripcion: sub.toJSON(), ...ajustes }));
    guardar(ajustes);
    return '';
  } catch (err) {
    console.error('No se pudieron activar los avisos:', err);
    // Brave trae apagado el servicio que reparte los avisos
    const esBrave = !!(navigator as any).brave;
    if (esBrave) {
      return 'Brave trae los avisos apagados. Escribe brave://settings/privacy en la barra de direcciones, activa «Usar los servicios de Google para la mensajería push», cierra y vuelve a abrir Brave, y prueba de nuevo.';
    }
    return 'No se pudieron activar los avisos en este navegador. En modo incógnito no funcionan; prueba en una ventana normal.';
  }
}

/**
 * Al abrir el mapa: si la persona tiene avisos activados y ya dio permiso, se
 * vuelve a guardar su suscripción en el servidor (por si se borró porque venció).
 * No pide permiso ni muestra nada.
 */
export async function sincronizarAvisosWeb(http: HttpClient) {
  const ajustes = leerAvisosWeb();
  if (!(ajustes.recordatorio || ajustes.novedades)) return;
  if (estadoAvisosWeb() !== 'si' || Notification.permission !== 'granted') return;
  try {
    const registro = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    const sub = await registro.pushManager.getSubscription();
    if (sub) {
      const r = await firstValueFrom(http.post<{ nueva: boolean }>('/api/push/suscripcion', { suscripcion: sub.toJSON(), ...ajustes }));
      if (!r.nueva) return;                         // el servidor ya la tenía: todo bien
      // El servidor la había borrado (venció): se crea una nueva
    }
    await cambiarAvisosWeb(http, ajustes);
  } catch (err) {
    console.error('No se pudieron revisar los avisos:', err);
  }
}
