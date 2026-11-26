import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent,
  IonIcon, IonButtons, IonButton, IonFooter, AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { logOutOutline, checkmark, lockClosed, flame, informationCircleOutline } from 'ionicons/icons';
import { AVATARES, imagenAvatar } from '../../avatars';
import { CompaneroComponent, EstadoVisual } from '../../companero/companero.component';
import { PiezaConfeti, crearConfeti } from '../../companero';
import { NIVELES, Nivel, nivelDeUnidad } from '../../niveles';
import { leerAccesibilidad } from '../../accesibilidad';
import { AjustesLecturaComponent } from '../../ajustes-lectura/ajustes-lectura.component';
import {
  AjustesRecordatorio, cambiarRecordatorio, leerAjustes, recordatorioDisponible
} from '../../recordatorio';
import { AjustesAvisosWeb, cambiarAvisosWeb, estadoAvisosWeb, leerAvisosWeb, sincronizarAvisosWeb } from '../../avisos-web';

const CLAVE_UNIDAD_COMPANERO = 'kimanke_companero_unidad';
const CLAVE_CONSEJOS = 'kimanke_consejos_vistos';

interface Consejo { id: string; icono: string; texto: string; soloApp?: boolean; }

// Consejos para practicar: al tocar al compañero en el mapa va diciendo uno distinto.
// Son sobre cómo aprender y cómo usar la app, no sobre la lengua o la cultura
// (eso se escribe con hablantes).
const CONSEJOS_PRACTICA: string[] = [
  'Un ratito cada día ayuda más que mucho de una sola vez.',
  'Di las palabras en voz alta mientras practicas.',
  'Si te equivocas, no pasa nada: esa palabra vuelve en el repaso.',
  '¿Ves algo raro en una pregunta? Toca la banderita y nos llega el aviso.',
  'Si tu teclado no tiene la ü, usa el botón ü en los ejercicios.',
  'Practicar con alguien que habla mapuzugun es lo mejor de todo.',
];

// Lo que el compañero cuenta sobre opciones que no están a la vista
const CONSEJOS: Consejo[] = [
  { id: 'letra', icono: '🔤', texto: '¿Te cuesta leer? Puedes agrandar la letra o quitar las animaciones.' },
  { id: 'recordatorio', icono: '🔔', texto: 'Puedo recordarte practicar cada día, a la hora que elijas.', soloApp: true },
  { id: 'cuenta', icono: '✏️', texto: 'Si quieres, puedes cambiar tu compañero, tu nombre o tu correo.' },
];

import { IconoRecursoComponent } from '../../icono-recurso/icono-recurso.component';
@Component({
  selector: 'app-units',
  templateUrl: './units.page.html',
  styleUrls: ['./units.page.scss', './units.niveles.scss'],
  standalone: true,
  imports: [
    CommonModule, IonHeader, IonToolbar, IonTitle, IonContent,
    IonIcon, IonButtons, IonButton, IonFooter, CompaneroComponent, IconoRecursoComponent, AjustesLecturaComponent
  ]
})
export class UnitsPage implements OnInit, OnDestroy {
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
  newen: number | null = null;

  // Compañero sobre el camino
  estadoMapa: EstadoVisual = 'quieto';
  llegando = false;

  // Repaso: cuántas palabras tiene pendientes la persona
  repasoPendientes = 0;

  // Celebración al completar un nivel
  nivelCelebrado: Nivel | null = null;
  confetiNivel: PiezaConfeti[] = [];

  // Recordatorio diario (solo en la app de Android)
  recordatorioNativo = recordatorioDisponible();
  ajustesRecordatorio: AjustesRecordatorio = leerAjustes();
  avisoRecordatorio = '';

  // Versión web: avisos del navegador (recordatorio y novedades)
  avisosWeb = estadoAvisosWeb();
  ajustesWeb: AjustesAvisosWeb = leerAvisosWeb();
  avisoWeb = '';
  guardandoWeb = false;

