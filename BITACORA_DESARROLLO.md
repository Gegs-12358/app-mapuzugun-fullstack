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

### Actualización 23–27 de octubre de 2026 (despliegue, privacidad y accesibilidad)

**Hecho**
- Despliegue: servidor en Render con SSL hacia Neon, `trust proxy` y script `start`. La app apunta al servidor en la nube. Compilación Android preparada (`appId` `cl.kimanke.app`, `webDir`).
- Compañeros nuevos: Pudimel (pudú) y Rinodar (ranita de Darwin).
- "Acerca de" rediseñada con tarjetas, compañeros, botones de contacto, créditos de las ilustraciones hechas con IA, gratuidad y condiciones de uso.
- Privacidad: política ampliada, aviso de consentimiento en el registro y opción para eliminar la cuenta y todo el progreso (pide la contraseña).
- Las fuentes quedan alojadas en la app (sin pedirlas a servidores externos).
- Licencia: todos los derechos reservados (`LICENSE`).
- Accesibilidad: se permite hacer zoom, los controles tienen nombre para lectores de pantalla y mejoró el contraste de los botones.
- Portada de cada etapa y barra con franjas en el mapa y en la lección.

### Actualización 18–19 de noviembre de 2026 (revisión, compañeros vivos y beta)

**Hecho**
- Correcciones de una revisión de código: llaves de firma fuera del repositorio, cálculo de vidas, avatares y registro.
- Las notas culturales salen de la base (tabla `units`) y solo se muestran si están aprobadas, o en modo borrador.
- Al despertar el servidor gratuito se muestra un aviso, con reintentos. Se agregaron guardias de sesión y pantallas de error de conexión.
- Cada ejercicio indica su grafemario (Unificado por defecto) y su variante territorial. Botón para escribir la ü.
- Rediseño con la tipografía Nunito y la paleta "Atardecer".
- "Nuestro acuerdo": pantalla en la intro y sección en "Acerca de", nacida de la encuesta.
- Compañeros vivos: los seis tienen cinco poses (parpadean, celebran, animan) en la lección y en el mapa, donde el compañero se para junto a la unidad actual.
- Versión beta 0.9.0: etiqueta "beta", número de versión, botón para reportar errores en cada pregunta, respuesta junto al compañero arriba de la pregunta y botón principal fijo abajo.
- El compañero se presenta al crear la cuenta.
- Ícono nuevo de la app: globo de diálogo crema con la ü (`scripts/crear_icono.py`).
- Íconos propios para Kütral, Kimün, Llanka y Newen, y una pantalla "Cómo funciona" en la intro que enseña esas cuatro palabras.
- En la intro se puede volver atrás (deslizando o con el botón de Android).
- Registro: avisa al tiro si el nombre está ocupado, sugiere otros y no acepta correos como nombre.
- Versión web en Render (sitio estático) para iPhone y cualquier navegador, instalable en la pantalla de inicio.

**Problemas y lecciones**
- Desde iPhone no se puede instalar una APK. La solución fue la versión web; para que funcionara hubo que agregar su dirección a `CORS_ORIGIN` en el servidor.
- Una hablante avisó que "müna" no significa "no" (es más bien "muy" o "qué"). Se agregó el estado `retirado` para sacar contenido con errores sin borrarlo, y se retiraron las preguntas 9 y 10.

### Actualización 20 de noviembre de 2026 (lección, mapa, estilo 3D y contenido)

**Hecho**
- Lección: la pregunta va en un recuadro destacado, con la palabra clave en otro color, y el botón "Reportar error" tiene texto. La pantalla final es más compacta y deja visible el botón.
- Mapa más claro: la unidad actual tiene destellos, el compañero dice qué hacer y un botón lleva directo a la siguiente etapa. Las unidades completadas pasaron a verde, porque el dorado se perdía en el camino.
- Estilo 3D en toda la app, a tono con los compañeros: degradados con brillo, cantos bajo botones y tarjetas, bordes plateados en lo pendiente y dorados en lo superado, campos hundidos y fichas con volumen en "Empareja".
- Presentaciones de los compañeros más claras. La de la ranita hablaba de crías "en la garganta" y se prestaba a malas lecturas.
- Servidor despierto con cron-job.org (consulta `/api/salud` cada 10 minutos) y respaldo de la base con `pg_dump` 18 en `~/respaldos`, fuera del repositorio.
- Planilla de revisión para hablantes con las 120 preguntas y las 8 notas de unidad. Cada fila tiene una alerta (alta, media, baja), qué revisar y una propuesta, también por confirmar.
- En la base: se retiraron 7 preguntas con palabras probablemente erróneas (nueve, abuelo, abuela, pie y nalca) y se reemplazaron 12 notas de preguntas y 3 notas de unidad que eran inventadas o delicadas por versiones neutras.

