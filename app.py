import os
import pymysql.cursors
from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
from dotenv import load_dotenv
import re
import uuid
import bcrypt

# Carrega as variáveis de ambiente do arquivo .env
load_dotenv()

app = Flask(__name__, static_folder="static", template_folder="templates")

# CORS liberado para a API, permitindo que seu frontend se comunique com o backend
CORS(app, resources={r"/api/*": {"origins": "*"}})

# --- Configuração da Conexão com o Banco de Dados ---
def get_db_connection():
    """Cria e retorna uma nova conexão com o banco de dados."""
    try:
        connection = pymysql.connect(
            host=os.getenv('DB_HOST'),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD'),
            database=os.getenv('DB_NAME'),
            cursorclass=pymysql.cursors.DictCursor, # Retorna resultados como dicionários
            autocommit=True # Garante que os comandos sejam executados imediatamente
        )
        return connection
    except pymysql.MySQLError as e:
        print(f"Erro ao conectar ao banco de dados: {e}")
        return None

# ===========================
# 🔹 ROTA PRINCIPAL
# ===========================
@app.route('/')
def index():
    """Serve a página principal da aplicação."""
    return render_template('index.html')

# ===========================
# 🔹 ROTAS DE API - AUTENTICAÇÃO E USUÁRIOS
# ===========================

