import os
import pymysql.cursors
from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
from dotenv import load_dotenv
import re
import uuid
import bcrypt
import datetime # Import necessário para formatar datas

# Carrega as variáveis de ambiente do arquivo .env
load_dotenv()

app = Flask(__name__, static_folder="static", template_folder="templates")

# CORS liberado para a API
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
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=True
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
    """Autentica um usuário."""
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
        if conn: conn.close()

@app.route('/api/users', methods=['POST'])
def create_user():
    """Cria um novo usuário."""
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
                data.get('mat'), # Usando snake_case consistentemente
                senha_hash,
                data.get('sala_id') # Usando snake_case consistentemente
            ))
        return jsonify({"message": f"{role.capitalize()} criado com sucesso!", "id": user_id}), 201
    except pymysql.IntegrityError:
        return jsonify({"error": "CPF já cadastrado."}), 409
    except Exception as e:
        print(f"Erro inesperado em create_user: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Erro interno ao criar usuário"}), 500
    finally:
        if conn: conn.close()

@app.route('/api/users/<role>', methods=['GET'])
def list_users(role):
    """Lista todos os usuários de um determinado perfil."""
    valid_roles_map = {'alunos': 'aluno', 'professores': 'professor', 'coordenadores': 'coordenador',
                       'aluno': 'aluno', 'professor': 'professor', 'coordenador': 'coordenador'}
    if role not in valid_roles_map:
        return jsonify({"error": "Perfil inválido"}), 400

    db_role = valid_roles_map[role]

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Falha na conexão com o servidor."}), 500

    try:
        with conn.cursor() as cursor:
            # Seleciona explicitamente as colunas com snake_case
            sql = "SELECT id, nome, cpf, matricula, sala_id, role FROM users WHERE role = %s"
            cursor.execute(sql, (db_role,))
            users = cursor.fetchall()
            return jsonify(users)
    finally:
        if conn: conn.close()

@app.route('/api/users/<role>/<user_id>', methods=['PUT'])
def update_user(role, user_id):
    """Atualiza os dados de um usuário específico."""
    data = request.get_json()
    print(f"--- Dados recebidos para atualização ({role}/{user_id}) ---")
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
            if 'mat' in data: # Frontend envia 'mat'
                fields.append("matricula = %s")
                params.append(data['mat'])
            if 'cpf' in data:
                fields.append("cpf = %s")
                params.append(data['cpf'])
            if 'senha' in data and data['senha']:
                senha_hash = bcrypt.hashpw(data['senha'].encode('utf-8'), bcrypt.gensalt())
                fields.append("senha_hash = %s")
                params.append(senha_hash)
            if 'salaId' in data: # Frontend envia 'salaId'
                fields.append("sala_id = %s")
                params.append(data['salaId'])

            if not fields:
                print("Nenhum campo válido encontrado para atualizar.")
                return jsonify({"error": "Nenhum campo para atualizar"}), 400

            params.append(user_id)
            sql = f"UPDATE users SET {', '.join(fields)} WHERE id = %s"

            print(f"--- Executando SQL ({role}/{user_id}) ---")
            print(sql)
            print("Parâmetros:", tuple(params))

            cursor.execute(sql, tuple(params))
            print(f"SQL executado com sucesso para {role}/{user_id}.")

        return jsonify({"message": "Usuário atualizado com sucesso!"}), 200
    except Exception as e:
        print(f"!!! Erro durante a execução do SQL ({role}/{user_id}) !!!")
        print(e)
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Erro ao atualizar no banco de dados"}), 500
    finally:
        if conn: conn.close()