### Actualización 20 de noviembre de 2026 (niveles, repaso y recordatorio)

**Hecho**
- Niveles en el mapa (`src/app/niveles.ts`): 1 Primeros pasos (unidades 1–3), 2 Vida diaria (4–6), 3 Territorio y cosmovisión (7–8). Cada nivel tiene su cartel en el camino y una celebración al completarlo, que sale una sola vez por persona.
- Modo repaso (`/repaso`): cada respuesta se guarda en la tabla `user_errores`. Una palabra entra al repaso al fallarla y sale al responderla bien dos veces seguidas. El repaso no gasta Newen, da 5 de Kimün por acierto y cuenta para la racha.
- Recordatorio diario en la APK (`@capacitor/local-notifications`, `src/app/recordatorio.ts`): avisos para los próximos 7 días a la hora elegida, y se salta el del día si la persona ya practicó. El ícono blanco de la barra lo crea `scripts/crear_icono_notificacion.py`.
- El servidor crea `user_errores` y la columna `users.creado_en` al arrancar (IF NOT EXISTS). Las cuentas anteriores quedan con `creado_en` en NULL.
- Se actualizó la dependencia `body-parser` del servidor (vulnerabilidad de denegación de servicio).

**Decisiones**
- Los niveles agrupan solo el contenido básico que existe. Un nivel avanzado real (frases, conversación, relatos) se escribirá con hablantes.
- El contenido original de las notas reemplazadas y de las preguntas retiradas queda en la planilla de revisión para hablantes.
- Cambio de nombre de usuario desde el panel del compañero, con la contraseña y sugerencias si el nombre está ocupado. Para que el progreso siga al nombre, el servidor cambia al arrancar la relación de `user_progress` con `users` a `ON UPDATE CASCADE`. Las rutas protegidas leen el nombre actual desde la base por el id del token, así una sesión abierta en otro dispositivo sigue guardando bien.
- Seguridad: securityheaders.com dio nota D al sitio web. Se agregaron encabezados al servidor con `helmet` y, para el sitio estático, se configuran en Render (Content-Security-Policy, X-Frame-Options, Referrer-Policy y Permissions-Policy). Para que la política de contenido no rompa los estilos se desactivó `inlineCritical` en `angular.json`: Angular cargaba el CSS con un `onload` en línea, que la política bloquea.

### Actualización 21 de noviembre de 2026 (revisión de seguridad)

**Resultado de las pruebas**
- Encabezados: A+ en securityheaders.com y en Mozilla Observatory, tanto para el sitio web como para la API.
- gitleaks: no hay secretos en los 65 commits del historial (las llaves `.jks` antiguas son binarias y ya se dan por expuestas).
- Pruebas de ataque en la copia local: los tokens falsos, alterados o vencidos se rechazan; nadie puede ver datos de otra persona; no hay inyección SQL; las compras simultáneas de Newen no gastan dos veces; una cuenta borrada deja de funcionar al tiro.

**Arreglado**
- Se podían completar por la API etapas bloqueadas (y ganar Llankas sin jugar). Ahora el servidor aplica la misma regla de desbloqueo que el mapa.
- Se podía sumar Kimün sin límite enviando «repaso terminado» o repitiendo una etapa en un ciclo. Ahora cada repaso se valida contra lo que se entregó, y terminar lecciones o repasos tiene un tope de 40 por hora por persona.
- Un id enorme o una petición sin JSON causaban un error 500; ahora responden 400.
- Nombres de usuario: solo letras (con tildes, ñ y ü), números, espacio, punto, guion y guion bajo, para evitar HTML y caracteres invisibles. Contraseñas de hasta 72 bytes, el máximo que bcrypt considera.
- El token JWT se firma y verifica solo con HS256.
- La app solo envía la sesión a la API, nunca a otros servidores.
- Encabezado Permissions-Policy en la API.

**Verificado en producción**
- El límite de intentos distingue a cada persona detrás del proxy de Render y Cloudflare: tras bloquear un celular con datos móviles, el computador con wifi entró sin problema.
- `JWT_SECRET` en Render es larga y aleatoria.

### Actualización 21 de noviembre de 2026 (correo y recuperación de contraseña)

