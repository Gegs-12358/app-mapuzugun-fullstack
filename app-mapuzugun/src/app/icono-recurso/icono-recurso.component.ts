import { Component, Input } from '@angular/core';
import { IdRecurso } from '../recursos';

/**
 * Íconos propios de Kütral, Kimün, Llanka y Newen.
 * Son SVG para que se vean iguales en todos los celulares (los emojis cambian según la marca).
 * Son decorativos: el texto de al lado ya dice qué son.
 */
@Component({
  selector: 'app-icono-recurso',
  standalone: true,
  template: `
    <svg viewBox="0 0 24 24" [attr.width]="tamano" [attr.height]="tamano" aria-hidden="true" focusable="false">
      @switch (nombre) {
        @case ('kutral') {
          <path d="M12 1.5C9 5.6 6.3 8.4 6.3 12.2a5.7 5.7 0 0011.4 0c0-3.8-2.7-6.6-5.7-10.7z" fill="#FFB703"/>
          <path d="M12 7.8c-1.6 2.1-3 3.5-3 5.3a3 3 0 006 0c0-1.8-1.4-3.2-3-5.3z" fill="#E8503A"/>
          <path d="M4.5 21.5l15-3.4M4.5 18.1l15 3.4" stroke="#8A5A2B" stroke-width="2.4" stroke-linecap="round"/>
        }
        @case ('kimun') {
          <path d="M12 21v-8" stroke="#1E7D47" stroke-width="2.4" stroke-linecap="round"/>
          <path d="M12 13.5C12 9 8.6 6.6 4.5 7c-.3 4.3 2.9 6.8 7.5 6.5z" fill="#3DBB6F"/>
          <path d="M12 11.5c0-4.6 3.4-7.6 7.6-7.3.3 4.4-3 7.6-7.6 7.3z" fill="#1E7D47"/>
          <ellipse cx="12" cy="21.2" rx="5" ry="1.3" fill="#8A5A2B" opacity=".55"/>
        }
        @case ('llanka') {
          <path d="M7 4h10l4.5 5.5L12 21 2.5 9.5z" fill="#1FA37A"/>
          <path d="M7 4l2.6 5.5h4.8L17 4zM2.5 9.5h19L12 21z" fill="#14806A"/>
          <path d="M9.6 9.5h4.8L12 21z" fill="#2CC795"/>
          <path d="M7 4h5l-2.4 5.5h-7z" fill="#6FE3B8" opacity=".9"/>
        }
        @case ('newen') {
          <path d="M12 21s-8.5-5.2-8.5-11.2C3.5 6.7 5.8 4.5 8.5 4.5c1.6 0 2.8.8 3.5 2 .7-1.2 1.9-2 3.5-2 2.7 0 5 2.2 5 5.3C20.5 15.8 12 21 12 21z" fill="#E0394A"/>
          <path d="M12.6 8.2l-2.6 4.6h2.4l-1 4.2 3.6-5.6h-2.4l1.4-3.2z" fill="#FFF4DA"/>
        }
      }
    </svg>
  `,
  styles: [`:host { display: inline-flex; flex: 0 0 auto; vertical-align: middle; }`],
})
export class IconoRecursoComponent {
  @Input() nombre: IdRecurso = 'kutral';
  @Input() tamano = 22;
}
