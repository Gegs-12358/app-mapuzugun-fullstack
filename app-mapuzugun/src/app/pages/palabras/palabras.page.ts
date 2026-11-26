import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton
} from '@ionic/angular/standalone';
import { palabrasDeEtapa } from '../../palabras';

// Cómo va cada palabra, según el repaso espaciado
type Estado = 'cuesta' | 'aprendiendo' | 'dominada';

interface MiPalabra {
  mapu: string;
  es: string;
  estado: Estado;
  caja: number;      // 0 a 5
  unidad: number;
}

const GRUPOS: { estado: Estado; titulo: string; ayuda: string }[] = [
  { estado: 'cuesta', titulo: 'Te cuestan', ayuda: 'Aparecen en tu repaso hasta que las aciertes dos veces seguidas.' },
  { estado: 'aprendiendo', titulo: 'Aprendiendo', ayuda: 'Vuelven al repaso cada vez más espaciado, para que no se olviden.' },
  { estado: 'dominada', titulo: 'Dominadas', ayuda: 'Las acertaste muchas veces. Igual vuelven de vez en cuando.' },
];

@Component({
  selector: 'app-palabras',
  templateUrl: './palabras.page.html',
  styleUrls: ['./palabras.page.scss'],
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton],
})
export class PalabrasPage implements OnInit {
  grupos = GRUPOS;
  palabras: MiPalabra[] = [];
  cargando = true;
  error = false;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() { this.cargar(); }

  ionViewWillEnter() { if (!this.cargando) this.cargar(); }

  cargar() {
    this.cargando = true;
    this.error = false;
    this.http.get<any[]>('/api/mis-palabras').subscribe({
      next: (filas) => { this.palabras = this.armar(filas); this.cargando = false; },
      error: () => { this.error = true; this.cargando = false; },
    });
  }

  // Cada ejercicio trae una o más palabras (el emparejamiento trae varias).
  // Si una palabra sale en varios ejercicios, cuenta el que va peor.
  private armar(filas: any[]): MiPalabra[] {
    const porPalabra = new Map<string, MiPalabra>();
    const orden: Record<Estado, number> = { cuesta: 0, aprendiendo: 1, dominada: 2 };
    for (const f of filas) {
      if (typeof f.options === 'string') { try { f.options = JSON.parse(f.options); } catch {} }
      const estado: Estado = f.pendiente ? 'cuesta' : f.caja >= 4 ? 'dominada' : 'aprendiendo';
      for (const p of palabrasDeEtapa([f])) {
        const clave = p.mapu.toLowerCase();
        const nueva: MiPalabra = { mapu: p.mapu, es: p.es, estado, caja: f.caja, unidad: f.unit_id };
        const ya = porPalabra.get(clave);
        if (!ya || orden[estado] < orden[ya.estado] || (estado === ya.estado && f.caja < ya.caja)) {
          porPalabra.set(clave, nueva);
        }
      }
    }
    return [...porPalabra.values()].sort((a, b) => a.unidad - b.unidad || a.mapu.localeCompare(b.mapu, 'es'));
  }

  de(estado: Estado): MiPalabra[] {
    return this.palabras.filter(p => p.estado === estado);
  }

  // Cinco puntitos: cuántas cajas lleva la palabra
  puntos(caja: number): boolean[] {
    return [1, 2, 3, 4, 5].map(n => caja >= n);
  }

  irARepaso() { this.router.navigateByUrl('/repaso'); }
  irAlMapa() { this.router.navigateByUrl('/units'); }
}
