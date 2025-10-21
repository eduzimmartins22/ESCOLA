CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  role ENUM('aluno','professor','coordenador') NOT NULL,
  nome VARCHAR(255) NOT NULL,
  cpf VARCHAR(20) UNIQUE,
  matricula VARCHAR(100),
  senha_hash VARCHAR(255) NOT NULL,
  sala_id VARCHAR(36),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE salas (
  id VARCHAR(36) PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  capacidade INT DEFAULT 30,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE materias (
  id VARCHAR(36) PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  sala_id VARCHAR(36),
  owner_id VARCHAR(36),
  quiz_facil INT DEFAULT 60,
  quiz_medio INT DEFAULT 30,
  quiz_dificil INT DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE perguntas (
  id VARCHAR(36) PRIMARY KEY,
  materia_id VARCHAR(36) NOT NULL,
  nivel ENUM('facil','medio','dificil') NOT NULL,
  enunciado TEXT NOT NULL,
  alt0 TEXT NOT NULL,
  alt1 TEXT NOT NULL,
  alt2 TEXT NOT NULL,
  alt3 TEXT NOT NULL,
  alt4 TEXT NOT NULL,
  correta TINYINT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE conteudos (
  id VARCHAR(36) PRIMARY KEY,
  materia_id VARCHAR(36) NOT NULL,
  nome VARCHAR(255),
  tipo VARCHAR(100),
  url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE banners (
  id VARCHAR(36) PRIMARY KEY,
  tit VARCHAR(255),
  data_evento DATE,
  hora TIME,
  local VARCHAR(255),
  materias VARCHAR(255),
  dicas TEXT,
  img_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE access_logs (
  id VARCHAR(36) PRIMARY KEY,
  user_name VARCHAR(255),
  user_role ENUM('aluno','professor','coordenador'),
  login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  logout_time TIMESTAMP NULL DEFAULT NULL,
  user_id VARCHAR(36)
);

CREATE TABLE app_stats ( 
stat_key VARCHAR(100) PRIMARY KEY, 
stat_value BIGINT DEFAULT 0);

CREATE TABLE ranking (
  id VARCHAR(36) PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  score INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Índices/constraints adicionais podem ser adicionados conforme necessário
