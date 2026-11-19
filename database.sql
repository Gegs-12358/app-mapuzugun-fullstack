-- Esquema de la base de datos "mapuzugun_db" (PostgreSQL)
-- Para crearla desde cero:
--   CREATE DATABASE mapuzugun_db;
--   psql -U postgres -d mapuzugun_db -f database.sql

CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  username        VARCHAR(50) UNIQUE NOT NULL,
  password        VARCHAR(255),                 -- hash bcrypt
  xp              INT DEFAULT 0,
  streak          INT DEFAULT 0,
  last_played     DATE,                         -- último día practicado (hora de Chile)
  lives           INT DEFAULT 5,
  gems            INT DEFAULT 40,
  last_life_regen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  avatar          VARCHAR(20) NOT NULL DEFAULT 'puma'
                  CHECK (avatar IN ('puma', 'aguila', 'bandurria', 'monito', 'pudu', 'ranita'))
);

-- Si tu base ya existía con la lista antigua de avatares, actualízala así:
--   ALTER TABLE users DROP CONSTRAINT users_avatar_check;
--   ALTER TABLE users ADD CONSTRAINT users_avatar_check
--     CHECK (avatar IN ('puma', 'aguila', 'bandurria', 'monito', 'pudu', 'ranita'));

CREATE TABLE IF NOT EXISTS units (
  id                SERIAL PRIMARY KEY,
  title             VARCHAR(100) NOT NULL,
  -- Nota cultural ("Sabías que…") que se muestra al terminar una etapa de la unidad.
  -- Sigue la misma regla que los ejercicios: solo se entrega si está aprobada.
  nota_cultural     TEXT,
  nota_estado       TEXT NOT NULL DEFAULT 'borrador'
                    CHECK (nota_estado IN ('borrador', 'aprobado')),
  nota_revisada_por TEXT,                       -- quién revisó (solo con su consentimiento)
  nota_revisada_en  DATE
);

-- Si tu base ya existía sin las columnas de la nota cultural, agrégalas así:
--   ALTER TABLE units ADD COLUMN IF NOT EXISTS nota_cultural TEXT;
--   ALTER TABLE units ADD COLUMN IF NOT EXISTS nota_estado TEXT NOT NULL DEFAULT 'borrador'
--     CHECK (nota_estado IN ('borrador', 'aprobado'));
--   ALTER TABLE units ADD COLUMN IF NOT EXISTS nota_revisada_por TEXT;
--   ALTER TABLE units ADD COLUMN IF NOT EXISTS nota_revisada_en DATE;

CREATE TABLE IF NOT EXISTS exercises (
  id             SERIAL PRIMARY KEY,
  unit_id        INT REFERENCES units(id),
  stage          INT DEFAULT 1,
  type           VARCHAR(20) DEFAULT 'multiple_choice',  -- multiple_choice | write | match
  question       TEXT NOT NULL,
  correct_answer VARCHAR(100) NOT NULL,
  options        JSONB NOT NULL,
  audio_url      VARCHAR(255),
  cultural_note  TEXT,
  estado         TEXT NOT NULL DEFAULT 'borrador'
                 CHECK (estado IN ('borrador', 'aprobado')),
  revisado_por   TEXT,                          -- quién revisó (solo con su consentimiento)
  revisado_en    DATE,
  -- Alfabeto en que está escrito el ejercicio. La app usa el Unificado por defecto.
  grafemario     TEXT NOT NULL DEFAULT 'unificado'
                 CHECK (grafemario IN ('unificado', 'azumchefe', 'raguileo')),
  -- Territorio o variante, según quien aportó la palabra o el audio
  -- (por ejemplo 'Lafkenche', 'Pewenche'). 'General' si se usa en todos lados.
  -- NULL = todavía no se sabe.
  variante       TEXT
);

-- Si tu base ya existía sin grafemario ni variante, agrégalos así:
--   ALTER TABLE exercises ADD COLUMN IF NOT EXISTS grafemario TEXT NOT NULL DEFAULT 'unificado'
--     CHECK (grafemario IN ('unificado', 'azumchefe', 'raguileo'));
--   ALTER TABLE exercises ADD COLUMN IF NOT EXISTS variante TEXT;

CREATE INDEX IF NOT EXISTS idx_exercises_unit ON exercises(unit_id);

CREATE TABLE IF NOT EXISTS stages (
  unit_id INT REFERENCES units(id),
  stage   INT NOT NULL,
  title   VARCHAR(100),                         -- subtemática (pendiente de validar con hablantes)
  PRIMARY KEY (unit_id, stage)
);

CREATE TABLE IF NOT EXISTS user_progress (
  id           SERIAL PRIMARY KEY,
  username     VARCHAR(50) REFERENCES users(username) ON DELETE CASCADE,
  unit_id      INT REFERENCES units(id),
  stage        INT NOT NULL DEFAULT 1,
  completed    BOOLEAN DEFAULT FALSE,
  score        INT DEFAULT 0,                   -- mejor cantidad de aciertos en la etapa
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (username, unit_id, stage)
);