**Hecho**
- Cada cuenta tiene un correo confirmado con un código de 6 números (columna `users.email`, única sin distinguir mayúsculas). Las cuentas que no lo tienen pasan por la pantalla `/correo` antes de seguir jugando; las nuevas, justo después de crear la cuenta. Desde el panel del compañero se puede cambiar.
- "¿Olvidaste tu contraseña?" (`/recuperar`): con el usuario o el correo llega un código para elegir una contraseña nueva.
- Los códigos se guardan como huella (HMAC), vencen en 15 minutos y admiten 5 intentos; pedir uno nuevo anula el anterior. Máximo 5 pedidos cada 15 minutos por conexión y 1 por minuto por cuenta. La respuesta de recuperación es la misma exista o no la cuenta.
- Envío con la API de Brevo. La exigencia del correo se activa solo si el servidor tiene `BREVO_API_KEY` y `CORREO_REMITENTE`, para no bloquear a nadie mientras no se pueda enviar. `CORREO_PRUEBA=true` (solo desarrollo) muestra los códigos en el registro del servidor.
- Política de privacidad actualizada: ahora se guarda el correo, solo para recuperar la contraseña, y Brevo aparece como servicio externo.

**Decisiones**
- Un correo por cuenta, para que la recuperación por correo no sea ambigua.
- Código en vez de enlace, porque funciona igual en la APK y en la web.
- La APK que ya está instalada no tiene esta pantalla: se exige el correo en la web desde ya, y en la APK cuando se instale la versión nueva.

### Actualización 21 de noviembre de 2026 (accesibilidad)

**Hecho**
- Tamaño de letra en el panel del compañero: Normal, Grande (115 %) y Muy grande (130 %). Se aplica con `zoom` en `<html>`, que agranda todo de forma pareja y reacomoda la pantalla, porque los estilos usan tamaños en píxeles. Probado en registro, mapa y lección: nada se sale por los costados y el botón principal sigue a la vista.
- "Menos movimiento": quita animaciones, transiciones y confeti, para quien se marea o se distrae con ellas.
- Los ajustes se guardan en el dispositivo (`kimanke_accesibilidad`) y se aplican antes de dibujar la app (`main.ts`), para que no se vea un salto al abrirla.
- Consejos del compañero: en el pie del mapa, una vez por dispositivo y solo cuando ya hay progreso, cuenta las opciones escondidas en el panel (tamaño de letra y menos movimiento, recordatorio en Android, cambiar compañero, nombre o correo), con un botón que abre el panel. La intro también lo menciona en "Te ayudan en el camino".
- Portada de la etapa rediseñada: estrella 3D de la unidad como en el mapa, fila con las etapas de la unidad (dorada superada, roja actual, plateada pendiente), el compañero animado con su globo, los tipos de pregunta y lo que se puede ganar. COMENZAR quedó en un pie fijo, siempre a la vista.
- "Cargando", "sin conexión" y "estamos preparando las lecciones" ahora tienen al compañero y el estilo de tarjeta 3D, en el mapa y en la lección.
- Se suelta el foco al cambiar de pantalla: el navegador avisaba que un botón enfocado quedaba dentro de una página oculta (aria-hidden), lo que confunde a los lectores de pantalla.
- El mapa se abre en la unidad en la que va la persona (o la última, si terminó todo), centrada en la pantalla, también al volver de una lección. En la primera unidad se queda arriba para mostrar el resumen. Con "Menos movimiento" salta sin deslizarse.
- Correo del proyecto: el contacto de "Acerca de" y los reportes de errores pasan a kimankeapp@gmail.com, en vez del correo personal.
- El compañero se para sobre la etapa que toca (con la lista de etapas abierta) y habla en un globo: cuánto falta para terminar la unidad, los consejos de opciones (con "Ver cómo") y, al tocarlo, consejos para practicar. Los consejos son sobre cómo aprender y usar la app, no sobre la lengua o la cultura. La fila se corre al revés que el zigzag del camino para quedar centrada. Con la lista cerrada, vuelve a la estrella.
- El compañero ya no se repite en el pie del mapa: ahí solo queda el botón (y "Repasar"). El mensaje del pie vuelve solo cuando se terminaron todas las unidades y no hay etapa sobre la que pararse.
- Pistas en las lecciones: si pasan 15 segundos sin responder, el compañero ofrece "¿Te ayudo con una pista?". Hasta tres niveles, sacados de la misma respuesta (sin inventar contenido): primera letra; en alternativas se apagan opciones incorrectas hasta dejar dos; al escribir se muestra la forma (`M _ _ _   _ _ _ _`) y luego la primera y última letra de cada palabra; en "Empareja" se ilumina una pareja. Una palabra respondida con pista queda para el repaso aunque se acierte.
- Arreglo del mapa: al volver de una lección quedaba muy abajo (en el nivel 3) porque medía la pantalla mientras Ionic aún la tenía oculta por la transición. Ahora mide en `ionViewDidEnter`, cuando ya está a la vista.
- Las pistas aparecen a los 10 segundos (antes 15).
- Correo ya usado en otra cuenta: la app responde igual que siempre ("te enviamos un código") y a ese correo le llega un aviso en vez del código, con el nombre de la cuenta dueña y cómo recuperar la contraseña. Así nadie puede averiguar qué correos tienen cuenta en Kimanke.

