import { Component, ViewChild, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonProgressBar, IonBackButton, IonInput, IonFooter, AlertController
} from '@ionic/angular/standalone';
import { AVATARES, imagenAvatar } from '../avatars';
import { CompaneroComponent, EstadoVisual } from '../companero/companero.component';
import { AjustesLecturaComponent } from '../ajustes-lectura/ajustes-lectura.component';
import { nivelDeUnidad } from '../niveles';
import { Palabra, ejercicioNuevoDePractica, ejerciciosDePractica, palabrasDeEtapa, sinTildes } from '../palabras';
import { EstadoCompanero, FRASES, PiezaConfeti, crearConfeti, fraseAlAzar } from '../companero';
import { enlaceReporte } from '../version';
import { IconoRecursoComponent } from '../icono-recurso/icono-recurso.component';
import { IdRecurso, Recurso, recurso } from '../recursos';
import { LETRAS_ESPECIALES, nombreGrafemario, normalizarRespuesta, partirPregunta, soloFaltaDieresis } from '../escritura';
import { marcarPracticaDeHoy } from '../recordatorio';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss', 'home.portada.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonProgressBar, IonBackButton, IonInput, IonFooter, CompaneroComponent, IconoRecursoComponent, AjustesLecturaComponent
  ]
})
export class HomePage implements OnInit, OnDestroy {
  ejercicios: any[] = [];
  currentIndex = 0;
  loading = true;
  errorCarga = false;

  // Variables del juego
  xp = 0;
  streak = 0;
  lives = 5;
  gems = 0;
  username = '';
  avatarId = 'puma';
  ajustesAbiertos = false;
  avisoU = false;  // ya se avisó en esta pregunta que falta la ü
  @ViewChild(IonContent) private contenido?: IonContent;
  private avisoPrimerIntento = false;  // ya se explicó que el primer error no gasta Newen

  // Las palabras de la etapa, para conocerlas antes de empezar
  palabras: Palabra[] = [];
  verPalabras = false;
  nextLifeInMinutes = 0;

  // Variables de estado
  selectedOption: string | null = null;
  writtenAnswer = '';
  isAnswered = false;
  isCorrect = false;
  leccionTerminada = false;
  gameOver = false;
  unitId: string | null = null;
  stage: string | null = null;
  tituloUnidad = '';
  mostrarPortada = true;
  tituloEtapa = '';
  notaCultural = '';
  notaEnRevision = true;
  aciertos = 0;
  xpGanado = 0;
  // Guardado del avance al terminar: 'guardando' hasta que responde el servidor
  estadoGuardado: 'guardando' | 'listo' | 'error' = 'listo';
  gemasGanadas = 0;

  letrasEspeciales = LETRAS_ESPECIALES;

  // Modo repaso: las palabras que más le han costado a la persona.
  // No gasta Newen, suma un poco de Kimün y cuenta para la racha.
  modoRepaso = false;
  sinRepaso = false;

  // Pistas: si pasan unos segundos sin responder, el compañero ofrece ayuda.
  // Salen de la misma respuesta correcta (letras, opciones descartadas), sin
  // inventar contenido. Quien usa pista, igual deja la palabra para el repaso.
  nivelPista = 0;
  ofrecerPista = false;
  opcionesApagadas: string[] = [];
  parejaPista: string | null = null;
  private usoPista = false;
  private relojPista: any = null;
  private static readonly SEGUNDOS_PISTA = 10;

  // Portada: etapas de la unidad (para la fila de etapas) y el compañero que saluda
  etapasUnidad: { stage: number; completed: boolean; title?: string }[] = [];
  estadoPortada: EstadoVisual = 'quieto';
  private fallosMatch = 0;

  // Explicación de Kütral, Kimün, Llanka o Newen al tocarlos en la barra
  recursoInfo: Recurso | null = null;
  private temporizadorInfo: any = null;

  explicar(id: IdRecurso) {
    clearTimeout(this.temporizadorInfo);
    this.recursoInfo = this.recursoInfo?.id === id ? null : recurso(id);
    if (this.recursoInfo) this.temporizadorInfo = setTimeout(() => this.recursoInfo = null, 6000);
  }

  // Compañero que acompaña y reacciona durante la lección
  estadoCompanero: EstadoCompanero = 'quieto';
  fraseCompanero = '';
  tonoFrase: '' | 'feliz' | 'animando' = '';
  confeti: PiezaConfeti[] = [];
  private temporizadorCompanero: any = null;

  // Variables para el juego de emparejamiento (Match)
  matchLeftColumn: any[] = [];
  matchRightColumn: any[] = [];
  selectedLeft: any = null;
  selectedRight: any = null;
  matchedLeft: string[] = [];
  matchedRight: string[] = [];

