import { Component, OnInit } from '@angular/core';
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
import { CompaneroComponent } from '../companero/companero.component';
import { EstadoCompanero, FRASES, PiezaConfeti, crearConfeti, fraseAlAzar } from '../companero';
import { enlaceReporte } from '../version';
import { IconoRecursoComponent } from '../icono-recurso/icono-recurso.component';
import { IdRecurso, Recurso, recurso } from '../recursos';
import { LETRAS_ESPECIALES, nombreGrafemario, normalizarRespuesta } from '../escritura';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonProgressBar, IonBackButton, IonInput, IonFooter, CompaneroComponent, IconoRecursoComponent
  ]
})
export class HomePage implements OnInit {
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
  gemasGanadas = 0;

  letrasEspeciales = LETRAS_ESPECIALES;

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

  comenzar() {
    this.mostrarPortada = false;
    this.fraseCompanero = fraseAlAzar(FRASES.inicio);
    this.tonoFrase = '';
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
    return enlaceReporte(
      `Unidad ${this.unitId} · Etapa ${this.stage} · Ejercicio #${e.id}\nPregunta: ${e.question}\nRespuesta esperada: ${e.correct_answer ?? '(emparejar)'}`
    );
  }

  get grafemarioActual(): string {
    return nombreGrafemario(this.ejercicioActual?.grafemario);
  }

  // Agrega una letra que no está en el teclado (por ejemplo la ü)
  insertarLetra(letra: string) {
    if (this.isAnswered) return;
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

          // Si las vidas reales son 0, mostramos Game Over
          if (this.lives <= 0) {
            this.gameOver = true;
          }

          // 3. Regenerar vidas si pasó tiempo suficiente
          this.regenerarVidasPorTiempo();
        },
        error: (err) => console.error('Error al cargar el usuario desde el backend:', err)
      });
    }

    this.unitId = this.route.snapshot.paramMap.get('unitId');
    this.stage = this.route.snapshot.paramMap.get('stage');
    const estado = history.state ?? {};
    this.tituloUnidad = estado.tituloUnidad ?? '';
    this.tituloEtapa = estado.tituloEtapa ?? '';

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

    // Cargar Ejercicios
    this.cargarEjercicios();
  }

  cargarEjercicios() {
    if (!this.unitId) return;
    this.loading = true;
    this.errorCarga = false;
    this.http.get<any[]>(`/api/exercises?unitId=${this.unitId}&stage=${this.stage}`).subscribe({
      next: (data) => {
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
        this.loading = false;
        this.initMatchGame();
      },
      error: (err) => {
        console.error('Error al conectar con el backend:', err);
        this.errorCarga = true;
        this.loading = false;
      }
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
    if (!this.isAnswered) {
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
          this.aciertos++;
          this.xp += 20;
          this.playCorrectSound();
          this.reaccionar('feliz', FRASES.feliz);
        }

      } else {
        this.playWrongSound();
        this.reaccionar('animando', FRASES.animando);
      }
      this.selectedLeft = null;
      this.selectedRight = null;
    }
  }

  // --- LÓGICA GENERAL DE RESPUESTA ---
  checkAnswer() {
    if (this.isAnswered) return;

    if (this.ejercicioActual.type === 'write' || this.ejercicioActual.type === 'fill_blank') {
      if (!this.writtenAnswer.trim()) return;
      this.isCorrect = normalizarRespuesta(this.writtenAnswer) === normalizarRespuesta(this.ejercicioActual.correct_answer);
    } else if (this.ejercicioActual.type === 'multiple_choice') {
      if (!this.selectedOption) return;
      this.isCorrect = this.selectedOption === this.ejercicioActual.correct_answer;
    } else if (this.ejercicioActual.type === 'match') {
      return;
    }

    this.isAnswered = true;

    if (this.isCorrect) {
      this.playCorrectSound();
      this.reaccionar('feliz', FRASES.feliz);
      this.xp += 20;
      this.aciertos++;
    } else {
      this.playWrongSound();
      this.reaccionar('animando', FRASES.animando);
      this.restarVida();
      const yaEstaEnRepaso = this.ejercicios.slice(this.currentIndex + 1).some(e => e.id === this.ejercicioActual.id);
      if (!yaEstaEnRepaso) {
        this.ejercicios.push({ ...this.ejercicioActual, isReview: true });
      }
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
    this.fraseCompanero = '';
    this.tonoFrase = '';
    this.estadoCompanero = 'quieto';
    this.selectedOption = null;
    this.writtenAnswer = '';
    this.isAnswered = false;
    this.isCorrect = false;
    this.initMatchGame();
  }

  terminarLeccion() {
    if (!this.unitId) return;

    this.http.post('/api/lessons/complete', {
      unitId: parseInt(this.unitId, 10),
      stage: parseInt(this.stage ?? '1', 10),
      correct: this.aciertos
    }).subscribe({
      next: (res: any) => {
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
      error: (err) => console.error('Error al guardar la lección:', err)
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