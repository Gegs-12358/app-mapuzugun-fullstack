import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  IonItem, IonInput, IonButton, IonSpinner
} from '@ionic/angular/standalone';

// Recuperar la contraseña: llega un código al correo de la cuenta y se elige una nueva
@Component({
  selector: 'app-recuperar',
  templateUrl: './recuperar.page.html',
  styleUrls: ['./recuperar.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
    IonItem, IonInput, IonButton, IonSpinner
  ]
})
export class RecuperarPage {
  paso: 'pedir' | 'cambiar' = 'pedir';
  usuario = '';
  codigo = '';
  password = '';
  showPassword = false;
  loading = false;
  errorMsg = '';
  mensaje = '';

  constructor(private http: HttpClient, private router: Router) {}

  pedirCodigo() {
    const usuario = this.usuario.trim();
    if (usuario.length < 3) {
      this.errorMsg = 'Escribe tu usuario o el correo de tu cuenta.';
      return;
    }
    this.loading = true;
    this.errorMsg = '';
    this.http.post<any>('/api/recuperar/pedir', { usuario }).subscribe({
      next: (res) => {
        this.loading = false;
        this.mensaje = res.mensaje;
        this.paso = 'cambiar';
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err.error?.error || 'No pudimos enviar el código. Revisa tu conexión.';
      }
    });
  }

  cambiar() {
    const codigo = (this.codigo || '').replace(/\D/g, '');
    if (codigo.length !== 6) { this.errorMsg = 'El código tiene 6 números.'; return; }
    if (this.password.length < 8) { this.errorMsg = 'La contraseña debe tener al menos 8 caracteres.'; return; }
    this.loading = true;
    this.errorMsg = '';
    this.http.post<any>('/api/recuperar/cambiar', {
      usuario: this.usuario.trim(), codigo, password: this.password
    }).subscribe({
      next: (res) => {
        const { token, ...user } = res;
        localStorage.setItem('mapu_token', token);
        localStorage.setItem('mapu_user', JSON.stringify(user));
        this.loading = false;
        this.router.navigateByUrl('/units', { replaceUrl: true });
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err.error?.error || 'No pudimos cambiar la contraseña. Inténtalo de nuevo.';
      }
    });
  }

  volverAPedir() {
    this.paso = 'pedir';
    this.errorMsg = '';
    this.codigo = '';
  }
}
