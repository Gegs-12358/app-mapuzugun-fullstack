import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AjustesAccesibilidad, TAMANOS, TamanoLetra, guardarAccesibilidad, leerAccesibilidad
} from '../accesibilidad';

/**
 * Tamaño de letra y "menos movimiento". Se usa en el panel del mapa y en el
 * panel que se abre al tocar el compañero de la cabecera durante una lección.
 */
@Component({
  selector: 'app-ajustes-lectura',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ajuste-panel">
      <p class="ajuste-titulo" id="titulo-letra">🔤 Tamaño de letra</p>
      <div class="tamanos" role="radiogroup" aria-labelledby="titulo-letra">
        <button type="button" *ngFor="let t of tamanos; let n = index" role="radio"
          [attr.aria-checked]="ajustes.letra === t.id" [class.elegido]="ajustes.letra === t.id"
          [ngClass]="'tamano-' + n" (click)="cambiarLetra(t.id)">
          <span class="muestra" aria-hidden="true">Aa</span>{{ t.nombre }}
        </button>
      </div>
      <label class="fila">
        <input type="checkbox" [checked]="ajustes.menosMovimiento"
          (change)="cambiarMovimiento($any($event.target).checked)">
        <span>Menos movimiento <small>(sin animaciones ni confeti)</small></span>
      </label>
    </div>
  `,
  styleUrls: ['./ajustes-lectura.component.scss'],
})
export class AjustesLecturaComponent {
  tamanos = TAMANOS;
  ajustes: AjustesAccesibilidad = leerAccesibilidad();

  cambiarLetra(letra: TamanoLetra) {
    this.ajustes = { ...this.ajustes, letra };
    guardarAccesibilidad(this.ajustes);
  }

  cambiarMovimiento(menos: boolean) {
    this.ajustes = { ...this.ajustes, menosMovimiento: menos };
    guardarAccesibilidad(this.ajustes);
  }
}
