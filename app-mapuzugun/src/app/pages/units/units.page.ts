import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, 
  IonItem, IonLabel, IonIcon, IonButton, IonButtons 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { bookOutline, chevronForwardOutline, logOutOutline } from 'ionicons/icons';

@Component({
  selector: 'app-units',
  templateUrl: './units.page.html',
  styleUrls: ['./units.page.scss'],
  standalone: true,
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, 
    IonList, IonItem, IonLabel, IonIcon, IonButton, IonButtons
  ]
})
export class UnitsPage implements OnInit {
  unidades: any[] = [];
  loading = true;
  username = '';

  constructor(private http: HttpClient, private router: Router) {
    addIcons({ bookOutline, chevronForwardOutline, logOutOutline });
  }

  ngOnInit() {
    // Leemos el nombre del usuario
    const userStr = localStorage.getItem('mapu_user');
    if (userStr) {
      this.username = JSON.parse(userStr).username;
    }

    this.http.get<any[]>('http://localhost:3000/api/units').subscribe({
      next: (data) => {
        this.unidades = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar unidades', err);
        this.loading = false;
      }
    });
  }

  irAUnidad(id: number) {
    this.router.navigate(['/home', id]);
  }

  cerrarSesion() {
    localStorage.removeItem('mapu_user');
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}