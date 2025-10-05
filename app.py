import os
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder='.', static_url_path='')

# ✅ Libera CORS (altere o domínio conforme seu site)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ===========================
# 🔹 ROTA PRINCIPAL (index)
# ===========================
@app.route('/')
def serve_index():
    """Serve o arquivo index.html da raiz"""
    return send_from_directory('.', 'index.html')


# ===========================
# 🔹 ROTAS DE API (exemplo)
# ===========================

@app.route('/api/login', methods=['POST'])
def login():
    """Login simples (exemplo)"""
    data = request.get_json()
    cpf = data.get('cpf')
    senha = data.get('senha')
    role = data.get('role')

    # Aqui você colocaria a validação real no banco
    if cpf == "123" and senha == "senha123":
        return jsonify({"status": "ok", "role": role, "msg": "Login realizado!"})
    else:
        return jsonify({"status": "erro", "msg": "Credenciais inválidas"}), 401


@app.route('/api/users/<role>', methods=['GET'])
def listar_usuarios(role):
    """Lista usuários conforme o tipo (aluno, professor, etc.)"""
    exemplo = [
        {"id": 1, "nome": "Maria", "role": role},
        {"id": 2, "nome": "João", "role": role},
    ]
    return jsonify(exemplo)


@app.route('/api/materias', methods=['GET'])
def listar_materias():
    materias = [
        {"id": 1, "nome": "Matemática"},
        {"id": 2, "nome": "História"},
    ]
    return jsonify(materias)


@app.route('/api/banners', methods=['GET'])
def listar_banners():
    banners = [
        {"id": 1, "titulo": "Bem-vindo!", "img": "banner1.jpg"},
        {"id": 2, "titulo": "Novo semestre!", "img": "banner2.jpg"},
    ]
    return jsonify(banners)


@app.route('/api/stats', methods=['GET'])
def estatisticas():
    stats = {
        "usuarios": 120,
        "materias": 8,
        "banners": 2
    }
    return jsonify(stats)


# ===========================
# 🔹 CATCH-ALL (para arquivos estáticos)
# ===========================
@app.route('/<path:path>')
def serve_static_files(path):
    """Serve qualquer arquivo da raiz (CSS, JS, imagens...)"""
    if os.path.exists(path):
        return send_from_directory('.', path)
    else:
        return send_from_directory('.', 'index.html')


# ===========================
# 🔹 EXECUÇÃO
# ===========================
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)