  // Qué tipos de pregunta trae la etapa, para contarlo en la portada
  get resumenTipos(): { icono: string; texto: string }[] {
    const nombres: Record<string, [string, string, string]> = {
      multiple_choice: ['🔘', 'alternativa', 'alternativas'],
      write: ['✍️', 'para escribir', 'para escribir'],
      fill_blank: ['🧩', 'completar la frase', 'completar la frase'],
      match: ['🔗', 'emparejar', 'emparejar'],
      ordenar: ['🧱', 'ordenar palabras', 'ordenar palabras'],
    };
    const cuenta = new Map<string, number>();
    for (const e of this.ejercicios) cuenta.set(e.type, (cuenta.get(e.type) ?? 0) + 1);
    return [...cuenta.entries()].map(([tipo, n]) => {
      const [icono, uno, varios] = nombres[tipo] ?? ['❓', 'pregunta', 'preguntas'];
      return { icono, texto: `${n} ${n === 1 ? uno : varios}` };
    });
  }

  reaccionarPortada() {
    setTimeout(() => this.estadoPortada = 'saltito', 30);
  }

    get etapaYaCompletada(): boolean {
    return this.etapasUnidad.some(e => String(e.stage) === this.stage && e.completed);
  }

  // Lo máximo que se puede ganar (mismas reglas que el servidor)
  // El emparejamiento de calentamiento no da puntos
  private get preguntasConPuntos(): number {
    return this.ejercicios.filter(e => !e.calentamiento).length;
  }

  get kimunPosible(): number {
    return this.preguntasConPuntos * (this.modoRepaso || this.etapaYaCompletada ? 5 : 20);
  }

  get llankasPosibles(): number {
    return this.modoRepaso || this.etapaYaCompletada ? 0 : this.preguntasConPuntos * 2;
  }

  // Color de la estrella de la unidad, el mismo que en el mapa
  get colorUnidad(): number {
    return ((Number(this.unitId) - 1) % 5 + 5) % 5 + 1;
  }

  estadoDeEtapa(e: { stage: number; completed: boolean }): 'completada' | 'actual' | 'pendiente' {
    if (String(e.stage) === this.stage) return 'actual';
    return e.completed ? 'completada' : 'pendiente';
  }

  // Cada pregunta empieza arriba, con el compañero y la pregunta a la vista
  private subirAlInicio() {
    this.contenido?.scrollToTop(0);
  }

  comenzar() {
    this.verPalabras = false;
    this.mostrarPortada = false;
    this.subirAlInicio();
    this.fraseCompanero = fraseAlAzar(FRASES.inicio);
    this.tonoFrase = '';
    if (!this.modoRepaso) this.avisarPocoNewen();
    this.iniciarPista();
    this.registrarInicio();
  }

  // Para saber en qué pregunta se deja una etapa: solo la etapa y el número de pregunta
  private idIntento: number | null = null;

  private registrarInicio() {
    if (this.modoRepaso || !this.unitId || !this.stage) return;
    this.http.post<{ id: number }>('/api/intento', {
      unitId: Number(this.unitId), stage: Number(this.stage), total: this.ejercicios.length,
    }).subscribe({ next: (r) => this.idIntento = r.id, error: () => {} });
  }

  private registrarAvance() {
    if (!this.idIntento) return;
    this.http.post(`/api/intento/${this.idIntento}/avance`, { pregunta: this.currentIndex + 1 })
      .subscribe({ error: () => {} });
  }

  // Con la pantalla de "sin Newen" abierta, cada minuto se revisa si ya volvió uno
  private relojNewen = setInterval(() => {
    if (!this.gameOver) return;
    if (this.nextLifeInMinutes > 1) this.nextLifeInMinutes--;
    this.regenerarVidasPorTiempo();
  }, 60_000);

  ngOnDestroy() {
    clearInterval(this.relojNewen);
    clearTimeout(this.relojPista);
  }

  ionViewWillLeave() {
    clearTimeout(this.relojPista);
  }

  // --- Pistas ---
  private iniciarPista() {
    clearTimeout(this.relojPista);
    this.nivelPista = 0;
    this.ofrecerPista = false;
    this.opcionesApagadas = [];
    this.parejaPista = null;
    this.usoPista = false;
    if (this.maxNivelPista === 0) return;
    this.relojPista = setTimeout(() => {
      if (this.isAnswered || this.mostrarPortada || this.leccionTerminada || this.gameOver) return;
      this.ofrecerPista = true;
      this.reaccionar('saltito');
      this.fraseCompanero = '¿Te ayudo con una pista?';
      this.tonoFrase = '';
    }, HomePage.SEGUNDOS_PISTA * 1000);
  }

