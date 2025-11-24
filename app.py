import os
import pymysql.cursors
from flask import Flask, jsonify, request, render_template, url_for
from flask_cors import CORS
from dotenv import load_dotenv
import re
import uuid
import bcrypt
import datetime # Import necessário para formatar datas
from werkzeug.utils import secure_filename

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
# ROTA PRINCIPAL
# ===========================
@app.route('/')
def index():
    """Serve a página principal da aplicação."""
    return render_template('index.html')

# ===========================
# ROTAS DE API - AUTENTICAÇÃO E USUÁRIOS
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
            sql = "SELECT id, nome, cpf, role, sala_id, senha_hash, is_assistente FROM users WHERE cpf=%s AND role=%s"
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
    valid_roles_map = {
        'alunos': 'aluno', 'professores': 'professor', 'coordenadores': 'coordenador',
        'aluno': 'aluno', 'professor': 'professor', 'coordenador': 'coordenador'
    }
    if role not in valid_roles_map:
        return jsonify({"error": "Perfil inválido"}), 400

    db_role = valid_roles_map[role]

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Falha na conexão com o servidor."}), 500

    try:
        with conn.cursor() as cursor:
            # Seleciona colunas (incluindo is_assistente)
            sql = "SELECT id, nome, cpf, matricula, sala_id, role, is_assistente FROM users WHERE role = %s"
            
            # --- PROTEÇÃO DO ADMIN MESTRE ---
            # Se estivermos listando coordenadores, escondemos o ADMIN01
            if db_role == 'coordenador':
                sql += " AND matricula != 'ADMIN01'"
            # --------------------------------

            cursor.execute(sql, (db_role,))
            users = cursor.fetchall()
            return jsonify(users)
    finally:
        if conn: conn.close()

