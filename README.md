# Kimanke

Aplicación gratuita para aprender y practicar mapuzugun con lecciones cortas, a tu ritmo.

> **Estado: prototipo en desarrollo.** El contenido (palabras, notas culturales, audios) todavía no ha sido validado por hablantes. Por eso no se publica en este repositorio, y la app no debería presentarse como material de enseñanza hasta que esa revisión exista.

## Cómo se cuida el contenido

Kimanke es un apoyo educativo sin fines comerciales. Nada de lo que enseña debería llegar al público sin que lo revisen hablantes y kimeltuchefe, así que el sistema está pensado alrededor de eso:

- Cada ejercicio nace como **borrador**. En producción, el servidor solo entrega los que están marcados como **aprobados**, con quién los revisó y cuándo.
- Si no hay nada aprobado, la app lo dice ("Estamos preparando las lecciones") en vez de mostrar contenido sin revisar.
- Este repositorio contiene el código y el esquema de la base de datos, no las lecciones.
- La app no usa símbolos sagrados (como el kultrun y su cruz) sin autorización de la comunidad.
- Los cuatro compañeros que acompañan a quien aprende (Pangipol, Manketor, Rakyfar y Teutimos) tienen nombres inventados para el proyecto, y la app lo aclara: no son palabras del mapuzugun.

Quedan por definir con hablantes: la ortografía y el significado del nombre "Kimanke", el grafemario que se usará en las lecciones y los nombres de las estadísticas del juego (Kütral, Kimün, Llanka y Newen son provisorios).

## Qué hace hoy

- Introducción de dos pantallas, que se muestra solo la primera vez.
- Registro e inicio de sesión. Al crear la cuenta se elige uno de cuatro compañeros animales (puma, cóndor, bandurria y monito del monte), y se puede cambiar después.
- Mapa de unidades con etapas. Cada etapa tiene 5 ejercicios; una unidad se desbloquea al terminar la anterior.
- Tres tipos de ejercicio: selección múltiple, escritura y emparejamiento. El audio se reproduce desde la URL del ejercicio, cuando la tiene.
- Juego: experiencia (Kimün), racha diaria (Kütral, con hora de Chile), gemas (Llanka) y vidas (Newen).
- Economía: 40 gemas al registrarse, 10 gemas por una etapa perfecta (solo la primera vez), 30 gemas por una recarga completa. Las vidas son 5 como máximo y se recupera una cada 10 minutos, o practicando.

## Tecnologías

- Frontend: Ionic 8 y Angular 18 (componentes standalone), con Capacitor para Android.
- Backend: Node.js y Express 5.
- Base de datos: PostgreSQL.

```text
/
├── app-mapuzugun/   # frontend (Ionic/Angular)
├── backend/         # API (server.js)
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

Cuando un hablante revise un ejercicio, se aprueba así:

```sql
UPDATE exercises
SET estado = 'aprobado', revisado_por = 'nombre o iniciales acordadas', revisado_en = CURRENT_DATE
WHERE unit_id = 1 AND stage = 1;
```

## Seguridad

- Contraseñas con `bcrypt` (mínimo 8 caracteres) y sesión con JWT de 7 días.
- La experiencia, las gemas y la racha las calcula el servidor. El cliente solo informa cuántos aciertos tuvo en una etapa, y el servidor limita ese número al total de ejercicios.
- Límite de intentos: 10 inicios de sesión fallidos cada 15 minutos y 10 registros por hora.
- CORS con lista de orígenes permitidos (`CORS_ORIGIN`).
- Limitación conocida: la respuesta correcta viaja a la app, para dar feedback inmediato y permitir uso sin conexión más adelante. Si algún día hubiera ranking o competencia entre usuarios, habría que validar cada respuesta en el servidor.

## Pendiente

- Validación del contenido y de los nombres con hablantes.
- Probar el APK y cambiar el `appId` de Capacitor (hoy `io.ionic.starter`) antes de publicar.
- Desplegar con HTTPS y definir la licencia del proyecto.

## Cómo colaborar

Si hablas mapuzugun y quieres revisar contenido o corregir algo, abre un *issue* en este repositorio. Toda corrección de la comunidad tiene prioridad sobre el código.

## Licencia

Por definir.