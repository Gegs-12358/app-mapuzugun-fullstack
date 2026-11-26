# Kimanke

Aplicación gratuita para aprender y practicar mapuzugun con lecciones cortas, a tu ritmo.

> **Estado: beta (0.9.0), en prueba con un grupo de un taller de mapuzugun.** El contenido (palabras, notas culturales, audios) todavía no ha sido validado por hablantes: está en revisión y la app lo indica en cada pregunta. Por eso las lecciones no se publican en este repositorio, y la app no debería presentarse como material de enseñanza hasta que esa revisión exista.
>
> - Versión web: https://kimanke.onrender.com (funciona en cualquier navegador, también en iPhone).
> - Android: APK de prueba, compartida directamente con quienes prueban.

## Cómo se cuida el contenido

Kimanke es un apoyo educativo sin fines comerciales. Nada de lo que enseña debería llegar al público sin que lo revisen hablantes y kimeltuchefe, así que el sistema está pensado alrededor de eso:

- Cada ejercicio nace como **borrador**. Con `CONTENIDO_BORRADOR=false`, el servidor solo entrega los que están marcados como **aprobados**, con quién los revisó y cuándo. Durante la beta está en `true`: se muestran los borradores con la etiqueta "Contenido en revisión".
- Lo que tiene errores se marca como **retirado**: deja de mostrarse en cualquier modo, pero no se borra, para poder corregirlo.
- En cada pregunta hay un botón **Reportar error** que abre un correo con la pregunta ya identificada.
- Si no hay nada aprobado, la app lo dice ("Estamos preparando las lecciones") en vez de mostrar contenido sin revisar.
- Este repositorio contiene el código y el esquema de la base de datos, no las lecciones.
- Al empezar, cada persona acepta **Nuestro acuerdo** (`app-mapuzugun/src/app/acuerdo.ts`): la app es gratuita y sin publicidad, apoya pero no reemplaza la enseñanza con hablantes y kimeltuchefe, la lengua tiene variantes y el contenido está en revisión. Nació de la encuesta a la comunidad. Si se cambia el texto, se sube la versión y se vuelve a pedir.
- La app no usa símbolos sagrados (como el kultrun y su cruz) sin autorización de la comunidad.
- Los compañeros que acompañan a quien aprende tienen nombres inventados para el proyecto, y la app lo aclara: no son palabras del mapuzugun.

- Las lecciones usan el **grafemario Unificado**, el que se usa en los cursos de quienes participan en el proyecto. Cada ejercicio guarda su grafemario (`unificado`, `azumchefe` o `raguileo`) para poder sumar otros más adelante.
- Cada palabra puede indicar su **variante territorial** (columna `variante`, por ejemplo `Lafkenche`, o `General` si se usa en todos lados). La indica quien aporta la palabra o el audio, no se supone.

Quedan por definir con hablantes: la ortografía y el significado del nombre "Kimanke" y los nombres de las estadísticas del juego (Kütral, Kimün, Llanka y Newen son provisorios).

## Qué hace hoy

