import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <-- IMPORTANTE para los inputs
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonCard, 
  IonCardHeader, IonCardSubtitle, IonCardTitle, IonCardContent, 
  IonItem, IonInput, IonButton, IonSpinner, IonText 
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonCard, 
    IonCardHeader, IonCardSubtitle, IonCardTitle, IonCardContent, 
    IonItem, IonInput, IonButton, IonSpinner, IonText
  ]
})
export class LoginPage {
  username = '';
  password = '';
  isLoginMode = true; // true = Login, false = Registro
  loading = false;
  errorMsg = '';

  constructor(private http: HttpClient, private router: Router) {}

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.errorMsg = '';
  }

  onSubmit() {
    if (!this.username || !this.password) {
      this.errorMsg = 'Por favor, llena todos los campos.';
      return;
    }

    this.loading = true;
    this.errorMsg = '';
    
    const endpoint = this.isLoginMode ? '/api/login' : '/api/register';
    const body = { username: this.username, password: this.password };

    this.http.post(`http://localhost:3000${endpoint}`, body).subscribe({
      next: (user: any) => {
        // Guardamos el usuario en el navegador para mantener la sesión
        localStorage.setItem('mapu_user', JSON.stringify(user));
        this.loading = false;
        // Redirigimos al menú de unidades
        this.router.navigateByUrl('/units', { replaceUrl: true });
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err.error.error || 'Error de conexión';
      }
    });
  }
}