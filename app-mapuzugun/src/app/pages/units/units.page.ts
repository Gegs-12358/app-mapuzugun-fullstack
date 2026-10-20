import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonIcon, IonButtons, IonButton
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logOutOutline, checkmark, lockClosed } from 'ionicons/icons';

@Component({
  selector: 'app-units',
  templateUrl: './units.page.html',
  styleUrls: ['./units.page.scss'],
  standalone: true,
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent,
    IonIcon, IonButtons, IonButton
  ]
})
export class UnitsPage implements OnInit {
  unidades: any[] = [];
  progreso: any[] = [];
  loading = true;
  username = '';

  constructor(private http: HttpClient, private router: Router) {
    addIcons({ logOutOutline, checkmark, lockClosed });
  }

  ngOnInit() {
    const userStr = localStorage.getItem('mapu_user');
    if (userStr) {
      this.username = JSON.parse(userStr).username;
    }

    this.http.get<any[]>('http://localhost:3000/api/units').subscribe({
      next: (data) => {
        this.unidades = data;
        this.cargarProgreso();
      },
      error: (err) => {
        console.error('Error al cargar unidades:', err);
        this.loading = false;
      }
    });
  }

  cargarProgreso() {
    if (!this.username) {
      this.loading = false;
      return;
    }
    this.http.get<any[]>(`http://localhost:3000/api/progress/${this.username}`).subscribe({
      next: (data) => {
        this.progreso = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar progreso:', err);
        this.loading = false;
      }
    });
  }

  estaCompletada(unitId: number): boolean {
    return this.progreso.some(p => p.unit_id === unitId && p.completed);
  }

  estaDesbloqueada(unitId: number): boolean {
    if (unitId === 1) return true;
    return this.estaCompletada(unitId - 1);
  }

  esActual(unitId: number): boolean {
    return this.estaDesbloqueada(unitId) && !this.estaCompletada(unitId);
  }

  // 👇 ESTA ERA LA FUNCIÓN QUE FALTABA
  estadoUnidad(unitId: number): string {
    if (this.estaCompletada(unitId)) return 'completada';
    if (!this.estaDesbloqueada(unitId)) return 'bloqueada';
    return 'actual';
  }

  get completadas(): number {
    return this.progreso.filter(p => p.completed).length;
  }

  get totalUnidades(): number {
    return this.unidades.length;
  }

  irAUnidad(id: number) {
    if (this.estaDesbloqueada(id)) {
      // Navegación hacia la Etapa 1 de la unidad
      this.router.navigateByUrl(`/home/${id}/1`);
    }
  }

  cerrarSesion() {
    localStorage.removeItem('mapu_user');
    localStorage.removeItem('mapu_token');
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}