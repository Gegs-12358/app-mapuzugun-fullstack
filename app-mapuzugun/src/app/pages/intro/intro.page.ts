import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonButton } from '@ionic/angular/standalone';
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
export class IntroPage implements OnInit {
  mostrar = false;
  paso: 1 | 2 | 3 | 4 = 1;
  recursos = RECURSOS;
  companeros = AVATARES;
  acuerdo = ACUERDO;
  // A dónde ir después de aceptar el acuerdo
  private destino = '/register';

  @ViewChild(IonContent) contenido?: IonContent;

  constructor(private router: Router) {}

  // Cambia de pantalla y vuelve arriba (si no, la nueva se abre ya desplazada)
  irA(paso: 1 | 2 | 3 | 4) {
    this.paso = paso;
    this.contenido?.scrollToTop(0);
  }

  ngOnInit() {
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