- Introducción de cuatro pantallas (bienvenida, compañeros, cómo funciona y nuestro acuerdo), que se muestra solo la primera vez. Se puede volver atrás deslizando o con el botón atrás de Android.
- Registro e inicio de sesión. Mientras se escribe el nombre de usuario, la app avisa si está ocupado y sugiere otros. Al crear la cuenta se elige uno de seis compañeros animales (puma, cóndor, bandurria, monito del monte, pudú y ranita de Darwin), que se presenta y se puede cambiar después. Desde el panel del compañero (tocando la foto en el mapa) también se puede cambiar el nombre de usuario, con la contraseña; el progreso se mantiene.
- **Correo para recuperar la contraseña:** cada cuenta debe tener un correo confirmado con un código de 6 números. Las cuentas que no lo tienen lo agregan al volver a entrar, antes de seguir jugando. En el inicio de sesión, "¿Olvidaste tu contraseña?" envía un código para elegir una nueva. Se exige solo cuando el servidor puede enviar correos (Brevo configurado).
- Mapa con **niveles** (`src/app/niveles.ts`): 1 Primeros pasos, 2 Vida diaria y 3 Territorio y cosmovisión. Cada nivel agrupa unidades, cada unidad tiene etapas y cada etapa unas 5 preguntas. Una unidad se desbloquea al terminar la anterior. La unidad que toca brilla, el compañero se para a su lado y el pie del mapa dice qué sigue.
- Cuatro tipos de ejercicio: selección múltiple, escritura, completar la frase y emparejamiento. El audio se reproduce desde la URL del ejercicio, cuando la tiene.
- **Repaso**: cada respuesta se guarda, y el mapa ofrece repasar las palabras que más costaron. Una palabra sale del repaso al responderla bien dos veces seguidas. El repaso no gasta Newen.
- **Accesibilidad:** en el panel del compañero se elige el tamaño de letra (Normal, Grande o Muy grande) y se pueden quitar las animaciones ("Menos movimiento"). Se guarda en cada dispositivo. La app también respeta la opción de reducir movimiento del sistema y permite hacer zoom.
- **Avisos:** en la APK de Android, un recordatorio local a la hora que la persona elija, que se salta si ese día ya practicó. En la web, avisos del navegador (`src/sw.js` y `src/app/avisos-web.ts`): el recordatorio diario y, si la persona lo acepta, avisos cuando hay mejoras. En Android funcionan en el navegador; en iPhone (iOS 16.4 o más) solo con Kimanke agregada a la pantalla de inicio y abierta desde ese ícono.
- **Dónde se deja una etapa:** se guarda hasta qué pregunta llegó cada intento (`intentos_etapa`), para ver qué preguntas hacen que la gente abandone.
- Juego: experiencia (Kimün), racha diaria (Kütral, con hora de Chile), gemas (Llanka) y vidas (Newen). Al tocarlos en la barra de la lección se explica qué significa cada palabra.
- Economía: 40 Llankas al registrarse, 2 por acierto la primera vez que se completa una etapa, 30 por una recarga completa de Newen. El Newen es 5 como máximo y se recupera uno cada 10 minutos, o practicando.

## Compañeros animados

Cada compañero tiene cinco poses (sentado, ojos cerrados, feliz, saltando y saludando) para parpadear y reaccionar durante la lección y en el mapa. Hoy los seis las tienen.

Para agregar las poses de un compañero nuevo:

1. En Canva, crea las cinco versiones sobre el mismo lienzo, sin mover ni cambiar el tamaño del personaje, y descárgalas como PNG con fondo transparente.
2. Desde la carpeta del proyecto, ejecuta (necesita `python3-pil`):
   ```bash
   python3 scripts/preparar_poses.py puma sentado.png ojos.png feliz.png saltando.png saludando.png
   ```
3. En `app-mapuzugun/src/app/avatars.ts`, agrega `poses: true` al compañero.

## Tecnologías

- Frontend: Ionic 8 y Angular 18 (componentes standalone), con Capacitor para Android.
- Backend: Node.js y Express 5.
- Base de datos: PostgreSQL.

```text
/
├── app-mapuzugun/   # frontend (Ionic/Angular)
├── backend/         # API (server.js)
├── scripts/         # íconos de la app, ícono de notificación y poses de los compañeros
├── database.sql     # esquema de la base de datos
└── BITACORA_DESARROLLO.md
```

## Cómo ejecutarlo en tu computador

Necesitas Node.js, PostgreSQL y Ionic CLI (`npm install -g @ionic/cli`).

**1. Base de datos**

```bash
createdb -U postgres mapuzugun_db
psql -U postgres -d mapuzugun_db -f database.sql
```

**2. Backend**

```bash
cd backend
npm install
cp .env.example .env     # en PowerShell: Copy-Item .env.example .env
```

Abre `.env` y completa `DB_PASSWORD` y `JWT_SECRET`. Para el secreto puedes generar uno así:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Para desarrollo, pon también `CONTENIDO_BORRADOR=true`. Luego:

```bash
node server.js           # http://localhost:3000
```

Al arrancar, el servidor crea lo que falte en la base (por ejemplo la tabla de errores para el repaso), así que no hace falta correr SQL a mano después de cada actualización.

El archivo `.env` nunca debe subirse a Git. Si cambias algo en `server.js` o en `.env`, reinicia el servidor: no se recarga solo.

**3. Frontend**

```bash
cd app-mapuzugun
npm install
ionic serve              # http://localhost:8100
```

**4. Contenido de ejemplo**

La base queda vacía. Para ver la app funcionando, inserta una unidad con texto de relleno (con `CONTENIDO_BORRADOR=true` se muestra aunque sea borrador):

```sql
INSERT INTO units (title) VALUES ('Unidad de ejemplo');
INSERT INTO stages (unit_id, stage, title) VALUES (1, 1, 'Etapa de ejemplo');
INSERT INTO exercises (unit_id, stage, type, question, correct_answer, options)
VALUES (1, 1, 'multiple_choice', 'Pregunta de ejemplo', 'Opción A',
        '["Opción A", "Opción B", "Opción C", "Opción D"]');
```

