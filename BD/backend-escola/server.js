const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());


const db = mysql.createConnection({
  host: "mainline.proxy.rlwy.net",
  user: "root",
  password: "SUA_SENHA_AQUI",
  database: "railway",
  port: 13779
});

// 🔹 Rota teste
app.get("/", (req, res) => {
  res.send("API funcionando 🚀");
});

// 🔹 Cadastro usuário
app.post("/api/register", (req, res) => {
  const { role, nome, id, senha } = req.body;
  db.query(
    "INSERT INTO usuarios (role, nome, identificador, senha) VALUES (?, ?, ?, ?)",
    [role, nome, id, senha],
    (err, result) => {
      if (err) return res.status(500).json({ error: err });
      res.json({ message: "Usuário cadastrado!", userId: result.insertId });
    }
  );
});

// 🔹 Login
app.post("/api/login", (req, res) => {
  const { role, id, senha } = req.body;
  db.query(
    "SELECT * FROM usuarios WHERE role=? AND identificador=? AND senha=?",
    [role, id, senha],
    (err, result) => {
      if (err) return res.status(500).json({ error: err });
      if (result.length === 0) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }
      res.json(result[0]);
    }
  );
});

// 🔹 Listar matérias
app.get("/api/materias", (req, res) => {
  db.query("SELECT * FROM materias", (err, results) => {
    if (err) return res.status(500).json({ error: err });
    res.json(results);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));



