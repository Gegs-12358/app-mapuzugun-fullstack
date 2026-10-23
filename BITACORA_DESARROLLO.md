# 📘 Bitácora de Desarrollo y Arquitectura: Kimanke (antes "App Mapuzugun")

Este documento detalla el proceso de construcción, desde cero, de la aplicación Full-Stack para el aprendizaje y revitalización del mapuzugun. Sirve como registro técnico de las decisiones tomadas, las tecnologías implementadas y los desafíos superados.

Es un documento acumulativo. La **Parte I** conserva el registro original tal como se escribió, con notas `[Actualizado]` donde algo cambió después. La **Parte II** reúne lo hecho desde entonces, y debe seguir creciendo con cada sesión de trabajo.

---

# PARTE I. Registro original

## 🏗️ 1. Arquitectura del Sistema

El proyecto utiliza una arquitectura desacoplada (Cliente-Servidor), garantizando escalabilidad y seguridad:

*   **Frontend:** Ionic 8 + Angular 18 (Standalone Components). Diseñado para ser una PWA y posteriormente compilarse a Android/iOS.
*   **Backend:** Node.js + Express. Actúa como API REST para intermediar entre la base de datos y el cliente.
*   **Base de Datos:** PostgreSQL (Gestionada mediante pgAdmin).
*   **Seguridad:** Encriptación de contraseñas con `bcrypt`.
    *   `[Actualizado]` Se sumaron sesión con JWT, límite de intentos y CORS con lista de orígenes. Ver Parte II, sección 8.1.

**Estructura de carpetas:**
```text
/mapuche
  ├── /backend         # API en Node.js (server.js)
  ├── /app-mapuzugun   # Aplicación Frontend (Ionic/Angular)
  ├── /docs            # Documentación (incluye esta bitácora)
  ├── .gitignore       # Exclusión de node_modules y variables de entorno
  └── database.sql     # Script de respaldo y creación de la base de datos
```
`[Actualizado]` La bitácora quedó en la raíz del repositorio (`BITACORA_DESARROLLO.md`), no en `/docs`.

## 🗄️ 2. Fase 1: Base de Datos (PostgreSQL)

Se diseñó una base de datos relacional para soportar el contenido dinámico y el progreso de los usuarios.

**Esquema de Tablas:**
*   **`users`**: Almacena credenciales y progreso.
    *   `id` (Serial), `username` (Varchar), `password` (Varchar encriptado).
    *   `xp` (Entero), `streak` (Entero), `lives` (Entero), `gems` (Entero).
    *   `last_life_regen` (Timestamp) para la regeneración automática de vidas.
    *   `[Actualizado]` Se agregaron `last_played` (Date) y `avatar` (uno de `puma`, `aguila`, `bandurria`, `monito`).
*   **`units`**: Las unidades temáticas del curso.
    *   `id` (Serial), `title` (Varchar).
*   **`exercises`**: Los ejercicios de cada unidad.
    *   `id` (Serial), `unit_id` (Llave foránea), `type` (Varchar: 'multiple_choice', 'write', 'match').
    *   `question` (Texto), `correct_answer` (Varchar), `options` (JSONB), `audio_url` (Varchar).
    *   `cultural_note` (Texto) para notas específicas por palabra.
    *   `[Actualizado]` Se agregaron `stage` (etapa dentro de la unidad), `estado` ('borrador' o 'aprobado'), `revisado_por` y `revisado_en`.
*   **`user_progress`**: Registra el avance del usuario por las unidades.
    *   `id` (Serial), `username` (FK), `unit_id` (FK), `completed` (Boolean), `score` (Entero).
    *   `[Actualizado]` Se agregó `stage`, con clave única `(username, unit_id, stage)`.
*   `[Actualizado]` **`stages`** (nueva): título de cada etapa por unidad, con clave `(unit_id, stage)`.

