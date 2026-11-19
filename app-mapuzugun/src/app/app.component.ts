import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Capacitor } from '@capacitor/core';
import { ServidorService } from './servidor.service';

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
