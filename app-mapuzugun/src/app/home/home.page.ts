import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { 
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, 
  IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonProgressBar 
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, 
    IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonProgressBar
  ]
})
export class HomePage implements OnInit {
  // Variables de la app (Solo declaradas UNA vez)
  ejercicios: any[] = [];
  currentIndex = 0;
  loading = true;
  xp = 120;
  streak = 3;
  username = 'estudiante1';
  selectedOption: string | null = null;
  isAnswered = false;
  isCorrect = false;
  leccionTerminada = false;

  constructor(private http: HttpClient) {}

  get ejercicioActual() {
    return this.ejercicios[this.currentIndex];
  }

  get progreso() {
    if (this.ejercicios.length === 0) return 0;
    return this.currentIndex / this.ejercicios.length;
  }

  ngOnInit() {
    // 1. Cargamos los ejercicios
    this.http.get<any[]>('http://localhost:3000/api/exercises').subscribe({
      next: (data) => {
        this.ejercicios = this.shuffleArray(data).map(ejercicio => {
          if (Array.isArray(ejercicio.options)) {
            ejercicio.options = this.shuffleArray([...ejercicio.options]);
          }
          return ejercicio;
        });
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al conectar con el backend:', err);
        this.loading = false;
      }
    });

    // 2. Cargamos el perfil del usuario (XP y Racha reales desde PostgreSQL)
    this.http.get(`http://localhost:3000/api/user/${this.username}`).subscribe({
      next: (user: any) => {
        this.xp = user.xp;
        this.streak = user.streak;
      },
      error: (err) => {
        console.error('Error al cargar el usuario:', err);
      }
    });
  }

  playAudio() {
    const audio = new Audio('assets/audio/mari_mari.wav'); // O .mp3 según tengas
    audio.play().catch(e => console.error('Error al reproducir el audio:', e));
  }

  selectOption(option: string) {
    if (!this.isAnswered) {
      this.selectedOption = option;
    }
  }

  checkAnswer() {
    if (!this.selectedOption || this.isAnswered) return;
    
    this.isAnswered = true;
    this.isCorrect = this.selectedOption === this.ejercicioActual.correct_answer;
    
    if (this.isCorrect) {
      this.xp += 20;
    }
  }

  nextExercise() {
    if (this.currentIndex === this.ejercicios.length - 1) {
      this.leccionTerminada = true;
      this.guardarProgreso(); // Guarda el XP final en la base de datos
      return;
    }

    this.currentIndex++;
    this.selectedOption = null;
    this.isAnswered = false;
    this.isCorrect = false;
  }

  guardarProgreso() {
    this.http.post('http://localhost:3000/api/update-xp', {
      username: this.username,
      xp: this.xp
    }).subscribe({
      next: (res) => console.log('Progreso guardado en la nube:', res),
      error: (err) => console.error('Error al guardar progreso:', err)
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
    this.leccionTerminada = false;
    this.selectedOption = null;
    this.isAnswered = false;
    this.isCorrect = false;
    // Nota: No reiniciamos this.xp aquí para mantener el XP real del usuario
  }

  shuffleArray(array: any[]) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
  }
}