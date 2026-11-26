import { Component, NgZone, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NavigationStart, Router } from '@angular/router';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Capacitor } from '@capacitor/core';
import { ServidorService } from './servidor.service';
import { environment } from '../environments/environment';
import { programarRecordatorios } from './recordatorio';
import { enviarPendientes } from './pendientes';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  servidor = inject(ServidorService);
  avisoIos = debeMostrarAvisoIos();
  // Sin conexión: la app sigue con lo que ya cargó y lo avisa arriba
  sinConexion = signal(typeof navigator !== 'undefined' && !navigator.onLine);
  // El mensaje completo se ve unos segundos; después queda una etiqueta chica en la esquina
  avisoLargo = signal(this.sinConexion());
  private relojAviso: any = this.sinConexion() ? setTimeout(() => this.avisoLargo.set(false), 7000) : null;

  constructor() {
    const http = inject(HttpClient);
    const zone = inject(NgZone);

    // En la web, el service worker guarda la app y lo ya abierto para usarla sin internet
    if (!Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    // Lo jugado sin conexión se envía al abrir la app y cada vez que vuelve internet
    enviarPendientes(http);
    window.addEventListener('online', () => zone.run(() => { this.sinConexion.set(false); enviarPendientes(http); }));
    window.addEventListener('offline', () => zone.run(() => {
      this.sinConexion.set(true);
      this.avisoLargo.set(true);
      clearTimeout(this.relojAviso);
      this.relojAviso = setTimeout(() => zone.run(() => this.avisoLargo.set(false)), 7000);
    }));

    // El servidor gratuito se duerme si nadie lo usa. Se despierta apenas se abre la app,
    // mientras la persona lee la intro, así el registro o el mapa cargan más rápido.
    // Va directo (sin el interceptor) para no mostrar el aviso de «despertando».
    fetch(`${environment.apiUrl}/api/salud`, { cache: 'no-store' }).catch(() => {});

    // Recordatorio diario (solo en la app de Android): mantiene programados los próximos días
    programarRecordatorios();

    // Al cambiar de pantalla, Ionic oculta la anterior a los lectores de pantalla
    // (aria-hidden). Si el botón tocado seguía enfocado, el navegador lo advierte y el
    // lector se confunde. Se suelta el foco antes de navegar.
    inject(Router).events.subscribe(e => {
      if (e instanceof NavigationStart) (document.activeElement as HTMLElement | null)?.blur?.();
    });
  }

  cerrarAvisoIos() {
    this.avisoIos = false;
    try { localStorage.setItem(CLAVE_AVISO_IOS, '1'); } catch {}
  }
}

const CLAVE_AVISO_IOS = 'kimanke_aviso_ios';

// En iPhone/iPad no se puede instalar el APK: se usa la versión web y se agrega a la pantalla de inicio.
// El aviso aparece solo en el navegador (no en la app instalada) y hasta que se cierra.
function debeMostrarAvisoIos(): boolean {
  try {
    if (Capacitor.isNativePlatform()) return false;
    const ua = navigator.userAgent;
    const esIos = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
    const instalada = (navigator as any).standalone === true || matchMedia('(display-mode: standalone)').matches;
    return esIos && !instalada && localStorage.getItem(CLAVE_AVISO_IOS) !== '1';
  } catch {
    return false;
  }
}
