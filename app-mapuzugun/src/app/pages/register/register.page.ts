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
import { AVATARES } from '../../avatars';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
    IonItem, IonInput, IonButton, IonSpinner
  ]
})
export class RegisterPage {
  paso: 1 | 2 = 1;
  avatares = AVATARES;
  avatar: string | null = null;
  username = '';
  password = '';
  showPassword = false;
  loading = false;
  errorMsg = '';

  constructor(private http: HttpClient, private router: Router) {}

  get avatarElegido() {
    return this.avatares.find(a => a.id === this.avatar) || null;
  }

  elegir(id: string) {
    this.avatar = id;
    this.errorMsg = '';
  }

  continuar() {
    if (!this.avatar) {
      this.errorMsg = 'Elige un animal para continuar.';
      return;
    }
    this.errorMsg = '';
    this.paso = 2;
  }

  volver() {
    this.errorMsg = '';
    this.paso = 1;
  }

  onSubmit() {
    if (!this.avatar) {
      this.paso = 1;
      this.errorMsg = 'Elige un animal para continuar.';
      return;
    }
    if (this.username.trim().length < 3) {
      this.errorMsg = 'El usuario debe tener al menos 3 caracteres.';
      return;
    }
    if (this.password.length < 8) {
      this.errorMsg = 'La contraseña debe tener al menos 8 caracteres.';
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    this.http.post('/api/register', {
      username: this.username.trim(),
      password: this.password,
      avatar: this.avatar
    }).subscribe({
      next: (res: any) => {
        const { token, ...user } = res;
        localStorage.setItem('mapu_token', token);
        localStorage.setItem('mapu_user', JSON.stringify(user));
        this.loading = false;
        this.router.navigateByUrl('/units', { replaceUrl: true });
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err.error?.error || 'Error de conexión';
      }
    });
  }
}