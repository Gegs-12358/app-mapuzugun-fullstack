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
import { AVATARES, imagenAvatar } from '../../avatars';

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
  etapas: any[] = [];            // { unit_id, stage, ejercicios, title, completed, score }
  unidadAbierta: number | null = null;
  loading = true;
  username = '';

  avatares = AVATARES;
  avatarId = 'puma';
  selectorAbierto = false;

  constructor(private http: HttpClient, private router: Router) {
    addIcons({ logOutOutline, checkmark, lockClosed });
  }

  get avatarImg(): string {
    return imagenAvatar(this.avatarId);
  }

  ngOnInit() {
    const userStr = localStorage.getItem('mapu_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      this.username = user.username;
      this.avatarId = user.avatar || 'puma';
    }

    this.http.get<any[]>('/api/units').subscribe({
      next: (data) => {
        this.unidades = data;
        this.cargarEtapas();
      },
      error: (err) => {
        console.error('Error al cargar unidades:', err);
        this.loading = false;
      }
    });
  }

  // Se ejecuta cada vez que se vuelve a esta pantalla (por ejemplo, al terminar una lección)
  ionViewWillEnter() {
    if (!this.loading) this.cargarEtapas();
  }

  cargarEtapas() {
    this.http.get<any[]>('/api/stages').subscribe({
      next: (data) => {
        this.etapas = data;
        this.loading = false;
        const actual = this.unidades.find(u => this.esActual(u.id));
        if (actual) this.unidadAbierta = actual.id;
      },
      error: (err) => {
        console.error('Error al cargar etapas:', err);
        this.loading = false;
      }
    });
  }

  // --- Etapas ---
  etapasDe(unitId: number): any[] {
    return this.etapas.filter(e => e.unit_id === unitId);
  }

  etapasCompletadas(unitId: number): number {
    return this.etapasDe(unitId).filter(e => e.completed).length;
  }

  estadoEtapa(unitId: number, stage: number): string {
    const etapa = this.etapasDe(unitId).find(e => e.stage === stage);
    if (etapa && etapa.completed) return 'completada';
    if (!this.estaDesbloqueada(unitId)) return 'bloqueada';

    const anterior = this.etapasDe(unitId).find(e => e.stage === stage - 1);
    if (anterior && !anterior.completed) return 'bloqueada';
    return 'actual';
  }

  // --- Unidades ---
  estaCompletada(unitId: number): boolean {
    const etapas = this.etapasDe(unitId);
    return etapas.length > 0 && etapas.every(e => e.completed);
  }

  estaDesbloqueada(unitId: number): boolean {
    const i = this.unidades.findIndex(u => u.id === unitId);
    if (i < 0) return false;
    if (i === 0) return true;
    return this.estaCompletada(this.unidades[i - 1].id);
  }

  esActual(unitId: number): boolean {
    return this.estaDesbloqueada(unitId) && !this.estaCompletada(unitId);
  }

  estadoUnidad(unitId: number): string {
    if (this.estaCompletada(unitId)) return 'completada';
    if (!this.estaDesbloqueada(unitId)) return 'bloqueada';
    return 'actual';
  }

  get completadas(): number {
    return this.unidades.filter(u => this.estaCompletada(u.id)).length;
  }

  get totalUnidades(): number {
    return this.unidades.length;
  }

  // --- Navegación ---
  irAUnidad(id: number) {
    if (!this.estaDesbloqueada(id)) return;
    this.unidadAbierta = this.unidadAbierta === id ? null : id;
  }

  irAEtapa(unitId: number, stage: number) {
    if (this.estadoEtapa(unitId, stage) === 'bloqueada') return;
    this.router.navigateByUrl(`/home/${unitId}/${stage}`);
  }

  // --- Avatar ---
  cambiarAvatar(id: string) {
    if (id === this.avatarId) {
      this.selectorAbierto = false;
      return;
    }
    this.http.put<any>('/api/avatar', { avatar: id }).subscribe({
      next: (res) => {
        this.avatarId = res.avatar;
        this.selectorAbierto = false;
        const userStr = localStorage.getItem('mapu_user');
        if (userStr) {
          const user = JSON.parse(userStr);
          user.avatar = res.avatar;
          localStorage.setItem('mapu_user', JSON.stringify(user));
        }
      },
      error: (err) => console.error('Error al cambiar el avatar:', err)
    });
  }

  cerrarSesion() {
    localStorage.removeItem('mapu_user');
    localStorage.removeItem('mapu_token');
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}