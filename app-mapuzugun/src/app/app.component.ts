import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Capacitor } from '@capacitor/core';
import { ServidorService } from './servidor.service';
import { environment } from '../environments/environment';
import { programarRecordatorios } from './recordatorio';

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

  constructor() {
    // El servidor gratuito se duerme si nadie lo usa. Se despierta apenas se abre la app,
    // mientras la persona lee la intro, así el registro o el mapa cargan más rápido.
    // Va directo (sin el interceptor) para no mostrar el aviso de «despertando».
    fetch(`${environment.apiUrl}/api/salud`, { cache: 'no-store' }).catch(() => {});

    // Recordatorio diario (solo en la app de Android): mantiene programados los próximos días
    programarRecordatorios();
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
