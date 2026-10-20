¡Me alegra mucho que te hayan gustado las ideas! Aquí tienes la **Bitácora de Desarrollo actualizada**, incluyendo todo lo que construimos hoy (el mapa con candados, los tipos de ejercicios, la estética mapuche, las notas culturales específicas) y la sección de **Próximos Pasos (Roadmap)** ampliada con todas las recomendaciones que te gustaron.

Copia todo el texto de abajo, pégalo en tu archivo `docs/BITACORA_DESARROLLO.md` (reemplazando el contenido anterior) y guarda.

---

```markdown
# 📘 Bitácora de Desarrollo y Arquitectura: App Mapuzugun

Este documento detalla el proceso de construcción, desde cero, de la aplicación Full-Stack para el aprendizaje y revitalización del mapuzugun. Sirve como registro técnico de las decisiones tomadas, las tecnologías implementadas y los desafíos superados.

---

## 🏗️ 1. Arquitectura del Sistema

El proyecto utiliza una arquitectura desacoplada (Cliente-Servidor), garantizando escalabilidad y seguridad:

*   **Frontend:** Ionic 8 + Angular 18 (Standalone Components). Diseñado para ser una PWA y posteriormente compilarse a Android/iOS.
*   **Backend:** Node.js + Express. Actúa como API REST para intermediar entre la base de datos y el cliente.
*   **Base de Datos:** PostgreSQL (Gestionada mediante pgAdmin).
*   **Seguridad:** Encriptación de contraseñas con `bcrypt`.

**Estructura de carpetas:**
```text
/mapuche
  ├── /backend         # API en Node.js (server.js)
  ├── /app-mapuzugun   # Aplicación Frontend (Ionic/Angular)
  ├── /docs            # Documentación (incluye esta bitácora)
  ├── .gitignore       # Exclusión de node_modules y variables de entorno
  └── database.sql     # Script de respaldo y creación de la base de datos
