import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router'; 
import { RouterLink } from '@angular/router'; // <-- IMPORTANTE para que funcione el botón
import { 
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, 
  IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, 
  IonProgressBar, IonBackButton 
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink, // <-- Agregado aquí
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, 
    IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, 
    IonProgressBar, IonBackButton
  ]
})
export class HomePage implements OnInit {
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
  unitId: string | null = null;
  notaCultural: string = ""; // <-- Nueva variable para el texto

  constructor(private http: HttpClient, private route: ActivatedRoute) {}

  get ejercicioActual() {
    return this.ejercicios[this.currentIndex];
  }

  get progreso() {
    if (this.ejercicios.length === 0) return 0;
    return this.currentIndex / this.ejercicios.length;
  }

  ngOnInit() {
    this.unitId = this.route.snapshot.paramMap.get('unitId');

    // Asignamos una nota cultural según la unidad
    if (this.unitId === '1') this.notaCultural = "Nota cultural: Los saludos son una muestra de respeto.";
    else if (this.unitId === '2') this.notaCultural = "Nota cultural: Presentarse es el primer paso para crear lazos.";
    else if (this.unitId === '3') this.notaCultural = "Nota cultural: La familia es el núcleo fundamental de la cultura mapuche.";

    if (this.unitId) {
      this.http.get<any[]>(`http://localhost:3000/api/exercises?unitId=${this.unitId}`).subscribe({
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
    }

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
    const audio = new Audio('assets/audio/mari_mari.mp3');
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
      this.guardarProgreso();
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