Para indicar la variante de una palabra (según quien la aportó):

```sql
UPDATE exercises SET variante = 'Lafkenche' WHERE id = 1;
```

Cuando un hablante revise un ejercicio, se aprueba así:

```sql
UPDATE exercises
SET estado = 'aprobado', revisado_por = 'nombre o iniciales acordadas', revisado_en = CURRENT_DATE
WHERE unit_id = 1 AND stage = 1;
```

Las notas culturales ("Sabías que…") de cada unidad siguen la misma regla: se guardan en la tabla `units` como borrador y solo se muestran cuando se aprueban:

```sql
UPDATE units
SET nota_estado = 'aprobado', nota_revisada_por = 'nombre o iniciales acordadas', nota_revisada_en = CURRENT_DATE
WHERE id = 1;
```

## Dónde está publicada

- **Base de datos:** PostgreSQL en Neon (plan gratuito).
- **Servidor:** Render, servicio web `kimanke-api`. Variables de entorno en Render: las del `.env`, más `CORS_ORIGIN` con los orígenes de la app (`https://localhost` para la APK y `https://kimanke.onrender.com` para la web).
- **Versión web:** Render, sitio estático `kimanke` (carpeta `app-mapuzugun`, build `npm ci && npx ng build`, publica `www/browser`, con una regla que reescribe `/*` a `/index.html`).
- **Correos:** se envían con la API de Brevo (plan gratuito). Variables en `kimanke-api`: `BREVO_API_KEY` y `CORREO_REMITENTE` (el correo verificado en Brevo). Sin ellas, la app no pide correo a nadie.
- **Servidor despierto:** el plan gratuito de Render se duerme tras 15 minutos sin uso. Una tarea en cron-job.org consulta `/api/salud` cada 10 minutos.
- **Avisos web:** variables en `kimanke-api`: `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY` (se generan con `npx web-push generate-vapid-keys`), `VAPID_CONTACTO` y `AVISOS_SECRETO`. Otra tarea en cron-job.org llama cada 15 minutos a `POST /api/avisos/recordatorios` con el encabezado `x-avisos-secreto`. Las novedades se mandan a mano con `POST /api/avisos/novedad` (`{"titulo": "...", "texto": "..."}`), con el mismo encabezado. Sin las claves, los avisos quedan apagados.
- Cada cambio que llega a `main` en GitHub se publica solo en Render. La APK, en cambio, hay que compilarla y compartirla de nuevo.

**Respaldo de la base:** con el cliente de PostgreSQL 18 (la versión de Neon), guardando el archivo fuera del repositorio:

```bash
/usr/lib/postgresql/18/bin/pg_dump "$URL_DE_NEON" -Fc -f ~/respaldos/kimanke-$(date +%F).dump
```

**Compilar la APK:**

```bash
cd app-mapuzugun
npm install
npx ng build
npx cap sync android
cd .. && python3 scripts/crear_icono_notificacion.py
```

Después, en Android Studio: Build → Build App Bundle(s) / APK(s) → Build APK(s).

## Seguridad

- Contraseñas con `bcrypt` (mínimo 8 caracteres) y sesión con JWT de 7 días.
- La experiencia, las gemas y la racha las calcula el servidor. El cliente solo informa cuántos aciertos tuvo en una etapa, y el servidor limita ese número al total de ejercicios.
- Límite de intentos: 10 inicios de sesión fallidos cada 15 minutos y 10 registros por hora.
- CORS con lista de orígenes permitidos (`CORS_ORIGIN`).
- Limitación conocida: la respuesta correcta viaja a la app, para dar feedback inmediato y permitir uso sin conexión más adelante. Si algún día hubiera ranking o competencia entre usuarios, habría que validar cada respuesta en el servidor.

## Pendiente

- Validación del contenido y de los nombres con hablantes. Hay una planilla de revisión con todas las preguntas y notas, marcadas según la urgencia.
- Rehacer con hablantes las preguntas retiradas (por ejemplo "no", pie, nueve, abuelo y abuela) y grabar audios con consentimiento.
- Generar una llave de firma nueva para publicar en Play Store y guardarla **fuera** del repositorio (`*.jks` está en `.gitignore`).

## Cómo colaborar

Si hablas mapuzugun y quieres revisar contenido o corregir algo, abre un *issue* en este repositorio. Toda corrección de la comunidad tiene prioridad sobre el código.

## Licencia

Todos los derechos reservados. Ver [LICENSE](LICENSE).