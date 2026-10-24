import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton
} from '@ionic/angular/standalone';
import { AVATARES } from '../../avatars';

// --- Datos que el proyecto debe completar ---
const CONTACTO = '';     // correo de contacto, por ejemplo 'hola@tudominio.cl'
const GRAFEMARIO = '';   // por ejemplo 'Azümchefe'. Vacío = aún por confirmar con hablantes

// Solo personas que dieron permiso explícito para aparecer aquí.
const CREDITOS: { nombre: string; comunidad?: string; aporte: string }[] = [];

@Component({
  selector: 'app-acerca',
  templateUrl: './acerca.page.html',
  styleUrls: ['./acerca.page.scss'],
  standalone: true,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton]
})
export class AcercaPage {
  contacto = CONTACTO;
  grafemario = GRAFEMARIO;
  creditos = CREDITOS;
  companeros = AVATARES;
}