- El mapa toma el compañero del servidor: si se cambiaba en otro dispositivo, seguía mostrando el antiguo.
- En las lecciones, la pregunta va justo encima de las respuestas (antes estaba arriba y el compañero quedaba en medio, así que se perdía al bajar).
- Ajustes de lectura desde cualquier lección: al tocar el compañero de la cabecera se abre un panel con el tamaño de letra y "Menos movimiento" (componente `app-ajustes-lectura`, compartido con el mapa).
- El panel del compañero del mapa ahora flota sobre la pantalla. Antes se abría arriba de todo el mapa y, como el mapa se abre en la unidad actual, parecía que el botón no hacía nada.
- Sugerencia de una usuaria: conocer las palabras antes de empezar. En la portada de cada etapa hay un botón "Conocer las palabras" que abre la lista mapuzugun / castellano. La lista sale de las mismas preguntas de la etapa (`palabras.ts`), sin inventar contenido: "¿Cómo se dice X?" y "Escribe X" dan la respuesta y X; "¿Qué significa X?" da X y la respuesta; el emparejamiento da sus parejas; las preguntas culturales dan la respuesta con la descripción. Lleva el aviso de contenido en revisión.
- El botón "Conocer las palabras" es verde, con un halo que late y un destello que lo cruza (con "Menos movimiento" queda quieto). El compañero de la portada invita a mirarlo.
- El emparejamiento va primero en cada etapa (antes salía en cualquier lugar, porque las preguntas se mezclan). Así se ven todas las parejas al comienzo. El repaso no cambia.
- Todas las etapas empiezan con un emparejamiento. Las 6 que no traían uno (1-3, 2-2, 4-2, 5-2, 6-2, 7-3) arman uno con las mismas palabras de la etapa (hasta 5 parejas). Es de calentamiento: no suma Kimün ni Llankas, no gasta Newen y no se guarda para el repaso. Su enlace de "Reportar error" lleva las parejas, porque no tiene número de ejercicio.
- Toda etapa tiene al menos un ejercicio de cada tipo: emparejar, alternativas, escribir y completar la frase. Los que faltan se arman con las palabras de la misma etapa (`ejerciciosDePractica` en `palabras.ts`):
  - Escribir: "Escribe «Sí» en mapuzugun", con la palabra más corta que la etapa no pide escribir ya.
  - Completar la frase: si hay una expresión de varias palabras, se completa la última ("Chaltu ___ (Gracias)" → mai). Si no, "«Weza» significa ___", en castellano y sin exigir tildes, de preferencia con una palabra que la etapa pregunta al revés.
  - Son de práctica: no suman puntos, no gastan Newen y no van al repaso; si se fallan, se repiten al final. No quedan pegados a otra pregunta sobre la misma palabra.
  - Ninguna etapa traía "completar la frase", así que ahora todas tienen uno armado. Conviene pedir a los hablantes frases reales para reemplazarlos.
- Prueba externa con una cuenta nueva. Hallazgos corregidos:
  - Al terminar una etapa decía "Has ganado 0 puntos" y, al volver enseguida, el mapa mostraba la etapa sin completar (al recargar sí aparecía). Era una carrera: la pantalla final se mostraba antes de que el servidor confirmara, y con Render lento se alcanzaba a volver. Ahora dice "Guardando tu avance…", el botón espera a que termine, hay "Reintentar" si falla, y el mapa se actualiza solo cuando termina de guardarse aunque se haya salido con la flecha.
  - El registro avisa que después se pedirá un correo para recuperar la contraseña.
  - "Acerca de" ya no dice que no hay recuperación de contraseña.