  // Consejos del compañero: cada uno se muestra una sola vez por dispositivo
  @ViewChild(IonContent) contenido?: IonContent;
  consejoActual: Consejo | null = null;
  private indiceConsejoPractica = -1;

  // Accesibilidad: tamaño de letra y menos movimiento

  constructor(private http: HttpClient, private router: Router, private alertCtrl: AlertController) {
    addIcons({ logOutOutline, checkmark, lockClosed, flame, informationCircleOutline });
  }

  get avatarImg(): string {
    return imagenAvatar(this.avatarId);
  }

  // El avance de una lección puede terminar de guardarse después de volver al mapa
  private alGuardarAvance = () => {
    this.cargarEtapas();
    this.cargarRacha();
    this.cargarRepaso();
  };

  ngOnDestroy() {
    window.removeEventListener('kimanke:avance-guardado', this.alGuardarAvance);
  }

  ngOnInit() {
    window.addEventListener('kimanke:avance-guardado', this.alGuardarAvance);
    const userStr = localStorage.getItem('mapu_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      this.username = user.username;
      this.avatarId = user.avatar || 'puma';
    }

    this.cargarRacha();
    this.cargarUnidades();
    this.cargarRepaso();
    sincronizarAvisosWeb(this.http);
  }

  cargarRepaso() {
    this.http.get<{ total: number }>('/api/repaso').subscribe({
      next: (r) => this.repasoPendientes = r.total ?? 0,
      error: (err) => console.error('Error al cargar el repaso:', err)
    });
  }

  irARepaso() {
    this.router.navigateByUrl('/repaso');
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
    this.cargarRepaso();
  }

  // El mapa solo se puede medir cuando la pantalla ya está a la vista: durante la
  // transición de Ionic sigue oculta y todas las medidas dan cero.
  private visible = false;

  ionViewDidEnter() {
    this.visible = true;
    setTimeout(() => this.irAUnidadActual(), 60);
  }

  ionViewWillLeave() {
    this.visible = false;
  }