*(Nota: Todo el esquema está exportado en el archivo `database.sql` en la raíz del proyecto. Los datos de las lecciones se mantienen fuera del repositorio mientras no estén validados.)*

## ⚙️ 3. Fase 2: Backend (Node.js + Express)

El backend expone una serie de endpoints para manejar la lógica de negocio.

**Dependencias principales:** `express`, `pg`, `cors`, `bcrypt`.
`[Actualizado]` Se sumaron `dotenv`, `jsonwebtoken` y `express-rate-limit`.

**Endpoints Desarrollados:**
*   `POST /api/register`: Registro de usuarios con hash de contraseña.
*   `POST /api/login`: Validación de credenciales y entrega de sesión.
*   `GET /api/units`: Obtiene el listado de unidades.
*   `GET /api/exercises?unitId=X`: Obtiene los ejercicios filtrados por unidad. `[Actualizado]` Acepta también `stage` y solo entrega ejercicios aprobados en producción.
*   `POST /api/update-xp`: Actualiza el puntaje (Kimün) del usuario. `[Reemplazado]` por `/api/lessons/complete`: ya no se permite que el cliente envíe el XP.
*   `POST /api/lose-life`: Resta un Newen (vida) en caso de error.
*   `POST /api/buy-lives`: Compra 5 Newen con Llankas (gemas). `[Actualizado]` Cuesta 30 Llankas.
*   `POST /api/earn-life`: Gana 1 Newen practicando.
*   `POST /api/regen-lives`: Regenera Newen por tiempo (1 cada 10 min).
*   `POST /api/progress`: Guarda el progreso de una unidad completada. `[Reemplazado]` por `/api/lessons/complete`.
*   `GET /api/progress/:username`: Obtiene el progreso de un usuario. `[Reemplazado]` por `/api/stages`.

## 📱 4. Fase 3: Frontend (Ionic + Angular)

Se diseñó una interfaz con identidad visual propia, inspirada en la cosmovisión mapuche (Aukanaw).