- Newen más amable al empezar. En el Nivel 1 (unidades 1 a 3), fallar una pregunta por primera vez no gasta Newen; se repite al final y fallar esa repetición sí gasta. El compañero lo explica la primera vez. En los niveles 2 y 3 sigue como antes.
- Cuando queda 1 Newen (según el servidor), el compañero avisa: "Ojo: me queda solo 1 Newen. Tómate tu tiempo y pide una pista si la necesitas". También al empezar una etapa con 1 Newen.
- Chequeo en producción con juanito (unidad 5, etapa 3, repaso, ajustes y "Acerca de"): todo lo nuevo funciona (emparejar primero, palabras, pista a los 10 s, práctica sin puntos, Newen en Nivel 2, "Guardando", mapa al día). Dos ajustes:
  - Al empezar la etapa con la portada bajada, la pregunta quedaba con el compañero fuera de la pantalla. Ahora cada pregunta parte desde arriba.
  - El botón "Sí, una pista" quedaba pegado al texto en pantallas anchas; ahora va en su propia línea.
- La ü, que es de lo que más se falla al escribir (Küme, Kelü, Küla):
  - El botón ü tiene al lado "Letras del mapuzugun que no están en tu teclado".
  - Si la respuesta está bien salvo que lleva "u" donde va "ü", la primera vez no cuenta como error: el compañero avisa "¡Casi! Esta palabra lleva ü", el botón se destaca y, al tocarlo, la ü se pone donde corresponde. Si vuelve a pasar, sí cuenta.
  - La primera pista de una palabra con ü lo dice: "Lleva ü: usa el botón de abajo".

### Actualización 26 de noviembre de 2026 (avisos web y dónde se abandona)

**Hecho**
- Dónde se deja una etapa: al empezar una etapa se crea un intento (`intentos_etapa`) y se anota hasta qué pregunta llega. Al terminarla queda como terminado. Solo guarda la etapa y el número de pregunta. Se borra con la cuenta.
- Avisos web en el navegador (push), para la versión web:
  - `src/sw.js`: service worker que solo muestra avisos y abre la app al tocarlos. No guarda nada en caché.
  - En el panel del compañero, "Avisos": recordatorio diario con hora y "Avísame cuando haya mejoras en Kimanke". En iPhone sin instalar explica cómo agregarla al inicio.
  - El servidor (`backend/avisos.js`) guarda la suscripción de cada navegador. Una tarea de cron-job.org llama cada 15 minutos a `/api/avisos/recordatorios`: manda el aviso a quien ya llegó a su hora, no lo recibió hoy y no ha practicado hoy. Las novedades se mandan con `/api/avisos/novedad`. Ambas rutas piden un secreto. Las suscripciones que el navegador ya no acepta se borran solas.
  - Probado en local con un receptor falso: el recordatorio sale una sola vez al día, la suscripción muerta se borra, la novedad llega solo a quien la aceptó, y un secreto incorrecto responde 403. En modo incógnito Chrome no permite avisos: la app lo explica y desmarca las casillas.
- "Acerca de" cuenta que se guarda hasta qué pregunta se llega y los datos de los avisos.
- En Brave los avisos vienen apagados (no usa el servicio de Google para repartirlos). La app lo detecta y explica cómo activarlos en brave://settings/privacy. Probado en producción con juanito en Brave: después de activarlo, la suscripción quedó guardada.
- La primera suscripción de Brave venció apenas se usó (el servicio respondió 410 y el servidor la borró). Ahora, al activar los avisos siempre se crea una suscripción nueva; y al abrir el mapa, si la persona tiene avisos activados y el servidor ya no tiene su suscripción, se crea otra sola, sin pedir nada. El servidor anota en el registro cuando borra una vencida y el detalle de cualquier otro error.

**Decisiones**
- Los avisos web los manda el servidor, porque el navegador no puede programar avisos con la app cerrada. La APK sigue con los recordatorios locales; las novedades por ahora llegan solo a la web.
- Arreglo: al entrar a una etapa con 0 Newen guardado, se mostraba "¡Te has quedado sin Newen!" aunque la recarga por tiempo lo subiera a 5 enseguida (la barra decía 5 y no dejaba seguir). Ahora, si la recarga devuelve Newen, la pantalla se quita sola. Además, con esa pantalla abierta, cada minuto se revisa si ya volvió un Newen y se deja seguir sin tocar nada.
- Al cerrar sesión, este navegador deja de recibir los avisos de esa cuenta: se borra la suscripción en el servidor y en el navegador, y se olvidan los ajustes. Así, en un celular compartido, la siguiente persona no recibe los avisos de la anterior. Si no hay red, salir no espera más de 3 segundos.
- Recordatorio probado en producción: salió a la 1:30 para una cuenta con hora 01:20 y sonó en el celular. Dos ajustes después de verlo:
  - El ícono chico del aviso salía como un cuadro blanco, porque Android pinta ese ícono de un solo color. Ahora usa `badge-96.png`, la misma silueta del globo con la ü que usa la APK (`scripts/crear_icono_notificacion.py --web`).
  - Al tocar el aviso se abre el mapa y el compañero repite el mensaje en su globo («Te mandé este aviso: …»), porque en el celular la notificación se lee chica.
