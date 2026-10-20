# App Mapuzugun - Aprende y practica la lengua

Aplicación web (PWA) y móvil full-stack diseñada para el aprendizaje y la revitalización digital del mapuzugun. Creada para ofrecer una ruta de aprendizaje desde cero a través de lecciones cortas, práctica auditiva y ejercicios interactivos.

*Nota: El nombre definitivo de la aplicación se definirá en conjunto con los hablantes y comunidades colaboradoras.*

## 🛠️ Tecnologías Utilizadas

Este proyecto fue construido utilizando una arquitectura moderna separada en Frontend y Backend:

*   **Frontend:** Ionic 8 + Angular 18 (Standalone Components)
*   **Backend:** Node.js + Express
*   **Base de Datos:** PostgreSQL (gestionada mediante pgAdmin)
*   **Estilos:** SCSS / Ionic UI Components
*   **Audio:** Reproducción nativa desde assets locales

## ✨ Características Actuales

*   **Lecciones cortas:** Interfaz amigable con preguntas de selección múltiple.
*   **Práctica auditiva:** Botón para escuchar la pronunciación (grabaciones de hablantes).
*   **Motivación (Gamificación):** Sistema de puntos de experiencia (XP) y rachas diarias.
*   **Preguntas aleatorias:** Las opciones de respuesta y el orden de las preguntas se mezclan en cada intento.
*   **Persistencia de datos:** El progreso del usuario (XP) se guarda en la base de datos PostgreSQL para que no se pierda al recargar.

## 🚀 Cómo ejecutar este proyecto localmente

Sigue estos pasos para levantar el proyecto en tu computadora:

### 1. Requisitos previos
*   Tener instalado [Node.js](https://nodejs.org/).
*   Tener instalado PostgreSQL y pgAdmin.
*   Tener instalado Ionic CLI (`npm install -g @ionic/cli`).

### 2. Configurar la Base de Datos
1. Abre pgAdmin y crea una base de datos llamada `mapuzugun_db`.
2. Ejecuta el siguiente script SQL para crear las tablas necesarias:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  xp INT DEFAULT 120,
  streak INT DEFAULT 3
);

CREATE TABLE exercises (
  id SERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  correct_answer VARCHAR(100) NOT NULL,
  options JSONB NOT NULL,
  audio_url VARCHAR(255)
);