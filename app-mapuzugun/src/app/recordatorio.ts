// Recordatorio diario para practicar (solo en la app instalada en Android).
// Se programan avisos para los próximos 7 días a la hora elegida. Si la persona
// ya practicó hoy, el de hoy se salta. Cada vez que se abre la app o se termina
// una lección se vuelven a programar, así la ventana de 7 días siempre avanza.
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { AVATARES } from './avatars';

const CLAVE_AJUSTES = 'kimanke_recordatorio';
const CLAVE_ULTIMA_PRACTICA = 'kimanke_ultima_practica';
const ID_BASE = 7000;
const DIAS = 7;

export interface AjustesRecordatorio {
  activo: boolean;
  hora: string; // "HH:MM"
}

export function recordatorioDisponible(): boolean {
  return Capacitor.isNativePlatform();
}

export function leerAjustes(): AjustesRecordatorio {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_AJUSTES) || 'null');
    if (guardado && typeof guardado.hora === 'string') return guardado;
  } catch {}
  return { activo: false, hora: '19:00' };
}

function guardarAjustes(ajustes: AjustesRecordatorio) {
  try { localStorage.setItem(CLAVE_AJUSTES, JSON.stringify(ajustes)); } catch {}
}

function hoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Se llama al terminar una lección o un repaso
export function marcarPracticaDeHoy() {
  try { localStorage.setItem(CLAVE_ULTIMA_PRACTICA, hoy()); } catch {}
  programarRecordatorios();
}

function practicoHoy(): boolean {
  try { return localStorage.getItem(CLAVE_ULTIMA_PRACTICA) === hoy(); } catch { return false; }
}

function nombreCompanero(): string {
  try {
    const user = JSON.parse(localStorage.getItem('mapu_user') || 'null');
    return AVATARES.find(a => a.id === user?.avatar)?.nombre ?? 'Tu compañero';
  } catch {
    return 'Tu compañero';
  }
}

function mensajes(nombre: string): string[] {
  return [
    `${nombre} te espera. ¿Practicamos unos minutos?`,
    `¡Mari mari! ${nombre} tiene una lección lista para ti.`,
    `Un ratito de mapuzugun hoy mantiene encendido tu Kütral.`,
    `${nombre} quiere aprender contigo hoy. ¡Amulepe!`,
  ];
}

// Pide permiso y guarda los ajustes. Devuelve false si la persona no dio permiso.
export async function cambiarRecordatorio(ajustes: AjustesRecordatorio): Promise<boolean> {
  if (!recordatorioDisponible()) return false;
  if (ajustes.activo) {
    let permiso = await LocalNotifications.checkPermissions();
    if (permiso.display !== 'granted') permiso = await LocalNotifications.requestPermissions();
    if (permiso.display !== 'granted') {
      guardarAjustes({ ...ajustes, activo: false });
      await cancelarTodos();
      return false;
    }
  }
  guardarAjustes(ajustes);
  await programarRecordatorios();
  return true;
}

async function cancelarTodos() {
  const ids = Array.from({ length: DIAS }, (_, i) => ({ id: ID_BASE + i }));
  try { await LocalNotifications.cancel({ notifications: ids }); } catch {}
}

export async function programarRecordatorios() {
  if (!recordatorioDisponible()) return;
  try {
    await cancelarTodos();
    const ajustes = leerAjustes();
    if (!ajustes.activo) return;

    const [h, m] = ajustes.hora.split(':').map(Number);
    const ahora = new Date();
    const textos = mensajes(nombreCompanero());
    const avisos = [];

    for (let i = 0; i < DIAS; i++) {
      const cuando = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + i, h, m, 0);
      if (cuando <= ahora) continue;
      if (i === 0 && practicoHoy()) continue;
      avisos.push({
        id: ID_BASE + i,
        title: 'Kimanke',
        body: textos[cuando.getDate() % textos.length],
        schedule: { at: cuando, allowWhileIdle: true },
      });
    }
    if (avisos.length) await LocalNotifications.schedule({ notifications: avisos });
  } catch (err) {
    console.error('No se pudieron programar los recordatorios:', err);
  }
}
