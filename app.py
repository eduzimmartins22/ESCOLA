
import os
import uuid
from datetime import datetime
from flask import Flask, jsonify, request, send_from_directory, render_template
from flask_cors import CORS
import pymysql
from pymysql.cursors import DictCursor
from dotenv import load_dotenv

# 🔹 1. Carregar variáveis de ambiente
load_dotenv()

# 🔹 2. Configs do Banco de Dados
DB_HOST = os.getenv("DB_HOST")
DB_PORT = int(os.getenv("DB_PORT", 3306))
DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASS")
DB_NAME = os.getenv("DB_NAME")

# 🔹 3. Configuração de Uploads
UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "static/uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)  # garante que a pasta existe

# 🔹 4. Inicializar Flask
app = Flask(__name__, static_folder="static", template_folder="templates")

# 🔹 5. Configuração de segurança e CORS
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
CORS(
    app,
    origins=[os.getenv("CORS_ALLOWED_ORIGINS", "*")],
    supports_credentials=True,
)

# 🔹 6. (Opcional) Usar SECRET_KEY
app.secret_key = os.getenv("SECRET_KEY", "chave_fallback")

# ---------- Helpers ----------
def get_conn():
    return pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        database=DB_NAME,
        cursorclass=DictCursor,
        autocommit=True,
    )

def gen_id():
    return str(uuid.uuid4())

def log_event(user_id, action, details=""):
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO logs (id, user_id, action, details, ts) VALUES (%s,%s,%s,%s,%s)",
            (gen_id(), user_id, action, details, datetime.utcnow()),
        )

# Serve frontend
@app.route("/")
def index():
     return send_from_directory(".", "index.html")

# ---------- AUTH / USERS ----------
@app.route("/api/login", methods=["POST"])
def login():
    data = request.json
    cpf, senha, role = data.get("cpf"), data.get("senha"), data.get("role")
    if not cpf or not senha or not role:
        return jsonify({"error": "missing"}), 400
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM users WHERE cpf=%s AND role=%s LIMIT 1", (cpf, role))
        u = cur.fetchone()
    if not u or u["senha_hash"] != senha:
        return jsonify({"error": "invalid"}), 401
    u.pop("senha_hash", None)
    log_event(u["id"], "login", f"User {cpf} logged in")
    return jsonify(u)

@app.route("/api/users", methods=["POST"])
def create_user():
    data = request.json
    uid = gen_id()
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO users (id, role, nome, cpf, matricula, senha_hash, sala_id)
            VALUES (%s,%s,%s,%s,%s,%s,%s)
            """,
            (
                uid,
                data.get("role"),
                data.get("nome"),
                data.get("cpf"),
                data.get("matricula"),
                data.get("senha"),
                data.get("sala_id"),
            ),
        )
    log_event(uid, "create_user", f"User {data.get('nome')}")
    return jsonify({"id": uid}), 201

@app.route("/api/users/<role>", methods=["GET"])
def list_users(role):
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute("SELECT id, nome, cpf, matricula, sala_id FROM users WHERE role=%s", (role,))
        rows = cur.fetchall()
    return jsonify(rows)

# ---------- SALAS ----------
@app.route("/api/salas", methods=["GET", "POST"])
def salas():
    conn = get_conn()
    if request.method == "GET":
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM salas ORDER BY nome")
            rows = cur.fetchall()
        return jsonify(rows)
    else:
        data = request.json
        uid = gen_id()
        with conn.cursor() as cur:
            cur.execute("INSERT INTO salas (id, nome, capacidade) VALUES (%s,%s,%s)",
                        (uid, data.get("nome"), int(data.get("capacidade") or 30)))
        log_event(None, "create_sala", data.get("nome"))
        return jsonify({"id": uid}), 201

# ---------- MATERIAS ----------
@app.route("/api/materias", methods=["GET", "POST"])
def materias():
    conn = get_conn()
    if request.method == "GET":
        owner_id = request.args.get("owner_id")
        sala_id = request.args.get("sala_id")
        q = "SELECT m.*, s.nome as sala_nome FROM materias m LEFT JOIN salas s ON m.sala_id=s.id"
        filters, params = [], []
        if owner_id:
            filters.append("m.owner_id=%s"); params.append(owner_id)
        if sala_id:
            filters.append("m.sala_id=%s"); params.append(sala_id)
        if filters:
            q += " WHERE " + " AND ".join(filters)
        with conn.cursor() as cur:
            cur.execute(q, params)
            rows = cur.fetchall()
        return jsonify(rows)
    else:
        data = request.json
        uid = gen_id()
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO materias (id, nome, sala_id, owner_id, quiz_facil, quiz_medio, quiz_dificil)
                VALUES (%s,%s,%s,%s,%s,%s,%s)
            """, (uid, data.get("nome"), data.get("sala_id"), data.get("owner_id"),
                  data.get("quiz_facil",60), data.get("quiz_medio",30), data.get("quiz_dificil",10)))
        log_event(data.get("owner_id"), "create_materia", data.get("nome"))
        return jsonify({"id": uid}), 201