**Identidad Visual:**
*   **Colores:** Índigo profundo (#23406B), Terracota (#A64B2A), Ocre (#D4A017), Crema (#F4EBD8).
    *   `[Actualizado]` La paleta que quedó en uso: azul #1F3A60, terracota #C47B66, crema #F5EBE1 y dorado #D9A441.
*   **Tipografía:** *Bitter* (títulos, sensación artesanal) y *Lora* (texto, serif cálido).
*   **Fondo:** Mapa cultural de la Patagonia con un filtro crema para mantener legibilidad.

**Pantallas Desarrolladas:**
1.  **Login / Registro (`login.page`):** Permite crear cuentas y guarda la sesión en `localStorage`.
    *   `[Actualizado]` Ahora son dos páginas: `login` y `register`, esta última con elección de compañero. Antes de ambas hay una introducción de dos pantallas (`intro`).
2.  **Menú de Unidades (`units.page`):**
    *   Visualización tipo "Camino" (Rüpü) con estrellas de 8 puntas (Flor del Foye).
    *   Sistema de progreso: Unidades completadas (✓ verde), actual (pulso dorado), bloqueadas (🔒 gris).
    *   Barra superior con contador de unidades completadas.
    *   `[Actualizado]` Cada unidad se abre en etapas, se muestra la racha y el avatar, y se ocultan las unidades sin contenido aprobado.
3.  **Lección (`home.page`):** El núcleo de la app.
    *   Barra superior con Kütral (🔥 racha), Kimün (🏵️ XP), Llanka (🟢 gemas) y Newen (🌿 vidas).
    *   **Tres tipos de ejercicios:** Selección múltiple, escritura (input de texto) y emparejamiento (match de columnas).
    *   **Notas Culturales Dinámicas:** La nota general de la unidad aparece antes de responder; al responder, se revela la nota específica de la palabra (ej. *"Weza es lo que desequilibra..."*).
        *   `[Actualizado]` La nota general de la unidad pasó a la pantalla final ("Sabías que…"), porque aparecía en todas las preguntas aunque no tuviera relación con ellas. Al responder se sigue mostrando la nota propia del ejercicio, solo si existe.
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
    *   `[Actualizado]` Esto ahora tiene respaldo técnico: estados de contenido borrador y aprobado (sección 8.5).
*   **Respeto a la variante:** Preparado para soportar distintos grafemarios (Azümchefe, Raguileo, etc.). `[Pendiente]` La elección del grafemario se define con hablantes.
*   **Precisión conceptual:** Se diferencia entre *Mongen* (vida) y *Newen* (fuerza vital), educando al usuario en la cosmovisión mapuche.

## 🚀 7. Próximos Pasos (Roadmap de Mejoras)

Este es el plan de evolución de la app, priorizado por impacto pedagógico, retención de usuarios y experiencia técnica. Cada punto lleva su estado al 21 de octubre de 2026.

### 🎯 1. Lo más urgente (Pedagógico)
*   **Ejercicio de Micrófono (Hablar):** El usuario graba su voz y la app la compara. Es clave para una lengua oral. `[Pendiente]`
*   **Unidad de Gramática Explícita:** Enseñar a formar oraciones simples (ej. *"Inche tañi üy..."*). `[Pendiente]`
*   **Frases Completas:** Introducir oraciones completas en lugar de solo palabras aisladas (ej. *"Mari mari, kümelkülen"*). `[Pendiente]`
*   **Modo Repaso (Repetición Espaciada):** Sección aparte para practicar solo las palabras falladas. `[Parcial]` Dentro de cada lección, las preguntas falladas se repiten al final; falta la sección aparte.
*   **Audio Real:** Reemplazar audios genéricos por grabaciones de hablantes nativos (previo consentimiento). `[Pendiente]`

### 🎮 2. Gamificación y Retención
*   **Logros / Insignias:** Ej. "Primer Mari mari", "Racha de 7 días", "1000 de Kimün". `[Pendiente]`
*   **Perfil de Usuario:** Pantalla con estadísticas, logros y selección de avatar (animal de poder). `[Parcial]` Ya se elige y cambia el compañero; falta la pantalla de perfil.
*   **Tienda Ampliada:** Usar Llankas para comprar "doble Kimün por 1 día", avatares o temas. `[Reconsiderar]` La economía actual es mínima a propósito (sección 8.4).
*   **Sonidos de Acierto/Error:** Feedback auditivo (un "ding" al acertar, "buzz" al fallar). `[Hecho]`
*   **Temporizador de Próxima Vida:** Mostrar "Próximo Newen en 7:32" en la pantalla de Game Over. `[Hecho]` Se muestra en minutos.
*   **Ligas Semanales:** Competir con otros usuarios por Kimün (requiere backend más complejo con rankings). `[Reconsiderar]` Exigiría validar cada respuesta en el servidor (sección 8.1).

### 🛠️ 3. Técnico y de Experiencia
*   **Modo Oscuro:** Adaptar la paleta de colores para entornos con poca luz. `[Pendiente]`
*   **PWA Instalable (Offline):** Configurar el Service Worker para funcionar sin internet. `[Pendiente]`
*   **Despliegue en la Nube:** Subir Backend (Render/Railway) y BD (Supabase) para independencia del localhost. `[Pendiente]` Requiere HTTPS, `trust proxy` y variables de entorno.

### 📚 4. Contenido y Comunidad
*   **Más Unidades Temáticas:** Agregar "Ropa", "Colores avanzados", "Clima", "Direcciones". `[Pendiente]` Después de validar lo existente.
*   **Sección de "Historia" (Nütram):** Un cuento corto en mapuzugun con traducción para practicar lectura. `[Pendiente]`
*   **Contribución Comunitaria:** Espacio para que hablantes propongan nuevas palabras o correcciones (requiere panel de admin). `[Parcial]` El sistema de estados ya existe en la base de datos; falta el panel.

---

# PARTE II. Actualización del 20 y 21 de octubre de 2026

## 8. Qué se hizo y por qué

### 8.1 Seguridad y arquitectura

*   **Secretos fuera del código.** Contraseña de la base de datos y clave del JWT pasaron a `backend/.env`, que no se sube a Git. `backend/.env.example` documenta las variables.
*   **Sesión con JWT** (7 días). Todas las rutas, salvo registro, login y lista de unidades, exigen el token. El servidor usa siempre el usuario del token y ignora cualquier nombre que envíe el cliente.
*   **Experiencia, gemas y racha las calcula el servidor.** El cliente solo informa unidad, etapa y aciertos. El servidor limita los aciertos al número real de ejercicios.
*   **No se valida cada respuesta en el servidor.** La respuesta correcta viaja a la app, para dar feedback inmediato y permitir uso sin conexión en el APK. Si algún día hay ranking o ligas, esta decisión se revisa.
*   **Límites de intentos:** 10 inicios de sesión fallidos cada 15 minutos y 10 registros por hora. CORS con lista de orígenes permitidos.
*   **Contraseñas:** mínimo 8 caracteres. El mensaje de error del login es genérico, para no revelar si el usuario existe.
*   **Frontend:** un interceptor agrega el token a cada petición, antepone `apiUrl` según el entorno y, si el servidor responde 401, cierra la sesión y lleva al login.

### 8.2 Etapas por unidad

Quince preguntas por tema eran demasiadas. Cada unidad se divide ahora en tres etapas de cinco ejercicios (8 unidades por 3 etapas por 5 ejercicios). El progreso se guarda por `(usuario, unidad, etapa)`. Una unidad se desbloquea al terminar la anterior. El servidor no exige el orden entre etapas; hoy solo lo hace la pantalla.

### 8.3 Identidad, compañeros e introducción

*   **Nombre:** de "Mapuzugun Küme Rüpü" a **Kimanke**. Sin coincidencias en tiendas ni en INAPI, y `nic.cl` libre. Falta confirmar con un hablante la ortografía y el significado.
*   **Compañeros:** cuatro animales del logo, elegidos al crear la cuenta y cambiables después. Nombres de fantasía, sin roles ni atribuciones: Pangipol (puma), Manketor (cóndor), Rakyfar (bandurria) y Teutimos (monito del monte). La app aclara que no son palabras del mapuzugun. Los identificadores internos no cambian.
*   **Logo:** la versión con cruz divide el círculo en cuatro y se parece al kultrun. Se preparó una alternativa sin cruz. No se usan símbolos sagrados sin autorización de la comunidad.
*   **Introducción de dos pantallas** (`intro`), que se muestra solo la primera vez. La segunda presenta a los cuatro compañeros. Quien ya tiene sesión entra directo al mapa.

### 8.4 Racha y economía

*   **Racha con hora de Chile.** Se compara el día de la última práctica con la fecha de `America/Santiago`. Si fue ayer, suma uno; si pasó más tiempo, vuelve a 1. El mapa muestra 0 si ya pasó más de un día sin practicar.
*   **Economía:** 40 gemas al registrarse, 10 gemas por etapa perfecta (2 por acierto, solo la primera vez), 30 gemas por recarga completa de Newen. 5 vidas como máximo, una nueva cada 10 minutos o practicando. Experiencia: 20 por acierto la primera vez y 5 al repetir.
*   Se descartaron los anuncios y las esperas largas: la app es gratuita y busca que se practique. Los valores son constantes al inicio de `server.js` para ajustarlos con pruebas reales.

### 8.5 Contenido: borrador y aprobado

*   Cada ejercicio tiene `estado`, con `revisado_por` y `revisado_en` opcionales.
*   Con `CONTENIDO_BORRADOR=false` (producción), el servidor entrega solo lo aprobado y calcula los puntajes sobre ese contenido. La app oculta las unidades sin nada aprobado y muestra "Estamos preparando las lecciones".
*   En desarrollo, `CONTENIDO_BORRADOR=true` muestra todo, con la etiqueta "Contenido en revisión".
*   Los datos de quién revisó no se envían a la app.
*   `seed.sql` (las lecciones) se queda en local mientras no esté validado. El repositorio es público.

### 8.6 Documentación y repositorio

*   `README.md` reescrito: antes describía el proyecto anterior.
*   `database.sql` corregido y probado contra una base vacía.
*   `.env.example` corregido.
*   Esta bitácora pasó a ser acumulativa.

## 9. Problemas encontrados y cómo se resolvieron

*   Las páginas se apilaban y la navegación "no cambiaba": faltaba importar el CSS base de Ionic en `global.scss`.
*   401 después de iniciar sesión: el interceptor no estaba registrado (`provideHttpClient()` sin argumentos).
*   Dos rutas con `path: ''` en `app.routes.ts`: Angular usa la primera que coincide, así que la segunda no se ejecutaba.
*   Errores 500 por consultas editadas a mano sin su parámetro (`$1` sin valor), dos veces en `/api/user`.
*   Cambios que "no hacían nada": el servidor viejo seguía en memoria con el código y el `.env` anteriores. Regla: reiniciar el backend tras cualquier cambio.
*   El emparejamiento no terminaba: se perdió `this.isAnswered = true` en `checkMatch()`.
*   Reglas de CSS del avatar anidadas por error dentro de `.stage-chip`.
*   `express-rate-limit` instalado en el frontend en vez del backend.
*   `database.sql` con una coma faltante y otra sobrante; `.env.example` con el comando de PowerShell guardado como contenido.
*   Valores de la maqueta que sobrevivieron: XP inicial 120, racha 3, 500 gemas, y un `xp - 120` en la pantalla final.
*   La contraseña antigua de la base de datos quedó en el historial de Git. Ya se cambió en PostgreSQL; no debe reutilizarse en ningún otro lado.

## 10. Pendientes y decisiones abiertas

**Contenido (necesita hablantes)**
*   Validar lecciones y notas culturales (por ejemplo "Foye", "Chonchón", "Kulen") y respuestas dudosas (por ejemplo "Amulepe"). Después, hacer las notas distintas por etapa.
*   Confirmar el grafemario, el nombre "Kimanke" y los nombres de las estadísticas, en especial Llanka, que es una joya ceremonial.
*   Decidir sobre el logo y su cruz.

**Técnico**
*   Probar el APK y cambiar el `appId` (hoy `io.ionic.starter`).
*   Desplegar con HTTPS.
*   Exigir el orden de las etapas en el servidor.
*   Quitar o actualizar el texto "Contenido de prueba" del login cuando haya contenido aprobado.

**Antes de publicar**
*   Licencia del código.
*   Licencia y permiso de redistribución del PDF del diccionario que está en el repositorio (pesa 22 MB).
*   Registrar el dominio y revisar el nombre en las tiendas.

### Actualización 22–23 de octubre de 2026

**Hecho**
- Página "Acerca de" (`/acerca`), con un solo punto de entrada desde el botón ⓘ del mapa. Explica qué es Kimanke, cómo se cuida el contenido, la escritura y las variantes, los datos, los compañeros, los créditos y cómo ayudar. Los créditos están vacíos hasta contar con consentimiento.
- Avatares nuevos (puma, cóndor, bandurria, monito del monte) y ajuste de SCSS para que se vean completos dentro del círculo.
- Ejercicio "completar la frase" (fill_blank), con una fila de prueba en estado `borrador` mientras ningún hablante la revise.
- Encuesta de 23 respuestas en 2 horas de difusión. Temas más fuertes: que la app sea hecha con gente mapuche, créditos, no uso comercial y diversidad territorial. No hubo hablantes entre quienes respondieron.
- Se revisó una sesión de trabajo con otra IA. No se implementaron pies de página con afirmaciones de validación. La app solo dice "Contenido en revisión".

**Decisiones**
- El proyecto es personal y sin fines de lucro en esta etapa.
- No se afirma validación comunitaria hasta que exista.
- El logo (círculo dividido en cuatro) queda provisorio hasta consultarlo con la comunidad. Cambiarlo es reemplazar `src/assets/img/logo.png`.

**Pendiente**
- Licencias: la del código es decisión propia. La del contenido se define con la comunidad. El PDF del diccionario de Augusta es material de terceros y debe excluirse de cualquier licencia propia (revisar si puede redistribuirse).
- Decidir con hablantes: nombre de la app, grafemario y variantes, y validar los nombres de Llanka, Kütral, Kimün y Newen.
- Cuando cierre la encuesta (24 h más): recontar, y contactar a quienes se ofrecieron (2 de voz, 1 de revisión) mediante un llamado en los mismos grupos.
- Arreglar el encabezado de la lección en celular (el avatar queda encima de los contadores).
- Cambiar el fallback `gems ... : 500` de `home.page.ts` por 0.
- Reemplazar las notas culturales fijas por notas por etapa validadas.
- Prueba en celular (APK), cambio de `appId` (`io.ionic.starter`) y despliegue con HTTPS.

### Actualización 23 de octubre de 2026 (estilo visual y repositorio)

**Hecho**
- Nuevo estilo visual: fondos 3D tierno para intro, login/registro, mapa y lección (`src/assets/bg/`), tarjetas translúcidas ("vidrio"), textos más grandes y colores más suaves. Los fondos se aplican con `--background` en cada `ion-content` (no con `::part`).
- Portada de la intro (`src/assets/img/portada.webp`) con los cuatro compañeros, el volcán y una araucaria.
- Avatares rehechos en 3D tierno (puma, cóndor joven, bandurria, monito del monte), ajustados a rasgos reales de cada especie, a 320×320 px (~40 KB cada uno).
- Al terminar una lección, el compañero que la persona eligió muestra el dato cultural en una burbuja, con la etiqueta "Contenido en revisión". Siempre es el mismo compañero elegido, para no asignar saberes o roles a cada animal.
- Repositorio: se subieron los cambios a GitHub. `seed.sql` (lecciones) y el Excel de la encuesta quedaron en `.gitignore`; el PDF del diccionario dejó de rastrearse (sigue en commits antiguos). Imágenes comprimidas de ~13 MB a ~400 KB.

**Problemas y lecciones**
- Una regla global `body, p, span { color: ... }` pintaba de marrón todo texto de `p` y `span`, aunque estuviera dentro de un contenedor claro sobre azul. Ahora solo `body` y `ion-card-content` definen color.
- `ion-card` tenía `background: #FFFFFF !important` en `global.scss`, lo que impedía las tarjetas translúcidas. Se quitó.
- La contraseña de una cuenta de prueba se guardó en texto plano con un `UPDATE`, y el login falló: la base guarda hashes bcrypt, así que hay que generar el hash con `bcrypt` y guardarlo.
- Al comprimir imágenes se ejecutó `npm init` dentro de la raíz del proyecto y se subieron `package.json`, `package-lock.json` y `comprimir.js`. Se quitaron en un commit de limpieza. Para estos trabajos conviene usar una carpeta temporal fuera del repositorio.

**Pendiente / decisiones abiertas**
- Con la comunidad: logo (el actual es provisorio), nombre de la app, grafemario/variantes, nombres de los compañeros y de Kütral/Kimün/Llanka/Newen.
- Revisión de hablantes de las notas culturales y del texto de la pantalla "sin Newen" (explicación de Newen/Mongen).
- Licencia del código y del contenido; permiso de redistribución del diccionario de Augusta (hoy fuera del seguimiento, pero presente en el historial).
- Créditos de "Acerca de": indicar que los fondos y avatares son ilustraciones generadas con IA.
-