- Al escribir, el botón azul del teclado (✓, "Listo", "Ir" o Enter) solo cierra el teclado, para ver la pantalla completa. No comprueba la respuesta: así un toque sin querer no gasta Newen, y la persona revisa y toca COMPROBAR. Además, el campo ya no corrige ni pone mayúscula solo, porque el corrector cambiaba palabras en mapuzugun.

### Actualización 26 de noviembre de 2026 (repaso espaciado y Mis palabras)

**Hecho**
- Repaso espaciado (cajas de Leitner): cada palabra respondida queda en una caja de 0 a 5 (`palabras_usuario`). Al acertar sube de caja y vuelve al repaso en 1, 3, 7, 15 o 30 días; al fallar vuelve a la caja 0. El repaso trae primero las palabras que costaron y después las que ya se sabían y les toca hoy, hasta 8 por vez.
- Al arrancar, el servidor llena la tabla con lo jugado antes: las palabras falladas (caja 0) y las de las etapas terminadas (caja 1, para el día siguiente de terminarlas).
- "Mis palabras" (`/palabras`, botón en el resumen de arriba del mapa): todas las palabras vistas, en tres grupos (te cuestan, aprendiendo, dominadas), con cinco puntitos de avance y un botón para repasar. Las palabras salen de las mismas preguntas (`palabrasDeEtapa`).
- El botón del mapa dice cuántas palabras trae este repaso (máximo 8), no el total pendiente, que se ve en "Mis palabras".

**Decisiones**
- El repaso espaciado es un método publicado y libre (caja de Leitner, años 70). Los nombres y el diseño son propios de Kimanke.
- Tres tipos de ejercicio nuevos, armados con las palabras de la etapa (`ejercicioNuevoDePractica` en `palabras.ts`). Cada etapa trae uno, elegido al azar entre los que se pueden armar, para que varíen sin hacerse largas:
  - Con dibujos: "¿Cuál es «Epu»?" y se elige entre cuatro dibujos (emoji). Solo para palabras con un dibujo claro: números, colores, animales, comida, el cuerpo, el cielo y algunas acciones. El nombre de cada dibujo se lee en voz alta para lectores de pantalla.
  - Ordenar palabras: "Arma «Mundo Inferior» en mapuzugun" con fichas (Minche, Mapu y una de más). Solo con expresiones de 2 a 4 palabras distintas.
  - Verdadero o falso: "¿«Küla» significa «Tres»?", con Sí y No.
  - Son de práctica, como los otros armados. Al responder, el compañero dice qué significa la palabra. Con dibujos y verdadero o falso no se ofrecen pistas (serían la respuesta); al ordenar, la pista dice con qué palabra empieza.
- Al crear la tabla, las palabras de las etapas ya terminadas quedaron todas para hoy (en una cuenta, 59). Una migración de una sola vez (`migraciones`) las repartió en los próximos 7 días; las que costaron siguen primero. No se repite al reiniciar el servidor.
- "Mis palabras" también en el globo del compañero: es el primer consejo que aparece (una vez por dispositivo, cuando ya hay progreso), con el botón "Ver mis palabras" que lleva directo. Además, uno de los consejos que salen al tocarlo recuerda dónde está. Antes solo estaba arriba del mapa, y como el mapa se abre en la unidad actual, quien llevaba avance no lo veía.

### Actualización 26 de noviembre de 2026 (Kütral de reserva y resumen de la etapa)

**Hecho**
- Kütral de reserva: cuesta 50 Llankas y se pueden tener hasta 2. Si pasan días sin practicar y alcanzan las reservas para cubrirlos, al volver la racha sigue y se gastan las que hicieron falta; si no alcanzan, la racha parte de nuevo y las reservas no se gastan. La racha que muestra la app ya cuenta las reservas. La regla está en un solo lugar del servidor (`SQL_RACHA`), para lecciones y repasos.
- En el mapa, bajo la racha, un botón muestra las reservas y explica cómo funcionan antes de canjear. El compañero lo cuenta como consejo a quien lleva 2 días o más de racha y no tiene reservas. La explicación del Kütral también lo menciona.
- Al terminar, si una reserva cuidó la racha, se avisa.
- Resumen al terminar la etapa: cuántas preguntas se acertaron al primer intento, las palabras para repasar (las falladas) y las que salieron bien.
- Probado: canjear (y el límite de 2), un día sin practicar gasta 1, dos días gastan 2, cinco días reinician la racha sin gastarlas, y el resumen con dos errores.