# ---------- PERGUNTAS ----------
@app.route("/api/perguntas", methods=["GET", "POST"])
def perguntas():
    conn = get_conn()
    if request.method == "GET":
        materia_id = request.args.get("materia_id")
        q = "SELECT * FROM perguntas WHERE 1=1"
        params = []
        if materia_id:
            q += " AND materia_id=%s"; params.append(materia_id)
        with conn.cursor() as cur:
            cur.execute(q, params)
            rows = cur.fetchall()
        return jsonify(rows)
    else:
        data = request.json
        uid = gen_id()
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO perguntas (id, materia_id, nivel, enunciado, alt0, alt1, alt2, alt3, alt4, correta)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (uid, data.get("materia_id"), data.get("nivel"), data.get("enunciado"),
                  data.get("alt0"), data.get("alt1"), data.get("alt2"),
                  data.get("alt3"), data.get("alt4"), int(data.get("correta"))))
        log_event(None, "create_pergunta", f"Materia {data.get('materia_id')}")
        return jsonify({"id": uid}), 201

# ---------- CONTEUDOS ----------
@app.route("/api/conteudos", methods=["GET", "POST"])
def conteudos():
    conn = get_conn()
    if request.method == "GET":
        materia_id = request.args.get("materia_id")
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM conteudos WHERE materia_id=%s", (materia_id,))
            rows = cur.fetchall()
        return jsonify(rows)
    else:
        file = request.files.get("file")
        materia_id = request.form.get("materia_id")
        if not file or not materia_id:
            return jsonify({"error": "missing"}), 400
        ext = os.path.splitext(file.filename)[1]
        uid_name = gen_id() + ext
        dest = os.path.join(app.config["UPLOAD_FOLDER"], uid_name)
        file.save(dest)
        url = f"/{app.config['UPLOAD_FOLDER']}/{uid_name}"
        uid = gen_id()
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO conteudos (id, materia_id, nome, tipo, url)
                VALUES (%s,%s,%s,%s,%s)
            """, (uid, materia_id, file.filename, file.mimetype, url))
        log_event(None, "upload_conteudo", file.filename)
        return jsonify({"id": uid, "url": url}), 201

# ---------- BANNERS ----------
@app.route("/api/banners", methods=["GET", "POST"])
def banners():
    conn = get_conn()
    if request.method == "GET":
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM banners ORDER BY ts DESC")
            rows = cur.fetchall()
        return jsonify(rows)
    else:
        file = request.files.get("file")
        if not file:
            return jsonify({"error": "missing file"}), 400
        ext = os.path.splitext(file.filename)[1]
        uid_name = gen_id() + ext
        dest = os.path.join(app.config["UPLOAD_FOLDER"], uid_name)
        file.save(dest)
        url = f"/{app.config['UPLOAD_FOLDER']}/{uid_name}"
        uid = gen_id()
        with conn.cursor() as cur:
            cur.execute("INSERT INTO banners (id, nome, url, ts) VALUES (%s,%s,%s,%s)",
                        (uid, file.filename, url, datetime.utcnow()))
        log_event(None, "create_banner", file.filename)
        return jsonify({"id": uid, "url": url}), 201

@app.route("/api/banners/<id>", methods=["DELETE"])
def delete_banner(id):
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute("DELETE FROM banners WHERE id=%s", (id,))
    log_event(None, "delete_banner", id)
    return jsonify({"ok": True})

# ---------- RANKING ----------
@app.route("/api/ranking", methods=["GET", "POST"])
def ranking():
    conn = get_conn()
    if request.method == "GET":
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM ranking ORDER BY pontos DESC LIMIT 50")
            rows = cur.fetchall()
        return jsonify(rows)
    else:
        data = request.json
        uid = gen_id()
        with conn.cursor() as cur:
            cur.execute("INSERT INTO ranking (id, user_id, pontos, ts) VALUES (%s,%s,%s,%s)",
                        (uid, data.get("user_id"), int(data.get("pontos")), datetime.utcnow()))
        log_event(data.get("user_id"), "add_ranking", str(data.get("pontos")))
        return jsonify({"id": uid}), 201

# ---------- LOGS ----------
@app.route("/api/logs", methods=["GET"])
def logs():
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM logs ORDER BY ts DESC LIMIT 100")
        rows = cur.fetchall()
    return jsonify(rows)

# ---------- STATS ----------
@app.route("/api/stats", methods=["GET"])
def stats():
    conn = get_conn()
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) as total FROM users WHERE role='aluno'")
        alunos = cur.fetchone()["total"]
        cur.execute("SELECT COUNT(*) as total FROM users WHERE role='professor'")
        profs = cur.fetchone()["total"]
        cur.execute("SELECT COUNT(*) as total FROM materias")
        materias = cur.fetchone()["total"]
        cur.execute("SELECT COUNT(*) as total FROM perguntas")
        perguntas = cur.fetchone()["total"]
    return jsonify({
        "alunos": alunos,
        "professores": profs,
        "materias": materias,
        "perguntas": perguntas
    })

# Static uploads
@app.route("/static/uploads/<path:filename>")
def uploaded_file(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "not found"}), 404
    
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=(os.getenv("FLASK_DEBUG") == "1"))



