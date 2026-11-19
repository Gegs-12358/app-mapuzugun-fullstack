import { Injectable, computed, signal } from '@angular/core';

/**
 * Lleva la cuenta de las peticiones al backend que están tardando.
 *
 * El plan gratis de Render apaga el servidor cuando nadie lo usa y la primera
 * petición puede tardar cerca de un minuto. Mientras haya alguna petición lenta,
 * la app muestra un aviso para que nadie piense que se colgó.
 */
@Injectable({ providedIn: 'root' })
export class ServidorService {
  private readonly lentas = signal(0);

  /** true mientras haya al menos una petición que lleva varios segundos esperando */
  readonly despertando = computed(() => this.lentas() > 0);

  marcarLenta() {
    this.lentas.update(n => n + 1);
  }

  desmarcarLenta() {
    this.lentas.update(n => Math.max(0, n - 1));
  }
}
