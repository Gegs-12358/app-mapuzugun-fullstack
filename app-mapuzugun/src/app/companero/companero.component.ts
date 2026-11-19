import { Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AVATARES } from '../avatars';

export type EstadoVisual = 'quieto' | 'feliz' | 'animando' | 'saltito' | 'celebra' | 'durmiendo';
type Pose = 'sentado' | 'ojos-cerrados' | 'feliz' | 'saltando' | 'saludando';

const POSES: Pose[] = ['sentado', 'ojos-cerrados', 'feliz', 'saltando', 'saludando'];

/**
 * El compañero animado.
 * Si el animal tiene sus poses (assets/avatars/poses), cambia de pose según el
 * estado y parpadea solo. Si no, muestra su imagen única dentro de un círculo.
 * Todas las poses se cargan de una vez y se muestran u ocultan, así el cambio
 * es instantáneo.
 */
@Component({
  selector: 'app-companero',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './companero.component.html',
  styleUrls: ['./companero.component.scss'],
})
export class CompaneroComponent implements OnInit, OnChanges, OnDestroy {
  @Input() avatarId = 'puma';
  @Input() estado: EstadoVisual = 'quieto';
  @Input() tamano = 80;

  pose: Pose = 'sentado';
  poses = POSES;
  private timers: any[] = [];
  private parpadeo: any = null;
  private bucle: any = null;

  get avatar() {
    return AVATARES.find(a => a.id === this.avatarId) ?? AVATARES[0];
  }

  get tienePoses(): boolean {
    return !!this.avatar.poses;
  }

  rutaPose(p: Pose): string {
    return `assets/avatars/poses/${this.avatar.id}-${p}.webp`;
  }

  ngOnInit() {
    this.programarParpadeo();
    this.aplicarEstado();
  }

  ngOnChanges(cambios: SimpleChanges) {
    if (cambios['estado'] && !cambios['estado'].firstChange) this.aplicarEstado();
  }

  ngOnDestroy() {
    this.limpiar();
    clearTimeout(this.parpadeo);
  }

  private limpiar() {
    this.timers.forEach(t => clearTimeout(t));
    this.timers = [];
    clearInterval(this.bucle);
    this.bucle = null;
  }

  private despues(ms: number, fn: () => void) {
    this.timers.push(setTimeout(fn, ms));
  }

  // Cada reacción es una pequeña secuencia de poses sincronizada con la animación CSS
  private aplicarEstado() {
    switch (this.estado) {
      case 'feliz':
        this.limpiar();
        this.pose = 'saltando';                        // en el aire
        this.despues(520, () => this.pose = 'feliz');  // cae sonriendo
        this.despues(2000, () => this.pose = 'sentado');
        break;
      case 'animando':
        this.limpiar();
        this.pose = 'sentado';
        this.despues(350, () => this.pose = 'ojos-cerrados');  // un suspiro
        this.despues(800, () => this.pose = 'sentado');
        break;
      case 'saltito':
        this.limpiar();
        this.pose = 'saludando';
        this.despues(1300, () => this.pose = 'sentado');
        break;
      case 'celebra':
        this.limpiar();
        this.pose = 'saltando';
        let arriba = true;
        this.bucle = setInterval(() => {
          arriba = !arriba;
          this.pose = arriba ? 'saltando' : 'feliz';
        }, 600);
        break;
      case 'durmiendo':
        this.limpiar();
        this.pose = 'ojos-cerrados';
        break;
      // 'quieto': no se interrumpe una reacción en curso; los temporizadores la terminan
    }
  }

  // Parpadeo natural: cada 2,5 a 5,5 segundos, solo si está sentado tranquilo
  private programarParpadeo() {
    const espera = 2500 + Math.random() * 3000;
    this.parpadeo = setTimeout(() => {
      if (this.pose === 'sentado' && this.estado !== 'durmiendo' && this.estado !== 'celebra') {
        this.pose = 'ojos-cerrados';
        setTimeout(() => { if (this.pose === 'ojos-cerrados' && this.estado !== 'durmiendo') this.pose = 'sentado'; }, 150);
      }
      this.programarParpadeo();
    }, espera);
  }
}
