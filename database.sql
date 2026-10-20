-- Crear tablas
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  xp INT DEFAULT 120,
  streak INT DEFAULT 3,
  last_played DATE DEFAULT CURRENT_DATE
);

CREATE TABLE units (
  id SERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL
);

CREATE TABLE exercises (
  id SERIAL PRIMARY KEY,
  unit_id INT REFERENCES units(id),
  question TEXT NOT NULL,
  correct_answer VARCHAR(100) NOT NULL,
  options JSONB NOT NULL,
  audio_url VARCHAR(255)
);

-- Insertar usuario de prueba
INSERT INTO users (username, xp, streak) VALUES ('estudiante1', 120, 3);

-- Insertar unidades
INSERT INTO units (title) VALUES ('Saludos'), ('Me presento'), ('Mi familia');

-- Insertar preguntas (Unidad 1: Saludos)
INSERT INTO exercises (unit_id, question, correct_answer, options, audio_url) VALUES 
(1, '¿Qué saludo escuchaste?', 'Mari mari', '["Mari mari", "Peukayal", "Kümelkülen", "Inche"]', 'assets/audio/mari_mari.mp3'),
(1, '¿Cómo se dice "Gracias"?', 'Chaltu mai', '["Chaltu mai", "Mari mari", "Peukayal", "Inche"]', 'assets/audio/mari_mari.mp3'),
(1, '¿Qué significa "Peukayal"?', 'Hasta luego', '["Hola", "Hasta luego", "Buenos días", "Gracias"]', 'assets/audio/mari_mari.mp3'),
(1, '¿Cómo se dice "Yo"?', 'Inche', '["Inche", "Eymi", "Tüfa", "Mari mari"]', 'assets/audio/mari_mari.mp3');

-- Insertar preguntas (Unidad 2: Me presento)
INSERT INTO exercises (unit_id, question, correct_answer, options, audio_url) VALUES 
(2, '¿Cómo se dice "Tú"?', 'Eymi', '["Eymi", "Inche", "Tüfa", "Fey"]', 'assets/audio/mari_mari.mp3'),
(2, '¿Cómo se dice "¿Cómo te llamas?"?', 'Iney pigeymi?', '["Iney pigeymi?", "Mari mari", "Kümelkülen", "Peukayal"]', 'assets/audio/mari_mari.mp3'),
(2, '¿Cómo se dice "Me llamo..."?', '... pigey', '["... pigey", "Inche", "Eymi", "Mari mari"]', 'assets/audio/mari_mari.mp3'),
(2, '¿Cómo se dice "Buenos días"?', 'Kümelküle', '["Kümelküle", "Mari mari", "Peukayal", "Inche"]', 'assets/audio/mari_mari.mp3');

-- Insertar preguntas (Unidad 3: Mi familia)
INSERT INTO exercises (unit_id, question, correct_answer, options, audio_url) VALUES 
(3, '¿Cómo se dice "Padre"?', 'Chaw', '["Chaw", "Ñuke", "Weche", "Malle"]', 'assets/audio/mari_mari.mp3'),
(3, '¿Cómo se dice "Madre"?', 'Ñuke', '["Ñuke", "Chaw", "Weche", "Malle"]', 'assets/audio/mari_mari.mp3'),
(3, '¿Cómo se dice "Hermano"?', 'Peñi', '["Peñi", "Lamngen", "Chaw", "Ñuke"]', 'assets/audio/mari_mari.mp3'),
(3, '¿Cómo se dice "Hermana"?', 'Lamngen', '["Lamngen", "Peñi", "Chaw", "Ñuke"]', 'assets/audio/mari_mari.mp3');