  get maxNivelPista(): number {
    const e = this.ejercicioActual;
    if (!e || e.sinPista) return 0;   // con dibujos o verdadero o falso, una pista sería la respuesta
    if (e.type === 'ordenar') return 1;
    if (e.type === 'match') return 1;
    if (e.type === 'multiple_choice') return (e.options?.length ?? 0) >= 4 ? 3 : 2;
    return 3;
  }

  darPista() {
    if (this.isAnswered || this.nivelPista >= this.maxNivelPista) return;
    clearTimeout(this.relojPista);
    this.nivelPista++;
    this.usoPista = true;
    this.ofrecerPista = false;
    const e = this.ejercicioActual;
    if (e.type === 'multiple_choice' && this.nivelPista >= 2) {
      // Apagar una alternativa incorrecta que siga encendida
      const malas = (e.options as string[]).filter(o => o !== e.correct_answer && !this.opcionesApagadas.includes(o));
      const quitar = malas[Math.floor(Math.random() * malas.length)];
      if (quitar) {
        this.opcionesApagadas = [...this.opcionesApagadas, quitar];
        if (this.selectedOption === quitar) this.selectedOption = null;
      }
    }
    if (e.type === 'match') {
      const libre = (e.options as any[]).find(p => !this.matchedLeft.includes(p.mapuche));
      this.parejaPista = libre?.mapuche ?? null;
    }
  }

  // «M _ _ i   _ _ _ i»: guiones por letra, con la primera (y en el nivel 3 la última) visible
  get formaPista(): string {
    const e = this.ejercicioActual;
    if (!e || this.nivelPista < 2 || (e.type !== 'write' && e.type !== 'fill_blank')) return '';
    const resp = String(e.correct_answer ?? '').trim();
    const conUltima = this.nivelPista >= 3;
    return resp.split(/\s+/).map((palabra, n) =>
      [...palabra].map((letra, i, todas) =>
        (i === 0 && (n === 0 || conUltima)) || (conUltima && i === todas.length - 1) ? letra : '_'
      ).join(' ')
    ).join('   ');
  }

