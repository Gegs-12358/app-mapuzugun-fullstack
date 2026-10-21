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

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
    IonItem, IonInput, IonButton, IonSpinner
  ]
})
export class LoginPage {
  username = '';
  password = '';
  showPassword = false;
  loading = false;
  errorMsg = '';

  constructor(private http: HttpClient, private router: Router) {}

  onSubmit() {
    if (!this.username || !this.password) {
      this.errorMsg = 'Por favor, llena todos los campos.';
      return;
    }

    this.loading = true;
    this.errorMsg = '';

    this.http.post('/api/login', {
      username: this.username.trim(),
      password: this.password
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