import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonItem, IonInput, IonButton, IonSpinner
} from '@ionic/angular/standalone';
import { AVATARES, imagenAvatar } from '../../avatars';

// Agregar (o cambiar) el correo de la cuenta, confirmándolo con un código.
// Si la cuenta no tiene correo, esta pantalla es obligatoria antes de seguir jugando.
@Component({
  selector: 'app-correo',
  templateUrl: './correo.page.html',
  styleUrls: ['./correo.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
    IonItem, IonInput, IonButton, IonSpinner
  ]
})
export class CorreoPage implements OnInit, OnDestroy {
  paso: 'correo' | 'codigo' | 'listo' = 'correo';
  modoCambiar = false;
  email = '';
  codigo = '';
  loading = false;
  errorMsg = '';
  avatarId = 'puma';
  username = '';
  esperaReenvio = 0;
  private reloj: any = null;

  constructor(private http: HttpClient, private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    this.modoCambiar = this.route.snapshot.queryParamMap.get('cambiar') === '1';
    try {
      const user = JSON.parse(localStorage.getItem('mapu_user') || '{}');
      this.avatarId = user.avatar || 'puma';
      this.username = user.username || '';
    } catch {}
  }

  ngOnDestroy() {
    clearInterval(this.reloj);
  }

  get avatarImg(): string {
    return imagenAvatar(this.avatarId);
  }

  get nombreCompanero(): string {
    return AVATARES.find(a => a.id === this.avatarId)?.nombre ?? 'Tu compañero';
  }

  enviarCodigo() {
    const email = this.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) {
      this.errorMsg = 'Revisa el correo: parece que está mal escrito.';
      return;
    }
    this.loading = true;
    this.errorMsg = '';
    this.http.post('/api/correo/enviar', { email }).subscribe({
      next: () => {
        this.loading = false;
        this.email = email;
        this.codigo = '';
        this.paso = 'codigo';
        this.empezarEspera();
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err.error?.error || 'No pudimos enviar el código. Revisa tu conexión.';
      }
    });
  }

  private empezarEspera() {
    this.esperaReenvio = 60;
    clearInterval(this.reloj);
    this.reloj = setInterval(() => {
      this.esperaReenvio--;
      if (this.esperaReenvio <= 0) clearInterval(this.reloj);
    }, 1000);
  }

  confirmar() {
    const codigo = (this.codigo || '').replace(/\D/g, '');
    if (codigo.length !== 6) {
      this.errorMsg = 'El código tiene 6 números.';
      return;
    }
    this.loading = true;
    this.errorMsg = '';
    this.http.post('/api/correo/verificar', { codigo }).subscribe({
      next: () => {
        this.loading = false;
        try {
          const user = JSON.parse(localStorage.getItem('mapu_user') || '{}');
          localStorage.setItem('mapu_user', JSON.stringify({ ...user, tiene_correo: true }));
        } catch {}
        this.paso = 'listo';
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err.error?.error || 'No pudimos confirmar el código. Inténtalo de nuevo.';
      }
    });
  }

  otroCorreo() {
    this.paso = 'correo';
    this.errorMsg = '';
  }

  irAlMapa() {
    this.router.navigateByUrl('/units', { replaceUrl: true });
  }

  cerrarSesion() {
    localStorage.removeItem('mapu_user');
    localStorage.removeItem('mapu_token');
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