**Decisiones**
- Nombre propio ("Kütral de reserva") y no el de otras apps.
- En los textos de la app se dice "canjear" y no "comprar": las Llankas se ganan jugando y nunca se paga con dinero, y "comprar" podía hacer pensar lo contrario. Vale para el Kütral de reserva y para el Newen ("CANJEAR 5 NEWEN").
- Versión 0.10.0 beta, por todo lo agregado (avisos, repaso espaciado, Mis palabras, ejercicios nuevos, Kütral de reserva, resumen). "Acerca de" actualizado: qué se guarda (cómo va cada palabra, las reservas), que no hay compras dentro de la app, y las explicaciones de Llanka y Newen.

### Actualización 26 de noviembre de 2026 (sin internet)

**Hecho**
- El service worker ahora también guarda la app: las pantallas (siempre la última versión, y la guardada si no hay red), el código, los estilos, las imágenes y las fuentes (lo guardado al tiro y se actualiza por detrás), y los datos del servidor que sirven para jugar (unidades, etapas, ejercicios, usuario, repaso y Mis palabras: primero la red y, si falla, lo guardado). El mapa pide por adelantado los ejercicios de la etapa que sigue.
- Lo jugado sin conexión (respuestas, Newen gastado, hasta qué pregunta se llegó y terminar lecciones y repasos) se guarda en el teléfono (`pendientes.ts`) y se envía en orden al abrir la app, al volver al mapa y cuando vuelve internet. Si el servidor rechaza algo viejo, se descarta; si se corta otra vez, sigue después.
- Al terminar una etapa sin conexión: "📴 Sin conexión. Tu avance quedó guardado en este teléfono y se enviará solo cuando vuelva internet", y se puede volver al mapa.
- Aviso de "Sin conexión" unos segundos abajo y después una etiqueta chica en la esquina, que no tapa botones. Sin conexión, el interceptor no reintenta ni muestra "despertando el servidor".
- Al cerrar sesión se intenta enviar lo pendiente y se borran los datos guardados de esa cuenta.
- "Acerca de" explica qué se guarda en el teléfono para jugar sin internet y que se borra al cerrar sesión.
- Probado en local: con la app abierta una vez, se cortó la conexión, se recargó el mapa, se jugó la etapa 1 completa, quedaron 6 envíos pendientes y, al volver la conexión, el servidor recibió la etapa terminada y las 5 respuestas.

**Pendiente**
- Sin conexión no se desbloquea la etapa siguiente hasta que el servidor recibe el avance. Tampoco funciona en la APK (usa los archivos instalados, pero no guarda los datos del servidor).
- Si se juega sin conexión y se envía al otro día, la racha cuenta el día en que llegó al servidor.
- Arreglo de la prueba en el celular: en modo avión el mapa no cargaba y las imágenes salían rotas. La primera visita después de publicar se carga antes de que el service worker nuevo tome el control, así que nada quedaba guardado. Ahora, al tomar el control, la app le manda la lista de lo que ya cargó (imágenes, estilos, código) para que lo guarde, y el mapa vuelve a pedir sus datos. Probado con una sola visita, sin recargar: sin conexión el mapa abre sin imágenes rotas y la etapa se juega completa.
- Si falta algo sin conexión, el mensaje lo dice ("Este teléfono todavía no tiene el mapa guardado…", "Esta etapa todavía no está guardada…") en vez de hablar del servidor despertando.
- Probado en el celular: en modo avión se jugó la etapa 2 de "Animales y Comida" (que el mapa había descargado por adelantado) y, al volver internet, el mapa la mostró completada.
- Las etapas ya desbloqueadas también se pueden repetir sin conexión: una vez al día, con internet, el mapa las descarga de a una y sin apuro. Antes solo estaban las abiertas desde la actualización.
- La palabra clave también se destaca en las preguntas culturales: «¿Cómo se llama *el ave de mal agüero*?», «¿Quién es…?», «¿Cuál es…?».

### Actualización 28 de noviembre de 2026 (pantallas anchas)