  get textoPista(): string {
    const e = this.ejercicioActual;
    if (!e || this.nivelPista === 0) return '';
    if (e.type === 'match') return 'Mira la pareja que brilla. Las demás van por tu cuenta.';
    if (e.type === 'ordenar') return `Empieza con «${String(e.correct_answer).split(/\s+/)[0]}».`;
    const resp = String(e.correct_answer ?? '').trim();
    const primera = `Empieza con «${resp.charAt(0)}».`;
    const aviso = ' Esta palabra quedará para repasar.';
    if (e.type === 'multiple_choice') {
      if (this.nivelPista === 1) return primera + aviso;
      return primera + (this.nivelPista === 2 ? ' Apagué una opción que no es.' : ' Quedan solo dos opciones.');
    }
    // Escribir o completar: la forma de la palabra va aparte (formaPista)
    const conU = /ü/i.test(resp) ? ' Lleva ü: usa el botón de abajo.' : '';
    if (this.nivelPista === 1) return primera + conU + aviso;
    if (this.nivelPista === 2) return `${primera} Tiene esta forma:`;
    return 'Primera y última letra de cada palabra:';
  }
  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private alertCtrl: AlertController
  ) { }

  private async avisar(mensaje: string) {
    const alerta = await this.alertCtrl.create({ message: mensaje, buttons: ['OK'] });
    await alerta.present();
  }

  get ejercicioActual() {
    return this.ejercicios[this.currentIndex];
  }

  get progreso() {
    if (this.ejercicios.length === 0) return 0;
    return this.currentIndex / this.ejercicios.length;
  }

  // Correo de reporte con la pregunta ya identificada, para revisar el contenido
  get enlaceReporteEjercicio(): string {
    const e = this.ejercicioActual;
    if (!e) return enlaceReporte();
    if (e.calentamiento) {
      return enlaceReporte(
        `Unidad ${e.unit_id ?? this.unitId} · Etapa ${e.stage ?? this.stage} · Ejercicio de práctica armado con las palabras de la etapa\n` +
        (e.type === 'match'
          ? e.options.map((p: any) => `${p.mapuche} = ${p.spanish}`).join('\n')
          : `Pregunta: ${e.frase ?? e.question}\nRespuesta esperada: ${e.correct_answer}`)
      );
    }
    return enlaceReporte(
      `Unidad ${e.unit_id ?? this.unitId} · Etapa ${e.stage ?? this.stage} · Ejercicio #${e.id}\nPregunta: ${e.question}\nRespuesta esperada: ${e.correct_answer ?? '(emparejar)'}`
    );
  }

  // La pregunta en partes, para pintar la palabra clave de otro color
  get partesPregunta() {
    return partirPregunta(this.ejercicioActual?.question);
  }

  get grafemarioActual(): string {
    return nombreGrafemario(this.ejercicioActual?.grafemario);
  }

  // El botón de "listo" o "enter" del teclado solo cierra el teclado. No comprueba:
  // así un toque sin querer no gasta Newen, y la persona revisa y toca COMPROBAR.
  enterEnRespuesta(evento: Event) {
    evento.preventDefault();
    (evento.target as HTMLElement | null)?.blur();
    (document.activeElement as HTMLElement | null)?.blur();
  }

  // Agrega una letra que no está en el teclado (por ejemplo la ü)
  insertarLetra(letra: string) {
    if (this.isAnswered) return;
    // Si ya se avisó que falta la ü, se pone donde corresponde en lo que escribió
    const correcta = String(this.ejercicioActual?.correct_answer ?? '');
    if (letra === 'ü' && this.avisoU && soloFaltaDieresis(this.writtenAnswer, correcta)) {
      const escrito = this.writtenAnswer.normalize('NFC').trim().replace(/\s+/g, ' ');
      const modelo = normalizarRespuesta(correcta);
      const corregido = [...escrito].map((c, i) => modelo[i] === 'ü' ? (c === 'U' ? 'Ü' : 'ü') : c).join('');
      // ion-input no siempre redibuja si el texto cambia por dentro; se vacía y se vuelve a poner
      this.writtenAnswer = '';
      setTimeout(() => this.writtenAnswer = corregido);
      return;
    }
    this.writtenAnswer = (this.writtenAnswer ?? '') + letra;
  }

  get nombreCompanero(): string {
    return AVATARES.find(a => a.id === this.avatarId)?.nombre ?? 'Tu compañero';
  }

  // Cambia la animación del compañero. Se pasa por 'quieto' un instante para que
  // la animación se repita aunque sea la misma de antes.
  reaccionar(estado: EstadoCompanero, frases?: string[]) {
    clearTimeout(this.temporizadorCompanero);
    this.estadoCompanero = 'quieto';
    if (frases) {
      this.fraseCompanero = fraseAlAzar(frases, this.fraseCompanero);
      this.tonoFrase = estado === 'feliz' || estado === 'animando' ? estado : '';
    }
    setTimeout(() => {
      this.estadoCompanero = estado;
      this.temporizadorCompanero = setTimeout(() => this.estadoCompanero = 'quieto', 1400);
    }, 30);
  }

  tocarCompanero() {
    this.reaccionar('saltito', FRASES.toque);
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

      // 1. Mostramos los datos del localStorage rápido para que no parpadee
      this.xp = user.xp ?? 0;
      this.streak = user.streak ?? 0;
      this.lives = user.lives !== undefined ? user.lives : 5;
      this.gems = user.gems !== undefined ? user.gems : 0;

      // 2. Consultamos la base de datos para tener los datos reales
      this.http.get(`/api/user/${this.username}`).subscribe({
        next: (userData: any) => {
          this.xp = userData.xp;
          this.streak = userData.streak;
          this.avatarId = userData.avatar || this.avatarId;
          try {
            const guardado = JSON.parse(localStorage.getItem('mapu_user') || '{}');
            localStorage.setItem('mapu_user', JSON.stringify({ ...guardado, avatar: this.avatarId }));
          } catch {}
          this.lives = userData.lives;
          this.gems = userData.gems;

          // Calcular minutos para la próxima vida
          if (this.lives < 5 && userData.last_life_regen) {
            const lastRegen = new Date(userData.last_life_regen).getTime();
            const minutesPassed = Math.floor((Date.now() - lastRegen) / 60000);
            const minutesRemaining = 10 - (minutesPassed % 10);
            this.nextLifeInMinutes = minutesRemaining;
          }

          // Actualizamos el localStorage con los datos frescos de la BD
          localStorage.setItem('mapu_user', JSON.stringify(userData));

          // Si las vidas reales son 0, mostramos Game Over (el repaso no gasta Newen)
          if (this.lives <= 0 && !this.modoRepaso) {
            this.gameOver = true;
          }

          // 3. Regenerar vidas si pasó tiempo suficiente
          this.regenerarVidasPorTiempo();
        },
        error: (err) => console.error('Error al cargar el usuario desde el backend:', err)
      });
    }

    this.modoRepaso = this.route.snapshot.routeConfig?.path === 'repaso';
    this.unitId = this.route.snapshot.paramMap.get('unitId');
    this.stage = this.route.snapshot.paramMap.get('stage');
    const estado = history.state ?? {};
    this.tituloUnidad = this.modoRepaso ? 'Repaso' : (estado.tituloUnidad ?? '');
    this.tituloEtapa = estado.tituloEtapa ?? '';

    if (this.modoRepaso) {
      this.cargarEjercicios();
      return;
    }

    // La nota cultural viene de la base (tabla units) y solo llega si fue aprobada
    // por hablantes, o si el servidor está en modo borrador.
    this.http.get<any[]>('/api/units').subscribe({
      next: (unidades) => {
        const unidad = unidades.find(u => String(u.id) === this.unitId);
        this.notaCultural = unidad?.nota_cultural ?? '';
        this.notaEnRevision = unidad?.nota_estado !== 'aprobado';
      },
      error: (err) => console.error('Error al cargar la nota cultural:', err)
    });

    // Etapas de esta unidad, para la portada
    this.http.get<any[]>('/api/stages').subscribe({
      next: (etapas) => {
        this.etapasUnidad = etapas.filter(e => String(e.unit_id) === this.unitId)
          .map(e => ({ stage: e.stage, completed: e.completed, title: e.title }));
      },
      error: () => {}
    });

    // Cargar Ejercicios
    this.cargarEjercicios();
  }

  cargarEjercicios() {
    if (this.modoRepaso) {
      this.loading = true;
      this.errorCarga = false;
      this.http.get<{ total: number; ejercicios: any[] }>('/api/repaso').subscribe({
        next: (res) => {
          this.sinRepaso = res.ejercicios.length === 0;
          this.prepararEjercicios(res.ejercicios);
        },
        error: (err) => {
          console.error('Error al cargar el repaso:', err);
          this.errorCarga = true;
          this.loading = false;
        }
      });
      return;
    }
    if (!this.unitId) return;
    this.loading = true;
    this.errorCarga = false;
    this.http.get<any[]>(`/api/exercises?unitId=${this.unitId}&stage=${this.stage}`).subscribe({
      next: (data) => this.prepararEjercicios(data),
      error: (err) => {
        console.error('Error al conectar con el backend:', err);
        this.errorCarga = true;
        this.loading = false;
      }
    });
  }

  private prepararEjercicios(data: any[]) {
    this.ejercicios = this.shuffleArray(data).map(ejercicio => {
      if (typeof ejercicio.options === 'string') {
        try { ejercicio.options = JSON.parse(ejercicio.options); } catch (e) { }
      }

      // Detectar si es match
      if (Array.isArray(ejercicio.options) && ejercicio.options.length > 0) {
        if (ejercicio.options[0].mapuche !== undefined) {
          ejercicio.type = 'match';
        } else {
          ejercicio.options = this.shuffleArray([...ejercicio.options]);
        }
      }
      return ejercicio;
    });
    // El emparejamiento va primero: muestra de una vez todas las parejas de la
    // etapa y sirve para conocer las palabras antes de las demás preguntas.
    if (!this.modoRepaso) {
      this.ejercicios = [
        ...this.ejercicios.filter(e => e.type === 'match'),
        ...this.ejercicios.filter(e => e.type !== 'match'),
      ];
    }
    this.palabras = palabrasDeEtapa(this.ejercicios);
    // Si a la etapa le falta emparejar, escribir o completar la frase, se arman
    // con sus mismas palabras (no inventan contenido). Son de práctica: no dan
    // ni quitan puntos. El emparejamiento va primero; los otros, en cualquier lugar.
    if (!this.modoRepaso) {
      const extras = ejerciciosDePractica(this.ejercicios, this.palabras);
      const nuevo = ejercicioNuevoDePractica(this.ejercicios, this.palabras);
      if (nuevo) extras.push(nuevo);
      for (const extra of extras) {
        if (extra.type === 'match') this.ejercicios.unshift(extra);
        else {
          // En cualquier lugar después del emparejamiento, pero no pegado a
          // otra pregunta sobre la misma palabra
          const desde = this.ejercicios[0]?.type === 'match' ? 1 : 0;
          const palabra = String(extra.palabra ?? '').toLowerCase();
          const nombra = (e: any) => !!e && e.type !== 'match' && !!palabra &&
            `${e.question} ${e.correct_answer} ${JSON.stringify(e.options ?? [])}`.toLowerCase().includes(palabra);
          let pos = desde;
          for (let intento = 0; intento < 12; intento++) {
            pos = desde + Math.floor(Math.random() * (this.ejercicios.length - desde + 1));
            if (!nombra(this.ejercicios[pos - 1]) && !nombra(this.ejercicios[pos])) break;
          }
          this.ejercicios.splice(pos, 0, extra);
        }
      }
    }
    this.loading = false;
    this.initMatchGame();
    // El compañero saluda al aparecer la portada
    setTimeout(() => this.estadoPortada = 'saltito', 350);
  }

  // Guarda si la persona acertó o no, para armar su repaso
  private registrarRespuesta(ejercicio: any, correcta: boolean) {
    if (!ejercicio?.id) return;
    // Con pista, la palabra queda para el repaso aunque se acierte
    this.http.post('/api/respuesta', { exerciseId: ejercicio.id, correcta: correcta && !this.usoPista }).subscribe({
      error: (err) => console.error('Error al guardar la respuesta:', err)
    });
  }

  initMatchGame() {
    if (this.ejercicioActual && this.ejercicioActual.type === 'match') {
      const { izq, der } = this.mezclarSinCoincidencias(this.ejercicioActual.options);
      this.matchLeftColumn = izq;
      this.matchRightColumn = der;
      this.selectedLeft = null;
      this.selectedRight = null;
      this.matchedLeft = [];
      this.matchedRight = [];
      this.fallosMatch = 0;
    }
  }

  playAudio() {
    if (!this.ejercicioActual || !this.ejercicioActual.audio_url) {
      console.log('Esta pregunta no tiene audio.');
      return;
    }
    const audio = new Audio(this.ejercicioActual.audio_url);
    audio.play().catch(e => console.error('Error al reproducir el audio:', e));
  }

  selectOption(option: string) {
    if (!this.isAnswered && !this.opcionesApagadas.includes(option)) {
      this.selectedOption = option;
    }
  }

  // --- LÓGICA DE EMPAREJAMIENTO (MATCH) ---
  selectLeft(item: any) {
    if (this.isAnswered || this.matchedLeft.includes(item.mapuche)) return;
    this.selectedLeft = item;
    this.checkMatch();
  }

  selectRight(item: any) {
    if (this.isAnswered || this.matchedRight.includes(item.spanish)) return;
    this.selectedRight = item;
    this.checkMatch();
  }

  checkMatch() {
    if (this.selectedLeft && this.selectedRight) {
      if (this.selectedLeft.mapuche === this.selectedRight.mapuche) {
        this.matchedLeft.push(this.selectedLeft.mapuche);
        this.matchedRight.push(this.selectedRight.spanish);

        if (this.matchedLeft.length === this.ejercicioActual.options.length) {
          this.isAnswered = true;
          this.isCorrect = true;
          if (!this.ejercicioActual.calentamiento) {
            this.aciertos++;
            this.xp += 20;
          }
          this.playCorrectSound();
          this.reaccionar('feliz', FRASES.feliz);
          // Un par equivocado se perdona; dos o más cuentan como error para el repaso
          this.registrarRespuesta(this.ejercicioActual, this.fallosMatch < 2);
        }

      } else {
        this.fallosMatch++;
        this.playWrongSound();
        this.reaccionar('animando', FRASES.animando);
      }
      this.selectedLeft = null;
      this.selectedRight = null;
    }
  }

  // --- LÓGICA GENERAL DE RESPUESTA ---
  // --- ORDENAR PALABRAS ---
  // Las fichas elegidas, por su posición en la lista de piezas (puede haber palabras repetidas)
  ordenElegido: number[] = [];

  get fraseArmada(): string {
    return this.ordenElegido.map(i => this.ejercicioActual.piezas[i]).join(' ');
  }

  tocarPieza(i: number) {
    if (this.isAnswered || this.ordenElegido.includes(i)) return;
    this.ordenElegido = [...this.ordenElegido, i];
  }

  quitarPieza(pos: number) {
    if (this.isAnswered) return;
    this.ordenElegido = this.ordenElegido.filter((_, k) => k !== pos);
  }

  checkAnswer() {
    if (this.isAnswered) return;

    if (this.ejercicioActual.type === 'write' || this.ejercicioActual.type === 'fill_blank') {
      if (!this.writtenAnswer.trim()) return;
      const comparar = (t: string) => this.ejercicioActual.sinTildes ? sinTildes(normalizarRespuesta(t)) : normalizarRespuesta(t);
      this.isCorrect = comparar(this.writtenAnswer) === comparar(this.ejercicioActual.correct_answer);
      // Casi: escribió "u" donde va "ü". La primera vez no cuenta como error,
      // se avisa y se deja intentar de nuevo.
      if (!this.isCorrect && !this.avisoU && soloFaltaDieresis(this.writtenAnswer, this.ejercicioActual.correct_answer)) {
        this.avisoU = true;
        this.fraseCompanero = '¡Casi! Esta palabra lleva ü. Toca el botón ü para escribirla y vuelve a comprobar.';
        this.tonoFrase = '';
        this.reaccionar('animando');
        return;
      }
    } else if (this.ejercicioActual.type === 'multiple_choice') {
      if (!this.selectedOption) return;
      this.isCorrect = this.selectedOption === this.ejercicioActual.correct_answer;
    } else if (this.ejercicioActual.type === 'ordenar') {
      if (!this.ordenElegido.length) return;
      this.isCorrect = normalizarRespuesta(this.fraseArmada) === normalizarRespuesta(this.ejercicioActual.correct_answer);
    } else if (this.ejercicioActual.type === 'match') {
      return;
    }

    this.isAnswered = true;
    clearTimeout(this.relojPista);
    this.ofrecerPista = false;
    this.registrarRespuesta(this.ejercicioActual, this.isCorrect);

    const practica = !!this.ejercicioActual.calentamiento;
    if (this.isCorrect) {
      this.playCorrectSound();
      this.reaccionar('feliz', FRASES.feliz);
      if (!practica) {
        this.xp += 20;
        this.aciertos++;
      }
    } else {
      this.playWrongSound();
      this.reaccionar('animando', FRASES.animando);
      if (!this.modoRepaso && !practica) {
        if (this.primerIntentoGratis) {
          // Nivel 1: equivocarse la primera vez no gasta Newen; fallar la repetición sí
          if (!this.avisoPrimerIntento) {
            this.avisoPrimerIntento = true;
            this.fraseCompanero = 'Tranquilidad: en el Nivel 1, el primer intento no gasta Newen. Te la vuelvo a preguntar al final.';
          }
        } else {
          this.restarVida();
        }
      }
      const yaEstaEnRepaso = this.ejercicios.slice(this.currentIndex + 1)
        .some(e => e.id === this.ejercicioActual.id && (e.id !== null || e.question === this.ejercicioActual.question));
      if (!yaEstaEnRepaso) {
        this.ejercicios.push({ ...this.ejercicioActual, isReview: true });
      }
    }
  }

  // En el Nivel 1, una pregunta fallada por primera vez no cuesta Newen
  get primerIntentoGratis(): boolean {
    return !this.ejercicioActual?.isReview && nivelDeUnidad(Number(this.unitId)).numero === 1;
  }

  // Cuando queda 1 de Newen, el compañero avisa antes de que se acabe
  private avisarPocoNewen() {
    if (this.lives === 1 && !this.gameOver) {
      this.fraseCompanero = 'Ojo: me queda solo 1 Newen. Tómate tu tiempo y pide una pista si la necesitas.';
    }
  }

  restarVida() {
    this.lives--;
    if (this.lives <= 0) {
      this.lives = 0;
      this.gameOver = true;
      this.nextLifeInMinutes = 10;
    }

    this.http.post('/api/lose-life', {}).subscribe({
      next: (res: any) => {
        this.lives = res.lives;
        this.gems = res.gems;
        this.avisarPocoNewen();

        const userStr = localStorage.getItem('mapu_user');
        if (userStr) {
          const user = JSON.parse(userStr);
          user.lives = this.lives;
          user.gems = this.gems;
          localStorage.setItem('mapu_user', JSON.stringify(user));
        }
      },
      error: (err) => console.error('Error al restar vida:', err)
    });
  }

  nextExercise() {
    if (this.currentIndex === this.ejercicios.length - 1) {
      this.leccionTerminada = true;
      this.confeti = crearConfeti();
      this.terminarLeccion();
      return;
    }

    this.currentIndex++;
    this.ordenElegido = [];
    this.registrarAvance();
    this.avisoU = false;
    this.subirAlInicio();
    this.fraseCompanero = '';
    this.tonoFrase = '';
    this.estadoCompanero = 'quieto';
    this.selectedOption = null;
    this.writtenAnswer = '';
    this.isAnswered = false;
    this.isCorrect = false;
    this.initMatchGame();
    this.iniciarPista();
  }

  terminarLeccion() {
    if (!this.unitId && !this.modoRepaso) return;

    const guardar = this.modoRepaso
      ? this.http.post('/api/repaso/completar', { correct: this.aciertos })
      : this.http.post('/api/lessons/complete', {
          unitId: parseInt(this.unitId ?? '0', 10),
          stage: parseInt(this.stage ?? '1', 10),
          correct: this.aciertos
        });

    this.estadoGuardado = 'guardando';
    guardar.subscribe({
      next: (res: any) => {
        this.estadoGuardado = 'listo';
        marcarPracticaDeHoy();
        // Por si ya se volvió al mapa antes de que terminara de guardarse
        window.dispatchEvent(new CustomEvent('kimanke:avance-guardado'));
        this.xp = res.xp;
        this.streak = res.streak;
        this.gems = res.gems;
        this.xpGanado = res.xpGanado;
        this.gemasGanadas = res.gemasGanadas;
        const userStr = localStorage.getItem('mapu_user');
        if (userStr) {
          const user = JSON.parse(userStr);
          user.xp = res.xp;
          user.streak = res.streak;
          user.gems = res.gems;
          localStorage.setItem('mapu_user', JSON.stringify(user));
        }
      },
      error: (err) => {
        console.error('Error al guardar la lección:', err);
        this.estadoGuardado = 'error';
      }
    });
  }

  comprarVidas() {
    this.http.post('/api/buy-lives', {}).subscribe({
      next: (res: any) => {
        this.lives = res.lives;
        this.gems = res.gems;
        this.gameOver = false;

        const userStr = localStorage.getItem('mapu_user');
        if (userStr) {
          const user = JSON.parse(userStr);
          user.lives = this.lives;
          user.gems = this.gems;
          localStorage.setItem('mapu_user', JSON.stringify(user));
        }
      },
      error: (err) => {
        this.avisar(err.error?.error || 'Error al comprar vidas');
      }
    });
  }

  ganarVidaPracticando() {
    this.http.post('/api/earn-life', {}).subscribe({
      next: (res: any) => {
        this.lives = res.lives;
        this.gems = res.gems;
        this.gameOver = false;

        const userStr = localStorage.getItem('mapu_user');
        if (userStr) {
          const user = JSON.parse(userStr);
          user.lives = this.lives;
          user.gems = this.gems;
          localStorage.setItem('mapu_user', JSON.stringify(user));
        }

        this.reiniciarLeccion();
      },
      error: (err) => this.avisar(err.error?.error || 'Error al ganar vida')
    });
  }

  regenerarVidasPorTiempo() {
    if (!this.username) return;

    this.http.post('/api/regen-lives', {}).subscribe({
      next: (res: any) => {
        if (res.regened > 0) {
          this.lives = res.lives;
          // Si la pantalla de "sin Newen" estaba por el valor anterior, se quita
          if (this.lives > 0) this.gameOver = false;
          if (this.lives < 5) {
            this.nextLifeInMinutes = 10;
          }
          const userStr = localStorage.getItem('mapu_user');
          if (userStr) {
            const user = JSON.parse(userStr);
            user.lives = this.lives;
            localStorage.setItem('mapu_user', JSON.stringify(user));
          }
        }
      },
      error: (err) => console.error('Error al regenerar vidas:', err)
    });
  }

  reiniciarLeccion() {
    this.ejercicios = this.shuffleArray([...this.ejercicios]).map(ejercicio => {
      if (Array.isArray(ejercicio.options)) {
        ejercicio.options = this.shuffleArray([...ejercicio.options]);
      }
      return ejercicio;
    });

    this.currentIndex = 0;
    this.aciertos = 0;
    this.leccionTerminada = false;
    this.gameOver = false;
    this.selectedOption = null;
    this.writtenAnswer = '';
    this.isAnswered = false;
    this.isCorrect = false;
    this.initMatchGame();
    this.iniciarPista();
  }

  // Mezcla las dos columnas del emparejado y evita que una palabra quede en la
  // misma fila que su pareja, porque así el ejercicio se resolvería mirando de lado.
  mezclarSinCoincidencias(items: any[]): { izq: any[]; der: any[] } {
    const izq = this.shuffleArray([...items]);
    let der = this.shuffleArray([...items]);

    const hayCoincidencia = () => izq.some((x, i) => x.mapuche === der[i].mapuche);

    if (items.length > 1) {
      for (let intento = 0; intento < 50 && hayCoincidencia(); intento++) {
        der = this.shuffleArray([...items]);
      }
      // Respaldo muy improbable: desplazar una fila
      if (hayCoincidencia()) {
        der = izq.map((_, i) => izq[(i + 1) % izq.length]);
      }
    }
    return { izq, der };
  }

  shuffleArray(array: any[]) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }

  // --- SONIDOS (Web Audio API) ---
  playCorrectSound() {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }

  playWrongSound() {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  }

}