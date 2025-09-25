const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// 🔗 conexão MySQL
const db = mysql.createConnection({
  host: "mainline.proxy.rlwy.net",
  user: "root",
  password: "wWAgwpmKcnlbywafHzhycNOOcfTXCmpa",
  database: "railway",
  port: 13779 
});

// Teste da conexão
db.connect((err) => {
  if (err) {
    console.error("Erro ao conectar no MySQL:", err);
    return;
  }
  console.log("✅ Conectado ao MySQL");
});


// ================= SALAS =================
app.get("/salas", (req, res) => {
  db.query("SELECT * FROM salas", (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

app.post("/salas", (req, res) => {
  const { nome, capacidade } = req.body;
  db.query(
    "INSERT INTO salas (nome, capacidade) VALUES (?, ?)",
    [nome, capacidade],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ id: result.insertId, nome, capacidade });
    }
  );
});


// ================= MATÉRIAS =================
app.get("/materias", (req, res) => {
  const { salaId, ownerId } = req.query;
  let sql = "SELECT m.*, s.nome AS salaNome FROM materias m JOIN salas s ON m.salaId = s.id";
  const params = [];

  if (salaId) {
    sql += " WHERE m.salaId = ?";
    params.push(salaId);
  } else if (ownerId) {
    sql += " WHERE m.ownerId = ?";
    params.push(ownerId);
  }

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

app.get("/materias/:id", (req, res) => {
  const id = req.params.id;
  db.query("SELECT * FROM materias WHERE id = ?", [id], (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results[0] || {});
  });
});

app.post("/materias", (req, res) => {
  const { nome, salaId, ownerId } = req.body;
  db.query(
    "INSERT INTO materias (nome, salaId, ownerId) VALUES (?, ?, ?)",
    [nome, salaId, ownerId],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ id: result.insertId, nome, salaId, ownerId });
    }
  );
});


// ================= PROFESSORES =================
app.get("/professores", (req, res) => {
  db.query("SELECT * FROM professores", (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

app.post("/professores", (req, res) => {
  const { nome, cpf, mat, senha } = req.body;
  db.query(
    "INSERT INTO professores (nome, cpf, mat, senha) VALUES (?, ?, ?, ?)",
    [nome, cpf, mat, senha],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ id: result.insertId, nome, cpf, mat });
    }
  );
});


// ================= ALUNOS =================
app.get("/alunos", (req, res) => {
  const { salaId } = req.query;
  let sql = "SELECT * FROM alunos";
  const params = [];

  if (salaId) {
    sql += " WHERE salaId = ?";
    params.push(salaId);
  }

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

app.post("/alunos", (req, res) => {
  const { nome, ra, salaId } = req.body;
  db.query(
    "INSERT INTO alunos (nome, ra, salaId) VALUES (?, ?, ?)",
    [nome, ra, salaId],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ id: result.insertId, nome, ra, salaId });
    }
  );
});

app.put("/alunos/:id", (req, res) => {
  const id = req.params.id;
  const { salaId } = req.body;
  db.query(
    "UPDATE alunos SET salaId = ? WHERE id = ?",
    [salaId, id],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ id, salaId });
    }
  );
});


// ================= BANNERS =================
app.get("/banners", (req, res) => {
  db.query("SELECT * FROM banners", (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

app.post("/banners", (req, res) => {
  const { tit, data, hora, local, materias, dicas } = req.body;
  db.query(
    "INSERT INTO banners (tit, data, hora, local, materias, dicas) VALUES (?, ?, ?, ?, ?, ?)",
    [tit, data, hora, local, materias, dicas],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ id: result.insertId, tit, data, hora, local, materias, dicas });
    }
  );
});


// ================= START SERVER =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