**Hecho**
- La app se adapta al computador y a la tablet en horizontal. En el teléfono no cambia nada: todo está dentro de `@media (min-width: 760px)` y `(min-width: 1180px)`.
- Lección (portada de la etapa, preguntas, resumen y "sin Newen"): el contenido va en una columna central de 680 px sobre un cielo de atardecer (azul, dorado, naranjo y el rojo de la franja), en vez de estirarse a todo el ancho. Las tarjetas son más sólidas, para que el fondo no compita con el texto. Los contadores del encabezado y el botón del pie quedan del mismo ancho que la columna.
- Mapa: desde 760 px el camino va en una columna central. Desde 1180 px el resumen (avance, Mis palabras, racha y Kütral de reserva) pasa a un panel fijo a la derecha, y Continuar y Repasar quedan debajo de ese panel.
- Probado en local a 1440×900, 1024×768 y 412×820 (teléfono, sin cambios).
- Ajuste tras verlo publicado en un notebook (pantalla de unos 690 px de alto): las alternativas no cabían sin bajar. En pantallas anchas, los cuatro contadores van en una sola línea, las alternativas en dos columnas, y detrás del pie va el mismo rojo con que termina el cielo (antes se veía una franja crema a los lados).
- «Palabras de esta etapa» en pantallas anchas: el panel es más ancho (640 px) y las palabras van en dos columnas, así se ven todas sin bajar dentro del panel.
- Ingresar en pantallas anchas: el logo y el saludo a la izquierda y el formulario a la derecha, para que quepa sin bajar en un notebook.
- Mapa desde 1180 px: el pie vuelve a ocupar todo el ancho, como en el teléfono, con Continuar y Repasar justo debajo del panel de la derecha (antes quedaba una franja crema vacía a la izquierda).

**Decisiones**
- Se tomó la idea de la columna central y el panel lateral, que es común en apps web; los colores, ilustraciones, compañeros y textos son de Kimanke.
- Ingresar, Crear cuenta, Bienvenida, Mis palabras y Acerca ya se veían centradas en el computador, así que no se tocaron.

**Pendiente**
- Modo noche: ordenar los colores en una paleta central primero (hoy hay unos 700 escritos directamente).
- Mis palabras desde 1180 px: los grupos (te cuestan, aprendiendo, dominadas) van lado a lado; si uno está vacío, los otros se reparten el ancho.

**Arreglo**
- Resumen al terminar la etapa: si en el emparejar se unían mal dos pares o más, «Para repasar» mostraba todas las palabras del ejercicio (por ejemplo, las 4 de la comida con 5 de 7 acertadas). Ahora solo aparecen las palabras de los pares que se unieron mal, y las demás quedan en «Te salieron bien». Probado: dos pares mal entre 3 palabras → esas 3 para repasar y la cuarta bien.
- Mis palabras: el resumen de arriba queda solo en su línea y centrado (antes, en algunos anchos, se ponía al lado de «Te cuestan» y «Aprendiendo» bajaba).
- Mapa desde 1180 px: sin barra abajo; el mapa sigue por detrás (`fullscreen` en `ion-content`) y Continuar y Repasar flotan bajo el panel. Se acabó la franja crema vacía.
- Mapa al entrar: después de bajar hasta el compañero se revisa una vez más (1,2 s después) que siga a la vista, porque el globo, los consejos y las imágenes pueden cambiar el alto del camino. En el notebook a veces quedaba más abajo, sin el compañero.
- Palabras de la etapa: si una palabra sale con dos traducciones, queda la más corta («Foye: Canelo» y no «El árbol sagrado mapuche», que viene de la pregunta cultural).

**Pendiente**
- La etapa 7-1 tiene solo 2 palabras activas (Foye y Kulen): se retiraron Pange y su emparejar hasta validarlos, así que el emparejar de práctica sale con 2 pares. Se arregla con contenido nuevo (folil, lawen…, en la planilla de la profesora).

### Actualización 28 de noviembre de 2026 (pregunta en dos columnas)

**Hecho**
- Desde 1180 px de ancho, la pregunta va en dos columnas, como Ingresar: a la izquierda el avance («Etapa · Pregunta»), Reportar error, las etiquetas y el compañero con su globo; a la derecha la pregunta y las respuestas (emparejar, alternativas, dibujos, escribir, completar la frase, ordenar). La tarjeta y el pie llegan a 1080 px. En tablets y teléfonos sigue en una sola columna.
- Como la explicación del compañero queda a un lado de las respuestas, al responder el globo se destaca: un pequeño salto, borde más grueso y un halo verde o rojo. Con «quitar animaciones» no salta.
- Probado a 1440×690 con todos los tipos de pregunta y con una respuesta incorrecta: todo queda a la vista sin bajar.

**Decisión**
- El resultado también se ve donde la persona está mirando (la respuesta elegida en verde o rojo); el globo agrega la explicación y la nota cultural.