@app.route('/api/users/<role>/<user_id>', methods=['PUT'])
def update_user(role, user_id):
    """Atualiza os dados de um usuário específico."""
    data = request.get_json()
    print(f"\n{'='*60}")
    print(f"UPDATE USER - Role: {role}, ID: {user_id}")
    print(f"Dados recebidos: {data}")
    print(f"{'='*60}\n")

    if not data:
        return jsonify({"error": "Nenhum dado fornecido"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Falha na conexão com o servidor."}), 500

    try:
        with conn.cursor() as cursor:
            fields = []
            params = []

            if 'nome' in data and data['nome']:
                fields.append("nome = %s")
                params.append(data['nome'])
           
            if 'mat' in data:
                fields.append("matricula = %s")
                params.append(data['mat'] if data['mat'] else None)
           
            if 'cpf' in data and data['cpf']:
                cpf_limpo = data['cpf'].replace('-', '').replace('.', '').strip()
                fields.append("cpf = %s")
                params.append(cpf_limpo)
           
            if 'senha' in data and data['senha'] and len(str(data['senha']).strip()) > 0:
                try:
                    senha_hash = bcrypt.hashpw(data['senha'].encode('utf-8'), bcrypt.gensalt())
                    fields.append("senha_hash = %s")
                    params.append(senha_hash)
                    print(f"✓ Senha será atualizada")
                except Exception as e:
                    print(f"✗ Erro ao gerar hash: {e}")
                    return jsonify({"error": "Erro ao processar senha"}), 500
           
            if 'salaId' in data:
                fields.append("sala_id = %s")
                params.append(data['salaId'] if data['salaId'] else None)

            if 'is_assistente' in data:
                fields.append("is_assistente = %s")
                params.append(1 if data['is_assistente'] else 0) 

            if not fields:
                return jsonify({"error": "Nenhum campo para atualizar"}), 400

            # --- CORREÇÃO DEFINITIVA DE ROLE ---
            # Mapeia o plural da URL para o singular do Banco de Dados
            role_map = {
                'alunos': 'aluno',
                'professores': 'professor',
                'coordenadores': 'coordenador',
                'aluno': 'aluno',        # Caso venha singular
                'professor': 'professor' # Caso venha singular
            }
            db_role = role_map.get(role, role) # Usa o mapa, ou o original se não achar
            
            params.append(user_id)
            params.append(db_role) 
            
            sql = f"UPDATE users SET {', '.join(fields)} WHERE id = %s AND role = %s"

            print(f"SQL: {sql}")
            print(f"Params: {params}")

            cursor.execute(sql, tuple(params))
           
            if cursor.rowcount == 0:
                # O MySQL retorna 0 se os dados novos forem iguais aos antigos.
                # Vamos verificar se o usuário REALMENTE existe para decidir se é erro ou não.
                cursor.execute("SELECT id FROM users WHERE id = %s", (user_id,))
                if cursor.fetchone():
                    # O usuário existe, então foi apenas "sem mudanças". Retornamos sucesso (200).
                    return jsonify({"message": "Dados salvos (sem alterações detectadas)."}), 200
                else:
                    # O usuário realmente não existe. Retornamos erro (404).
                    return jsonify({"error": f"Usuário {user_id} com papel {db_role} não encontrado"}), 404

        return jsonify({"message": "Usuário atualizado com sucesso!"}), 200
       
    except pymysql.IntegrityError as e:
        if 'Duplicate entry' in str(e) and 'cpf' in str(e).lower():
            return jsonify({"error": "CPF já cadastrado"}), 409
        return jsonify({"error": f"Erro: {str(e)}"}), 409
       
    except Exception as e:
        print(f"ERRO: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Erro: {str(e)}"}), 500
       
    finally:
        if conn:
            conn.close()

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
# ROTAS DE API - SALAS E MATÉRIAS
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
            
            # --- LÓGICA CORRIGIDA ---
            if result == 0:
                # Verifica se a sala existe mesmo
                cursor.execute("SELECT id FROM salas WHERE id = %s", (sala_id,))
                if cursor.fetchone():
                    return jsonify({"message": "Sala atualizada (sem alterações)."}), 200
                else:
                    return jsonify({"error": "Sala não encontrada"}), 404
            # ------------------------

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
    """Lista todas as matérias e seus conteúdos E perguntas associadas."""
    conn = get_db_connection()
    if not conn: return jsonify([]), 500
    try:
        materias_dict = {}
        with conn.cursor() as cursor:
            # 1. Busca matérias
            sql_materias = "SELECT id, nome, sala_id, owner_id, quiz_facil, quiz_medio, quiz_dificil FROM materias"
            cursor.execute(sql_materias)
            materias = cursor.fetchall()
            for m in materias:
                m['conteudos'] = []
                m['perguntas'] = []
                materias_dict[m['id']] = m

            # 2. Busca conteúdos
            sql_conteudos = "SELECT id, materia_id, nome, tipo, url, texto, link_externo FROM conteudos ORDER BY created_at ASC"
            cursor.execute(sql_conteudos)
            conteudos = cursor.fetchall()
            for c in conteudos:
                materia_id = c.get('materia_id')
                if materia_id in materias_dict:
                    materias_dict[materia_id]['conteudos'].append(c)

            # 3. Busca perguntas (ADICIONADO: explicacao)
            sql_perguntas = """
                SELECT id, materia_id, nivel, enunciado,
                       alt0, alt1, alt2, alt3, alt4, correta, img_url, explicacao
                FROM perguntas
                ORDER BY created_at ASC
            """
            cursor.execute(sql_perguntas)
            perguntas = cursor.fetchall()
            for p in perguntas:
                materia_id = p.get('materia_id')
                if materia_id in materias_dict:
                     pergunta_formatada = {
                         "id": p['id'],
                         "nivel": p['nivel'],
                         "q": p['enunciado'],
                         "a": [p['alt0'], p['alt1'], p['alt2'], p['alt3'], p['alt4']],
                         "correta": p['correta'], 
                         "img_url": p.get('img_url'),
                         "explicacao": p.get('explicacao') # <-- NOVO CAMPO
                     }
                     materias_dict[materia_id]['perguntas'].append(pergunta_formatada)

        return jsonify(list(materias_dict.values()))

    except Exception as e:
        print(f"Erro ao listar matérias: {e}")
        return jsonify([]), 500
    finally:
        if conn: conn.close()


@app.route('/api/materias', methods=['POST'])
def create_materia():
    """Cria uma nova matéria com tratamento robusto de quizConfig."""
    print("=" * 60)
    print("--- Iniciando create_materia ---")
    print("=" * 60)

    data = request.get_json()
    print(f" Dados recebidos: {data}")

    # Validação básica
    if not data or not all(k in data for k in ['nome', 'sala_id']):
        print("❌ Erro: Dados incompletos recebidos.")
        return jsonify({"error": "Nome da matéria e sala são obrigatórios"}), 400

    conn = None
    try:
        print(" Tentando obter conexão com DB...")
        conn = get_db_connection()
        if not conn:
            print("❌ Erro: Falha ao conectar ao DB.")
            return jsonify({"error": "Falha na conexão com o servidor."}), 500
        print("✅ Conexão DB obtida.")

        with conn.cursor() as cursor:
            materia_id = str(uuid.uuid4())

            #  CORREÇÃO CIRÚRGICA: Extração segura de quizConfig
            quiz_config = data.get('quizConfig')
            print(
                f" quizConfig RAW: {quiz_config} (tipo: {type(quiz_config)})")

            # Proteção dupla: garante que é dict e não None
            if not isinstance(quiz_config, dict) or quiz_config is None:
                print(f"  quizConfig inválido, usando padrões")
                quiz_config = {}

            # Extração segura dos valores
            quiz_facil = quiz_config.get('facil', 60)
            quiz_medio = quiz_config.get('medio', 30)
            quiz_dificil = quiz_config.get('dificil', 10)

            print(
                f"✅ Quiz extraído: facil={quiz_facil}, medio={quiz_medio}, dificil={quiz_dificil}")

            # SQL com snake_case
            sql = "INSERT INTO materias (id, nome, sala_id, owner_id, quiz_facil, quiz_medio, quiz_dificil) VALUES (%s, %s, %s, %s, %s, %s, %s)"

            # Parâmetros com valores seguros
            params = (
                materia_id,
                data['nome'],
                data['sala_id'],
                data.get('owner_id'),
                quiz_facil,    # ✅ Valor já extraído com segurança
                quiz_medio,    # ✅ Valor já extraído com segurança
                quiz_dificil   # ✅ Valor já extraído com segurança
            )

            print(f" Executando SQL: {sql}")
            print(f" Parâmetros: {params}")

            cursor.execute(sql, params)
            print("✅ SQL executado com sucesso.")

        print("=" * 60)
        print("✅ create_materia CONCLUÍDA COM SUCESSO")
        print("=" * 60)
        return jsonify({"message": "Matéria criada com sucesso!", "id": materia_id}), 201

    except pymysql.IntegrityError as e:
        print("=" * 60)
        print("❌ ERRO DE INTEGRIDADE DB")
        print("=" * 60)
        print(f"Erro: {e}")
        return jsonify({"error": f"Erro de integridade: {str(e)}"}), 409

    except KeyError as e:
        print("=" * 60)
        print("❌ ERRO: CHAVE AUSENTE")
        print("=" * 60)
        print(f"Chave faltando: {e}")
        return jsonify({"error": f"Dado ausente: {e}"}), 400

    except AttributeError as e:
        print("=" * 60)
        print("❌ ERRO: ATRIBUTO INVÁLIDO")
        print("=" * 60)
        print(f"Erro de atributo (provável None.get()): {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Erro ao processar quizConfig"}), 500

    except Exception as e:
        print("=" * 60)
        print("❌ ERRO INESPERADO")
        print("=" * 60)
        print(f"Tipo: {type(e).__name__}")
        print(f"Mensagem: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Erro interno no servidor"}), 500

    finally:
        if conn:
            conn.close()
            print("Conexão DB fechada.")
         
