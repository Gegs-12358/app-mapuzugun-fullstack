import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonButton } from '@ionic/angular/standalone';
import { AVATARES } from '../../avatars';

const CLAVE_INTRO = 'kimanke_intro_visto';

@Component({
  selector: 'app-intro',
  templateUrl: './intro.page.html',
  styleUrls: ['./intro.page.scss'],
  standalone: true,
  imports: [CommonModule, IonContent, IonButton]
})
export class IntroPage implements OnInit {
  mostrar = false;
  paso: 1 | 2 = 1;
  companeros = AVATARES;

  constructor(private router: Router) {}

  ngOnInit() {
    let visto = false;
    let hayToken = false;
    try {
      visto = localStorage.getItem(CLAVE_INTRO) === '1';
      hayToken = !!localStorage.getItem('mapu_token');
    } catch {}

    if (hayToken) {
      this.router.navigateByUrl('/units', { replaceUrl: true });
    } else if (visto) {
      this.router.navigateByUrl('/login', { replaceUrl: true });
    } else {
      this.mostrar = true;
    }
  }

  siguiente() {
    this.paso = 2;
  }

  private marcarVisto() {
    try { localStorage.setItem(CLAVE_INTRO, '1'); } catch {}
  }

  crearCuenta() {
    this.marcarVisto();
    this.router.navigateByUrl('/register', { replaceUrl: true });
  }

  yaTengoCuenta() {
    this.marcarVisto();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