@app.route('/api/users/<role>/<user_id>', methods=['DELETE'])
def delete_user(role, user_id):
    """Exclui um usuário."""
     # Mapeia plural/singular se necessário, ou usa o role como recebido se já for singular
    db_role = role.rstrip('es') if role.endswith('es') else role
    valid_roles = ['aluno', 'professor', 'coordenador']
    if db_role not in valid_roles:
         return jsonify({"error": "Perfil inválido para exclusão"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Falha na conexão com o servidor."}), 500

    try:
        with conn.cursor() as cursor:
            sql = "DELETE FROM users WHERE id = %s AND role = %s"
            result = cursor.execute(sql, (user_id, db_role)) # Usa db_role (singular)
            if result == 0:
                return jsonify({"error": "Usuário não encontrado"}), 404
        return jsonify({"message": "Usuário excluído com sucesso!"}), 200
    finally:
        if conn: conn.close()

# ===========================
# 🔹 ROTAS DE API - SALAS E MATÉRIAS
# ===========================

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
        if conn: conn.close()

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
            cursor.execute(sql, (sala_id, data['nome'], data.get('capacidade', 30))) # Usa get com default
        return jsonify({"message": "Sala criada com sucesso!", "id": sala_id}), 201
    except Exception as e:
        print(f"Erro ao criar sala: {e}")
        return jsonify({"error": "Erro interno ao criar sala"}), 500
    finally:
        if conn: conn.close()

@app.route('/api/salas/<sala_id>', methods=['PUT'])
def update_sala(sala_id):
    """Atualiza os dados de uma sala específica."""
    data = request.get_json()
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
        if conn: conn.close()

@app.route('/api/salas/<sala_id>', methods=['DELETE'])
def delete_sala(sala_id):
    """Exclui uma sala após desvincular os alunos."""
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Falha na conexão com o servidor."}), 500

    try:
        with conn.cursor() as cursor:
            # 1. Desvincular alunos (importante!)
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
        if conn: conn.close()

@app.route('/api/materias', methods=['GET'])
def list_materias():
    """Lista todas as matérias."""
    conn = get_db_connection()
    if not conn: return jsonify([]), 500
    try:
        with conn.cursor() as cursor:
            # Seleciona explicitamente as colunas com snake_case
            cursor.execute("SELECT id, nome, sala_id, owner_id, quiz_facil, quiz_medio, quiz_dificil FROM materias")
            return jsonify(cursor.fetchall())
    finally:
        if conn: conn.close()

@app.route('/api/materias', methods=['POST'])
def create_materia():
    """Cria uma nova matéria."""
    print("--- Iniciando create_materia ---") # LOG 1
    data = request.get_json()
    print(f"Dados recebidos: {data}") # LOG 2

    # Validação básica
    if not data or not all(k in data for k in ['nome', 'sala_id']):
         print("!!! Erro: Dados incompletos recebidos.") # LOG ERRO DADOS
         return jsonify({"error": "Nome da matéria e sala são obrigatórios"}), 400

    conn = None
    try:
        print("Tentando obter conexão com DB...") # LOG 3
        conn = get_db_connection()
        if not conn:
             print("!!! Erro: Falha ao conectar ao DB.") # LOG ERRO CONEXÃO
             return jsonify({"error": "Falha na conexão com o servidor."}), 500
        print("Conexão DB obtida.") # LOG 4

        with conn.cursor() as cursor:
            materia_id = str(uuid.uuid4())
            # SQL usa snake_case
            sql = "INSERT INTO materias (id, nome, sala_id, owner_id, quiz_facil, quiz_medio, quiz_dificil) VALUES (%s, %s, %s, %s, %s, %s, %s)"
            # Parâmetros usam snake_case vindo do frontend/payload
            params = (
                materia_id,
                data['nome'],
                data['sala_id'],
                data.get('owner_id'), # Recebe snake_case
                data.get('quizConfig', {}).get('facil', 60), # Extrai de quizConfig se existir
                data.get('quizConfig', {}).get('medio', 30),
                data.get('quizConfig', {}).get('dificil', 10)
            )
            print(f"Executando SQL: {sql}") # LOG 5
            print(f"Parâmetros SQL: {params}") # LOG 6

            cursor.execute(sql, params)
            print("SQL executado com sucesso.") # LOG 7

        print("--- create_materia concluída com sucesso ---") # LOG 8 SUCESSO
        return jsonify({"message": "Matéria criada com sucesso!", "id": materia_id}), 201

    except pymysql.IntegrityError as e:
         print(f"!!! Erro de Integridade DB: {e}") # LOG ERRO INTEGRIDADE
         return jsonify({"error": "Erro ao inserir no banco (possível duplicata)"}), 409
    except KeyError as e:
         print(f"!!! Erro: Chave não encontrada nos dados recebidos - {e}") # LOG ERRO CHAVE
         return jsonify({"error": f"Dado ausente na requisição: {e}"}), 400
    except Exception as e:
         print(f"!!! Erro inesperado em create_materia: {e}") # LOG ERRO GERAL
         import traceback
         traceback.print_exc()
         return jsonify({"error": "Erro interno no servidor ao criar matéria"}), 500
    finally:
        if conn:
            conn.close()
            print("Conexão DB fechada.") # LOG 9 FECHAMENTO


# ===========================
# 🔹 ROTAS DE API - LOGS, STATS E OUTROS
# ===========================

@app.route('/api/logs', methods=['GET'])
def list_logs():
    """Retorna os últimos utilizadores que fizeram login (nome e papel)."""
    conn = get_db_connection()
    if not conn: return jsonify([]), 500
    try:
        with conn.cursor() as cursor:
            # Busca apenas nome e papel, ordenado pelo login mais recente
            # DISTINCT pode ser útil se não quiser o mesmo user várias vezes seguidas
            sql = """
                SELECT DISTINCT user_name as user, user_role as role
                FROM access_logs
                ORDER BY login_time DESC
                LIMIT 15 
            """
            # Ou se quiser os últimos 15 logins individuais (pode ter repetidos):
            # sql = """
            #    SELECT user_name as user, user_role as role
            #    FROM access_logs
            #    ORDER BY login_time DESC
            #    LIMIT 15
            # """
            cursor.execute(sql)
            logs = cursor.fetchall()
            # Não precisamos mais de formatar datas
            return jsonify(logs)
    except Exception as e:
        print(f"Erro ao buscar logs simplificados: {e}")
        return jsonify([]), 500
    finally:
        if conn: conn.close()

@app.route('/api/logs', methods=['POST'])
def add_log():
    """Regista um evento de login ou logout.""" # Descrição atualizada
    data = request.get_json()
    if not data or 'type' not in data or 'user' not in data:
        return jsonify({"error": "Dados de log inválidos"}), 400

    user_info = data.get('user')
    log_type = data.get('type') # 'login' ou 'logout'

    if not isinstance(user_info, dict) or 'id' not in user_info:
         return jsonify({"error": "Informação do utilizador inválida no log"}), 400

    conn = get_db_connection()
    if not conn: return jsonify({"error": "Falha na conexão"}), 500

    log_id = str(uuid.uuid4()) # ID para inserção (login)

    try:
        with conn.cursor() as cursor:
            if log_type == 'login':
                sql = """
                    INSERT INTO access_logs (id, user_name, user_role, user_id, login_time)
                    VALUES (%s, %s, %s, %s, NOW())
                """
                cursor.execute(sql, (
                    log_id,
                    user_info.get('nome'),
                    user_info.get('role'),
                    user_info.get('id')
                ))
            # --- REATIVE ESTE BLOCO ---
            elif log_type == 'logout':
                # Encontra o último login aberto para este utilizador e atualiza o logout_time
                sql = """
                    UPDATE access_logs
                    SET logout_time = NOW()
                    WHERE user_id = %s AND logout_time IS NULL
                    ORDER BY login_time DESC
                    LIMIT 1
                """
                cursor.execute(sql, (user_info.get('id'),))
                log_id = "logout_update" # Indica que foi uma atualização
            # --- FIM DO BLOCO REATIVADO ---
            else:
                return jsonify({"error": "Tipo de log inválido"}), 400

        return jsonify({"message": "Log registado", "id": log_id}), 201
    except Exception as e:
        print(f"Erro ao registar log: {e}")
        return jsonify({"error": "Erro interno ao registar log"}), 500
    finally:
        if conn: conn.close()


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Retorna estatísticas básicas."""
    conn = get_db_connection()
    stats_data = {"respostas": 0, "usuarios": 0, "materias": 0}
    if not conn: return jsonify(stats_data), 500
    try:
        with conn.cursor() as cursor:
            # Busca 'questions_answered'
            sql_q = "SELECT stat_value FROM app_stats WHERE stat_key = 'questions_answered'"
            cursor.execute(sql_q)
            result_q = cursor.fetchone()
            stats_data['respostas'] = result_q['stat_value'] if result_q else 0

            # Busca contagem de utilizadores
            cursor.execute("SELECT COUNT(*) as count FROM users")
            stats_data['usuarios'] = cursor.fetchone()['count']

            # Busca contagem de matérias
            cursor.execute("SELECT COUNT(*) as count FROM materias")
            stats_data['materias'] = cursor.fetchone()['count']

        return jsonify(stats_data)
    except Exception as e:
        print(f"Erro ao buscar stats: {e}")
        return jsonify(stats_data), 500 # Retorna default em caso de erro
    finally:
        if conn: conn.close()

@app.route('/api/stats/increment', methods=['POST'])
def increment_stat():
    """Incrementa um contador de estatística."""
    data = request.get_json()
    stat_key_to_increment = data.get('stat_key')

    if not stat_key_to_increment:
        return jsonify({"error": "stat_key é obrigatório"}), 400

    allowed_keys = ['questions_answered']
    if stat_key_to_increment not in allowed_keys:
        return jsonify({"error": "Chave de estatística inválida"}), 400

    conn = get_db_connection()
    if not conn: return jsonify({"error": "Falha na conexão"}), 500

    try:
        with conn.cursor() as cursor:
            sql = """
                INSERT INTO app_stats (stat_key, stat_value)
                VALUES (%s, 1)
                ON DUPLICATE KEY UPDATE stat_value = stat_value + 1
            """
            cursor.execute(sql, (stat_key_to_increment,))
        return jsonify({"message": f"Estatística '{stat_key_to_increment}' incrementada"}), 200
    except Exception as e:
        print(f"Erro ao incrementar estatística: {e}")
        return jsonify({"error": "Erro interno ao incrementar estatística"}), 500
    finally:
        if conn: conn.close()

# Rota de exemplo para Banners (precisa de implementação real)
@app.route('/api/banners', methods=['GET'])
def list_banners():
    """Lista todos os banners (exemplo)."""
    banners = [
        {"id": "banner1", "titulo": "Bem-vindo!", "img_url": "banner1.jpg"},
        {"id": "banner2", "titulo": "Novo semestre!", "img_url": "banner2.jpg"},
    ]
    return jsonify(banners)

# Rota de exemplo para Ranking (precisa de implementação real)
@app.route('/api/ranking', methods=['GET'])
def list_ranking():
    """Retorna o ranking (exemplo)."""
    ranking = [
        {"nome": "Exemplo Aluno 1", "score": 15},
        {"nome": "Exemplo Aluno 2", "score": 10},
    ]
    return jsonify(ranking)

# ===========================
# 🔹 EXECUÇÃO
# ===========================
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True) # debug=True é útil para desenvolvimento