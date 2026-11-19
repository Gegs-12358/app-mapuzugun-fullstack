import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonIcon, IonButtons, IonButton, AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logOutOutline, checkmark, lockClosed, flame, informationCircleOutline } from 'ionicons/icons';
import { AVATARES, imagenAvatar } from '../../avatars';
import { CompaneroComponent, EstadoVisual } from '../../companero/companero.component';

const CLAVE_UNIDAD_COMPANERO = 'kimanke_companero_unidad';

import { IconoRecursoComponent } from '../../icono-recurso/icono-recurso.component';
@Component({
  selector: 'app-units',
  templateUrl: './units.page.html',
  styleUrls: ['./units.page.scss'],
  standalone: true,
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent,
    IonIcon, IonButtons, IonButton, CompaneroComponent, IconoRecursoComponent
  ]
})
export class UnitsPage implements OnInit {
  unidades: any[] = [];
  unidadesTodas: any[] = [];
  etapas: any[] = [];            // { unit_id, stage, ejercicios, title, completed, score }
  unidadAbierta: number | null = null;
  loading = true;
  errorCarga = false;
  username = '';

  avatares = AVATARES;
  avatarId = 'puma';
  selectorAbierto = false;

  racha = 0;

  // Compañero sobre el camino
  estadoMapa: EstadoVisual = 'quieto';
  llegando = false;

  constructor(private http: HttpClient, private router: Router, private alertCtrl: AlertController) {
    addIcons({ logOutOutline, checkmark, lockClosed, flame, informationCircleOutline });
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

    this.cargarRacha();
    this.cargarUnidades();
  }

  cargarUnidades() {
    this.loading = true;
    this.errorCarga = false;
    this.http.get<any[]>('/api/units').subscribe({
      next: (data) => {
        this.unidadesTodas = data;
        this.cargarEtapas();
      },
      error: (err) => {
        console.error('Error al cargar unidades:', err);
        this.errorCarga = true;
        this.loading = false;
      }
    });
  }

  reintentar() {
    this.cargarRacha();
    this.cargarUnidades();
  }

  // Se ejecuta cada vez que se vuelve a esta pantalla (por ejemplo, al terminar una lección)
  ionViewWillEnter() {
    if (this.errorCarga) this.cargarUnidades();
    else if (!this.loading) this.cargarEtapas();
    this.cargarRacha();
  }

  cargarRacha() {
    if (!this.username) return;
    this.http.get<any>(`/api/user/${encodeURIComponent(this.username)}`).subscribe({
      next: (u) => this.racha = u.streak ?? 0,
      error: (err) => console.error('Error al cargar la racha:', err)
    });
  }

  cargarEtapas() {
    this.http.get<any[]>('/api/stages').subscribe({
      next: (data) => {
        this.etapas = data;
        this.errorCarga = false;
        // Solo se muestran las unidades que tienen etapas aprobadas
        this.unidades = this.unidadesTodas.filter(u => this.etapasDe(u.id).length > 0);
        this.loading = false;
        const actual = this.unidades.find(u => this.esActual(u.id));
        if (actual) this.unidadAbierta = actual.id;
        this.revisarLlegada();
      },
      error: (err) => {
        console.error('Error al cargar etapas:', err);
        this.errorCarga = true;
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

  irAEtapa(unitId: number, stage: number, tituloUnidad?: string, tituloEtapa?: string) {
    if (this.estadoEtapa(unitId, stage) === 'bloqueada') return;
    this.router.navigateByUrl(`/home/${unitId}/${stage}`, {
      state: { tituloUnidad, tituloEtapa }
    });
  }

  // --- Compañero en el mapa ---
  // Se para junto a la unidad actual; si ya terminó todo, celebra en la última.
  get unidadCompanero(): number | null {
    const actual = this.unidades.find(u => this.esActual(u.id));
    if (actual) return actual.id;
    return this.unidades.length ? this.unidades[this.unidades.length - 1].id : null;
  }

  get todoCompletado(): boolean {
    return this.unidades.length > 0 && this.unidades.every(u => this.estaCompletada(u.id));
  }

  // Si el compañero cambió de unidad desde la última visita, llega saltando
  private revisarLlegada() {
    const destino = this.unidadCompanero;
    if (destino === null) return;
    let anterior: string | null = null;
    try { anterior = localStorage.getItem(CLAVE_UNIDAD_COMPANERO); } catch {}
    try { localStorage.setItem(CLAVE_UNIDAD_COMPANERO, String(destino)); } catch {}

    if (this.todoCompletado) {
      this.estadoMapa = 'celebra';
      return;
    }
    if (anterior !== null && anterior !== String(destino)) {
      this.llegando = true;
      this.reaccionarMapa('feliz');
      setTimeout(() => this.llegando = false, 1200);
    }
  }

  private reaccionarMapa(estado: EstadoVisual) {
    this.estadoMapa = 'quieto';
    setTimeout(() => {
      this.estadoMapa = estado;
      setTimeout(() => { if (!this.todoCompletado) this.estadoMapa = 'quieto'; }, 1500);
    }, 30);
  }

  tocarCompaneroMapa() {
    if (this.todoCompletado) return;
    this.reaccionarMapa('saltito');
  }

  get nombreCompanero(): string {
    return AVATARES.find(a => a.id === this.avatarId)?.nombre ?? 'Tu compañero';
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

  irAAcerca() {
    this.router.navigateByUrl('/acerca');
  }

  cerrarSesion() {
    localStorage.removeItem('mapu_user');
    localStorage.removeItem('mapu_token');
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
    async eliminarCuenta() {
    const alerta = await this.alertCtrl.create({
      header: 'Eliminar mi cuenta',
      message: 'Se borrarán tu usuario y todo tu progreso. Esto no se puede deshacer. Para confirmar, escribe tu contraseña.',
      inputs: [{ name: 'password', type: 'password', placeholder: 'Tu contraseña' }],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: (data) => {
            if (!data.password) {
              alerta.message = 'Escribe tu contraseña para confirmar.';
              return false;
            }
            this.http.delete('/api/account', { body: { password: data.password } }).subscribe({
              next: () => {
                alerta.dismiss();
                this.cerrarSesion();
              },
              error: (err) => {
                alerta.message = err.status === 403
                  ? 'Contraseña incorrecta. Inténtalo de nuevo.'
                  : 'No se pudo eliminar la cuenta. Inténtalo más tarde.';
              }
            });
            return false; // mantiene el aviso abierto hasta tener respuesta
          }
        }
      ]
    });
    await alerta.present();
  }
  
}