import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton
} from '@ionic/angular/standalone';
import { AVATARES } from '../../avatars';
import { GRAFEMARIO_APP, nombreGrafemario } from '../../escritura';
import { ACUERDO } from '../../acuerdo';
import { VERSION_COMPLETA, WHATSAPP_CONTACTO, enlaceReporte } from '../../version';

// --- Datos que el proyecto debe completar ---
const CONTACTO = '';     // correo de contacto, por ejemplo 'hola@tudominio.cl'

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
  grafemario = nombreGrafemario(GRAFEMARIO_APP);
  creditos = CREDITOS;
  companeros = AVATARES;
  acuerdo = ACUERDO;
  version = VERSION_COMPLETA;
  whatsapp = WHATSAPP_CONTACTO;
  reporte = enlaceReporte('Desde «Acerca de Kimanke»');
}