Paso 1: Crear el archivo
En VS Code, dentro de la carpeta principal (mapuche), crea una nueva carpeta llamada docs.

Dentro de docs, crea un archivo llamado BITACORA_DESARROLLO.md.

Copia y pega el siguiente contenido:

markdown
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
  ├── /docs            # Documentación
  ├── .gitignore       # Exclusión de node_modules y variables de entorno
  └── database.sql     # Script de respaldo y creación de la base de datos
🗄️ 2. Fase 1: Base de Datos (PostgreSQL)
Se diseñó una base de datos relacional para soportar el contenido dinámico y el progreso de los usuarios.

Esquema de Tablas
users: Almacena las credenciales y el progreso.

id (Serial), username (Varchar), password (Varchar encriptado).

xp (Entero), streak (Entero), lives (Entero), gems (Entero).

units: Las unidades temáticas del curso.

id (Serial), title (Varchar).

exercises: Los ejercicios de cada unidad.

id (Serial), unit_id (Llave foránea), question (Texto), correct_answer (Varchar), options (JSONB), audio_url (Varchar).

(Nota: Todo el esquema y los datos iniciales están exportados en el archivo database.sql en la raíz del proyecto).

⚙️ 3. Fase 2: Backend (Node.js + Express)
El backend expone una serie de endpoints para manejar la lógica de negocio.

Dependencias principales:
express: Servidor web.

pg: Conexión a PostgreSQL.

cors: Permite peticiones cruzadas desde el frontend.

bcrypt: Encriptación de contraseñas.

Endpoints Desarrollados:
POST /api/register: Registro de usuarios con hash de contraseña.

POST /api/login: Validación de credenciales y entrega de sesión (XP, vidas, etc.).

GET /api/units: Obtiene el listado de unidades disponibles.

GET /api/exercises?unitId=X: Obtiene los ejercicios filtrados por unidad.

POST /api/update-xp: Actualiza el puntaje del usuario al finalizar una lección.

POST /api/lose-life: Resta una vida en caso de error del usuario.

📱 4. Fase 3: Frontend (Ionic + Angular)
Se diseñó una interfaz con identidad visual propia (Colores: Azul profundo #1F3A60, Terracota #C47B66, Beige #F5EBE1).

Pantallas Desarrolladas:
Login / Registro (login.page): Permite crear cuentas y guardar la sesión en el localStorage.

Menú de Unidades (units.page): Lista las unidades y saluda al usuario por su nombre. Incluye botón de cerrar sesión.

Lección (home.page): El núcleo de la app.

Barra superior con Racha (🔥), Gemas (💎) y Vidas (❤️).

Barra de progreso dinámica.

Reproductor de audio nativo.

Lógica de Gamificación: Si el usuario falla, pierde un corazón y se actualiza en la base de datos. Si llega a 0, aparece una pantalla de "Game Over".

Lógica de Juego Implementada:
Aleatoriedad: Se implementó el algoritmo de Fisher-Yates para mezclar las opciones de respuesta y las preguntas en cada intento, evitando la memorización posicional.

Notas Culturales Dinámicas: El texto de respaldo cambia según el ID de la unidad (Saludos, Familia, etc.).

🐙 5. Fase 4: Control de Versiones (Git + GitHub)
El proyecto se gestiona con Git y se aloja en el repositorio app-mapuzugun-fullstack.

Desafíos superados (Lecciones de Ingeniería):
Configuración de Node.js en Windows: Se solucionó el problema de reconocimiento de comandos (npm no se reconoce) agregando la ruta al PATH del sistema.

Conflicto de versiones (Angular 22 vs Ionic): Se degradaron las versiones a Angular 18 e Ionic 8 para garantizar la compatibilidad con Standalone Components.

Archivos Basura en Git: Se implementó un .gitignore estricto para evitar subir la carpeta node_modules y .angular/cache. Se usó git rm -r -f --cached . para limpiar el historial previo y git push -f para forzar el repositorio limpio.

⚖️ 6. Enfoque Ético
Alineado con el documento fundacional del proyecto:

No comercial: La app es un apoyo educativo.

Revisión comunitaria: Las palabras y audios deben ser validados por hablantes y kimeltuchefe antes de su publicación oficial.

Respeto a la variante: Preparado para soportar distintos grafemarios (Azümchefe, Raguileo, etc.).

🚀 7. Próximos Pasos (Roadmap)
Nuevos tipos de ejercicios: Rellenar espacios en blanco, emparejamiento de pares, dictado.

Integración de Micrófono: Para evaluación de pronunciación.

Despliegue en la Nube: Subir el Backend a Render/Railway y la Base de Datos a Supabase para independencia del localhost.

Compilación APK: Generar el archivo instalable para Android usando Capacitor.

text

---

### Paso 2: Guardar y subir a GitHub
Guarda el archivo (`Ctrl + S`). Luego, en la terminal (en la carpeta `mapuche`), sube esta documentación a tu repositorio:

```powershell
git add docs/BITACORA_DESARROLLO.md
git commit -m "docs: agregar bitacora detallada del desarrollo de la app"
git push origin main