@app.route('/api/login', methods=['POST'])
def login():
    """Autentica um usuário e retorna seus dados se as credenciais forem válidas."""
    data = request.get_json()
    cpf = (data.get('cpf') or "").strip()
    senha = (data.get('senha') or "").strip()
    role = data.get('role')

    if not re.fullmatch(r"\d{11}", cpf):
        return jsonify({"error": "CPF inválido. Use 11 dígitos numéricos."}), 400
    if not senha or not role:
        return jsonify({"error": "CPF, senha e perfil são obrigatórios."}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Falha na conexão com o servidor."}), 500
        
    try:
        with conn.cursor() as cursor:
            sql = "SELECT id, nome, cpf, role, sala_id, senha_hash FROM users WHERE cpf=%s AND role=%s"
            cursor.execute(sql, (cpf, role))
            user = cursor.fetchone()

            if user and bcrypt.checkpw(senha.encode('utf-8'), user['senha_hash'].encode('utf-8')):
                del user['senha_hash']
                return jsonify({"user": user})
            else:
                return jsonify({"error": "Credenciais inválidas"}), 401
    finally:
        conn.close()

@app.route('/api/users', methods=['POST'])
def create_user():
    """Cria um novo usuário (aluno, professor ou coordenador)."""
    data = request.get_json()
    role = data.get('role')
    
    if not all(k in data for k in ['nome', 'cpf', 'senha', 'role']):
        return jsonify({"error": "Campos nome, cpf, senha e role são obrigatórios"}), 400

    senha_hash = bcrypt.hashpw(data['senha'].encode('utf-8'), bcrypt.gensalt())

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Falha na conexão com o servidor."}), 500

    try:
        with conn.cursor() as cursor:
            sql = """
                INSERT INTO users (id, role, nome, cpf, matricula, senha_hash, sala_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            user_id = str(uuid.uuid4())
            cursor.execute(sql, (
                user_id,
                role,
                data['nome'],
                data['cpf'],
                data.get('mat'),
                senha_hash,
                data.get('sala_id')
            ))
        return jsonify({"message": f"{role.capitalize()} criado com sucesso!", "id": user_id}), 201
    except pymysql.IntegrityError:
        return jsonify({"error": "CPF já cadastrado."}), 409
    finally:
        conn.close()

@app.route('/api/users/<role>', methods=['GET'])
def list_users(role):
    """Lista todos os usuários de um determinado perfil."""
    # ### CORREÇÃO 1: Aceita os papéis no plural ###
    valid_roles = ['aluno', 'professor', 'coordenador', 'alunos', 'professores', 'coordenadores']
    if role not in valid_roles:
        return jsonify({"error": "Perfil inválido"}), 400
    
    # Converte para o singular para a consulta no banco de dados
    db_role = role.rstrip('es')

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Falha na conexão com o servidor."}), 500

    try:
        with conn.cursor() as cursor:
            sql = "SELECT id, nome, cpf, matricula, sala_id FROM users WHERE role = %s"
            cursor.execute(sql, (db_role,))
            users = cursor.fetchall()
            return jsonify(users)
    finally:
        conn.close()
        
@app.route('/api/users/<role>/<user_id>', methods=['PUT'])
def update_user(role, user_id):
    """Atualiza os dados de um usuário específico."""
    data = request.get_json()

    # ### LOG ADICIONADO 1: Ver o que o backend recebeu ###
    print("--- Dados recebidos para atualização ---")
    print(data) 

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Falha na conexão com o servidor."}), 500

    try:
        with conn.cursor() as cursor:
            fields = []
            params = []

            if 'nome' in data:
                fields.append("nome = %s")
                params.append(data['nome'])

            if 'mat' in data:
                fields.append("matricula = %s")
                params.append(data['mat'])

            if 'cpf' in data:
                fields.append("cpf = %s")
                params.append(data['cpf'])

            if 'senha' in data and data['senha']:
                senha_hash = bcrypt.hashpw(data['senha'].encode('utf-8'), bcrypt.gensalt())
                fields.append("senha_hash = %s")
                params.append(senha_hash)

            if 'salaId' in data:
                fields.append("sala_id = %s")
                params.append(data['salaId'])

            if not fields:
                print("Nenhum campo válido encontrado para atualizar.") # LOG ADICIONAL
                return jsonify({"error": "Nenhum campo para atualizar"}), 400

            params.append(user_id)
            sql = f"UPDATE users SET {', '.join(fields)} WHERE id = %s"

            # ### LOG ADICIONADO 2: Ver o SQL e os parâmetros ###
            print("--- Executando SQL ---")
            print(sql)
            print("Parâmetros:", tuple(params))

            cursor.execute(sql, tuple(params))

        return jsonify({"message": "Usuário atualizado com sucesso!"}), 200
    except Exception as e: # LOG ADICIONAL: Captura qualquer erro SQL
        print("!!! Erro durante a execução do SQL !!!")
        print(e)
        return jsonify({"error": "Erro ao atualizar no banco de dados"}), 500
    finally:
        conn.close()

@app.route('/api/users/<role>/<user_id>', methods=['DELETE'])
def delete_user(role, user_id):
    """Exclui um usuário."""
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Falha na conexão com o servidor."}), 500
        
    try:
        with conn.cursor() as cursor:
            sql = "DELETE FROM users WHERE id = %s AND role = %s"
            result = cursor.execute(sql, (user_id, role))
            if result == 0:
                return jsonify({"error": "Usuário não encontrado"}), 404
        return jsonify({"message": "Usuário excluído com sucesso!"}), 200
    finally:
        conn.close()

# ... (O restante das suas rotas de salas e matérias continua igual) ...
@app.route('/api/salas', methods=['GET'])
def list_salas():
    """Lista todas as salas."""
    conn = get_db_connection()
    if not conn: return jsonify([]), 500
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT id, nome, capacidade FROM salas")
            return jsonify(cursor.fetchall())
    finally:
        conn.close()

@app.route('/api/salas', methods=['POST'])
def create_sala():
    """Cria uma nova sala."""
    data = request.get_json()
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Falha na conexão"}), 500
    try:
        with conn.cursor() as cursor:
            sala_id = str(uuid.uuid4())
            sql = "INSERT INTO salas (id, nome, capacidade) VALUES (%s, %s, %s)"
            cursor.execute(sql, (sala_id, data['nome'], data['capacidade']))
        return jsonify({"message": "Sala criada com sucesso!", "id": sala_id}), 201
    finally:
        conn.close()

@app.route('/api/salas/<sala_id>', methods=['PUT'])
def update_sala(sala_id):
    """Atualiza os dados de uma sala específica."""
    data = request.get_json()
    
    # Validações básicas
    if not data or 'nome' not in data or 'capacidade' not in data:
        return jsonify({"error": "Campos nome e capacidade são obrigatórios"}), 400
        
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Falha na conexão com o servidor."}), 500
        
    try:
        with conn.cursor() as cursor:
            sql = "UPDATE salas SET nome = %s, capacidade = %s WHERE id = %s"
            result = cursor.execute(sql, (data['nome'], data['capacidade'], sala_id))
            
            if result == 0:
                return jsonify({"error": "Sala não encontrada"}), 404
                
        return jsonify({"message": "Sala atualizada com sucesso!"}), 200
    except Exception as e:
        print(f"Erro ao atualizar sala: {e}")
        return jsonify({"error": "Erro interno ao atualizar sala"}), 500
    finally:
        conn.close()

@app.route('/api/salas/<sala_id>', methods=['DELETE'])
def delete_sala(sala_id):
    """Exclui uma sala após desvincular os alunos."""
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Falha na conexão com o servidor."}), 500

    try:
        with conn.cursor() as cursor:
            # 1. Desvincular alunos da sala
            sql_update_alunos = "UPDATE users SET sala_id = NULL WHERE sala_id = %s AND role = 'aluno'"
            cursor.execute(sql_update_alunos, (sala_id,))

            # 2. Deletar a sala
            sql_delete_sala = "DELETE FROM salas WHERE id = %s"
            result = cursor.execute(sql_delete_sala, (sala_id,))

            if result == 0:
                return jsonify({"error": "Sala não encontrada"}), 404

        return jsonify({"message": "Sala excluída com sucesso!"}), 200
    except Exception as e:
        print(f"Erro ao excluir sala: {e}")
        return jsonify({"error": "Erro interno ao excluir sala"}), 500
    finally:
        conn.close()

@app.route('/api/materias', methods=['GET'])
def list_materias():
    """Lista todas as matérias."""
    conn = get_db_connection()
    if not conn: return jsonify([]), 500
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM materias")
            return jsonify(cursor.fetchall())
    finally:
        conn.close()

@app.route('/api/materias', methods=['POST'])
def create_materia():
    """Cria uma nova matéria."""
    print("--- Iniciando create_materia ---") # LOG 1
    data = request.get_json()
    print(f"Dados recebidos: {data}") # LOG 2

    # Validação básica dos dados recebidos
    if not data or not all(k in data for k in ['nome', 'sala_id']):
         print("!!! Erro: Dados incompletos recebidos.") # LOG ERRO DADOS
         return jsonify({"error": "Nome da matéria e sala são obrigatórios"}), 400

    conn = None # Inicializa conn como None
    try:
        print("Tentando obter conexão com DB...") # LOG 3
        conn = get_db_connection()
        if not conn:
             print("!!! Erro: Falha ao conectar ao DB.") # LOG ERRO CONEXÃO
             return jsonify({"error": "Falha na conexão com o servidor."}), 500
        print("Conexão DB obtida.") # LOG 4

        with conn.cursor() as cursor:
            materia_id = str(uuid.uuid4())
            sql = "INSERT INTO materias (id, nome, sala_id, owner_id) VALUES (%s, %s, %s, %s)"
            params = (
                materia_id,
                data['nome'],
                data['sala_id'], # Deve ser snake_case aqui
                data.get('owner_id') # Deve ser snake_case aqui
            )
            print(f"Executando SQL: {sql}") # LOG 5
            print(f"Parâmetros SQL: {params}") # LOG 6

            cursor.execute(sql, params)
            print("SQL executado com sucesso.") # LOG 7

        print("--- create_materia concluída com sucesso ---") # LOG 8 SUCESSO
        return jsonify({"message": "Matéria criada com sucesso!", "id": materia_id}), 201

    except pymysql.IntegrityError as e:
         print(f"!!! Erro de Integridade DB: {e}") # LOG ERRO INTEGRIDADE
         # Adapte a mensagem se houver outras constraints unique
         return jsonify({"error": "Erro ao inserir no banco (possível duplicata)"}), 409
    except KeyError as e:
         print(f"!!! Erro: Chave não encontrada nos dados recebidos - {e}") # LOG ERRO CHAVE
         return jsonify({"error": f"Dado ausente na requisição: {e}"}), 400
    except Exception as e:
         print(f"!!! Erro inesperado em create_materia: {e}") # LOG ERRO GERAL
         # Imprime o traceback completo para depuração mais detalhada
         import traceback
         traceback.print_exc()
         return jsonify({"error": "Erro interno no servidor ao criar matéria"}), 500
    finally:
        if conn:
            conn.close()
            print("Conexão DB fechada.") # LOG 9 FECHAMENTO


# ===========================
# 🔹 ROTAS DE API - BANNERS, STATS E OUTROS
# ===========================

# ### CORREÇÃO 2: Adiciona as rotas que estavam faltando ###
@app.route('/api/logs', methods=['GET'])
def list_logs():
    """Retorna uma lista de logs (atualmente vazia)."""
    return jsonify([])

@app.route('/api/ranking', methods=['GET'])
def list_ranking():
    """Retorna o ranking (atualmente vazio)."""
    return jsonify([])

@app.route('/api/banners', methods=['GET'])
def list_banners():
    """Lista todos os banners."""
    banners = [
        {"id": 1, "titulo": "Bem-vindo!", "img_url": "banner1.jpg"},
        {"id": 2, "titulo": "Novo semestre!", "img_url": "banner2.jpg"},
    ]
    return jsonify(banners)

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Retorna estatísticas básicas."""
    conn = get_db_connection()
    if not conn: return jsonify({}), 500
    try:
        with conn.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) as count FROM users")
            users_count = cursor.fetchone()['count']
            cursor.execute("SELECT COUNT(*) as count FROM materias")
            materias_count = cursor.fetchone()['count']
            
            stats = {
                "usuarios": users_count,
                "materias": materias_count,
                "banners": 0
            }
            return jsonify(stats)
    finally:
        conn.close()

# ===========================
# 🔹 EXECUÇÃO
# ===========================
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)