```

## 🗄️ 2. Fase 1: Base de Datos (PostgreSQL)

Se diseñó una base de datos relacional para soportar el contenido dinámico y el progreso de los usuarios.

**Esquema de Tablas:**
*   **`users`**: Almacena credenciales y progreso.
    *   `id` (Serial), `username` (Varchar), `password` (Varchar encriptado).
    *   `xp` (Entero), `streak` (Entero), `lives` (Entero), `gems` (Entero).
    *   `last_life_regen` (Timestamp) para la regeneración automática de vidas.
*   **`units`**: Las unidades temáticas del curso.
    *   `id` (Serial), `title` (Varchar).
*   **`exercises`**: Los ejercicios de cada unidad.
    *   `id` (Serial), `unit_id` (Llave foránea), `type` (Varchar: 'multiple_choice', 'write', 'match').
    *   `question` (Texto), `correct_answer` (Varchar), `options` (JSONB), `audio_url` (Varchar).
    *   `cultural_note` (Texto) para notas específicas por palabra.
*   **`user_progress`**: Registra el avance del usuario por las unidades.
    *   `id` (Serial), `username` (FK), `unit_id` (FK), `completed` (Boolean), `score` (Entero).

*(Nota: Todo el esquema y los datos iniciales están exportados en el archivo `database.sql` en la raíz del proyecto).*

## ⚙️ 3. Fase 2: Backend (Node.js + Express)

El backend expone una serie de endpoints para manejar la lógica de negocio.

**Dependencias principales:** `express`, `pg`, `cors`, `bcrypt`.

**Endpoints Desarrollados:**
*   `POST /api/register`: Registro de usuarios con hash de contraseña.
*   `POST /api/login`: Validación de credenciales y entrega de sesión.
*   `GET /api/units`: Obtiene el listado de unidades.
*   `GET /api/exercises?unitId=X`: Obtiene los ejercicios filtrados por unidad.
*   `POST /api/update-xp`: Actualiza el puntaje (Kimün) del usuario.
*   `POST /api/lose-life`: Resta un Newen (vida) en caso de error.
*   `POST /api/buy-lives`: Compra 5 Newen con Llankas (gemas).
*   `POST /api/earn-life`: Gana 1 Newen practicando.
*   `POST /api/regen-lives`: Regenera Newen por tiempo (1 cada 10 min).
*   `POST /api/progress`: Guarda el progreso de una unidad completada.
*   `GET /api/progress/:username`: Obtiene el progreso de un usuario.

## 📱 4. Fase 3: Frontend (Ionic + Angular)

Se diseñó una interfaz con identidad visual propia, inspirada en la cosmovisión mapuche (Aukanaw).

**Identidad Visual:**
*   **Colores:** Índigo profundo (#23406B), Terracota (#A64B2A), Ocre (#D4A017), Crema (#F4EBD8).
*   **Tipografía:** *Bitter* (títulos, sensación artesanal) y *Lora* (texto, serif cálido).
*   **Fondo:** Mapa cultural de la Patagonia con un filtro crema para mantener legibilidad.

**Pantallas Desarrolladas:**
1.  **Login / Registro (`login.page`):** Permite crear cuentas y guarda la sesión en `localStorage`.
2.  **Menú de Unidades (`units.page`):** 
    *   Visualización tipo "Camino" (Rüpü) con estrellas de 8 puntas (Flor del Foye).
    *   Sistema de progreso: Unidades completadas (✓ verde), actual (pulso dorado), bloqueadas (🔒 gris).
    *   Barra superior con contador de unidades completadas.
3.  **Lección (`home.page`):** El núcleo de la app.
    *   Barra superior con Kütral (🔥 racha), Kimün (🏵️ XP), Llanka (🟢 gemas) y Newen (🌿 vidas).
    *   **Tres tipos de ejercicios:** Selección múltiple, escritura (input de texto) y emparejamiento (match de columnas).
    *   **Notas Culturales Dinámicas:** La nota general de la unidad aparece antes de responder; al responder, se revela la nota específica de la palabra (ej. *"Weza es lo que desequilibra..."*).
    *   **Game Over:** Si el Newen llega a 0, el usuario puede recuperarlo practicando (+1), comprando con Llankas (+5) o esperando regeneración por tiempo.

## 🐙 5. Fase 4: Control de Versiones (Git + GitHub)

El proyecto se gestiona con Git y se aloja en el repositorio `app-mapuzugun-fullstack`.

**Desafíos superados (Lecciones de Ingeniería):**
*   **Configuración de Node.js en Windows:** Se solucionó el problema de reconocimiento de comandos agregando la ruta al PATH del sistema.
*   **Conflicto de versiones (Angular 22 vs Ionic):** Se degradaron las versiones a Angular 18 e Ionic 8 para garantizar compatibilidad con Standalone Components.
*   **Archivos Basura en Git:** Se implementó un `.gitignore` estricto. Se usó `git rm -r -f --cached .` para limpiar el historial previo y `git push -f` para forzar el repositorio limpio.

## ⚖️ 6. Enfoque Ético

Alineado con el documento fundacional del proyecto:
*   **No comercial:** La app es un apoyo educativo.
*   **Revisión comunitaria:** Las palabras y audios deben ser validados por hablantes y kimeltuchefe antes de su publicación oficial.
*   **Respeto a la variante:** Preparado para soportar distintos grafemarios (Azümchefe, Raguileo, etc.).
*   **Precisión conceptual:** Se diferencia entre *Mongen* (vida) y *Newen* (fuerza vital), educando al usuario en la cosmovisión mapuche.

## 🚀 7. Próximos Pasos (Roadmap de Mejoras)

Este es el plan de evolución de la app, priorizado por impacto pedagógico, retención de usuarios y experiencia técnica.

### 🎯 1. Lo más urgente (Pedagógico)
*   **Ejercicio de Micrófono (Hablar):** El usuario graba su voz y la app la compara. Es clave para una lengua oral.
*   **Unidad de Gramática Explícita:** Enseñar a formar oraciones simples (ej. *"Inche tañi üy..."*).
*   **Frases Completas:** Introducir oraciones completas en lugar de solo palabras aisladas (ej. *"Mari mari, kümelkülen"*).
*   **Modo Repaso (Repetición Espaciada):** Sección aparte para practicar solo las palabras falladas.
*   **Audio Real:** Reemplazar audios genéricos por grabaciones de hablantes nativos (previo consentimiento).

### 🎮 2. Gamificación y Retención
*   **Logros / Insignias:** Ej. "Primer Mari mari", "Racha de 7 días", "1000 de Kimün".
*   **Perfil de Usuario:** Pantalla con estadísticas, logros y selección de avatar (animal de poder).
*   **Tienda Ampliada:** Usar Llankas para comprar "doble Kimün por 1 día", avatares o temas.
*   **Sonidos de Acierto/Error:** Feedback auditivo (un "ding" al acertar, "buzz" al fallar).
*   **Temporizador de Próxima Vida:** Mostrar "Próximo Newen en 7:32" en la pantalla de Game Over.
*   **Ligas Semanales:** Competir con otros usuarios por Kimün (requiere backend más complejo con rankings).

### 🛠️ 3. Técnico y de Experiencia
*   **Modo Oscuro:** Adaptar la paleta de colores para entornos con poca luz.
*   **PWA Instalable (Offline):** Configurar el Service Worker para funcionar sin internet.
*   **Despliegue en la Nube:** Subir Backend (Render/Railway) y BD (Supabase) para independencia del localhost.

### 📚 4. Contenido y Comunidad
*   **Más Unidades Temáticas:** Agregar "Ropa", "Colores avanzados", "Clima", "Direcciones".
*   **Sección de "Historia" (Nütram):** Un cuento corto en mapuzugun con traducción para practicar lectura.
*   **Contribución Comunitaria:** Espacio para que hablantes propongan nuevas palabras o correcciones (requiere panel de admin).