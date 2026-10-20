import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, 
  IonList, IonItem, IonLabel, IonIcon 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { bookOutline, chevronForwardOutline } from 'ionicons/icons';

@Component({
  selector: 'app-units',
  templateUrl: './units.page.html',
  styleUrls: ['./units.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    IonHeader, IonToolbar, IonTitle, IonContent, 
    IonList, IonItem, IonLabel, IonIcon
  ]
})
export class UnitsPage implements OnInit {
  unidades: any[] = [];
  loading = true;

  constructor(private http: HttpClient, private router: Router) {
    // Registramos los iconos que vamos a usar
    addIcons({ bookOutline, chevronForwardOutline });
  }

  ngOnInit() {
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

  // Función para ir a la lección pasando el ID de la unidad
  irAUnidad(id: number) {
    this.router.navigate(['/home', id]);
  }
}