  cargarRacha() {
    if (!this.username) return;
    this.http.get<any>(`/api/user/${encodeURIComponent(this.username)}`).subscribe({
      next: (u) => {
        this.racha = u.streak ?? 0;
        this.newen = u.lives ?? null;
        // El compañero se puede cambiar desde otro dispositivo: manda el del servidor
        if (u.avatar) this.avatarId = u.avatar;
        try {
          const guardado = JSON.parse(localStorage.getItem('mapu_user') || '{}');
          localStorage.setItem('mapu_user', JSON.stringify({
            ...guardado, avatar: u.avatar || guardado.avatar,
            tiene_correo: u.tiene_correo, correo_requerido: u.correo_requerido
          }));
        } catch {}
        // Cuentas sin correo: primero hay que agregarlo
        if (u.correo_requerido && u.tiene_correo === false) {
          this.router.navigateByUrl('/correo', { replaceUrl: true });
        }
      },
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
        this.revisarNiveles();
        this.elegirConsejo();
        // Esperar a que el camino se dibuje antes de bajar hasta la unidad actual
        setTimeout(() => this.irAUnidadActual(), 80);
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

  // --- Niveles ---
  // El nivel empieza en esta unidad si es la primera de su nivel en el camino
  nivelQueEmpieza(i: number): Nivel | null {
    const nivel = nivelDeUnidad(this.unidades[i].id);
    if (i > 0 && nivelDeUnidad(this.unidades[i - 1].id).numero === nivel.numero) return null;
    return nivel;
  }

  unidadesDelNivel(nivel: Nivel): any[] {
    return this.unidades.filter(u => nivelDeUnidad(u.id).numero === nivel.numero);
  }

  unidadesCompletasDelNivel(nivel: Nivel): number {
    return this.unidadesDelNivel(nivel).filter(u => this.estaCompletada(u.id)).length;
  }

  estadoNivel(nivel: Nivel): 'completado' | 'actual' | 'bloqueado' {
    const unidades = this.unidadesDelNivel(nivel);
    if (unidades.length && unidades.every(u => this.estaCompletada(u.id))) return 'completado';
    return unidades.length && this.estaDesbloqueada(unidades[0].id) ? 'actual' : 'bloqueado';
  }

  // Si se completó un nivel desde la última visita, se celebra una vez.
  // La primera vez que se usa esta versión solo se anota lo ya completado, sin celebrar.
  private revisarNiveles() {
    const clave = `kimanke_niveles_${this.username}`;
    const completos = NIVELES.filter(n => this.estadoNivel(n) === 'completado').map(n => n.numero);
    let anteriores: number[] | null = null;
    try { anteriores = JSON.parse(localStorage.getItem(clave) || 'null'); } catch {}
    try { localStorage.setItem(clave, JSON.stringify(completos)); } catch {}
    if (!Array.isArray(anteriores)) return;

    const nuevo = completos.filter(n => !anteriores!.includes(n)).pop();
    if (nuevo !== undefined) {
      this.nivelCelebrado = NIVELES.find(n => n.numero === nuevo) ?? null;
      this.confetiNivel = crearConfeti();
    }
  }

  cerrarCelebracion() {
    this.nivelCelebrado = null;
    this.confetiNivel = [];
  }

  get siguienteNivel(): Nivel | null {
    if (!this.nivelCelebrado) return null;
    return NIVELES.find(n => n.numero === this.nivelCelebrado!.numero + 1 && this.unidadesDelNivel(n).length) ?? null;
  }

  // --- Mostrar el mapa desde donde vas ---
  // Baja el camino hasta la unidad en la que vas (o la última, si terminaste todo)
  // y la deja al centro. En la primera unidad baja lo mínimo.
  private async irAUnidadActual() {
    if (!this.visible || !this.contenido || this.selectorAbierto || this.loading) return;
    const destino = this.unidadCompanero;
    if (destino === null) return;
    // Si el compañero está sobre la etapa, se centra eso; si no, la estrella
    const nodo = document.getElementById('compa-etapa') ?? document.getElementById(`unidad-${destino}`);
    if (!nodo || nodo.offsetParent === null || nodo.getBoundingClientRect().height === 0) return;
    const caja = await this.contenido.getScrollElement();
    if (caja.clientHeight === 0) return;
    const arriba = nodo.getBoundingClientRect().top - caja.getBoundingClientRect().top + caja.scrollTop;
    // En la primera unidad se baja solo lo justo para que se vea la etapa roja bajo
    // el compañero (así queda a la vista también el resumen de arriba)
    const y = destino === this.unidades[0]?.id
      ? Math.max(0, arriba + nodo.offsetHeight + 70 - caja.clientHeight)
      : Math.max(0, arriba - caja.clientHeight / 2 + 70);
    if (y === 0) return;
    const suave = !leerAccesibilidad().menosMovimiento;
    this.contenido.scrollToPoint(0, y, suave ? 500 : 0);
  }

  // --- Consejos del compañero ---
  // Aparecen cuando la persona ya completó alguna etapa, para no llenar de avisos la primera visita
  private elegirConsejo() {
    if (!this.hayProgreso || this.nivelCelebrado) { this.consejoActual = null; return; }
    let vistos: string[] = [];
    try { vistos = JSON.parse(localStorage.getItem(CLAVE_CONSEJOS) || '[]'); } catch {}
    this.consejoActual = CONSEJOS.find(c => !vistos.includes(c.id) && (!c.soloApp || this.recordatorioNativo || this.avisosWeb === 'si')) ?? null;
  }

  private marcarConsejoVisto() {
    if (!this.consejoActual) return;
    let vistos: string[] = [];
    try { vistos = JSON.parse(localStorage.getItem(CLAVE_CONSEJOS) || '[]'); } catch {}
    vistos.push(this.consejoActual.id);
    try { localStorage.setItem(CLAVE_CONSEJOS, JSON.stringify(vistos)); } catch {}
    this.consejoActual = null;
  }

  verConsejo() {
    this.marcarConsejoVisto();
    this.selectorAbierto = true;
  }

  cerrarConsejo() {
    this.marcarConsejoVisto();
  }

  // --- Accesibilidad ---
  // --- Recordatorio diario ---
  async alternarRecordatorio(activo: boolean) {
    const ajustes = { ...this.ajustesRecordatorio, activo };
    const ok = await cambiarRecordatorio(ajustes);
    this.ajustesRecordatorio = leerAjustes();
    this.avisoRecordatorio = !ok && activo
      ? 'Para recibir el recordatorio, permite las notificaciones de Kimanke en los ajustes del teléfono.'
      : (activo ? `Listo: te avisaremos cada día a las ${ajustes.hora}.` : '');
  }

  async cambiarHoraRecordatorio(hora: string) {
    if (!/^\d{2}:\d{2}$/.test(hora)) return;
    await cambiarRecordatorio({ ...this.ajustesRecordatorio, hora });
    this.ajustesRecordatorio = leerAjustes();
    if (this.ajustesRecordatorio.activo) this.avisoRecordatorio = `Listo: te avisaremos cada día a las ${hora}.`;
  }

  async cambiarWeb(cambio: Partial<AjustesAvisosWeb>) {
    if (cambio.hora !== undefined && !/^\d{2}:\d{2}$/.test(cambio.hora)) return;
    const nuevos = { ...this.ajustesWeb, ...cambio };
    // Se muestra lo pedido mientras se guarda; si falla, al volver al valor guardado
    // las casillas se desmarcan solas
    this.ajustesWeb = nuevos;
    this.guardandoWeb = true;
    const problema = await cambiarAvisosWeb(this.http, nuevos);
    this.guardandoWeb = false;
    this.ajustesWeb = leerAvisosWeb();
    if (problema) { this.avisoWeb = problema; return; }
    const partes = [];
    if (this.ajustesWeb.recordatorio) partes.push(`te avisaremos cada día cerca de las ${this.ajustesWeb.hora} si no has practicado`);
    if (this.ajustesWeb.novedades) partes.push('te contaremos cuando haya mejoras');
    this.avisoWeb = partes.length ? `Listo: ${partes.join(' y ')}.` : 'Avisos apagados.';
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
    // Cada toque, un consejo distinto (si no está mostrando uno de las opciones)
    if (!this.consejoActual) {
      this.indiceConsejoPractica = (this.indiceConsejoPractica + 1) % CONSEJOS_PRACTICA.length;
    }
  }

  // El compañero se para sobre la etapa que toca, si la lista de etapas está abierta
  esEtapaDelCompanero(unitId: number, stage: number): boolean {
    return unitId === this.unidadCompanero && this.unidadAbierta === unitId
      && this.estadoEtapa(unitId, stage) === 'actual';
  }

  companeroEnEtapa(unitId: number): boolean {
    return this.etapasDe(unitId).some(e => this.esEtapaDelCompanero(unitId, e.stage));
  }

  // Lo que dice el compañero junto a la etapa
  get mensajeCompanero(): string {
    if (this.consejoActual) return this.consejoActual.texto;
    if (this.indiceConsejoPractica >= 0) return CONSEJOS_PRACTICA[this.indiceConsejoPractica];
    if (this.newen === 0) return 'Me quedé sin Newen. Descansemos unos minutos o practiquemos para recuperarlo.';
    const unidad = this.unidades.find(u => u.id === this.unidadCompanero);
    if (!unidad) return '';
    const faltan = this.etapasDe(unidad.id).length - this.etapasCompletadas(unidad.id);
    if (!this.hayProgreso) return '¡Mari mari! Toca la etapa roja para empezar.';
    if (faltan === 1) return `¡Es la última etapa de «${unidad.title}»! ¡Vamos!`;
    if (this.etapasCompletadas(unidad.id) === 0) return `¡Empecemos «${unidad.title}»! Toca la etapa roja.`;
    return `Te faltan ${faltan} etapas para terminar «${unidad.title}».`;
  }

  // --- Qué sigue ---
  // La primera etapa disponible y sin completar de la unidad en que va la persona
  get siguienteEtapa(): { unitId: number; stage: number; tituloUnidad: string; tituloEtapa: string } | null {
    const unidad = this.unidades.find(u => this.esActual(u.id));
    if (!unidad) return null;
    const etapa = this.etapasDe(unidad.id).find(e => this.estadoEtapa(unidad.id, e.stage) === 'actual');
    if (!etapa) return null;
    return { unitId: unidad.id, stage: etapa.stage, tituloUnidad: unidad.title, tituloEtapa: etapa.title };
  }

  get hayProgreso(): boolean {
    return this.etapas.some(e => e.completed);
  }

  // Lo que dice el compañero en el pie del mapa
  get guiaMapa(): string {
    if (this.todoCompletado) {
      return this.repasoPendientes > 0
        ? '¡Terminaste todas las unidades! Mientras llegan más, repasemos lo que te costó.'
        : '¡Terminaste todas las unidades! Pronto habrá más lecciones.';
    }
    if (this.newen === 0) return 'Te quedaste sin Newen. Descansa unos minutos o practica para recuperarlo.';
    const s = this.siguienteEtapa;
    if (!s) return '';
    const etapa = s.tituloEtapa || `Etapa ${s.stage}`;
    return this.hayProgreso
      ? `¡Vamos con «${etapa}» de ${s.tituloUnidad}!`
      : `¡Mari mari! Empecemos con ${s.tituloUnidad}.`;
  }

  // El globo corto del compañero sobre el camino, apuntando a la estrella
  get fraseMapa(): string {
    if (this.todoCompletado) return '¡Lo lograste!';
    return this.hayProgreso ? '¡Sigue aquí!' : '¡Empieza aquí!';
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
  cambiarCorreo() {
    this.selectorAbierto = false;
    this.router.navigateByUrl('/correo?cambiar=1');
  }

  // Cambiar el nombre de usuario: pide el nombre nuevo y la contraseña
  async cambiarNombre(sugerido = '') {
    const alerta = await this.alertCtrl.create({
      header: 'Cambiar mi nombre',
      message: `Hoy te llamas «${this.username}». Usa un apodo, no tu correo. Tu progreso se mantiene.`,
      inputs: [
        { name: 'nombre', type: 'text', placeholder: 'Nombre nuevo', value: sugerido,
          attributes: { maxlength: 50, autocapitalize: 'off' } },
        { name: 'password', type: 'password', placeholder: 'Tu contraseña' }
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Cambiar',
          handler: (data) => {
            const nombre = (data.nombre || '').trim();
            if (nombre.length < 3) { alerta.message = 'El nombre debe tener al menos 3 caracteres.'; return false; }
            if (nombre.includes('@')) { alerta.message = 'Usa un apodo, no tu correo.'; return false; }
            if (!data.password) { alerta.message = 'Escribe tu contraseña para confirmar.'; return false; }

            this.http.put<any>('/api/username', { username: nombre, password: data.password }).subscribe({
              next: (res) => {
                const { token, ...user } = res;
                try {
                  localStorage.setItem('mapu_token', token);
                  const anterior = JSON.parse(localStorage.getItem('mapu_user') || '{}');
                  localStorage.setItem('mapu_user', JSON.stringify({ ...anterior, ...user }));
                } catch {}
                this.username = user.username;
                alerta.dismiss();
                this.avisar(`Listo, ahora te llamas «${user.username}».`);
              },
              error: (err) => {
                const sugerencias: string[] = err.error?.sugerencias ?? [];
                alerta.message = err.status === 403
                  ? 'Contraseña incorrecta. Inténtalo de nuevo.'
                  : err.status === 409
                    ? `«${nombre}» ya está en uso.` + (sugerencias.length ? ` Libres: ${sugerencias.join(', ')}.` : '')
                    : (err.error?.error || 'No se pudo cambiar el nombre. Inténtalo más tarde.');
              }
            });
            return false; // el aviso queda abierto hasta tener respuesta
          }
        }
      ]
    });
    await alerta.present();
  }

  private async avisar(mensaje: string) {
    const aviso = await this.alertCtrl.create({ message: mensaje, buttons: ['OK'] });
    await aviso.present();
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