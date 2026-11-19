import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonButton, Platform } from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';
import { AVATARES } from '../../avatars';
import { RECURSOS } from '../../recursos';
import { IconoRecursoComponent } from '../../icono-recurso/icono-recurso.component';
import { ACUERDO, aceptarAcuerdo, acuerdoAceptado } from '../../acuerdo';

const CLAVE_INTRO = 'kimanke_intro_visto';

@Component({
  selector: 'app-intro',
  templateUrl: './intro.page.html',
  styleUrls: ['./intro.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonButton, IconoRecursoComponent]
})
export class IntroPage implements OnInit, OnDestroy {
  mostrar = false;
  paso: 1 | 2 | 3 | 4 = 1;
  recursos = RECURSOS;
  companeros = AVATARES;
  acuerdo = ACUERDO;
  // A dónde ir después de aceptar el acuerdo
  private destino = '/register';

  @ViewChild(IonContent) contenido?: IonContent;

  // Hasta dónde se puede volver: quien entra directo al acuerdo no ve las pantallas anteriores
  pasoMinimo: 1 | 2 | 3 | 4 = 1;
  // Para animar la entrada desde la derecha (avanzar) o la izquierda (volver)
  direccion: 'desde-derecha' | 'desde-izquierda' = 'desde-derecha';
  private toqueX = 0;
  private toqueY = 0;
  private botonAtras?: Subscription;

  constructor(private router: Router, private platform: Platform) {}

  // Cambia de pantalla y vuelve arriba (si no, la nueva se abre ya desplazada)
  irA(paso: 1 | 2 | 3 | 4) {
    this.direccion = paso < this.paso ? 'desde-izquierda' : 'desde-derecha';
    this.paso = paso;
    this.contenido?.scrollToTop(0);
  }

  atras() {
    if (this.paso > this.pasoMinimo) this.irA((this.paso - 1) as 1 | 2 | 3);
  }

  // Deslizar el dedo: hacia la izquierda avanza, hacia la derecha vuelve.
  // La pantalla 3 avanza solo con sus botones (crear cuenta o entrar).
  inicioToque(e: TouchEvent) {
    this.toqueX = e.changedTouches[0].clientX;
    this.toqueY = e.changedTouches[0].clientY;
  }

  finToque(e: TouchEvent) {
    const dx = e.changedTouches[0].clientX - this.toqueX;
    const dy = e.changedTouches[0].clientY - this.toqueY;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;  // fue un desplazamiento vertical
    if (dx > 0) this.atras();
    else if (this.paso < 3) this.irA((this.paso + 1) as 2 | 3);
  }

  ngOnDestroy() {
    this.botonAtras?.unsubscribe();
  }

  ngOnInit() {
    // Botón o gesto «atrás» de Android: vuelve a la pantalla anterior en vez de salir
    this.botonAtras = this.platform.backButton.subscribeWithPriority(10, siguiente => {
      if (this.mostrar && this.paso > this.pasoMinimo) this.atras();
      else siguiente();
    });

    let visto = false;
    let hayToken = false;
    try {
      visto = localStorage.getItem(CLAVE_INTRO) === '1';
      hayToken = !!localStorage.getItem('mapu_token');
    } catch {}

    // Quien ya usaba la app pero no ha aceptado el acuerdo, lo ve una vez
    if (!acuerdoAceptado() && (hayToken || visto)) {
      this.destino = hayToken ? '/units' : '/login';
      this.paso = 4;
      this.pasoMinimo = 4;
      this.mostrar = true;
    } else if (hayToken) {
      this.router.navigateByUrl('/units', { replaceUrl: true });
    } else if (visto) {
      this.router.navigateByUrl('/login', { replaceUrl: true });
    } else {
      this.mostrar = true;
    }
  }

  private marcarVisto() {
    try { localStorage.setItem(CLAVE_INTRO, '1'); } catch {}
  }

  // Crear cuenta, Ya tengo cuenta y Omitir pasan antes por el acuerdo
  crearCuenta() {
    this.irAlAcuerdo('/register');
  }

  yaTengoCuenta() {
    this.irAlAcuerdo('/login');
  }

  private irAlAcuerdo(destino: string) {
    this.destino = destino;
    if (acuerdoAceptado()) {
      this.aceptar();
      return;
    }
    this.irA(4);
  }

  aceptar() {
    aceptarAcuerdo();
    this.marcarVisto();
    this.router.navigateByUrl(this.destino, { replaceUrl: true });
  }
}
