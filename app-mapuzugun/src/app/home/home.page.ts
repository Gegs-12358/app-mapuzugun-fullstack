import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // <-- NUEVO IMPORT para el input
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router'; 
import { 
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, 
  IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, 
  IonProgressBar, IonBackButton, IonInput 
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, // <-- Agregamos FormsModule
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, 
    IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, 
    IonProgressBar, IonBackButton, IonInput
  ]
})
export class HomePage implements OnInit {
  ejercicios: any[] = [];
  currentIndex = 0;
  loading = true;
  xp = 120;
  streak = 3;
  lives = 5;
  gems = 500;
  username = '';
  
  selectedOption: string | null = null;
  writtenAnswer = ''; // <-- NUEVA variable para la escritura
  
  isAnswered = false;
  isCorrect = false;
  leccionTerminada = false;
  gameOver = false;
  unitId: string | null = null;
  notaCultural: string = "";

  constructor(private http: HttpClient, private route: ActivatedRoute) {}

  get ejercicioActual() {
    return this.ejercicios[this.currentIndex];
  }

  get progreso() {
    if (this.ejercicios.length === 0) return 0;
    return this.currentIndex / this.ejercicios.length;
  }

  ngOnInit() {
    const userStr = localStorage.getItem('mapu_user');
    if (userStr) {
      const user = JSON.parse(userStr);
      this.username = user.username;
      this.xp = user.xp;
      this.streak = user.streak;
      this.lives = user.lives !== undefined ? user.lives : 5;
      this.gems = user.gems !== undefined ? user.gems : 500;
    }

    this.unitId = this.route.snapshot.paramMap.get('unitId');

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
    if (this.isAnswered) return;

    // Evaluamos si es de escritura o de selección
    if (this.ejercicioActual.type === 'write') {
      if (!this.writtenAnswer.trim()) return; // No dejar avanzar si está vacío
      
      // Comparamos ignorando mayúsculas, minúsculas y espacios extra
      this.isCorrect = this.writtenAnswer.trim().toLowerCase() === this.ejercicioActual.correct_answer.trim().toLowerCase();
    } else {
      if (!this.selectedOption) return;
      this.isCorrect = this.selectedOption === this.ejercicioActual.correct_answer;
    }
    
    this.isAnswered = true;
    
    if (this.isCorrect) {
      this.xp += 20;
    } else {
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
    }
    this.http.post('http://localhost:3000/api/lose-life', { username: this.username }).subscribe({
      next: (res: any) => {
        this.lives = res.lives;
        this.gems = res.gems;
      },
      error: (err) => console.error('Error al restar vida:', err)
    });
  }

  nextExercise() {
    if (this.lives <= 0) return;
    
    if (this.currentIndex === this.ejercicios.length - 1) {
      this.leccionTerminada = true;
      this.guardarProgreso();
      return;
    }

    this.currentIndex++;
    this.selectedOption = null;
    this.writtenAnswer = ''; // <-- Limpiamos la caja de texto
    this.isAnswered = false;
    this.isCorrect = false;
  }

  guardarProgreso() {
    this.http.post('http://localhost:3000/api/update-xp', {
      username: this.username,
      xp: this.xp
    }).subscribe({
      next: (res) => console.log('Progreso guardado:', res),
      error: (err) => console.error('Error al guardar progreso:', err)
    });
  }

  comprarVidas() {
    this.http.post('http://localhost:3000/api/buy-lives', { username: this.username }).subscribe({
      next: (res: any) => {
        this.lives = res.lives;
        this.gems = res.gems;
        this.gameOver = false; 
      },
      error: (err) => {
        alert(err.error.error || 'Error al comprar vidas');
      }
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
    this.gameOver = false;
    this.selectedOption = null;
    this.writtenAnswer = '';
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