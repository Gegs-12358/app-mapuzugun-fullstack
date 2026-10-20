import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
    CommonModule, FormsModule, RouterLink,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, 
    IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, 
    IonProgressBar, IonBackButton, IonInput
  ]
})
export class HomePage implements OnInit {
  ejercicios: any[] = [];
  currentIndex = 0;
  loading = true;
  
  // Variables del juego
  xp = 120;
  streak = 3;
  lives = 5;
  gems = 500;
  username = '';
  
  // Variables de estado
  selectedOption: string | null = null;
  writtenAnswer = ''; 
  isAnswered = false;
  isCorrect = false;
  leccionTerminada = false;
  gameOver = false;
  unitId: string | null = null;
  notaCultural: string = "";

  // Variables para el juego de emparejamiento (Match)
  matchLeftColumn: any[] = [];
  matchRightColumn: any[] = [];
  selectedLeft: any = null;
  selectedRight: any = null;
  matchedLeft: string[] = [];
  matchedRight: string[] = [];

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
      
      // 1. Mostramos los datos del localStorage rápido para que no parpadee
      this.xp = user.xp;
      this.streak = user.streak;
      this.lives = user.lives !== undefined ? user.lives : 5;
      this.gems = user.gems !== undefined ? user.gems : 500;

      // 2. Consultamos la base de datos para tener los datos reales (sincronización)
      this.http.get(`http://localhost:3000/api/user/${this.username}`).subscribe({
        next: (userData: any) => {
          this.xp = userData.xp;
          this.streak = userData.streak;
          this.lives = userData.lives;
          this.gems = userData.gems;
          
          // Actualizamos el localStorage con los datos frescos de la BD
          localStorage.setItem('mapu_user', JSON.stringify(userData));

          // Si las vidas reales son 0, mostramos Game Over
          if (this.lives <= 0) {
            this.gameOver = true;
          }
        },
        error: (err) => console.error('Error al cargar el usuario desde el backend:', err)
      });
    }

    this.unitId = this.route.snapshot.paramMap.get('unitId');

    // NOTAS CULTURALES
    if (this.unitId === '1') {
      this.notaCultural = "El Kütral (fuego) y el Newen (fuerza vital) son conceptos centrales. Los saludos buscan mantener el equilibrio de esa energía.";
    } else if (this.unitId === '2') {
      this.notaCultural = "La presentación no es solo decir tu nombre, sino reconocer tu origen. El Kimün (conocimiento) se comparte de generación en generación.";
    } else if (this.unitId === '3') {
      this.notaCultural = "En la cultura mapuche, la familia (Ruka) es el núcleo donde se resguarda la tradición y el Foye (Canelo) es el árbol que une el cielo con la tierra.";
    } else if (this.unitId === '4') {
      this.notaCultural = "El Foye (Canelo) es el árbol sagrado, el eje del cosmos. Las plantas no solo curan el cuerpo, sino que mantienen el equilibrio espiritual.";
    } else if (this.unitId === '5') {
      this.notaCultural = "El cosmos mapuche se divide en Wenu Mapu (arriba), Nag Mapu (tierra) y Minche Mapu (abajo). Todo está conectado por el Newen.";
    }

    // Cargar Ejercicios
    if (this.unitId) {
      this.http.get<any[]>(`http://localhost:3000/api/exercises?unitId=${this.unitId}`).subscribe({
        next: (data) => {
          this.ejercicios = this.shuffleArray(data).map(ejercicio => {
            if (typeof ejercicio.options === 'string') {
              try { ejercicio.options = JSON.parse(ejercicio.options); } catch(e){}
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
          this.loading = false;
        }
      });
    }
  }

  initMatchGame() {
    if (this.ejercicioActual && this.ejercicioActual.type === 'match') {
      this.matchLeftColumn = this.shuffleArray([...this.ejercicioActual.options]);
      this.matchRightColumn = this.shuffleArray([...this.ejercicioActual.options]);
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
          this.xp += 20; 
        }
      }
      this.selectedLeft = null;
      this.selectedRight = null;
    }
  }

  // --- LÓGICA GENERAL DE RESPUESTA ---
  checkAnswer() {
    if (this.isAnswered) return;

    if (this.ejercicioActual.type === 'write') {
      if (!this.writtenAnswer.trim()) return; 
      this.isCorrect = this.writtenAnswer.trim().toLowerCase() === this.ejercicioActual.correct_answer.trim().toLowerCase();
    } else if (this.ejercicioActual.type === 'multiple_choice') {
      if (!this.selectedOption) return;
      this.isCorrect = this.selectedOption === this.ejercicioActual.correct_answer;
    } else if (this.ejercicioActual.type === 'match') {
       return; 
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
        
        // Actualizamos localStorage al perder vida
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
    if (this.lives <= 0) {
      this.gameOver = true; 
      return;
    }
    
    if (this.currentIndex === this.ejercicios.length - 1) {
      this.leccionTerminada = true;
      this.guardarProgreso();
      return;
    }

    this.currentIndex++;
    this.selectedOption = null;
    this.writtenAnswer = ''; 
    this.isAnswered = false;
    this.isCorrect = false;
    this.initMatchGame(); 
  }

  guardarProgreso() {
    this.http.post('http://localhost:3000/api/update-xp', {
      username: this.username,
      xp: this.xp
    }).subscribe({
      next: (res) => {
        console.log('Progreso guardado:', res);
        // Actualizamos localStorage al ganar XP
        const userStr = localStorage.getItem('mapu_user');
        if (userStr) {
          const user = JSON.parse(userStr);
          user.xp = this.xp;
          localStorage.setItem('mapu_user', JSON.stringify(user));
        }
      },
      error: (err) => console.error('Error al guardar progreso:', err)
    });
  }

  comprarVidas() {
    this.http.post('http://localhost:3000/api/buy-lives', { username: this.username }).subscribe({
      next: (res: any) => {
        this.lives = res.lives;
        this.gems = res.gems;
        this.gameOver = false; 

        // Actualizamos localStorage al comprar vidas
        const userStr = localStorage.getItem('mapu_user');
        if (userStr) {
          const user = JSON.parse(userStr);
          user.lives = this.lives;
          user.gems = this.gems;
          localStorage.setItem('mapu_user', JSON.stringify(user));
        }
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
    this.initMatchGame();
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