@app.route('/api/materias/<materia_id>', methods=['PUT'])
def update_materia(materia_id):
    """Atualiza os dados de uma matéria específica."""
    data = request.get_json()
    if not data or 'nome' not in data or 'sala_id' not in data:
        return jsonify({"error": "Campos nome e sala_id são obrigatórios"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Falha na conexão com o servidor."}), 500

    try:
        with conn.cursor() as cursor:
            sql = "UPDATE materias SET nome = %s, sala_id = %s WHERE id = %s"
            result = cursor.execute(sql, (data['nome'], data['sala_id'], materia_id))
            
            # --- LÓGICA CORRIGIDA ---
            if result == 0:
                cursor.execute("SELECT id FROM materias WHERE id = %s", (materia_id,))
                if cursor.fetchone():
                     return jsonify({"message": "Matéria atualizada (sem alterações)."}), 200
                else:
                    return jsonify({"error": "Matéria não encontrada"}), 404
            # ------------------------

        return jsonify({"message": "Matéria atualizada com sucesso!"}), 200
    except Exception as e:
        print(f"Erro ao atualizar matéria: {e}")
        return jsonify({"error": "Erro interno ao atualizar matéria"}), 500
    finally:
        if conn: conn.close()

@app.route('/api/materias/<materia_id>', methods=['DELETE'])
def delete_materia(materia_id):
    """Exclui uma matéria e seus conteúdos/perguntas associados."""
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Falha na conexão com o servidor."}), 500

    try:
        with conn.cursor() as cursor:
            # 1. Apagar perguntas associadas
            sql_del_perguntas = "DELETE FROM perguntas WHERE materia_id = %s"
            cursor.execute(sql_del_perguntas, (materia_id,))
            
            # 2. Apagar conteúdos associados
            sql_del_conteudos = "DELETE FROM conteudos WHERE materia_id = %s"
            cursor.execute(sql_del_conteudos, (materia_id,))

            # 3. Apagar a matéria
            sql_del_materia = "DELETE FROM materias WHERE id = %s"
            result = cursor.execute(sql_del_materia, (materia_id,))
            
            if result == 0:
                return jsonify({"error": "Matéria não encontrada"}), 404

        return jsonify({"message": "Matéria e seus dados associados foram excluídos!"}), 200
    except Exception as e:
        print(f"Erro ao excluir matéria: {e}")
        return jsonify({"error": "Erro interno ao excluir matéria"}), 500
    finally:
        if conn: conn.close()

# ===========================
# ROTAS DE API - LOGS, STATS E OUTROS
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

@app.route('/api/banners', methods=['GET'])
def list_banners():
    """Lista os últimos banners da base de dados."""
    conn = get_db_connection()
    if not conn: return jsonify([]), 500
    try:
        with conn.cursor() as cursor:
            # Busca os últimos banners (ex: os 10 mais recentes)
            # Seleciona as colunas necessárias para a pré-visualização
            sql = """
                SELECT id, tit, data_evento, hora, local, materias, dicas, img_url
                FROM banners
                ORDER BY created_at DESC
                LIMIT 10
            """
            cursor.execute(sql)
            banners = cursor.fetchall()
            # Formata datas/horas se necessário para o frontend
            for banner in banners:
                if banner.get('data_evento'):
                    banner['data_evento'] = banner['data_evento'].isoformat()
                if banner.get('hora'):
                    # Converte timedelta (que pymysql pode retornar para TIME) para string
                    if isinstance(banner['hora'], datetime.timedelta):
                       total_seconds = int(banner['hora'].total_seconds())
                       hours, remainder = divmod(total_seconds, 3600)
                       minutes, seconds = divmod(remainder, 60)
                       banner['hora'] = f"{hours:02}:{minutes:02}:{seconds:02}"
                    # Se já for string (menos comum), mantém
                    elif isinstance(banner['hora'], str):
                         pass # Mantém a string como está
                    else: # Outros tipos podem precisar de formatação específica
                         banner['hora'] = str(banner['hora'])

            return jsonify(banners)
    except Exception as e:
        print(f"Erro ao buscar banners: {e}")
        return jsonify([]), 500
    finally:
        if conn: conn.close()

@app.route('/api/banners', methods=['POST'])
def create_banner():
    """Cria um novo banner e guarda a imagem."""
    print("--- Iniciando create_banner ---")
    # Lê os dados do formulário
    titulo = request.form.get('tit')
    data_evento = request.form.get('data')
    hora = request.form.get('hora')
    local = request.form.get('local')
    materias = request.form.get('mats')
    dicas = request.form.get('dicas')

    if not titulo:
        print("!!! Erro create_banner: Título ausente.")
        return jsonify({"error": "Título é obrigatório"}), 400

    img_file = request.files.get('img') # Obtém o ficheiro da requisição
    img_url_to_save = None # Variável para guardar a URL final

    # --- Lógica de Upload de Imagem ---
    if img_file and img_file.filename != '':
        print(f"Processando ficheiro: {img_file.filename}")
        try:
            # Caminho absoluto para a pasta de uploads dentro de 'static'
            # app.root_path é o diretório onde app.py está
            # app.static_folder é o nome da pasta estática ('static')
            upload_folder = os.path.join(app.root_path, app.static_folder, 'uploads')
            print(f"Pasta de upload definida como: {upload_folder}")
            os.makedirs(upload_folder, exist_ok=True) # Cria a pasta se não existir

            # Limpa o nome do ficheiro para segurança
            filename = secure_filename(img_file.filename)
            # Cria um nome único para evitar ficheiros com o mesmo nome
            unique_filename = str(uuid.uuid4()) + "_" + filename
            # Caminho completo onde o ficheiro será guardado
            save_path = os.path.join(upload_folder, unique_filename)

            print(f"Tentando guardar em: {save_path}")
            img_file.save(save_path) # Guarda o ficheiro no disco do servidor
            print("Ficheiro guardado com sucesso.")

            # Gera a URL relativa que o navegador pode aceder através do Nginx/Flask
            # O Flask serve automaticamente ficheiros dentro da pasta 'static'
            img_url_to_save = f"/static/uploads/{unique_filename}"
            print(f"URL relativa gerada: {img_url_to_save}")

        except Exception as e_upload:
            print(f"!!! ERRO CRÍTICO AO GUARDAR IMAGEM: {e_upload}")
            import traceback
            traceback.print_exc()
            # Decide se quer continuar sem imagem ou retornar um erro
            img_url_to_save = None # Continua sem imagem se o upload falhar
    else:
        print("Nenhum ficheiro de imagem enviado ou nome de ficheiro vazio.")
    # --- Fim da Lógica de Upload ---

    conn = None
    try:
        conn = get_db_connection()
        if not conn: return jsonify({"error": "Falha na conexão DB"}), 500

        banner_id = str(uuid.uuid4())
        with conn.cursor() as cursor:
            sql = """
                INSERT INTO banners (id, tit, data_evento, hora, local, materias, dicas, img_url)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            data_evento_db = data_evento if data_evento else None
            hora_db = hora if hora else None

            print(f"Guardando no DB: titulo={titulo}, ..., img_url={img_url_to_save}")
            cursor.execute(sql, (
                banner_id, titulo, data_evento_db, hora_db, local, materias, dicas, img_url_to_save
            ))
        print("Banner guardado no DB com sucesso.")
        return jsonify({"message": "Banner criado com sucesso!", "id": banner_id}), 201

    except Exception as e_db:
         print(f"!!! Erro ao guardar banner no DB: {e_db}")
         import traceback
         traceback.print_exc()
         return jsonify({"error": "Erro interno ao guardar banner"}), 500
    finally:
        if conn: conn.close()

@app.route('/api/banners/<banner_id>', methods=['DELETE'])
def delete_banner(banner_id):
    """Exclui um banner específico."""
    print(f"--- Iniciando delete_banner para ID: {banner_id} ---") # Log

    conn = None
    banner_img_url = None # Para guardar a URL da imagem a ser apagada

    try:
        conn = get_db_connection()
        if not conn:
            print("!!! Erro delete_banner: Falha na conexão DB.") # Log
            return jsonify({"error": "Falha na conexão com o servidor."}), 500

        with conn.cursor() as cursor:
            # Opcional: Buscar a URL da imagem ANTES de apagar o registo
            sql_find = "SELECT img_url FROM banners WHERE id = %s"
            cursor.execute(sql_find, (banner_id,))
            result_find = cursor.fetchone()
            if result_find:
                banner_img_url = result_find.get('img_url')
                print(f"URL da imagem encontrada para apagar: {banner_img_url}") # Log

            # Apagar o registo do banner na base de dados
            sql_delete = "DELETE FROM banners WHERE id = %s"
            result = cursor.execute(sql_delete, (banner_id,))

            if result == 0:
                print(f"!!! Erro delete_banner: Banner ID {banner_id} não encontrado no DB.") # Log
                return jsonify({"error": "Banner não encontrado"}), 404

        print("Banner apagado do DB com sucesso.") # Log

        # --- Opcional: Apagar o ficheiro da imagem do servidor ---
        if banner_img_url and banner_img_url.startswith('/static/uploads/'):
            try:
                # Constrói o caminho absoluto para o ficheiro
                filename = os.path.basename(banner_img_url) # Extrai o nome do ficheiro da URL
                file_path = os.path.join(app.root_path, app.static_folder, 'uploads', filename)

                if os.path.exists(file_path):
                    print(f"Tentando apagar ficheiro de imagem: {file_path}") # Log
                    os.remove(file_path)
                    print("Ficheiro de imagem apagado com sucesso.") # Log
                else:
                     print(f"Ficheiro de imagem não encontrado em {file_path}, não foi apagado.") # Log
            except Exception as e_file:
                print(f"!!! ATENÇÃO: Erro ao tentar apagar ficheiro {banner_img_url}: {e_file}") # Log erro ficheiro
        # --- Fim da Lógica Opcional de Apagar Ficheiro ---

        return jsonify({"message": "Banner excluído com sucesso!"}), 200 # HTTP 200 OK para delete bem-sucedido

    except Exception as e_db:
         print(f"!!! Erro inesperado em delete_banner: {e_db}") # Log erro geral
         import traceback
         traceback.print_exc()
         return jsonify({"error": "Erro interno no servidor ao excluir banner"}), 500
    finally:
        if conn:
            conn.close()
            print("Conexão DB fechada.") # Log

@app.route('/api/banners/<banner_id>', methods=['PUT'])
def update_banner(banner_id):
    """Atualiza um banner existente."""
    print(f"--- Update Banner {banner_id} ---")
    
    # Lê os dados do formulário (mesmos nomes do create_banner)
    titulo = request.form.get('tit')
    data_evento = request.form.get('data')
    hora = request.form.get('hora')
    local = request.form.get('local')
    materias = request.form.get('mats')
    dicas = request.form.get('dicas')

    if not titulo:
        return jsonify({"error": "Título é obrigatório"}), 400

    conn = get_db_connection()
    if not conn: return jsonify({"error": "Falha na conexão DB"}), 500

    try:
        with conn.cursor() as cursor:
            # 1. Buscar imagem antiga
            sql_find = "SELECT img_url FROM banners WHERE id = %s"
            cursor.execute(sql_find, (banner_id,))
            row = cursor.fetchone()
            if not row: return jsonify({"error": "Banner não encontrado"}), 404
            
            current_img_url = row['img_url']
            
            # 2. Processar nova imagem (se houver)
            img_file = request.files.get('img')
            if img_file and img_file.filename != '':
                try:
                    # Remove antiga
                    if current_img_url and current_img_url.startswith('/static/uploads/'):
                        old_path = os.path.join(app.root_path, app.static_folder, 'uploads', os.path.basename(current_img_url))
                        if os.path.exists(old_path): os.remove(old_path)
                    
                    # Salva nova
                    upload_folder = os.path.join(app.root_path, app.static_folder, 'uploads')
                    filename = str(uuid.uuid4()) + "_" + secure_filename(img_file.filename)
                    save_path = os.path.join(upload_folder, filename)
                    img_file.save(save_path)
                    current_img_url = f"/static/uploads/{filename}"
                except Exception as e:
                    print(f"Erro upload banner: {e}")

            # 3. Atualizar dados
            sql_update = """
                UPDATE banners 
                SET tit=%s, data_evento=%s, hora=%s, local=%s, materias=%s, dicas=%s, img_url=%s
                WHERE id=%s
            """
            # Trata data/hora vazios
            data_db = data_evento if data_evento else None
            hora_db = hora if hora else None
            
            cursor.execute(sql_update, (titulo, data_db, hora_db, local, materias, dicas, current_img_url, banner_id))

        return jsonify({"message": "Banner atualizado com sucesso!"}), 200

    except Exception as e:
        print(f"Erro update banner: {e}")
        return jsonify({"error": "Erro interno"}), 500
    finally:
        if conn: conn.close()

@app.route('/api/ranking', methods=['GET'])
def list_ranking():
    """Retorna o ranking filtrado por sala."""
    sala_id = request.args.get('sala_id') # Recebe o filtro da URL
    
    conn = get_db_connection()
    if not conn: return jsonify([]), 500
    try:
        with conn.cursor() as cursor:
            if sala_id:
                # Se vier sala_id, filtra por ela
                sql = """
                    SELECT nome, score 
                    FROM ranking 
                    WHERE sala_id = %s
                    ORDER BY score DESC, created_at ASC 
                    LIMIT 50 
                """
                cursor.execute(sql, (sala_id,))
            else:
                # Se não vier (ex: admin), mostra global ou vazio
                sql = """
                    SELECT nome, score 
                    FROM ranking 
                    ORDER BY score DESC, created_at ASC 
                    LIMIT 50 
                """
                cursor.execute(sql)
                
            ranking = cursor.fetchall()
            return jsonify(ranking)
    except Exception as e:
        print(f"Erro ao buscar ranking: {e}")
        return jsonify([]), 500
    finally:
        if conn: conn.close()

@app.route('/api/ranking', methods=['POST'])
def add_ranking_score():
    """Adiciona ou atualiza a pontuação no ranking (Mantém apenas a melhor)."""
    data = request.get_json()

    nome = data.get('nome')
    score = data.get('score')
    sala_id = data.get('sala_id')
    user_id = data.get('user_id') # <-- Agora recebemos o ID do aluno

    if not all([nome, score is not None, sala_id, user_id]):
        return jsonify({"error": "Dados incompletos (nome, score, sala_id, user_id)"}), 400

    try:
        score_int = int(score)
    except (ValueError, TypeError):
         return jsonify({"error": "Score deve ser um número inteiro"}), 400

    conn = get_db_connection()
    if not conn: return jsonify({"error": "Falha na conexão"}), 500

    try:
        with conn.cursor() as cursor:
            # 1. Verifica se o aluno já tem pontuação nesta sala
            sql_check = "SELECT id, score FROM ranking WHERE user_id = %s AND sala_id = %s"
            cursor.execute(sql_check, (user_id, sala_id))
            existente = cursor.fetchone()

            if existente:
                # CENÁRIO A: Já existe. Atualiza SÓ se a nova pontuação for maior.
                recorde_atual = existente['score']
                if score_int > recorde_atual:
                    sql_update = "UPDATE ranking SET score = %s, created_at = NOW() WHERE id = %s"
                    cursor.execute(sql_update, (score_int, existente['id']))
                    msg = "Novo recorde pessoal!"
                else:
                    msg = "Não superou o recorde anterior."
            else:
                # CENÁRIO B: Primeira vez. Insere novo registro.
                ranking_id = str(uuid.uuid4())
                sql_insert = "INSERT INTO ranking (id, nome, score, sala_id, user_id) VALUES (%s, %s, %s, %s, %s)"
                cursor.execute(sql_insert, (ranking_id, nome, score_int, sala_id, user_id))
                msg = "Primeira pontuação registrada!"

        return jsonify({"message": msg}), 200

    except Exception as e:
        print(f"Erro ao atualizar ranking: {e}")
        return jsonify({"error": "Erro interno"}), 500
    finally:
        if conn: conn.close()

@app.route('/api/ranking/all', methods=['DELETE'])
def reset_ranking():
    """Apaga todos os registos da tabela ranking."""
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Falha na conexão"}), 500

    try:
        with conn.cursor() as cursor:
            # Apaga TUDO da tabela ranking
            sql = "DELETE FROM ranking"
            cursor.execute(sql)
        return jsonify({"message": "Ranking resetado com sucesso!"}), 200
    except Exception as e:
        print(f"Erro ao resetar ranking: {e}")
        return jsonify({"error": "Erro interno ao resetar ranking"}), 500
    finally:
        if conn: conn.close()

@app.route('/api/perguntas', methods=['POST'])
def create_pergunta():  
    """Cria uma nova pergunta (recebe FormData)."""
    data = request.form
    # ... (validações existentes mantidas) ...
    required_fields = ['materia_id', 'nivel', 'enunciado', 'opcao_a', 'opcao_b', 'opcao_c', 'opcao_d', 'opcao_e', 'resposta_correta']
    if not all(k in data for k in required_fields):
        return jsonify({"error": "Todos os campos obrigatórios faltando"}), 400
    
    try:
        correta_idx = int(data['resposta_correta'])
    except: return jsonify({"error": "Índice inválido"}), 400

    # Upload de imagem (mantido igual, resumido aqui)
    img_file = request.files.get('imagem')
    img_url_to_save = None
    if img_file and img_file.filename != '':
        try:
            upload_folder = os.path.join(app.root_path, app.static_folder, 'uploads', 'perguntas')
            os.makedirs(upload_folder, exist_ok=True)
            unique_filename = str(uuid.uuid4()) + "_" + secure_filename(img_file.filename)
            img_file.save(os.path.join(upload_folder, unique_filename))
            img_url_to_save = f"/static/uploads/perguntas/{unique_filename}"
        except: pass

    conn = get_db_connection()
    if not conn: return jsonify({"error": "Falha DB"}), 500

    try:
        with conn.cursor() as cursor:
            pergunta_id = str(uuid.uuid4())
            # ADICIONADO: explicacao
            sql = """
                INSERT INTO perguntas (id, materia_id, nivel, enunciado,
                                       alt0, alt1, alt2, alt3, alt4, correta,
                                       img_url, explicacao)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            params = (
                pergunta_id, data['materia_id'], data['nivel'], data['enunciado'],
                data['opcao_a'], data['opcao_b'], data['opcao_c'], data['opcao_d'], data['opcao_e'],
                correta_idx, img_url_to_save, data.get('explicacao') # <-- NOVO CAMPO
            )
            cursor.execute(sql, params)

        return jsonify({"message": "Pergunta criada!", "id": pergunta_id}), 201
    except Exception as e:
         print(f"Erro: {e}")
         return jsonify({"error": "Erro interno"}), 500
    finally:
        if conn: conn.close()

@app.route('/api/perguntas/<pergunta_id>', methods=['PUT'])
def update_pergunta(pergunta_id):
    """Atualiza uma pergunta existente."""
    data = request.form
    # ... (validações) ...
    try: correta_idx = int(data['resposta_correta'])
    except: return jsonify({"error": "Índice inválido"}), 400

    conn = get_db_connection()
    if not conn: return jsonify({"error": "Falha DB"}), 500

    try:
        with conn.cursor() as cursor:
            # Lógica de imagem (mantida a mesma, resumida)
            sql_find = "SELECT img_url FROM perguntas WHERE id = %s"
            cursor.execute(sql_find, (pergunta_id,))
            row = cursor.fetchone()
            new_img = row['img_url'] if row else None
            
            img_file = request.files.get('imagem')
            if img_file and img_file.filename != '':
                 # ... (código de upload e delete antigo igual ao anterior) ...
                 # Vou assumir que o código de upload está aqui.
                 # Se precisar, copie da sua versão anterior, o importante é o SQL abaixo:
                 upload_folder = os.path.join(app.static_folder, 'uploads', 'perguntas')
                 os.makedirs(upload_folder, exist_ok=True)
                 fname = str(uuid.uuid4()) + "_" + secure_filename(img_file.filename)
                 img_file.save(os.path.join(upload_folder, fname))
                 new_img = f"/static/uploads/perguntas/{fname}"

            # SQL Atualizado com explicacao
            sql_update = """
                UPDATE perguntas
                SET materia_id = %s, nivel = %s, enunciado = %s,
                    alt0 = %s, alt1 = %s, alt2 = %s, alt3 = %s, alt4 = %s,
                    correta = %s, img_url = %s, explicacao = %s
                WHERE id = %s
            """
            params = (
                data['materia_id'], data['nivel'], data['enunciado'],
                data['opcao_a'], data['opcao_b'], data['opcao_c'],
                data['opcao_d'], data['opcao_e'], correta_idx,
                new_img, data.get('explicacao'), # <-- NOVO CAMPO
                pergunta_id
            )
            cursor.execute(sql_update, params)

        return jsonify({"message": "Atualizada!"}), 200
    except Exception as e:
         print(f"Erro: {e}")
         return jsonify({"error": "Erro interno"}), 500
    finally:
        if conn: conn.close()


@app.route('/api/perguntas/<pergunta_id>', methods=['DELETE'])
def delete_pergunta(pergunta_id):
    """Exclui uma pergunta e sua imagem associada."""
    print(f"--- Iniciando delete_pergunta para ID: {pergunta_id} ---")
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Falha na conexão DB"}), 500

    try:
        with conn.cursor() as cursor:
            # 1. Buscar a pergunta para obter a URL da imagem
            sql_find = "SELECT img_url FROM perguntas WHERE id = %s"
            cursor.execute(sql_find, (pergunta_id,))
            pergunta = cursor.fetchone()
            if not pergunta:
                return jsonify({"error": "Pergunta não encontrada"}), 404
            
            img_url = pergunta.get('img_url')

            # 2. Apagar o registro do DB
            sql_delete = "DELETE FROM perguntas WHERE id = %s"
            cursor.execute(sql_delete, (pergunta_id,))
            
            # 3. Apagar o arquivo físico (se existir)
            if img_url and img_url.startswith('/static/uploads/perguntas/'):
                try:
                    filename = os.path.basename(img_url)
                    file_path = os.path.join(app.root_path, app.static_folder, 'uploads', 'perguntas', filename)
                    if os.path.exists(file_path):
                        os.remove(file_path)
                        print(f"Arquivo de imagem associado removido: {file_path}")
                    else:
                        print(f"Arquivo de imagem não encontrado: {file_path}")
                except Exception as e_file:
                    print(f"!!! Erro ao remover arquivo físico: {e_file}")
            
        return jsonify({"message": "Pergunta excluída com sucesso!"}), 200
    except Exception as e:
        print(f"!!! Erro inesperado em delete_pergunta: {e}")
        return jsonify({"error": "Erro interno no servidor ao excluir"}), 500
    finally:
        if conn: conn.close()

# ===========================
# ROTAS DE API - CONTEÚDOS
# ===========================

@app.route('/api/conteudos', methods=['POST'])
def upload_conteudo():
    """Recebe uploads de ficheiros de conteúdo para uma matéria."""
    print("--- Iniciando upload_conteudo ---") # Log

    # Verifica se a matéria_id e o nome (título) foram enviados
    materia_id = request.form.get('materia_id')
    nome_conteudo = request.form.get('nome') # Título
    texto_conteudo = request.form.get('texto')
    link_conteudo = request.form.get('link_externo')
    
    if not materia_id:
        print("!!! Erro upload_conteudo: materia_id não fornecida.") # Log
        return jsonify({"error": "materia_id é obrigatório"}), 400
        
    if not nome_conteudo:
        print("!!! Erro upload_conteudo: 'nome' (título) não fornecido.") # Log
        return jsonify({"error": "O título do conteúdo é obrigatório"}), 400

    # Pega o arquivo (opcional)
    files = request.files.getlist('files')
    file = files[0] if files else None
    
    # Valida se pelo menos um tipo de conteúdo foi enviado
    if not file and not texto_conteudo and not link_conteudo:
        print("!!! Erro upload_conteudo: Nenhum conteúdo enviado (arquivo, texto ou link).") # Log
        return jsonify({"error": "Forneça pelo menos um arquivo, um texto ou um link."}), 400
        
    print(f"Recebido conteúdo para matéria {materia_id}. Título: {nome_conteudo}") # Log

    uploaded_files_info = []
    files = request.files.getlist('files') # Recebe a lista de ficheiros
    print(f"Recebidos {len(files)} ficheiros para matéria {materia_id}.") # Log

    conn = None
    try:
        print("Tentando obter conexão com DB...") # Log
        conn = get_db_connection()
        if not conn:
             print("!!! Erro upload_conteudo: Falha ao conectar ao DB.") # Log
             # Ainda assim, tentamos guardar os ficheiros se a conexão falhar? Ou retornamos erro?
             # Por agora, retornamos erro.
             return jsonify({"error": "Falha na conexão com o servidor."}), 500
        print("Conexão DB obtida.") # Log

        with conn.cursor() as cursor:
            # --- INÍCIO DA INTERVENÇÃO CIRÚRGICA (Processamento de arquivo opcional) ---
            file_url = None
            file_type = None
            
            if file and file.filename != '':
                try:
                    # --- Lógica de Guardar Ficheiro ---
                    upload_folder = os.path.join(app.static_folder, 'uploads', 'conteudos') # Pasta específica
                    os.makedirs(upload_folder, exist_ok=True)

                    filename = secure_filename(file.filename)
                    unique_filename = str(uuid.uuid4()) + "_" + filename
                    save_path = os.path.join(upload_folder, unique_filename)

                    print(f"Guardando ficheiro '{filename}' em '{save_path}'...") # Log
                    file.save(save_path)
                    print("Ficheiro guardado.") # Log

                    file_url = url_for('static', filename=f'uploads/conteudos/{unique_filename}', _external=False)
                    file_type = file.mimetype
                    print(f"URL gerada: {file_url}") # Log

                except Exception as e_file:
                    print(f"!!! Erro ao processar o ficheiro '{file.filename}': {e_file}") # Log erro ficheiro
                    # Não retorna erro, apenas continua sem o arquivo
            
            # --- Lógica de Inserir no DB (Modificada) ---
            conteudo_id = str(uuid.uuid4())
            sql = """
                INSERT INTO conteudos (id, materia_id, nome, tipo, url, texto, link_externo)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            params = (conteudo_id, materia_id, nome_conteudo, file_type, file_url, texto_conteudo, link_conteudo)
            print(f"Executando SQL para conteúdo: {sql}") # Log
            print(f"Parâmetros SQL: {params}") # Log
            cursor.execute(sql, params)
            print("Registo de conteúdo inserido no DB.") # Log

            uploaded_files_info.append({"id": conteudo_id, "nome": nome_conteudo, "url": file_url})
            # --- FIM DA INTERVENÇÃO CIRÚRGICA ---

        print(f"--- upload_conteudo: 1 conteúdo processado com sucesso. ---") # Log sucesso
        return jsonify({"message": f"Conteúdo '{nome_conteudo}' enviado com sucesso!", "files": uploaded_files_info}), 201

    except Exception as e:
         print(f"!!! Erro inesperado em upload_conteudo: {e}") # Log erro geral
         import traceback
         traceback.print_exc()
         return jsonify({"error": "Erro interno no servidor ao fazer upload"}), 500
    finally:
        if conn:
            conn.close()
            print("Conexão DB fechada.") # Log

@app.route('/api/conteudos/<conteudo_id>', methods=['PUT'])
def update_conteudo(conteudo_id):
    """Atualiza um conteúdo existente (texto, link e/ou arquivo)."""
    print(f"--- Iniciando update_conteudo para ID: {conteudo_id} ---")
    
    # 1. Validação dos dados do formulário
    materia_id = request.form.get('materia_id')
    nome_conteudo = request.form.get('nome')
    texto_conteudo = request.form.get('texto')
    link_conteudo = request.form.get('link_externo')

    if not all([materia_id, nome_conteudo]):
        return jsonify({"error": "Matéria ID e Título são obrigatórios"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Falha na conexão DB"}), 500

    try:
        with conn.cursor() as cursor:
            # 2. Buscar o conteúdo antigo para saber se existe um arquivo para apagar
            sql_find = "SELECT url FROM conteudos WHERE id = %s"
            cursor.execute(sql_find, (conteudo_id,))
            old_content = cursor.fetchone()
            if not old_content:
                return jsonify({"error": "Conteúdo não encontrado"}), 404
            
            old_file_url = old_content.get('url')
            
            # 3. Processar o novo arquivo (se enviado)
            file = request.files.get('file') # Usando 'file' (singular) para o upload de edição
            new_file_url = None
            new_file_type = None

            if file and file.filename != '':
                print(f"Processando novo arquivo: {file.filename}")
                # Apaga o arquivo antigo se um novo foi enviado
                if old_file_url and old_file_url.startswith('/static/uploads/conteudos/'):
                    try:
                        filename = os.path.basename(old_file_url)
                        file_path = os.path.join(app.root_path, app.static_folder, 'uploads', 'conteudos', filename)
                        if os.path.exists(file_path):
                            os.remove(file_path)
                            print(f"Arquivo antigo removido: {file_path}")
                    except Exception as e_del:
                        print(f"Erro ao remover arquivo antigo: {e_del}")
                
                # Salva o novo arquivo
                upload_folder = os.path.join(app.static_folder, 'uploads', 'conteudos')
                filename = secure_filename(file.filename)
                unique_filename = str(uuid.uuid4()) + "_" + filename
                save_path = os.path.join(upload_folder, unique_filename)
                file.save(save_path)
                
                new_file_url = url_for('static', filename=f'uploads/conteudos/{unique_filename}', _external=False)
                new_file_type = file.mimetype
                print(f"Novo arquivo salvo: {new_file_url}")
            
            # 4. Atualizar o banco de dados
            if new_file_url:
                # Se um novo arquivo foi salvo, atualiza URL e TIPO
                sql_update = """
                    UPDATE conteudos 
                    SET nome = %s, texto = %s, link_externo = %s, materia_id = %s, url = %s, tipo = %s
                    WHERE id = %s
                """
                params = (nome_conteudo, texto_conteudo, link_conteudo, materia_id, new_file_url, new_file_type, conteudo_id)
            else:
                # Se nenhum arquivo novo foi enviado, preserva URL e TIPO antigos
                sql_update = """
                    UPDATE conteudos 
                    SET nome = %s, texto = %s, link_externo = %s, materia_id = %s
                    WHERE id = %s
                """
                params = (nome_conteudo, texto_conteudo, link_conteudo, materia_id, conteudo_id)

            cursor.execute(sql_update, params)
        
        return jsonify({"message": "Conteúdo atualizado com sucesso!"}), 200

    except Exception as e:
        print(f"!!! Erro inesperado em update_conteudo: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": "Erro interno no servidor ao atualizar"}), 500
    finally:
        if conn: conn.close()


@app.route('/api/conteudos/<conteudo_id>', methods=['DELETE'])
def delete_conteudo(conteudo_id):
    """Exclui um conteúdo e seu arquivo associado."""
    print(f"--- Iniciando delete_conteudo para ID: {conteudo_id} ---")
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Falha na conexão DB"}), 500

    try:
        with conn.cursor() as cursor:
            # 1. Buscar o conteúdo para obter a URL do arquivo
            sql_find = "SELECT url FROM conteudos WHERE id = %s"
            cursor.execute(sql_find, (conteudo_id,))
            content = cursor.fetchone()
            if not content:
                return jsonify({"error": "Conteúdo não encontrado"}), 404
            
            file_url = content.get('url')

            # 2. Apagar o registro do DB
            sql_delete = "DELETE FROM conteudos WHERE id = %s"
            cursor.execute(sql_delete, (conteudo_id,))
            
            # 3. Apagar o arquivo físico (se existir)
            if file_url and file_url.startswith('/static/uploads/conteudos/'):
                try:
                    filename = os.path.basename(file_url)
                    file_path = os.path.join(app.root_path, app.static_folder, 'uploads', 'conteudos', filename)
                    if os.path.exists(file_path):
                        os.remove(file_path)
                        print(f"Arquivo associado removido: {file_path}")
                    else:
                        print(f"Arquivo associado não encontrado: {file_path}")
                except Exception as e_file:
                    print(f"!!! Erro ao remover arquivo físico: {e_file}")
            
        return jsonify({"message": "Conteúdo excluído com sucesso!"}), 200
    except Exception as e:
        print(f"!!! Erro inesperado em delete_conteudo: {e}")
        return jsonify({"error": "Erro interno no servidor ao excluir"}), 500
    finally:
        if conn: conn.close()

@app.route('/api/perguntas/copy', methods=['POST'])
def copy_pergunta():
    """Copia uma pergunta existente para uma nova matéria."""
    data = request.get_json()
    pergunta_id = data.get('pergunta_id')
    nova_materia_id = data.get('nova_materia_id')

    if not pergunta_id or not nova_materia_id:
        return jsonify({"error": "ID da pergunta e ID da nova matéria são obrigatórios"}), 400

    conn = None
    try:
        conn = get_db_connection()
        if not conn: return jsonify({"error": "Falha na conexão DB"}), 500

        with conn.cursor() as cursor:
            # 1. Encontrar a pergunta original (ADICIONADO: explicacao)
            sql_find = """
                SELECT nivel, enunciado, alt0, alt1, alt2, alt3, alt4, correta, img_url, explicacao
                FROM perguntas WHERE id = %s
            """
            cursor.execute(sql_find, (pergunta_id,))
            pergunta = cursor.fetchone()
            if not pergunta: return jsonify({"error": "Original não encontrada"}), 404
            
            # 2. Inserir cópia
            novo_id = str(uuid.uuid4())
            sql_insert = """
                INSERT INTO perguntas (
                    id, materia_id, nivel, enunciado, 
                    alt0, alt1, alt2, alt3, alt4, 
                    correta, img_url, explicacao
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            cursor.execute(sql_insert, (
                novo_id, nova_materia_id, pergunta['nivel'], pergunta['enunciado'],
                pergunta['alt0'], pergunta['alt1'], pergunta['alt2'], pergunta['alt3'], pergunta['alt4'],
                pergunta['correta'], pergunta['img_url'], pergunta['explicacao'] # <-- CÓPIA DA EXPLICAÇÃO
            ))

        return jsonify({"message": "Pergunta copiada com sucesso!", "novo_id": novo_id}), 201

    except Exception as e:
         print(f"!!! Erro inesperado em copy_pergunta: {e}")
         import traceback
         traceback.print_exc()
         return jsonify({"error": "Erro interno no servidor ao copiar pergunta"}), 500
    finally:
        if conn: conn.close()

@app.route('/api/historico', methods=['POST'])
def registrar_tentativa():
    """Guarda se o aluno acertou ou errou uma pergunta."""
    data = request.get_json()
    # user_id pode vir do payload ou da sessão (aqui assumimos payload por simplicidade)
    if not all(k in data for k in ['user_id', 'pergunta_id', 'materia_id']):
        return jsonify({"error": "Dados incompletos"}), 400

    acertou = bool(data.get('acertou'))
    
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Erro DB"}), 500

    try:
        with conn.cursor() as cursor:
            hist_id = str(uuid.uuid4())
            sql = """
                INSERT INTO historico_respostas (id, user_id, pergunta_id, materia_id, acertou)
                VALUES (%s, %s, %s, %s, %s)
            """
            cursor.execute(sql, (hist_id, data['user_id'], data['pergunta_id'], data['materia_id'], acertou))
        return jsonify({"message": "Registado"}), 201
    except Exception as e:
        print(f"Erro ao salvar historico: {e}")
        return jsonify({"error": "Erro interno"}), 500
    finally:
        if conn: conn.close()

@app.route('/api/dashboard/materia/<materia_id>', methods=['GET'])
def get_dashboard_materia(materia_id):
    """Calcula as estatísticas para o dashboard do professor."""
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Erro DB"}), 500

    stats = {
        "total_respostas": 0,
        "taxa_acerto": 0,
        "top_erros": [], # Perguntas mais difíceis
        "alunos_risco": [] # Alunos com baixo desempenho
    }

    try:
        with conn.cursor() as cursor:
            # 1. Totais Gerais
            sql_geral = """
                SELECT COUNT(*) as total, SUM(CASE WHEN acertou THEN 1 ELSE 0 END) as acertos
                FROM historico_respostas WHERE materia_id = %s
            """
            cursor.execute(sql_geral, (materia_id,))
            geral = cursor.fetchone()
            
            if geral and geral['total'] > 0:
                stats['total_respostas'] = geral['total']
                stats['taxa_acerto'] = round((geral['acertos'] / geral['total']) * 100, 1)

            # 2. Top 5 Perguntas Mais Erradas
            sql_erros = """
                SELECT p.enunciado, p.nivel, 
                       COUNT(h.id) as total,
                       SUM(CASE WHEN h.acertou THEN 0 ELSE 1 END) as erros,
                       ROUND((SUM(CASE WHEN h.acertou THEN 0 ELSE 1 END) / COUNT(h.id)) * 100, 1) as taxa_erro
                FROM historico_respostas h
                JOIN perguntas p ON h.pergunta_id = p.id
                WHERE h.materia_id = %s
                GROUP BY p.id
                HAVING total > 0
                ORDER BY taxa_erro DESC, total DESC
                LIMIT 5
            """
            cursor.execute(sql_erros, (materia_id,))
            stats['top_erros'] = cursor.fetchall()

            # 3. Alunos em Risco (Taxa de acerto < 40% com pelo menos 3 tentativas)
            sql_alunos = """
                SELECT u.nome, 
                       COUNT(h.id) as tentativas,
                       ROUND((SUM(CASE WHEN h.acertou THEN 1 ELSE 0 END) / COUNT(h.id)) * 100, 1) as aproveitamento
                FROM historico_respostas h
                JOIN users u ON h.user_id = u.id
                WHERE h.materia_id = %s AND u.role = 'aluno'
                GROUP BY u.id
                HAVING tentativas >= 3 AND aproveitamento < 40
                ORDER BY aproveitamento ASC
                LIMIT 10
            """
            cursor.execute(sql_alunos, (materia_id,))
            stats['alunos_risco'] = cursor.fetchall()

        return jsonify(stats)

    except Exception as e:
        print(f"Erro dashboard: {e}")
        return jsonify({"error": "Erro interno"}), 500
    finally:
        if conn: conn.close()

# ===========================
# EXECUÇÃO
# ===========================
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True) # debug=True é útil para desenvolvimento
